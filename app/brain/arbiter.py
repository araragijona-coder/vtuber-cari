from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum


class IntentKind(StrEnum):
    CHAT = "chat"
    ALERT = "alert"
    PROACTIVE = "proactive"
    IDLE = "idle"


@dataclass(frozen=True, slots=True)
class Intent:
    """A candidate action before response generation or avatar execution."""

    kind: IntentKind
    priority: int
    created_at: float
    key: str
    payload: object | None = None


class IntentArbiter:
    """Select one winner from competing intents deterministically."""

    def __init__(self, *, cooldown: float = 0.0) -> None:
        if cooldown < 0:
            raise ValueError("cooldown must be non-negative")
        self._cooldown = cooldown
        self._last_dispatch = float("-inf")
        self._last_key: str | None = None

    def choose(self, intents: list[Intent], *, now: float, busy: bool = False) -> Intent | None:
        if busy or not intents or now - self._last_dispatch < self._cooldown:
            return None
        valid = [item for item in intents if item.priority >= 0]
        if not valid:
            return None
        winner = min(valid, key=lambda item: (-item.priority, item.created_at, item.key))
        self._last_dispatch = now
        self._last_key = winner.key
        return winner

    @property
    def last_key(self) -> str | None:
        return self._last_key

    def reset(self) -> None:
        self._last_dispatch = float("-inf")
        self._last_key = None
