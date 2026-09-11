from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum
from typing import Callable


class ProactiveIntent(StrEnum):
    BREAK_SILENCE = "break_silence"
    CHECK_CHAT = "check_chat"
    REACT_TO_RECENT_ACTIVITY = "react_to_recent_activity"


@dataclass(frozen=True, slots=True)
class ProactiveCue:
    intent: ProactiveIntent
    reason: str
    created_at: float


class ProactiveDirector:
    """Low-cost proactive trigger generator; it never generates final text."""

    def __init__(
        self,
        clock: Callable[[], float],
        *,
        silence_after: float = 20.0,
        cooldown: float = 15.0,
    ) -> None:
        if silence_after < 0 or cooldown < 0:
            raise ValueError("timers must be non-negative")
        self._clock = clock
        self.silence_after = silence_after
        self.cooldown = cooldown
        now = clock()
        self._last_activity = now
        self._last_speech_start: float | None = None
        self._last_trigger = float("-inf")
        self._recent_chat = False

    def observe_chat(self) -> None:
        self._last_activity = self._clock()
        self._recent_chat = True

    def observe_speech_start(self) -> None:
        self._last_speech_start = self._clock()
        self._last_activity = self._last_speech_start

    def observe_speech_end(self) -> None:
        self._last_activity = self._clock()
        self._last_speech_start = None

    def tick(self, *, busy: bool = False, allow: bool = True) -> ProactiveCue | None:
        now = self._clock()
        if not allow or busy or now - self._last_trigger < self.cooldown:
            return None
        if self._last_speech_start is not None:
            return None
        if self._recent_chat:
            self._recent_chat = False
            self._last_trigger = now
            return ProactiveCue(ProactiveIntent.REACT_TO_RECENT_ACTIVITY, "recent_chat", now)
        if now - self._last_activity >= self.silence_after:
            self._last_trigger = now
            return ProactiveCue(ProactiveIntent.BREAK_SILENCE, "chat_silence", now)
        return None
