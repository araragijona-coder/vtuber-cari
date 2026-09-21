from __future__ import annotations

from app.avatar.controller import AvatarCommand
from app.brain.contracts import Emotion
from app.brain.event_bus import RuntimeEvent
from app.pipeline.runtime import LocalPipeline
from app.twitch.automation import AutomationAction


class LocalCariActionHandler:
    """Execute local Cari actions and forward Studio actions to the shared bus."""

    _FORWARDED_ACTIONS = {
        "chat",
        "sound",
        "scene",
        "overlay",
        "music",
        "stream",
        "recording",
        "source",
        "volume",
        "mute",
        "camera",
        "expression",
        "tracking",
        "command",
    }

    def __init__(self, pipeline: LocalPipeline) -> None:
        self.pipeline = pipeline

    def __call__(self, action: AutomationAction) -> None:
        kind = action.kind.strip().lower()
        value = action.value.strip()

        if kind == "avatar":
            self._avatar(value)
            return

        if kind in {"voice", "speak", "tts"}:
            self.pipeline.speak_manual(value)
            return

        if kind in self._FORWARDED_ACTIONS:
            self.pipeline.event_bus.publish(
                RuntimeEvent("studio_action", {"kind": kind, "value": value})
            )
            return

        self.pipeline.event_bus.publish(
            RuntimeEvent(
                "automation_action_unhandled",
                {"kind": kind, "value": value},
            )
        )

    def _avatar(self, value: str) -> None:
        if not value:
            return

        if value.startswith("emotion:"):
            name = value.split(":", 1)[1].strip().lower()
            try:
                emotion = Emotion(name)
            except ValueError:
                emotion = Emotion.NEUTRAL
            self.pipeline.avatar.apply(AvatarCommand(emotion=emotion))
            return

        self.pipeline.avatar.apply(AvatarCommand(animation=value))
