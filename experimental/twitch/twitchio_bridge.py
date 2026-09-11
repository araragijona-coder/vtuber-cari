from __future__ import annotations

"""Experimental TwitchIO 3 bridge.

This module is intentionally isolated from the production app until a real Twitch
channel rehearsal proves the complete read -> brain -> speak -> write path.

No LLM/API is required here. Twitch authentication is separate from Cari's AI
providers and uses Twitch OAuth/Device Code Flow.
"""

import asyncio
import logging
import os

try:
    import twitchio
    from twitchio import Scopes, eventsub
    from twitchio.ext import commands
except ImportError as exc:  # pragma: no cover - exercised only when optional extra is absent
    raise RuntimeError("Instala el extra Twitch con: python -m pip install -e .[twitch]") from exc

from app.pipeline.runtime import LocalPipeline
from app.twitch.models import ChatMessage

LOGGER = logging.getLogger("cari.twitch.experimental")


class CariTwitchBot(commands.Bot):
    """Small TwitchIO adapter that delegates all intelligence to LocalPipeline."""

    def __init__(self, pipeline: LocalPipeline) -> None:
        client_id = os.environ["TWITCH_CLIENT_ID"]
        bot_id = os.environ["TWITCH_BOT_ID"]
        broadcaster_id = os.environ["TWITCH_BROADCASTER_ID"]
        owner_id = os.getenv("TWITCH_OWNER_ID", broadcaster_id)

        self.pipeline = pipeline
        self.broadcaster_id = broadcaster_id

        super().__init__(
            client_id=client_id,
            client_secret=None,
            bot_id=bot_id,
            owner_id=owner_id,
            prefix="!",
        )

    async def setup_hook(self) -> None:
        # EventSub is preferred over legacy IRC by current TwitchIO documentation.
        subscription = eventsub.ChatMessageSubscription(
            broadcaster_user_id=self.broadcaster_id,
            user_id=self.bot_id,
        )
        await self.subscribe_websocket(payload=subscription, as_bot=True)
        LOGGER.info("Twitch EventSub chat subscription created for %s", self.broadcaster_id)

    async def event_ready(self) -> None:
        LOGGER.info("Cari connected to Twitch as bot_id=%s", self.bot_id)

    async def event_message(self, message: twitchio.ChatMessage) -> None:
        if message.chatter.id == self.bot_id:
            return

        local_message = ChatMessage.now(
            source="twitch",
            viewer_name=message.chatter.name,
            text=message.text,
        )
        # TTS can be blocking. Never block TwitchIO's async event loop with it.
        result = await asyncio.to_thread(self.pipeline.handle, local_message)
        if result is None:
            return

        # TwitchIO handles the authenticated send path. Keep responses <= Twitch's
        # 500-character message limit.
        response = result.response_text.strip()
        if response:
            await message.respond(response[:500])


async def run_cari_twitch(pipeline: LocalPipeline) -> None:
    """Authenticate with Twitch DCF and run until stopped.

    Required environment:
      TWITCH_CLIENT_ID
      TWITCH_BOT_ID
      TWITCH_BROADCASTER_ID

    The first run may require the user to authorize the device code in a browser.
    Tokens are handled by TwitchIO's token manager; do not commit them to Git.
    """
    missing = [
        key for key in ("TWITCH_CLIENT_ID", "TWITCH_BOT_ID", "TWITCH_BROADCASTER_ID")
        if not os.getenv(key)
    ]
    if missing:
        raise RuntimeError("Faltan variables Twitch: " + ", ".join(missing))

    bot = CariTwitchBot(pipeline)
    try:
        auth = await bot.login_dcf(
            scopes=Scopes(["user:read:chat", "user:write:chat", "user:bot"])
        )
        if auth is not None:
            LOGGER.info("Twitch authorization required. Open the displayed verification URL/code.")
            await bot.start_dcf(device_code=auth.user_code)
        else:
            await bot.start_dcf()
    finally:
        await bot.close()


if __name__ == "__main__":
    raise SystemExit(
        "Este puente es experimental: primero debe ejecutarse mediante el runner de Cari con una pipeline real."
    )
