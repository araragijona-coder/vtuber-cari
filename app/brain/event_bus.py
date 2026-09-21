from __future__ import annotations

from collections import defaultdict, deque
from collections.abc import Callable, Iterable
from dataclasses import dataclass, field
from threading import RLock
from time import monotonic
from typing import Any


@dataclass(frozen=True, slots=True)
class RuntimeEvent:
    """Small immutable event emitted by the runtime without coupling modules."""

    name: str
    payload: dict[str, Any] = field(default_factory=dict)
    created_at: float = field(default_factory=monotonic)


@dataclass(slots=True)
class EventBusMetrics:
    published: int = 0
    delivered: int = 0
    listener_errors: int = 0


Listener = Callable[[RuntimeEvent], None]


class EventJournal:
    """Bounded in-memory event history safe for the threaded local runtime."""

    def __init__(self, *, max_events: int = 256) -> None:
        if max_events < 1:
            raise ValueError("max_events must be positive")
        self.max_events = max_events
        self._events: deque[RuntimeEvent] = deque(maxlen=max_events)
        self._lock = RLock()

    def record(self, event: RuntimeEvent) -> None:
        with self._lock:
            self._events.append(event)

    def snapshot(self, *, names: Iterable[str] | None = None) -> tuple[RuntimeEvent, ...]:
        with self._lock:
            events = tuple(self._events)
        if names is None:
            return events
        allowed = set(names)
        return tuple(event for event in events if event.name in allowed)

    def clear(self) -> None:
        with self._lock:
            self._events.clear()

    def __len__(self) -> int:
        with self._lock:
            return len(self._events)


class EventBus:
    """Synchronous, deterministic and thread-safe in-process pub/sub.

    Listeners execute outside the internal lock. This keeps the bus re-entrant
    and lets worker threads publish without blocking subscription changes.
    """

    def __init__(self, *, journal: EventJournal | None = None) -> None:
        self._listeners: dict[str, list[Listener]] = defaultdict(list)
        self._lock = RLock()
        self.journal = journal
        self.metrics = EventBusMetrics()

    def subscribe(self, event_name: str, listener: Listener) -> None:
        if not event_name.strip():
            raise ValueError("event_name must not be empty")
        with self._lock:
            if listener not in self._listeners[event_name]:
                self._listeners[event_name].append(listener)

    def unsubscribe(self, event_name: str, listener: Listener) -> None:
        with self._lock:
            listeners = self._listeners.get(event_name)
            if not listeners:
                return
            if listener in listeners:
                listeners.remove(listener)

    def publish(self, event: RuntimeEvent) -> None:
        if not event.name.strip():
            raise ValueError("event.name must not be empty")

        if self.journal is not None:
            self.journal.record(event)

        with self._lock:
            self.metrics.published += 1
            listeners = tuple(self._listeners.get(event.name, ()))
            wildcard = tuple(self._listeners.get("*", ()))

        for listener in listeners + wildcard:
            try:
                listener(event)
            except Exception:
                with self._lock:
                    self.metrics.listener_errors += 1
                continue
            with self._lock:
                self.metrics.delivered += 1

    def listeners(self, event_name: str) -> int:
        with self._lock:
            return len(self._listeners.get(event_name, ()))

    def snapshot(self) -> dict[str, int]:
        with self._lock:
            return {
                "published": self.metrics.published,
                "delivered": self.metrics.delivered,
                "listener_errors": self.metrics.listener_errors,
            }
