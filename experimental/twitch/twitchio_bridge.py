from __future__ import annotations

"""Compatibility entry point for the single Twitch transport implementation.

Use app.twitch.live.TwitchLiveBot for the real TwitchIO adapter. This module
exists only so older callers do not create a second EventSub implementation.
"""

from app.pipeline.runtime import LocalPipeline
from app.twitch.live import TwitchLiveBot


CariTwitchBot = TwitchLiveBot


async def run_cari_twitch(pipeline: LocalPipeline) -> None:
    bot = TwitchLiveBot(pipeline)
    try:
        await bot.start()
    finally:
        await bot.close()


__all__ = ["CariTwitchBot", "TwitchLiveBot", "run_cari_twitch"]
