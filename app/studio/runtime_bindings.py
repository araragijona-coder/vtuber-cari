from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

from app.brain.event_bus import EventBus, RuntimeEvent
from app.studio.actions import StudioAction, StudioActionRouter


Handler = Callable[[str], None]


@dataclass(slots=True)
class StudioRuntimeMetrics:
    dispatched: int = 0
    handled: int = 0
    errors: int = 0
    last_action: str | None = None


class StudioRuntimeBindings:
    """Bind Studio actions to local subsystems without platform coupling."""

    def __init__(self, event_bus: EventBus, *, metrics: StudioRuntimeMetrics | None = None) -> None:
        self.event_bus = event_bus
        self.metrics = metrics or StudioRuntimeMetrics()
        self.router = StudioActionRouter(event_bus)

    def register(self, kind: str, handler: Handler) -> None:
        self.router.register(kind, self._wrap(kind, handler))

    def unregister(self, kind: str) -> None:
        self.router.unregister(kind)

    def _wrap(self, kind: str, handler: Handler) -> Handler:
        normalized = kind.strip().lower()

        def consume(action: StudioAction) -> None:
            self.metrics.dispatched += 1
            self.metrics.last_action = normalized
            try:
                handler(action.value)
            except Exception as exc:  # noqa: BLE001 - backend failure is isolated
                self.metrics.errors += 1
                self.event_bus.publish(
                    RuntimeEvent(
                        "studio_backend_error",
                        {"kind": normalized, "value": action.value, "error": str(exc) or exc.__class__.__name__},
                    )
                )
                return
            self.metrics.handled += 1
            self.event_bus.publish(
                RuntimeEvent("studio_action_handled", {"kind": normalized, "value": action.value})
            )

        return consume

    def snapshot(self) -> dict[str, int | str | None]:
        return {
            "dispatched": self.metrics.dispatched,
            "handled": self.metrics.handled,
            "errors": self.metrics.errors,
            "last_action": self.metrics.last_action,
        }
