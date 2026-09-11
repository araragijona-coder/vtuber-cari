"""Renderer-independent lip-sync state for the experimental Cari avatar.

The controller deliberately accepts already-derived viseme weights. Audio
analysis/TTS integration can be added later without coupling the avatar layer
to a speech provider or AI service.
"""

from __future__ import annotations

from dataclasses import dataclass

VISEMS = ("aa", "ih", "ou", "ee", "oh")


@dataclass(frozen=True, slots=True)
class LipSyncFrame:
    """Normalized five-viseme frame consumed by an avatar renderer."""

    weights: tuple[float, float, float, float, float]
    speaking: bool = True

    def __post_init__(self) -> None:
        if len(self.weights) != len(VISEMS):
            raise ValueError("lip-sync frame requires five viseme weights")
        if any(not isinstance(value, (int, float)) or isinstance(value, bool) for value in self.weights):
            raise TypeError("viseme weights must be numeric")
        if any(value < 0.0 or value > 1.0 for value in self.weights):
            raise ValueError("viseme weights must be between 0.0 and 1.0")
        if not isinstance(self.speaking, bool):
            raise TypeError("speaking must be bool")

    @classmethod
    def silence(cls) -> "LipSyncFrame":
        return cls((0.0, 0.0, 0.0, 0.0, 0.0), speaking=False)

    def to_dict(self) -> dict[str, float | bool]:
        return {name: weight for name, weight in zip(VISEMS, self.weights)} | {"speaking": self.speaking}


class LipSyncController:
    """Small state machine for smoothing externally-derived lip-sync frames."""

    def __init__(self, release_seconds: float = 0.08) -> None:
        if release_seconds < 0:
            raise ValueError("release_seconds must not be negative")
        self.release_seconds = release_seconds
        self._frame = LipSyncFrame.silence()
        self._silence_elapsed = 0.0

    @property
    def frame(self) -> LipSyncFrame:
        return self._frame

    def set_frame(self, frame: LipSyncFrame) -> LipSyncFrame:
        if not isinstance(frame, LipSyncFrame):
            raise TypeError("frame must be LipSyncFrame")
        self._frame = frame
        # Every incoming frame starts a fresh release window.
        self._silence_elapsed = 0.0
        return self._frame

    def advance(self, delta_seconds: float) -> LipSyncFrame:
        if delta_seconds < 0:
            raise ValueError("delta_seconds must not be negative")
        if self._frame.speaking:
            return self._frame
        self._silence_elapsed += delta_seconds
        # Tolerate floating-point accumulation at the exact release boundary.
        if self._silence_elapsed + 1e-9 >= self.release_seconds:
            self._frame = LipSyncFrame.silence()
        return self._frame
