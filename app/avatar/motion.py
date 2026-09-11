from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class MotionPose:
    x: float = 0.5
    y: float = 0.5
    scale: float = 1.0
    rotation: float = 0.0
    bob: float = 0.0
    sway: float = 0.0

    def normalized(self) -> "MotionPose":
        return MotionPose(
            x=max(0.0, min(1.0, self.x)),
            y=max(0.0, min(1.0, self.y)),
            scale=max(0.1, min(3.0, self.scale)),
            rotation=max(-45.0, min(45.0, self.rotation)),
            bob=max(-1.0, min(1.0, self.bob)),
            sway=max(-1.0, min(1.0, self.sway)),
        )


class MotionDirector:
    """Produces render-neutral movement; it never owns renderer coordinates."""

    def __init__(self) -> None:
        self._pose = MotionPose()

    @property
    def pose(self) -> MotionPose:
        return self._pose

    def set_pose(self, pose: MotionPose) -> MotionPose:
        self._pose = pose.normalized()
        return self._pose

    def reset(self) -> MotionPose:
        self._pose = MotionPose()
        return self._pose
