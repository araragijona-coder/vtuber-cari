from __future__ import annotations

from .client import MessageSink, TwitchConfig
from .models import ChatMessage


class TwitchAdapter:
    """Optional TwitchIO 3 adapter; the core remains usable without TwitchIO."""

    def __init__(self, config: TwitchConfig, sink: MessageSink) -> None:
        config.validate()
        self.config = config
        self.sink = sink
        self._bot = None

    @property
    def connected(self) -> bool:
        return self._bot is not None

    async def start(self) -> None:
        try:
            from twitchio.ext import commands
        except ImportError as exc:
            raise RuntimeError("Install the optional 'twitch' extra to enable Twitch") from exc

        config = self.config
        sink = self.sink

        class CariBot(commands.Bot):
            def __init__(self) -> None:
                super().__init__(
                    client_id=config.client_id,
                    prefix="!",
                    bot_id=config.bot_id,
                    token=config.token,
                )

            async def event_message(self, message) -> None:
                if getattr(message, "echo", False):
                    return
                author = getattr(message, "author", None)
                viewer = getattr(author, "name", None) or "viewer"
                message_id = getattr(message, "id", None) or f"{viewer}:{id(message)}"
                sink(ChatMessage.now(str(message_id), str(viewer), str(message.content)))

        self._bot = CariBot()
        await self._bot.start()

    async def close(self) -> None:
        if self._bot is not None:
            await self._bot.close()
            self._bot = None
