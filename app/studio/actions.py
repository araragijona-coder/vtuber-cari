from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from app.brain.event_bus import EventBus, RuntimeEvent


@dataclass(frozen=True, slots=True)
class StudioAction:
    """Validated local action crossing from automation into Studio services."""

    kind: str
    value: str

    def __post_init__(self) -> None:
        kind = self.kind.strip().lower()
        value = self.value.strip()
        if kind not in {"chat", "sound", "scene", "overlay", "music"}:
            raise ValueError(f"unsupported studio action: {self.kind!r}")
        if not value:
            raise ValueError("studio action value must not be empty")
        object.__setattr__(self, "kind", kind)
        object.__setattr__(self, "value", value)


StudioHandler = Callable[[StudioAction], None]


class StudioActionRouter:
    """Translate generic automation actions into stable runtime events or handlers.

    Twitch and other adapters only emit ``studio_action``. The router keeps the
    runtime contract platform-neutral so native scene/audio/output backends can
    subscribe without depending on TwitchIO.
    """

    _EVENT_NAMES = {
        "chat": "studio_chat_requested",
        "sound": "studio_sound_requested",
        "scene": "studio_scene_requested",
        "overlay": "studio_overlay_requested",
        "music": "studio_music_requested",
    }

    def __init__(self, event_bus: EventBus) -> None:
        self._event_bus = event_bus
        self._handlers: dict[str, StudioHandler] = {}
        event_bus.subscribe("studio_action", self._on_event)

    def register(self, kind: str, handler: StudioHandler) -> None:
        normalized = kind.strip().lower()
        if normalized not in self._EVENT_NAMES:
            raise ValueError(f"unsupported studio action: {kind!r}")
        self._handlers[normalized] = handler

    def unregister(self, kind: str) -> None:
        self._handlers.pop(kind.strip().lower(), None)

    def dispatch(self, action: StudioAction) -> None:
        handler = self._handlers.get(action.kind)
        if handler is not None:
            try:
                handler(action)
            except Exception as exc:  # noqa: BLE001 - an adapter must not break the runtime bus
                self._event_bus.publish(
                    RuntimeEvent(
                        "studio_action_error",
                        {"kind": action.kind, "value": action.value, "error": str(exc) or exc.__class__.__name__},
                    )
                )
            return

        self._event_bus.publish(
            RuntimeEvent(
                self._EVENT_NAMES[action.kind],
                {"kind": action.kind, "value": action.value},
            )
        )

    def _on_event(self, event: RuntimeEvent) -> None:
        try:
            payload: dict[str, Any] = event.payload
            self.dispatch(StudioAction(str(payload.get("kind", "")), str(payload.get("value", ""))))
        except (TypeError, ValueError) as exc:
            self._event_bus.publish(RuntimeEvent("studio_action_invalid", {"error": str(exc)}))
