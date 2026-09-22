from __future__ import annotations

import asyncio
import unittest

from aiohttp.test_utils import TestClient, TestServer

from backend.tma import TmaCombatService, create_combat_routes


def make_payload(*, damage: int = 42, hp_after: int = 38) -> dict:
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
            "variance": 2,
            "outcome": "IN_PROGRESS",
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


class AiohttpCombatRouteTests(unittest.TestCase):
    def run_async(self, coroutine):
        return asyncio.run(coroutine)

    async def _request(
        self,
        payload: dict | None,
        *,
        init_data: str | None = "valid-init-data",
    ):
        service = TmaCombatService()
        profile = {
            "xp": 0,
            "coins": 0,
            "daily_streak": 0,
            "last_victory_at": None,
            "loot": [],
        }
        contexts = {
            "player-1": {
                "authoritative_state": make_state(),
                "profile": profile,
                "base_xp": 10,
                "base_coins": 5,
                "base_loot": [],
            }
        }

        def verify_telegram_init_data(value: str):
            if value != "valid-init-data":
                return None
            return {"user_id": "player-1"}

        def get_game_context(player_id: str):
            return contexts[player_id]

        from aiohttp import web

        app = web.Application()
        app.add_routes(
            create_combat_routes(
                service=service,
                verify_telegram_init_data=verify_telegram_init_data,
                get_game_context=get_game_context,
            )
        )

        async with TestClient(TestServer(app)) as client:
            headers = {}
            if init_data is not None:
                headers["X-Telegram-Init-Data"] = init_data
            response = await client.post(
                "/api/combat/action",
                json=payload,
                headers=headers,
            )
            return response, client, contexts

    def test_missing_telegram_init_data_is_401(self) -> None:
        async def scenario() -> None:
            response, _client, _contexts = await self._request(
                make_payload(),
                init_data=None,
            )
            self.assertEqual(response.status, 401)

        self.run_async(scenario())

    def test_valid_action_returns_authoritative_state(self) -> None:
        async def scenario() -> None:
            response, _client, _contexts = await self._request(make_payload())
            body = await response.json()

            self.assertEqual(response.status, 200)
            self.assertTrue(body["ok"])
            self.assertFalse(body["replayed"])
            self.assertEqual(body["resolution"]["damage"], 42)
            self.assertEqual(body["serverState"]["target"]["hp"], 38)

        self.run_async(scenario())

    def test_validation_failure_is_400(self) -> None:
        async def scenario() -> None:
            payload = make_payload(damage=999, hp_after=0)
            response, _client, _contexts = await self._request(payload)
            body = await response.json()

            self.assertEqual(response.status, 400)
            self.assertEqual(body["error"], "combat_validation_failed")

        self.run_async(scenario())

    def test_same_key_with_changed_payload_is_409(self) -> None:
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

            def verify_telegram_init_data(_value: str):
                return {"user_id": "player-1"}

            def get_game_context(_player_id: str):
                return {
                    "authoritative_state": state,
                    "profile": profile,
                    "base_xp": 10,
                    "base_coins": 5,
                    "base_loot": [],
                }

            from aiohttp import web

            app = web.Application()
            app.add_routes(
                create_combat_routes(
                    service=service,
                    verify_telegram_init_data=verify_telegram_init_data,
                    get_game_context=get_game_context,
                )
            )

            async with TestClient(TestServer(app)) as client:
                headers = {"X-Telegram-Init-Data": "valid"}
                first = await client.post(
                    "/api/combat/action",
                    json=make_payload(),
                    headers=headers,
                )
                self.assertEqual(first.status, 200)

                conflicting = make_payload(damage=41, hp_after=39)
                second = await client.post(
                    "/api/combat/action",
                    json=conflicting,
                    headers=headers,
                )
                body = await second.json()

                self.assertEqual(second.status, 409)
                self.assertEqual(body["error"], "idempotency_conflict")

        self.run_async(scenario())


if __name__ == "__main__":
    unittest.main()
