from __future__ import annotations

import asyncio
import os

from app.pipeline.runtime import LocalPipeline
from app.twitch.commands import CommandContext, TwitchCommandEngine, default_commands
from app.twitch.models import ChatMessage


class TwitchLiveBot:
    """TwitchIO 3 runtime with local command handling before the AI pipeline."""

    def __init__(self, pipeline: LocalPipeline) -> None:
        self.pipeline = pipeline
        self._bot = None
        self.commands = TwitchCommandEngine()
        for command in default_commands():
            self.commands.register(command)

    @property
    def connected(self) -> bool:
        return self._bot is not None

    async def start(self) -> None:
        try:
            from twitchio import eventsub
            from twitchio.ext import commands
        except ImportError as exc:
            raise RuntimeError("Install the optional 'twitch' extra to enable Twitch") from exc

        client_id = os.environ.get("CARI_TWITCH_CLIENT_ID", "").strip()
        client_secret = os.environ.get("CARI_TWITCH_CLIENT_SECRET", "").strip()
        bot_id = os.environ.get("CARI_TWITCH_BOT_ID", "").strip()
        owner_id = os.environ.get("CARI_TWITCH_OWNER_ID", "").strip()
        if not all((client_id, client_secret, bot_id, owner_id)):
            raise RuntimeError(
                "CARI_TWITCH_CLIENT_ID, CARI_TWITCH_CLIENT_SECRET, "
                "CARI_TWITCH_BOT_ID and CARI_TWITCH_OWNER_ID are required"
            )

        pipeline = self.pipeline
        command_engine = self.commands

        class CariBot(commands.Bot):
            def __init__(self) -> None:
                super().__init__(
                    client_id=client_id,
                    client_secret=client_secret,
                    bot_id=bot_id,
                    owner_id=owner_id,
                    prefix="!",
                )

            async def setup_hook(self) -> None:
                subscription = eventsub.ChatMessageSubscription(
                    broadcaster_user_id=owner_id,
                    user_id=bot_id,
                )
                await self.subscribe_websocket(payload=subscription)

            async def event_message(self, message) -> None:
                if getattr(message, "echo", False):
                    return
                author = getattr(message, "author", None)
                viewer = str(getattr(author, "name", None) or "viewer")
                message_id = str(getattr(message, "id", None) or f"{viewer}:{id(message)}")
                text = str(message.content)

                command_context = CommandContext(
                    viewer=viewer,
                    is_subscriber=bool(getattr(message, "subscriber", False)),
                    is_vip=bool(getattr(message, "vip", False)),
                    is_moderator=bool(getattr(message, "moderator", False)),
                    is_broadcaster=bool(getattr(message, "broadcaster", False)),
                )
                command_result = command_engine.execute(text, command_context)
                if command_result.handled:
                    if command_result.response:
                        await message.respond(command_result.response)
                    return

                chat_message = ChatMessage.now(message_id, viewer, text)
                result = await asyncio.to_thread(pipeline.handle, chat_message)
                if result is None:
                    return
                response = result.response_text.strip()[:500]
                if response:
                    await message.respond(response)

        self._bot = CariBot()
        await self._bot.start()

    async def close(self) -> None:
        if self._bot is not None:
            await self._bot.close()
            self._bot = None
