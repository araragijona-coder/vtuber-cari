from __future__ import annotations

import copy
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
from collections.abc import MutableMapping
from typing import Any


@dataclass(slots=True)
class GameProfile:
    xp: int = 0
    coins: int = 0
    daily_streak: int = 0
    last_victory_at: str | None = None
    loot: list[Any] = field(default_factory=list)


@dataclass(frozen=True, slots=True)
class DailyRewardConfig:
    """Server-owned reward configuration.

    The contract requires a multiplier for the next UTC day but does not
    specify its numeric value, so 2x is the module default and remains
    configurable.
    """

    next_day_multiplier: Decimal = Decimal("2")
    reset_after: timedelta = timedelta(hours=48)

    def __post_init__(self) -> None:
        if self.next_day_multiplier <= 1:
            raise ValueError("next_day_multiplier must be greater than 1")
        if self.reset_after <= timedelta(0):
            raise ValueError("reset_after must be positive")


@dataclass(frozen=True, slots=True)
class RewardResult:
    streak: int
    mode: str
    xp_awarded: int
    coins_awarded: int
    loot_awarded: list[Any]
    multiplier: str
    last_victory_at: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "dailyStreak": self.streak,
            "mode": self.mode,
            "xpAwarded": self.xp_awarded,
            "coinsAwarded": self.coins_awarded,
            "lootAwarded": copy.deepcopy(self.loot_awarded),
            "multiplier": self.multiplier,
            "lastVictoryAt": self.last_victory_at,
        }


def apply_victory_rewards(
    profile: GameProfile | MutableMapping[str, Any] | Any,
    *,
    base_xp: int,
    base_coins: int,
    base_loot: list[Any] | tuple[Any, ...] | None = None,
    now: datetime | None = None,
    config: DailyRewardConfig | None = None,
) -> RewardResult:
    """Apply rewards after a validated VICTORY.

    UTC calendar days determine the streak:
    - first victory -> streak 1;
    - same UTC date -> no increment, base XP/coins;
    - following UTC date -> +1 streak and configured multiplier;
    - more than 48h -> reset to 1.
    A calendar gap larger than one day also resets, preventing an untracked
    day from silently extending a streak.
    """

    if not isinstance(base_xp, int) or isinstance(base_xp, bool) or base_xp < 0:
        raise ValueError("base_xp must be a non-negative integer")
    if not isinstance(base_coins, int) or isinstance(base_coins, bool) or base_coins < 0:
        raise ValueError("base_coins must be a non-negative integer")

    settings = config or DailyRewardConfig()
    current = _ensure_utc(now or datetime.now(timezone.utc))
    current_iso = _to_storage_iso(current)

    previous_raw = _profile_get(profile, "last_victory_at", None)
    previous = _parse_utc(previous_raw) if previous_raw is not None else None
    previous_streak = _profile_get(profile, "daily_streak", 0)

    if not isinstance(previous_streak, int) or isinstance(previous_streak, bool) or previous_streak < 0:
        raise ValueError("profile.daily_streak must be a non-negative integer")

    if previous is None:
        streak = 1
        mode = "FIRST_VICTORY"
        multiplier = Decimal("1")
    else:
        elapsed = current - previous
        if elapsed < timedelta(0):
            raise ValueError("current victory time cannot precede last_victory_at")

        if elapsed > settings.reset_after:
            streak = 1
            mode = "RESET_48H"
            multiplier = Decimal("1")
        elif previous.date() == current.date():
            streak = max(1, previous_streak)
            mode = "SAME_DAY"
            multiplier = Decimal("1")
        elif previous.date() + timedelta(days=1) == current.date():
            streak = max(1, previous_streak) + 1
            mode = "NEXT_DAY"
            multiplier = settings.next_day_multiplier
        else:
            streak = 1
            mode = "RESET_CALENDAR_GAP"
            multiplier = Decimal("1")

    xp_awarded = _scaled_integer(base_xp, multiplier)
    coins_awarded = _scaled_integer(base_coins, multiplier)
    loot_awarded = copy.deepcopy(list(base_loot or ()))

    current_xp = _profile_get(profile, "xp", 0)
    current_coins = _profile_get(profile, "coins", 0)
    if not isinstance(current_xp, int) or isinstance(current_xp, bool) or current_xp < 0:
        raise ValueError("profile.xp must be a non-negative integer")
    if not isinstance(current_coins, int) or isinstance(current_coins, bool) or current_coins < 0:
        raise ValueError("profile.coins must be a non-negative integer")

    _profile_set(profile, "xp", current_xp + xp_awarded)
    _profile_set(profile, "coins", current_coins + coins_awarded)
    _profile_set(profile, "daily_streak", streak)
    _profile_set(profile, "last_victory_at", current_iso)

    loot = _profile_get(profile, "loot", None)
    if loot is None:
        loot = []
        _profile_set(profile, "loot", loot)
    if not isinstance(loot, list):
        raise ValueError("profile.loot must be a list")
    loot.extend(copy.deepcopy(loot_awarded))

    return RewardResult(
        streak=streak,
        mode=mode,
        xp_awarded=xp_awarded,
        coins_awarded=coins_awarded,
        loot_awarded=loot_awarded,
        multiplier=str(multiplier),
        last_victory_at=current_iso,
    )


def _scaled_integer(value: int, multiplier: Decimal) -> int:
    scaled = (Decimal(value) * multiplier).quantize(
        Decimal("1"),
        rounding=ROUND_HALF_UP,
    )
    return int(scaled)


def _profile_get(profile: Any, key: str, default: Any) -> Any:
    if isinstance(profile, MutableMapping):
        return profile.get(key, default)
    return getattr(profile, key, default)


def _profile_set(profile: Any, key: str, value: Any) -> None:
    if isinstance(profile, MutableMapping):
        profile[key] = value
    else:
        setattr(profile, key, value)


def _parse_utc(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        return _ensure_utc(value)

    if isinstance(value, str) and value.strip():
        raw = value.strip()
        if raw.endswith("Z"):
            raw = raw[:-1] + "+00:00"
        try:
            return _ensure_utc(datetime.fromisoformat(raw))
        except ValueError as exc:
            raise ValueError(
                "last_victory_at must be a valid ISO-8601 timestamp"
            ) from exc

    raise ValueError(
        "last_victory_at must be a datetime or ISO-8601 string"
    )


def _ensure_utc(value: datetime) -> datetime:
    if value.tzinfo is None or value.utcoffset() is None:
        raise ValueError("datetime values must be timezone-aware")
    return value.astimezone(timezone.utc)


def _to_storage_iso(value: datetime) -> str:
    return _ensure_utc(value).isoformat().replace("+00:00", "Z")
