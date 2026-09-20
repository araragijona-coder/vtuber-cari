from dataclasses import dataclass
from enum import Enum


class CaptureKind(str, Enum):
    DISPLAY = "display"
    WINDOW = "window"
    CAMERA = "camera"
    GAME = "game"


@dataclass(frozen=True)
class CaptureSource:
    source_id: str
    name: str
    kind: CaptureKind
    enabled: bool = True

    def __post_init__(self) -> None:
        if not self.source_id.strip():
            raise ValueError("source_id must not be empty")
        if not self.name.strip():
            raise ValueError("name must not be empty")


@dataclass(frozen=True)
class CaptureHealth:
    fps: float
    dropped_frames: int
    frame_time_ms: float

    def __post_init__(self) -> None:
        if self.fps < 0:
            raise ValueError("fps must be non-negative")
        if self.dropped_frames < 0:
            raise ValueError("dropped_frames must be non-negative")
        if self.frame_time_ms < 0:
            raise ValueError("frame_time_ms must be non-negative")
