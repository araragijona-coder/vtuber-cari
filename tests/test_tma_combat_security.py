from __future__ import annotations

import asyncio
import unittest
from datetime import datetime, timezone

from backend.tma import (
    CombatValidationError,
    CombatValidator,
    GameProfile,
    IdempotencyConflict,
    IdempotencyStore,
    TmaCombatService,
    apply_victory_rewards,
)


def make_payload(
    *,
    damage: int = 42,
    hp_after: int = 38,
    outcome: str = "IN_PROGRESS",
    variance: int = 2,
) -> dict:
    return {
        "combatId": "combat-001",
        "state": {"turn": 1},
        "action": {
            "actionId": "action-001",
            "type": "basic_attack",
            "attackerId": "player-1",
            "targetId": "enemy-1",
            "turn": 1,
        },
        "resolution": {
            "damage": damage,
            "targetHpBefore": 80,
            "targetHpAfter": hp_after,
            "isCritical": False,
            "variance": variance,
            "outcome": outcome,
        },
        "seed": "server-seed-001",
    }


def make_state() -> dict:
    return {
        "combatId": "combat-001",
        "turn": 1,
        "seed": "server-seed-001",
        "allowed_action_types": ["basic_attack", "critical_attack"],
        "attacker": {
            "id": "player-1",
            "attack": 40,
            "hp": 100,
            "max_hp": 100,
        },
        "target": {
            "id": "enemy-1",
            "hp": 80,
            "max_hp": 80,
        },
        "enemies_remaining": 1,
    }


class CombatValidatorTests(unittest.TestCase):
    def test_valid_payload_matches_server_math(self) -> None:
        result = CombatValidator().validate_and_resolve(
            make_payload(),
            make_state(),
        )

        self.assertEqual(result.damage, 42)
        self.assertEqual(result.target_hp_after, 38)
        self.assertEqual(result.outcome, "IN_PROGRESS")
        self.assertEqual(result.variance, 2)

    def test_forged_damage_is_rejected(self) -> None:
        payload = make_payload(damage=999, hp_after=0)

        with self.assertRaises(CombatValidationError):
            CombatValidator().validate_and_resolve(payload, make_state())

    def test_forged_seed_is_rejected(self) -> None:
        payload = make_payload()
        payload["seed"] = "attacker-chosen-seed"

        with self.assertRaises(CombatValidationError):
            CombatValidator().validate_and_resolve(payload, make_state())

    def test_forged_hp_is_rejected(self) -> None:
        payload = make_payload(hp_after=1)

        with self.assertRaises(CombatValidationError):
            CombatValidator().validate_and_resolve(payload, make_state())


class IdempotencyTests(unittest.TestCase):
    def test_same_action_processes_once_and_replays_cached_result(self) -> None:
        async def scenario() -> None:
            store = IdempotencyStore(ttl_seconds=60)
            calls = 0

            async def producer() -> dict[str, int]:
                nonlocal calls
                calls += 1
                await asyncio.sleep(0.01)
                return {"state": calls}

            request = {"combatId": "c", "action": {"actionId": "a"}}
            first, second = await asyncio.gather(
                store.execute(
                    key="c:a",
                    request=request,
                    producer=producer,
                ),
                store.execute(
                    key="c:a",
                    request=request,
                    producer=producer,
                ),
            )

            self.assertEqual(calls, 1)
            self.assertFalse(first.replayed)
            self.assertTrue(second.replayed)
            self.assertEqual(first.value, second.value)

        asyncio.run(scenario())

    def test_same_key_with_different_payload_is_rejected(self) -> None:
        async def scenario() -> None:
            store = IdempotencyStore(ttl_seconds=60)

            async def producer() -> dict[str, bool]:
                return {"ok": True}

            await store.execute(
                key="c:a",
                request={"value": 1},
                producer=producer,
            )

            with self.assertRaises(IdempotencyConflict):
                await store.execute(
                    key="c:a",
                    request={"value": 2},
                    producer=producer,
                )

        asyncio.run(scenario())


class StreakRewardTests(unittest.TestCase):
    def test_same_day_does_not_increment_and_grants_base(self) -> None:
        now = datetime(2026, 9, 22, 12, tzinfo=timezone.utc)
        profile = GameProfile(
            xp=100,
            coins=50,
            daily_streak=4,
            last_victory_at="2026-09-22T08:00:00Z",
            loot=[],
        )

        result = apply_victory_rewards(
            profile,
            base_xp=20,
            base_coins=10,
            base_loot=[{"itemId": "potion", "qty": 1}],
            now=now,
        )

        self.assertEqual(result.streak, 4)
        self.assertEqual(result.xp_awarded, 20)
        self.assertEqual(result.coins_awarded, 10)
        self.assertEqual(profile.loot, [{"itemId": "potion", "qty": 1}])

    def test_next_day_increments_and_multiplies(self) -> None:
        now = datetime(2026, 9, 23, 12, tzinfo=timezone.utc)
        profile = GameProfile(
            xp=100,
            coins=50,
            daily_streak=4,
            last_victory_at="2026-09-22T12:00:00Z",
            loot=[],
        )

        result = apply_victory_rewards(
            profile,
            base_xp=20,
            base_coins=10,
            now=now,
        )

        self.assertEqual(result.streak, 5)
        self.assertEqual(result.xp_awarded, 40)
        self.assertEqual(result.coins_awarded, 20)

    def test_more_than_48_hours_resets_to_one(self) -> None:
        now = datetime(2026, 9, 25, 12, tzinfo=timezone.utc)
        profile = GameProfile(
            xp=100,
            coins=50,
            daily_streak=7,
            last_victory_at="2026-09-23T11:59:59Z",
            loot=[],
        )

        result = apply_victory_rewards(
            profile,
            base_xp=20,
            base_coins=10,
            now=now,
        )

        self.assertEqual(result.streak, 1)
        self.assertEqual(result.mode, "RESET_48H")


class TmaCombatServiceTests(unittest.TestCase):
    def test_victory_applies_rewards_only_after_validation(self) -> None:
        async def scenario() -> None:
            service = TmaCombatService()
            profile = {
                "xp": 100,
                "coins": 50,
                "daily_streak": 1,
                "last_victory_at": None,
                "loot": [],
            }
            state = make_state()
            state["target"]["hp"] = 42

            payload = make_payload(
                damage=42,
                hp_after=0,
                outcome="VICTORY",
            )

            result = await service.process(
                payload,
                authoritative_state=state,
                profile=profile,
                base_xp=10,
                base_coins=5,
                base_loot=[{"itemId": "potion", "qty": 1}],
                now=datetime(2026, 9, 22, 12, tzinfo=timezone.utc),
            )

            self.assertTrue(result["ok"])
            self.assertEqual(result["resolution"]["outcome"], "VICTORY")
            self.assertEqual(result["rewards"]["dailyStreak"], 1)
            self.assertEqual(profile["xp"], 10)
            self.assertEqual(profile["coins"], 5)

        asyncio.run(scenario())

    def test_service_replays_the_same_victory_without_double_rewards(self) -> None:
        async def scenario() -> None:
            service = TmaCombatService()
            profile = {
                "xp": 0,
                "coins": 0,
                "daily_streak": 0,
                "last_victory_at": None,
                "loot": [],
            }
            state = make_state()
            state["target"]["hp"] = 42
            payload = make_payload(damage=42, hp_after=0, outcome="VICTORY")

            first = await service.process(
                payload,
                authoritative_state=state,
                profile=profile,
                base_xp=10,
                base_coins=5,
                base_loot=[{"itemId": "potion", "qty": 1}],
                now=datetime(2026, 9, 22, 12, tzinfo=timezone.utc),
            )
            second = await service.process(
                payload,
                authoritative_state=state,
                profile=profile,
                base_xp=10,
                base_coins=5,
                base_loot=[{"itemId": "potion", "qty": 1}],
                now=datetime(2026, 9, 22, 12, tzinfo=timezone.utc),
            )

            self.assertFalse(first["replayed"])
            self.assertTrue(second["replayed"])
            self.assertEqual(profile["xp"], 10)
            self.assertEqual(profile["coins"], 5)
            self.assertEqual(profile["loot"], [{"itemId": "potion", "qty": 1}])
            self.assertEqual(state["turn"], 2)
            self.assertEqual(first["serverState"], second["serverState"])

        asyncio.run(scenario())
