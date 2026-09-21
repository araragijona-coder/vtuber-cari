"""Dependency-free contracts for the future native Windows capture backend.

This module deliberately contains no Windows bindings yet. It defines the
stable data contract so the native implementation can be tested separately
before it is allowed into the production application.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class CaptureKind(str, Enum):
    DISPLAY = "display"
    WINDOW = "window"
    CAMERA = "camera"
    GAME = "game"


@dataclass(frozen=True)
class CaptureSource:
    """A user-selectable capture source independent of the native backend."""

    source_id: str
    name: str
    kind: CaptureKind
    enabled: bool = True

    def __post_init__(self) -> None:
        if not self.source_id.strip():
            raise ValueError("source_id cannot be empty")
        if not self.name.strip():
            raise ValueError("name cannot be empty")


@dataclass(frozen=True)
class CaptureHealth:
    """Small, understandable capture health snapshot."""

    fps: float
    dropped_frames: int
    frame_time_ms: float

    def __post_init__(self) -> None:
        if self.fps < 0:
            raise ValueError("fps cannot be negative")
        if self.dropped_frames < 0:
            raise ValueError("dropped_frames cannot be negative")
        if self.frame_time_ms < 0:
            raise ValueError("frame_time_ms cannot be negative")
