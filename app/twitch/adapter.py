from __future__ import annotations

from app.pipeline.runtime import LocalPipeline

from .live import TwitchLiveBot


class TwitchAdapter:
    """Production TwitchIO 3 adapter.

    OAuth and token persistence are delegated to TwitchIO's managed web adapter;
    the Cari pipeline stays independent from Twitch.
    """

    def __init__(self, pipeline: LocalPipeline) -> None:
        self._live = TwitchLiveBot(pipeline)

    @property
    def connected(self) -> bool:
        return self._live.connected

    async def start(self) -> None:
        await self._live.start()

    async def close(self) -> None:
        await self._live.close()
