"""Pure-Python experimental contract for Cari avatar acting.

This module deliberately has no renderer, VRM, audio, or AI dependency. It
turns the documented acting schema into a small validated value object that
future avatar backends can consume.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

Emotion = Literal[
    "neutral", "happy", "sad", "surprised", "angry", "thinking", "excited", "embarrassed"
]
Gaze = Literal["camera", "left", "right", "up", "down", "target"]
Pose = Literal["neutral", "relaxed", "thinking", "greeting", "excited"]
BodyAnimation = Literal["idle", "talk", "think", "wave", "nod", "celebrate"]
FacialExpression = Literal["neutral", "smile", "blink", "surprised", "sad", "angry"]


@dataclass(frozen=True, slots=True)
class AvatarActingState:
    """Validated, renderer-independent acting state for Cari."""

    emotion: Emotion = "neutral"
    gaze: Gaze = "camera"
    head_tilt: float = 0.0
    pose: Pose = "neutral"
    body_animation: BodyAnimation = "idle"
    facial_expression: FacialExpression = "neutral"
    lip_sync: str | None = None

    def __post_init__(self) -> None:
        if not -1.0 <= self.head_tilt <= 1.0:
            raise ValueError("head_tilt must be between -1.0 and 1.0")
        if not self.lip_sync or not self.lip_sync.strip():
            object.__setattr__(self, "lip_sync", None)

    def with_updates(self, **changes: object) -> "AvatarActingState":
        """Return a validated state without mutating the current state."""
        allowed = {
            "emotion",
            "gaze",
            "head_tilt",
            "pose",
            "body_animation",
            "facial_expression",
            "lip_sync",
        }
        unknown = set(changes) - allowed
        if unknown:
            raise ValueError(f"unknown acting fields: {sorted(unknown)}")
        values = {
            "emotion": self.emotion,
            "gaze": self.gaze,
            "head_tilt": self.head_tilt,
            "pose": self.pose,
            "body_animation": self.body_animation,
            "facial_expression": self.facial_expression,
            "lip_sync": self.lip_sync,
        }
        values.update(changes)
        return AvatarActingState(**values)  # type: ignore[arg-type]

    def to_dict(self) -> dict[str, object]:
        """Serialize the contract without coupling it to a renderer."""
        return {
            "emotion": self.emotion,
            "gaze": self.gaze,
            "head_tilt": self.head_tilt,
            "pose": self.pose,
            "body_animation": self.body_animation,
            "facial_expression": self.facial_expression,
            "lip_sync": self.lip_sync,
        }
