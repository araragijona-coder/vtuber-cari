from __future__ import annotations

from typing import Any

from app.pipeline.runtime import LocalPipeline

from .client import MessageSink, TwitchConfig
from .live import TwitchLiveBot
from .models import ChatMessage


class _SinkPipeline:
    """Compatibility bridge for callers that only want inbound messages."""

    def __init__(self, sink: MessageSink) -> None:
        self._sink = sink

    def handle(self, message: ChatMessage) -> None:
        self._sink(message)
        return None


class TwitchAdapter:
    """TwitchIO 3 adapter with production pipeline support.

    Preferred form: ``TwitchAdapter(pipeline)``.
    The legacy ``TwitchAdapter(config, sink)`` shape remains accepted so old
    integrations fail softly while migrating to the OAuth/EventSub runtime.
    """

    def __init__(self, pipeline_or_config: LocalPipeline | TwitchConfig, sink: MessageSink | None = None) -> None:
        if isinstance(pipeline_or_config, TwitchConfig):
            pipeline_or_config.validate()
            if sink is None:
                raise ValueError("sink is required with the legacy TwitchConfig adapter")
            pipeline: Any = _SinkPipeline(sink)
        else:
            pipeline = pipeline_or_config
        self._live = TwitchLiveBot(pipeline)

    @property
    def connected(self) -> bool:
        return self._live.connected

    async def start(self) -> None:
        await self._live.start()

    async def close(self) -> None:
        await self._live.close()
