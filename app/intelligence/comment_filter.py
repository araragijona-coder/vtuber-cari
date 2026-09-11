from __future__ import annotations

from dataclasses import dataclass
import re

from app.twitch.models import ChatMessage


@dataclass(frozen=True, slots=True)
class FilterResult:
    accepted: bool
    normalized_text: str
    reason: str = "accepted"


class CommentFilter:
    def __init__(self, *, max_length: int = 2048) -> None:
        self.max_length = max_length

    def check(self, message: ChatMessage) -> FilterResult:
        text = re.sub(r"\s+", " ", message.text).strip()
        if not text:
            return FilterResult(False, "", "empty")
        if len(text) > self.max_length:
            return FilterResult(False, text[: self.max_length], "too_long")
        if len(text) >= 8 and len(set(text.lower())) == 1:
            return FilterResult(False, text, "repetition")
        return FilterResult(True, text)
