from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any, ClassVar

from app.brain.event_bus import EventBus, RuntimeEvent


@dataclass(frozen=True, slots=True)
class StudioAction:
    """Validated local action crossing from automation into Studio services."""

    kind: str
    value: str

    _EVENT_NAMES: ClassVar[dict[str, str]] = {
        "chat": "studio_chat_requested",
        "sound": "studio_sound_requested",
        "scene": "studio_scene_requested",
        "overlay": "studio_overlay_requested",
        "music": "studio_music_requested",
        "stream": "studio_stream_requested",
        "recording": "studio_recording_requested",
        "source": "studio_source_requested",
        "volume": "studio_volume_requested",
        "mute": "studio_mute_requested",
        "camera": "studio_camera_requested",
        "avatar": "studio_avatar_requested",
        "expression": "studio_expression_requested",
        "tracking": "studio_tracking_requested",
        "command": "studio_command_requested",
        "voice": "studio_voice_requested",
    }

    def __post_init__(self) -> None:
        kind = self.kind.strip().lower()
        value = self.value.strip()
        if kind not in self._EVENT_NAMES:
            raise ValueError(f"unsupported studio action: {self.kind!r}")
        if not value:
            raise ValueError("studio action value must not be empty")
        object.__setattr__(self, "kind", kind)
        object.__setattr__(self, "value", value)


@dataclass(slots=True)
class StudioActionMetrics:
    received: int = 0
    handled: int = 0
    forwarded: int = 0
    invalid: int = 0
    errors: int = 0
    last_kind: str | None = None


StudioHandler = Callable[[StudioAction], None]


class StudioActionRouter:
    """Translate automation actions into local handlers or provider-neutral events."""

    _EVENT_NAMES = StudioAction._EVENT_NAMES

    @classmethod
    def supported_kinds(cls) -> tuple[str, ...]:
        return tuple(sorted(cls._EVENT_NAMES))

    def __init__(
        self,
        event_bus: EventBus,
        *,
        metrics: StudioActionMetrics | None = None,
    ) -> None:
        self._event_bus = event_bus
        self._handlers: dict[str, StudioHandler] = {}
        self.metrics = metrics or StudioActionMetrics()
        event_bus.subscribe("studio_action", self._on_event)

    def register(self, kind: str, handler: StudioHandler) -> None:
        normalized = kind.strip().lower()
        if normalized not in self._EVENT_NAMES:
            raise ValueError(f"unsupported studio action: {kind!r}")
        self._handlers[normalized] = handler

    def unregister(self, kind: str) -> None:
        self._handlers.pop(kind.strip().lower(), None)

    def dispatch(self, action: StudioAction) -> None:
        self.metrics.received += 1
        self.metrics.last_kind = action.kind

        handler = self._handlers.get(action.kind)
        if handler is not None:
            try:
                handler(action)
            except Exception as exc:  # noqa: BLE001 - backend failure is isolated
                self.metrics.errors += 1
                self._event_bus.publish(
                    RuntimeEvent(
                        "studio_action_error",
                        {
                            "kind": action.kind,
                            "value": action.value,
                            "error": str(exc) or exc.__class__.__name__,
                        },
                    )
                )
                return

            self.metrics.handled += 1
            self._event_bus.publish(
                RuntimeEvent(
                    "studio_action_handled",
                    {"kind": action.kind, "value": action.value},
                )
            )
            return

        self.metrics.forwarded += 1
        self._event_bus.publish(
            RuntimeEvent(
                self._EVENT_NAMES[action.kind],
                {"kind": action.kind, "value": action.value},
            )
        )

    def dispatch_payload(self, payload: dict[str, Any]) -> bool:
        try:
            self.dispatch(
                StudioAction(
                    str(payload.get("kind", "")),
                    str(payload.get("value", "")),
                )
            )
        except (TypeError, ValueError) as exc:
            self.metrics.invalid += 1
            self._event_bus.publish(
                RuntimeEvent(
                    "studio_action_invalid",
                    {"error": str(exc) or exc.__class__.__name__},
                )
            )
            return False
        return True

    def _on_event(self, event: RuntimeEvent) -> None:
        self.dispatch_payload(event.payload)

    def snapshot(self) -> dict[str, int | str | None]:
        return {
            "received": self.metrics.received,
            "handled": self.metrics.handled,
            "forwarded": self.metrics.forwarded,
            "invalid": self.metrics.invalid,
            "errors": self.metrics.errors,
            "last_kind": self.metrics.last_kind,
        }
