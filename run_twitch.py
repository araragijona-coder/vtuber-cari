from __future__ import annotations

import asyncio

from app.pipeline.runtime import LocalPipeline
from app.twitch.live import TwitchLiveBot


async def main() -> None:
    pipeline = LocalPipeline()
    bot = TwitchLiveBot(pipeline)
    try:
        await bot.start()
    finally:
        await bot.close()


if __name__ == "__main__":
    asyncio.run(main())
