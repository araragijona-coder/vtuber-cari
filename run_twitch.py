from __future__ import annotations

import asyncio
import os
from pathlib import Path

from app.intelligence.llm import LLMConfig, OpenAICompatibleClient
from app.memory.persistent import PersistentMemoryStore
from app.pipeline.runtime import LocalPipeline
from app.twitch.live import TwitchLiveBot
from app.voice.tts import build_tts


def build_pipeline() -> LocalPipeline:
    config = LLMConfig.from_env()
    responder = OpenAICompatibleClient(config) if config is not None else None
    tts = build_tts(os.getenv("CARI_TTS", "none"))
    memory = PersistentMemoryStore(Path("data") / "cari-memory.json")
    return LocalPipeline(persistent_memory=memory, responder=responder, tts=tts)


async def main() -> None:
    bot = TwitchLiveBot(build_pipeline())
    try:
        await bot.start()
    finally:
        await bot.close()


if __name__ == "__main__":
    asyncio.run(main())
