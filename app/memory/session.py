from __future__ import annotations

from collections import deque
from dataclasses import dataclass
import re
from time import time


@dataclass(frozen=True, slots=True)
class SessionTurn:
    viewer: str
    text: str
    response: str
    timestamp: float


@dataclass(frozen=True, slots=True)
class MemoryItem:
    key: str
    value: str
    source: str = "conversation"
    timestamp: float = 0.0


class SessionMemory:
    """Small bounded working memory; never grows with the whole chat log."""

    def __init__(self, *, max_turns: int = 24, max_items: int = 32) -> None:
        if max_turns < 1 or max_items < 1:
            raise ValueError("memory limits must be positive")
        self.max_turns = max_turns
        self.max_items = max_items
        self._turns: deque[SessionTurn] = deque(maxlen=max_turns)
        self._items: dict[str, MemoryItem] = {}

    def add_turn(self, viewer: str, text: str, response: str, *, timestamp: float | None = None) -> None:
        self._turns.append(SessionTurn(viewer, text.strip(), response.strip(), time() if timestamp is None else timestamp))

    def remember(self, key: str, value: str, *, source: str = "conversation", timestamp: float | None = None) -> None:
        normalized_key = self._normalize_key(key)
        normalized_value = value.strip()
        if not normalized_key or not normalized_value:
            return
        self._items[normalized_key] = MemoryItem(
            normalized_key, normalized_value, source, time() if timestamp is None else timestamp
        )
        while len(self._items) > self.max_items:
            oldest_key = min(self._items, key=lambda item_key: self._items[item_key].timestamp)
            del self._items[oldest_key]

    def recall(self, key: str) -> MemoryItem | None:
        return self._items.get(self._normalize_key(key))

    def recent_turns(self, limit: int = 8) -> tuple[SessionTurn, ...]:
        if limit < 1:
            return ()
        return tuple(self._turns)[-limit:]

    def remembered(self) -> tuple[MemoryItem, ...]:
        return tuple(sorted(self._items.values(), key=lambda item: item.timestamp))

    def context(self, *, turn_limit: int = 6) -> dict[str, object]:
        """Return provider-neutral context; callers decide whether to send it to an LLM."""
        return {
            "recent_turns": self.recent_turns(turn_limit),
            "remembered": self.remembered(),
        }

    @staticmethod
    def _normalize_key(value: str) -> str:
        return re.sub(r"\s+", " ", value.strip().lower())
