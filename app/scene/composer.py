from __future__ import annotations

from dataclasses import dataclass

from app.avatar.motion import MotionPose
from .attention import AttentionPoint
from .director import SceneDirector


@dataclass(frozen=True, slots=True)
class SceneLayer:
    kind: str
    payload: dict[str, object]
    z: int = 0


@dataclass(frozen=True, slots=True)
class SceneFrame:
    layers: tuple[SceneLayer, ...]


class SceneComposer:
    """Builds renderer-neutral scene descriptions from avatar state."""

    def __init__(self, director: SceneDirector | None = None) -> None:
        self.director = director or SceneDirector()

    def compose(self, pose: MotionPose, attention: AttentionPoint) -> SceneFrame:
        zone = self.director.choose_zone()
        avatar = SceneLayer(
            "avatar",
            {
                "x": zone.x + zone.width / 2 + pose.sway * 0.02,
                "y": zone.y + zone.height / 2 + pose.bob * 0.02,
                "scale": pose.scale,
                "rotation": pose.rotation,
            },
            20,
        )
        focus = SceneLayer("attention", {"target": attention.target.value, "x": attention.x, "y": attention.y}, 30)
        return SceneFrame((avatar, focus))
