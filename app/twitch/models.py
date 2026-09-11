from __future__ import annotations

from dataclasses import dataclass
from time import time


@dataclass(frozen=True, slots=True)
class ChatMessage:
    id: str
    viewer_name: str
    text: str
    timestamp: float

    @classmethod
    def now(cls, message_id: str, viewer_name: str, text: str) -> "ChatMessage":
        return cls(message_id, viewer_name, text, time())
