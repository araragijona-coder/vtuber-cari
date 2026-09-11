from __future__ import annotations

from dataclasses import dataclass
from time import monotonic

from app.twitch.models import ChatMessage


@dataclass(frozen=True, slots=True)
class GateResult:
    accepted: bool
    reason: str = "accepted"


class CommentGate:
    def __init__(self, *, viewer_cooldown: float = 2.0, duplicate_cooldown: float = 20.0) -> None:
        self.viewer_cooldown = viewer_cooldown
        self.duplicate_cooldown = duplicate_cooldown
        self._viewer_last: dict[str, float] = {}
        self._text_last: dict[str, float] = {}

    def allow(self, message: ChatMessage, normalized_text: str, *, now: float | None = None) -> GateResult:
        current = monotonic() if now is None else now
        viewer = message.viewer_name.casefold()
        previous_viewer = self._viewer_last.get(viewer)
        if previous_viewer is not None and current - previous_viewer < self.viewer_cooldown:
            return GateResult(False, "viewer_cooldown")
        key = normalized_text.casefold()
        previous_text = self._text_last.get(key)
        if previous_text is not None and current - previous_text < self.duplicate_cooldown:
            return GateResult(False, "duplicate")
        self._viewer_last[viewer] = current
        self._text_last[key] = current
        return GateResult(True)
