from __future__ import annotations

from collections import deque
from time import monotonic


class TwitchChatRateLimiter:
    """Local outbound guard for Twitch chat: 1 msg/sec and 20 msgs/30 sec."""

    def __init__(self, *, per_second: float = 1.0, burst_window_seconds: float = 30.0, burst_limit: int = 20) -> None:
        if per_second <= 0 or burst_window_seconds <= 0 or burst_limit < 1:
            raise ValueError("invalid Twitch chat rate limit")
        self.per_second = per_second
        self.burst_window_seconds = burst_window_seconds
        self.burst_limit = burst_limit
        self._sent: deque[float] = deque()

    def next_delay(self, *, now: float | None = None) -> float:
        current = monotonic() if now is None else now
        while self._sent and current - self._sent[0] >= self.burst_window_seconds:
            self._sent.popleft()
        delay = 0.0
        if self._sent:
            delay = max(delay, self.per_second - (current - self._sent[-1]))
        if len(self._sent) >= self.burst_limit:
            delay = max(delay, self.burst_window_seconds - (current - self._sent[0]))
        return max(0.0, delay)

    def record(self, *, now: float | None = None) -> None:
        current = monotonic() if now is None else now
        delay = self.next_delay(now=current)
        if delay > 0:
            raise RuntimeError(f"Twitch chat send blocked for {delay:.3f}s")
        self._sent.append(current)
