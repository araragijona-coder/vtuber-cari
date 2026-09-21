import os
import unittest

from app.twitch.live import TwitchLiveBot


class TwitchLiveTests(unittest.TestCase):
    def test_live_bot_starts_disconnected(self) -> None:
        bot = TwitchLiveBot(pipeline=object())
        self.assertFalse(bot.connected)

    def test_missing_twitch_configuration_is_detected_when_dependency_is_available(self) -> None:
        # This test is intentionally skipped in the dependency-free CI path.
        try:
            import twitchio  # noqa: F401
        except ImportError:
            self.skipTest("optional TwitchIO dependency is not installed")
        for key in (
            "CARI_TWITCH_CLIENT_ID",
            "CARI_TWITCH_CLIENT_SECRET",
            "CARI_TWITCH_BOT_ID",
            "CARI_TWITCH_OWNER_ID",
        ):
            os.environ.pop(key, None)
        import asyncio

        async def run() -> None:
            with self.assertRaises(RuntimeError):
                await TwitchLiveBot(object()).start()

        asyncio.run(run())


if __name__ == "__main__":
    unittest.main()

    def test_controller_uses_pipeline_event_bus(self) -> None:
        from app.brain.event_bus import EventBus
        from app.pipeline.runtime import LocalPipeline

        pipeline = LocalPipeline()
        bot = TwitchLiveBot(pipeline)

        self.assertIs(bot.controller.event_bus, pipeline.event_bus)
        self.assertTrue(hasattr(bot.controller, "continuity"))
