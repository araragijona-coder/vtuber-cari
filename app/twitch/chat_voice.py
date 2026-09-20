from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class ChatVoiceRequest:
    viewer: str
    text: str


class ChatVoiceRouter:
    """Selects which Twitch messages are allowed onto the public speakers."""

    def __init__(self, *, trigger: str = "1+", max_length: int = 240) -> None:
        trigger = trigger.strip()
        if not trigger:
            raise ValueError("chat voice trigger is required")
        if max_length < 1:
            raise ValueError("max_length must be positive")
        self.trigger = trigger
        self.max_length = max_length

    def parse(self, viewer: str, message: str) -> ChatVoiceRequest | None:
        text = message.strip()
        prefix = self.trigger
        if not text.casefold().startswith(prefix.casefold()):
            return None
        spoken = text[len(prefix):].strip()
        if not spoken:
            return None
        # Prevent an intentionally huge chat message from becoming a long TTS job.
        spoken = " ".join(spoken.split())[: self.max_length].strip()
        if not spoken:
            return None
        return ChatVoiceRequest(viewer=viewer.strip() or "viewer", text=spoken)
