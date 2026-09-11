from __future__ import annotations

from dataclasses import dataclass, field
from time import monotonic

from app.voice.director import VoiceRequest


@dataclass(frozen=True, slots=True)
class VoiceItem:
    request: VoiceRequest
    priority: int = 0
    key: str = ""
    created_at: float = field(default_factory=monotonic)


class VoiceArbiter:
    """Small deterministic speech queue: one utterance owns the voice floor at a time."""

    def __init__(self, *, max_items: int = 8) -> None:
        if max_items < 1:
            raise ValueError("max_items must be positive")
        self.max_items = max_items
        self._items: list[VoiceItem] = []
        self._active: VoiceItem | None = None

    @property
    def busy(self) -> bool:
        return self._active is not None

    def enqueue(self, item: VoiceItem) -> bool:
        """Queue an utterance, coalescing an existing item with the same non-empty key."""
        if item.key:
            self._items = [queued for queued in self._items if queued.key != item.key]
        if len(self._items) >= self.max_items:
            lowest = min(range(len(self._items)), key=lambda i: (self._items[i].priority, -self._items[i].created_at))
            if self._items[lowest].priority > item.priority:
                return False
            self._items.pop(lowest)
        self._items.append(item)
        return True

    def start_next(self) -> VoiceItem | None:
        if self._active is not None or not self._items:
            return None
        index = max(range(len(self._items)), key=lambda i: (self._items[i].priority, -self._items[i].created_at))
        self._active = self._items.pop(index)
        return self._active

    def finish(self) -> VoiceItem | None:
        finished = self._active
        self._active = None
        return finished

    def clear(self) -> None:
        self._items.clear()
        self._active = None

    def pending(self) -> int:
        return len(self._items)
