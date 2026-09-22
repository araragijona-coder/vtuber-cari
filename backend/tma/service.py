from __future__ import annotations

import copy
from datetime import datetime
from typing import Any, Mapping

from .combat_validator import CombatValidator
from .idempotency import IdempotencyStore
from .streak_rewards import DailyRewardConfig, apply_victory_rewards


class TmaCombatService:
    """Async orchestration for server-authoritative combat."""

    def __init__(
        self,
        *,
        validator: CombatValidator | None = None,
        idempotency: IdempotencyStore | None = None,
        reward_config: DailyRewardConfig | None = None,
    ) -> None:
        self.validator = validator or CombatValidator()
        self.idempotency = idempotency or IdempotencyStore()
        self.reward_config = reward_config

    async def process(
        self,
        payload: Mapping[str, Any],
        *,
        authoritative_state: dict[str, Any],
        profile: Any,
        base_xp: int,
        base_coins: int,
        base_loot: list[Any] | tuple[Any, ...] | None = None,
        now: datetime | None = None,
    ) -> dict[str, Any]:
        combat_id = payload.get("combatId")
        action = payload.get("action")
        state = payload.get("state")

        action_id = None
        if isinstance(action, Mapping):
            action_id = action.get("actionId") or action.get("action_id")

        turn = state.get("turn") if isinstance(state, Mapping) else None
        key = self.idempotency.action_identity(
            combat_id=combat_id,
            action_id=action_id,
            turn=turn,
        )

        async def producer() -> dict[str, Any]:
            resolution = self.validator.validate_and_resolve(
                payload=payload,
                authoritative_state=authoritative_state,
            )

            target = authoritative_state["target"]
            target["hp"] = resolution.target_hp_after
            authoritative_state["turn"] = resolution.turn + 1

            reward_payload: dict[str, Any] | None = None
            if resolution.outcome == "VICTORY":
                reward = apply_victory_rewards(
                    profile,
                    base_xp=base_xp,
                    base_coins=base_coins,
                    base_loot=base_loot,
                    now=now,
                    config=self.reward_config,
                )
                reward_payload = reward.to_dict()

            return {
                "ok": True,
                "combatId": resolution.combat_id,
                "actionId": resolution.action_id,
                "resolution": resolution.to_dict(),
                "serverState": copy.deepcopy(authoritative_state),
                "rewards": reward_payload,
            }

        result = await self.idempotency.execute(
            key=key,
            request=payload,
            producer=producer,
        )

        response = copy.deepcopy(result.value)
        response["replayed"] = result.replayed
        return response
