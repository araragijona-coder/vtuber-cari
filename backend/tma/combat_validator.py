from __future__ import annotations

import hashlib
from dataclasses import dataclass
from decimal import Decimal, ROUND_FLOOR
from typing import Any, Mapping


class CombatValidationError(ValueError):
    """Raised when a client combat payload fails server-side validation."""


@dataclass(frozen=True, slots=True)
class CombatRules:
    """Server-owned deterministic combat rules."""

    normal_multiplier: Decimal = Decimal("1")
    critical_multiplier: Decimal = Decimal("1.5")
    variance_min: int = 0
    variance_max: int = 5
    require_server_seed: bool = True

    def __post_init__(self) -> None:
        if self.normal_multiplier <= 0:
            raise ValueError("normal_multiplier must be positive")
        if self.critical_multiplier < self.normal_multiplier:
            raise ValueError("critical_multiplier must be >= normal_multiplier")
        if self.variance_min < 0 or self.variance_max < self.variance_min:
            raise ValueError("invalid variance range")


@dataclass(frozen=True, slots=True)
class AuthoritativeResolution:
    combat_id: str
    action_id: str
    turn: int
    damage: int
    target_hp_before: int
    target_hp_after: int
    is_critical: bool
    variance: int
    outcome: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "combatId": self.combat_id,
            "actionId": self.action_id,
            "turn": self.turn,
            "damage": self.damage,
            "targetHpBefore": self.target_hp_before,
            "targetHpAfter": self.target_hp_after,
            "isCritical": self.is_critical,
            "variance": self.variance,
            "outcome": self.outcome,
        }


class CombatValidator:
    """Validate client claims against a server-authoritative combat snapshot.

    Client contract:

        {
            "combatId": str,
            "state": {"turn": int, ...},
            "action": {
                "actionId": str,
                "type": str,
                "attackerId": str,
                "targetId": str
            },
            "resolution": {
                "damage": int,
                "targetHpBefore": int,
                "targetHpAfter": int,
                "isCritical": bool,
                "variance": int,
                "outcome": str
            },
            "seed": int | str
        }

    The client state and resolution are claims. Attack, HP, turn, target and
    seed authority come from authoritative_state instead.
    """

    _TOP_LEVEL_KEYS = {"combatId", "state", "action", "resolution", "seed"}

    def __init__(self, rules: CombatRules | None = None) -> None:
        self.rules = rules or CombatRules()

    def validate_and_resolve(
        self,
        payload: Mapping[str, Any],
        authoritative_state: Mapping[str, Any],
    ) -> AuthoritativeResolution:
        self._require_mapping(payload, "payload")
        self._require_mapping(authoritative_state, "authoritative_state")

        if set(payload) != self._TOP_LEVEL_KEYS:
            raise CombatValidationError(
                "payload must contain exactly combatId, state, action, resolution and seed"
            )

        combat_id = self._required_str(payload, "combatId")
        server_combat_id = self._required_str(authoritative_state, "combatId")
        if combat_id != server_combat_id:
            raise CombatValidationError("combatId does not match the server combat")

        client_state = self._require_mapping(payload["state"], "state")
        action = self._require_mapping(payload["action"], "action")
        resolution = self._require_mapping(payload["resolution"], "resolution")

        turn = self._required_int(authoritative_state, "turn", minimum=1)
        client_turn = client_state.get("turn", turn)
        if (
            not isinstance(client_turn, int)
            or isinstance(client_turn, bool)
            or client_turn != turn
        ):
            raise CombatValidationError("state.turn does not match the authoritative turn")

        attacker = self._require_mapping(
            authoritative_state.get("attacker"),
            "authoritative_state.attacker",
        )
        target = self._require_mapping(
            authoritative_state.get("target"),
            "authoritative_state.target",
        )

        attacker_id = self._required_str(
            attacker, "id", "authoritative_state.attacker.id"
        )
        target_id = self._required_str(
            target, "id", "authoritative_state.target.id"
        )

        action_id = self._extract_action_id(payload, action)
        action_type = self._required_str(action, "type", "action.type")
        client_attacker_id = self._required_str(
            action, "attackerId", "action.attackerId"
        )
        client_target_id = self._required_str(
            action, "targetId", "action.targetId"
        )

        if client_attacker_id != attacker_id:
            raise CombatValidationError(
                "action.attackerId is not the server-selected attacker"
            )
        if client_target_id != target_id:
            raise CombatValidationError(
                "action.targetId is not the server-selected target"
            )

        allowed_actions = authoritative_state.get("allowed_action_types")
        if allowed_actions is not None:
            if not isinstance(allowed_actions, (list, tuple, set)):
                raise CombatValidationError(
                    "authoritative_state.allowed_action_types must be a sequence"
                )
            if action_type not in allowed_actions:
                raise CombatValidationError(
                    "action.type is not allowed for this combat state"
                )

        action_turn = action.get("turn")
        if action_turn is not None and (
            not isinstance(action_turn, int)
            or isinstance(action_turn, bool)
            or action_turn != turn
        ):
            raise CombatValidationError(
                "action.turn does not match the authoritative turn"
            )

        raw_seed = payload["seed"]
        if not isinstance(raw_seed, (str, int)) or isinstance(raw_seed, bool):
            raise CombatValidationError("seed must be a string or integer")

        if self.rules.require_server_seed:
            if "seed" not in authoritative_state:
                raise CombatValidationError(
                    "server combat state has no authoritative seed"
                )
            if raw_seed != authoritative_state["seed"]:
                raise CombatValidationError(
                    "client seed does not match the authoritative seed"
                )

        attack = self._positive_int(
            attacker.get("attack"),
            "authoritative_state.attacker.attack",
        )
        target_hp_before = self._nonnegative_int(
            target.get("hp"),
            "authoritative_state.target.hp",
        )
        target_max_hp = self._positive_int(
            target.get("max_hp"),
            "authoritative_state.target.max_hp",
        )
        if target_hp_before > target_max_hp:
            raise CombatValidationError("authoritative target HP exceeds max_hp")

        is_critical = action_type == "critical_attack"
        variance = self._derive_variance(
            seed=raw_seed,
            combat_id=combat_id,
            turn=turn,
            action_id=action_id,
            minimum=self.rules.variance_min,
            maximum=self.rules.variance_max,
        )

        multiplier = (
            self.rules.critical_multiplier
            if is_critical
            else self.rules.normal_multiplier
        )
        raw_damage = Decimal(attack) * multiplier + Decimal(variance)
        damage = int(raw_damage.to_integral_value(rounding=ROUND_FLOOR))

        damage_cap = int(
            (
                Decimal(attack) * self.rules.critical_multiplier
                + Decimal(self.rules.variance_max)
            ).to_integral_value(rounding=ROUND_FLOOR)
        )
        if damage < 0 or damage > damage_cap:
            raise CombatValidationError(
                "authoritative damage exceeded the configured damage ceiling"
            )

        target_hp_after = max(0, target_hp_before - damage)

        enemies_remaining = authoritative_state.get("enemies_remaining")
        if enemies_remaining is None:
            victory = target_hp_after == 0
        else:
            enemies_remaining_value = self._nonnegative_int(
                enemies_remaining,
                "authoritative_state.enemies_remaining",
            )
            victory = target_hp_after == 0 and enemies_remaining_value <= 1

        outcome = "VICTORY" if victory else "IN_PROGRESS"

        expected_resolution = {
            "damage": damage,
            "targetHpBefore": target_hp_before,
            "targetHpAfter": target_hp_after,
            "isCritical": is_critical,
            "variance": variance,
            "outcome": outcome,
        }
        self._compare_resolution(resolution, expected_resolution)

        return AuthoritativeResolution(
            combat_id=combat_id,
            action_id=action_id,
            turn=turn,
            damage=damage,
            target_hp_before=target_hp_before,
            target_hp_after=target_hp_after,
            is_critical=is_critical,
            variance=variance,
            outcome=outcome,
        )

    @staticmethod
    def _compare_resolution(
        client_resolution: Mapping[str, Any],
        expected: Mapping[str, Any],
    ) -> None:
        required = set(expected)
        if set(client_resolution) != required:
            raise CombatValidationError(
                "resolution must contain exactly: "
                + ", ".join(sorted(required))
            )

        for key, expected_value in expected.items():
            if client_resolution.get(key) != expected_value:
                raise CombatValidationError(
                    f"resolution.{key} does not match the server calculation"
                )

    @classmethod
    def _extract_action_id(
        cls,
        payload: Mapping[str, Any],
        action: Mapping[str, Any],
    ) -> str:
        for key in ("actionId", "action_id"):
            value = action.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()

        state = payload.get("state")
        if isinstance(state, Mapping):
            turn = state.get("turn")
            if isinstance(turn, int) and not isinstance(turn, bool) and turn > 0:
                return f"turn-{turn}"

        raise CombatValidationError(
            "action requires actionId or a positive state.turn"
        )

    @staticmethod
    def _derive_variance(
        *,
        seed: str | int,
        combat_id: str,
        turn: int,
        action_id: str,
        minimum: int,
        maximum: int,
    ) -> int:
        token = f"{seed}|{combat_id}|{turn}|{action_id}".encode("utf-8")
        value = int.from_bytes(hashlib.sha256(token).digest()[:8], "big")
        return minimum + (value % (maximum - minimum + 1))

    @staticmethod
    def _require_mapping(value: Any, name: str) -> Mapping[str, Any]:
        if not isinstance(value, Mapping):
            raise CombatValidationError(f"{name} must be an object")
        return value

    @staticmethod
    def _required_str(
        mapping: Mapping[str, Any],
        key: str,
        name: str | None = None,
    ) -> str:
        value = mapping.get(key)
        if not isinstance(value, str) or not value.strip():
            raise CombatValidationError(
                f"{name or key} must be a non-empty string"
            )
        return value.strip()

    @staticmethod
    def _required_int(
        mapping: Mapping[str, Any],
        key: str,
        minimum: int | None = None,
    ) -> int:
        value = mapping.get(key)
        if not isinstance(value, int) or isinstance(value, bool):
            raise CombatValidationError(f"{key} must be an integer")
        if minimum is not None and value < minimum:
            raise CombatValidationError(f"{key} must be >= {minimum}")
        return value

    @staticmethod
    def _positive_int(value: Any, name: str) -> int:
        if not isinstance(value, int) or isinstance(value, bool) or value <= 0:
            raise CombatValidationError(f"{name} must be a positive integer")
        return value

    @staticmethod
    def _nonnegative_int(value: Any, name: str) -> int:
        if not isinstance(value, int) or isinstance(value, bool) or value < 0:
            raise CombatValidationError(
                f"{name} must be a non-negative integer"
            )
        return value
