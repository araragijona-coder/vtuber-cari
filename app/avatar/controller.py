from __future__ import annotations

from dataclasses import dataclass

from app.brain.contracts import Emotion


@dataclass(frozen=True, slots=True)
class AvatarCommand:
    emotion: Emotion = Emotion.NEUTRAL
    intensity: float = 0.5
    animation: str = "idle"
    speaking: bool = False


class AvatarController:
    """Render-neutral avatar state; no LLM gets direct coordinate control."""

    def __init__(self) -> None:
        self.current = AvatarCommand()

    def apply(self, command: AvatarCommand) -> AvatarCommand:
        intensity = min(1.0, max(0.0, float(command.intensity)))
        self.current = AvatarCommand(command.emotion, intensity, command.animation.strip() or "idle", command.speaking)
        return self.current
