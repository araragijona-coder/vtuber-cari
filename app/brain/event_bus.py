from __future__ import annotations

from collections import defaultdict, deque
from collections.abc import Callable, Iterable
from dataclasses import dataclass, field
from time import monotonic
from typing import Any


@dataclass(frozen=True, slots=True)
class RuntimeEvent:
    """Small immutable event emitted by the runtime without coupling modules."""

    name: str
    payload: dict[str, Any] = field(default_factory=dict)
    created_at: float = field(default_factory=monotonic)


Listener = Callable[[RuntimeEvent], None]


class EventJournal:
    """Bounded in-memory event history for diagnostics and deterministic inspection."""

    def __init__(self, *, max_events: int = 256) -> None:
        if max_events < 1:
            raise ValueError("max_events must be positive")
        self.max_events = max_events
        self._events: deque[RuntimeEvent] = deque(maxlen=max_events)

    def record(self, event: RuntimeEvent) -> None:
        self._events.append(event)

    def snapshot(self, *, names: Iterable[str] | None = None) -> tuple[RuntimeEvent, ...]:
        events = tuple(self._events)
        if names is None:
            return events
        allowed = set(names)
        return tuple(event for event in events if event.name in allowed)

    def clear(self) -> None:
        self._events.clear()

    def __len__(self) -> int:
        return len(self._events)


class EventBus:
    """Synchronous in-process pub/sub for diagnostics and future adapters."""

    def __init__(self, *, journal: EventJournal | None = None) -> None:
        self._listeners: dict[str, list[Listener]] = defaultdict(list)
        self.journal = journal

    def subscribe(self, event_name: str, listener: Listener) -> None:
        if not event_name:
            raise ValueError("event_name must not be empty")
        if listener not in self._listeners[event_name]:
            self._listeners[event_name].append(listener)

    def unsubscribe(self, event_name: str, listener: Listener) -> None:
        listeners = self._listeners.get(event_name)
        if not listeners:
            return
        if listener in listeners:
            listeners.remove(listener)

    def publish(self, event: RuntimeEvent) -> None:
        if self.journal is not None:
            self.journal.record(event)
        listeners = tuple(self._listeners.get(event.name, ()))
        wildcard = tuple(self._listeners.get("*", ()))
        for listener in listeners + wildcard:
            try:
                listener(event)
            except Exception:
                # Observers are never allowed to break the runtime path.
                continue
