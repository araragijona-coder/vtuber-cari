"""Deterministic acting transitions, independent of VRM/AI runtimes."""

from __future__ import annotations

from dataclasses import dataclass

from .acting_state import AvatarActingState


@dataclass(frozen=True, slots=True)
class ActingTransition:
    """A linear transition between two validated acting states."""

    start: AvatarActingState
    target: AvatarActingState
    duration_seconds: float
    elapsed_seconds: float = 0.0

    def __post_init__(self) -> None:
        if self.duration_seconds < 0:
            raise ValueError("duration_seconds must not be negative")
        if self.elapsed_seconds < 0:
            raise ValueError("elapsed_seconds must not be negative")

    @property
    def progress(self) -> float:
        if self.duration_seconds == 0:
            return 1.0
        return min(1.0, self.elapsed_seconds / self.duration_seconds)

    @property
    def finished(self) -> bool:
        return self.progress >= 1.0

    def advance(self, delta_seconds: float) -> "ActingTransition":
        if delta_seconds < 0:
            raise ValueError("delta_seconds must not be negative")
        return ActingTransition(
            start=self.start,
            target=self.target,
            duration_seconds=self.duration_seconds,
            elapsed_seconds=min(self.duration_seconds, self.elapsed_seconds + delta_seconds),
        )

    def sample(self) -> AvatarActingState:
        """Return a deterministic blended state.

        Continuous head tilt is interpolated. Discrete fields switch at the
        midpoint so the transition remains predictable without a renderer.
        """
        if self.progress < 0.5:
            discrete = self.start
        else:
            discrete = self.target
        p = self.progress
        head_tilt = self.start.head_tilt + (self.target.head_tilt - self.start.head_tilt) * p
        return discrete.with_updates(head_tilt=head_tilt)
