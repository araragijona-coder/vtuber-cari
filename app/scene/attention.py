from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum


class AttentionTarget(StrEnum):
    SPECTATOR = "spectator"
    CHAT = "chat"
    ALERT = "alert"
    GAME = "game"
    WORKSPACE = "workspace"
    NONE = "none"


@dataclass(frozen=True, slots=True)
class AttentionPoint:
    target: AttentionTarget
    x: float = 0.5
    y: float = 0.5
    priority: int = 0
    hold_seconds: float = 0.0


class AttentionDirector:
    def __init__(self) -> None:
        self._current = AttentionPoint(AttentionTarget.NONE)

    @property
    def current(self) -> AttentionPoint:
        return self._current

    def focus(self, point: AttentionPoint) -> AttentionPoint:
        self._current = AttentionPoint(
            AttentionTarget(point.target),
            max(0.0, min(1.0, point.x)),
            max(0.0, min(1.0, point.y)),
            point.priority,
            max(0.0, point.hold_seconds),
        )
        return self._current
