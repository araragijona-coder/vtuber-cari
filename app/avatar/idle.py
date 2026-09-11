from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum
import random
import time


class IdleMicroBehavior(StrEnum):
    BLINK = "blink"
    GAZE_LEFT = "gaze_left"
    GAZE_RIGHT = "gaze_right"
    FIDGET = "fidget"


@dataclass(frozen=True, slots=True)
class IdleCue:
    behavior: IdleMicroBehavior
    created_at: float


class IdleMicroBehaviorScheduler:
    """Small deterministic-cost idle scheduler; disabled while the avatar is busy."""

    def __init__(self, *, min_delay: float = 5.0, max_delay: float = 14.0, seed: int = 1) -> None:
        self.min_delay = min_delay
        self.max_delay = max_delay
        self._rng = random.Random(seed)
        self._next = time.monotonic() + self._delay()

    def _delay(self) -> float:
        return self._rng.uniform(self.min_delay, self.max_delay)

    def tick(self, *, allow: bool, now: float | None = None) -> IdleCue | None:
        if not allow:
            return None
        current = time.monotonic() if now is None else now
        if current < self._next:
            return None
        behavior = self._rng.choice(tuple(IdleMicroBehavior))
        self._next = current + self._delay()
        return IdleCue(behavior, current)
