from __future__ import annotations

from app.avatar.controller import AvatarCommand
from app.brain.contracts import Emotion
from app.pipeline.runtime import LocalPipeline
from app.twitch.automation import AutomationAction


class LocalCariActionHandler:
    """Execute the safe local actions EventSub automation can request."""

    def __init__(self, pipeline: LocalPipeline) -> None:
        self.pipeline = pipeline

    def __call__(self, action: AutomationAction) -> None:
        kind = action.kind.strip().lower()
        value = action.value.strip()
        if kind == "avatar":
            self._avatar(value)
        elif kind in {"voice", "speak", "tts"}:
            self.pipeline.speak_manual(value)

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
