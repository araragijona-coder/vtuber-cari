from __future__ import annotations

from dataclasses import dataclass
import re

from app.twitch.models import ChatMessage


@dataclass(frozen=True, slots=True)
class CommentCandidate:
    message: ChatMessage
    normalized_text: str
    score: float


@dataclass(frozen=True, slots=True)
class CommentSelection:
    selected: CommentCandidate | None


class CommentIntelligence:
    """Cheap deterministic ranking before any expensive model call."""

    def __init__(self) -> None:
        self._answered: dict[str, float] = {}

    def rank(self, candidates: list[tuple[ChatMessage, str]]) -> CommentSelection:
        if not candidates:
            return CommentSelection(None)
        ranked = [CommentCandidate(message, text, self._score(text)) for message, text in candidates]
        return CommentSelection(max(ranked, key=lambda item: (item.score, -item.message.timestamp, item.message.id)))

    def mark_answered(self, message: ChatMessage) -> None:
        self._answered[message.id] = message.timestamp

    @staticmethod
    def _score(text: str) -> float:
        lowered = text.casefold()
        score = min(len(text), 120) / 120.0
        if "?" in text:
            score += 2.0
        if re.search(r"\b(hola|hey|buenas|gracias|chau)\b", lowered):
            score += 0.4
        if len(text.split()) >= 4:
            score += 0.5
        return score
