from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum
from typing import Any, Mapping


class Emotion(StrEnum):
    NEUTRAL = "neutral"
    HAPPY = "happy"
    SAD = "sad"
    ANGRY = "angry"
    SURPRISED = "surprised"
    SHY = "shy"
    AFFECTIONATE = "affectionate"
    PLAYFUL = "playful"


@dataclass(frozen=True, slots=True)
class AIResponse:
    text: str
    emotion: Emotion = Emotion.NEUTRAL
    intensity: float = 0.5
    animation: str = "idle"
    voice: str = "default"
    priority: int = 3
    interruptible: bool = True
    remember: bool = False

    def __post_init__(self) -> None:
        if not isinstance(self.text, str) or not self.text.strip():
            raise ValueError("AIResponse.text must not be empty")
        if not 0 <= self.priority <= 10:
            raise ValueError("priority must be between 0 and 10")
        object.__setattr__(self, "intensity", min(1.0, max(0.0, float(self.intensity))))
        if not self.animation.strip():
            raise ValueError("animation must not be empty")
        if not self.voice.strip():
            raise ValueError("voice must not be empty")

    @classmethod
    def from_mapping(cls, data: Mapping[str, Any]) -> "AIResponse":
        text = data.get("text")
        if not isinstance(text, str):
            raise ValueError("AI response requires string field: text")
        raw_emotion = data.get("emotion", Emotion.NEUTRAL)
        try:
            emotion = raw_emotion if isinstance(raw_emotion, Emotion) else Emotion(str(raw_emotion))
        except ValueError:
            emotion = Emotion.NEUTRAL
        return cls(
            text=text,
            emotion=emotion,
            intensity=float(data.get("intensity", 0.5)),
            animation=str(data.get("animation", "idle")),
            voice=str(data.get("voice", "default")),
            priority=int(data.get("priority", 3)),
            interruptible=bool(data.get("interruptible", True)),
            remember=bool(data.get("remember", False)),
        )
