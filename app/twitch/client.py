from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from .models import ChatMessage


class MessageSink(Protocol):
    def __call__(self, message: ChatMessage) -> None: ...


@dataclass(slots=True)
class TwitchConfig:
    channel: str
    client_id: str
    token: str
    bot_id: str | None = None

    def validate(self) -> None:
        if not self.channel.strip() or not self.client_id.strip() or not self.token.strip():
            raise ValueError("channel, client_id and token are required")
