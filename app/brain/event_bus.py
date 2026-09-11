from __future__ import annotations

from collections import defaultdict
from collections.abc import Callable
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


class EventBus:
    """Synchronous in-process pub/sub for diagnostics and future adapters."""

    def __init__(self) -> None:
        self._listeners: dict[str, list[Listener]] = defaultdict(list)

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
        listeners = tuple(self._listeners.get(event.name, ()))
        wildcard = tuple(self._listeners.get("*", ()))
        for listener in listeners + wildcard:
            try:
                listener(event)
            except Exception:
                # Observers are never allowed to break the runtime path.
                continue
