import unittest

from app.brain.event_bus import EventBus, RuntimeEvent
from app.pipeline.runtime import LocalPipeline
from app.twitch.models import ChatMessage
from app.voice.arbiter import VoiceItem
from app.voice.director import VoiceRequest


class PipelineEventTests(unittest.TestCase):
    def test_local_reply_emits_response_and_speech_lifecycle(self) -> None:
        bus = EventBus()
        events: list[RuntimeEvent] = []
        bus.subscribe("*", events.append)

        pipeline = LocalPipeline(event_bus=bus)
        result = pipeline.handle(ChatMessage.now("1", "viewer", "hola"))

        self.assertIsNotNone(result)
        names = [event.name for event in events]
        self.assertEqual(names[:2], ["message_received", "response_ready"])
        self.assertIn("speech_started", names)
        self.assertIn("speech_finished", names)
        self.assertFalse(pipeline.avatar.current.speaking)

    def test_filtered_message_emits_drop_signal(self) -> None:
        bus = EventBus()
        events: list[RuntimeEvent] = []
        bus.subscribe("*", events.append)

        result = LocalPipeline(event_bus=bus).handle(ChatMessage.now("2", "viewer", ""))

        self.assertIsNone(result)
        names = [event.name for event in events]
        self.assertEqual(names[0], "message_received")
        self.assertIn("message_filtered", names)
        self.assertIn("response_dropped", names)

    def test_voice_queue_drop_does_not_leave_avatar_speaking(self) -> None:
        pipeline = LocalPipeline()
        pipeline.voice_arbiter.max_items = 1
        blocker = VoiceItem(VoiceRequest("busy", "default", "neutral", 0.5), priority=10, key="blocker")
        self.assertTrue(pipeline.voice_arbiter.enqueue(blocker))

        result = pipeline.handle(ChatMessage.now("3", "viewer", "hola"))

        self.assertIsNotNone(result)
        self.assertFalse(pipeline.avatar.current.speaking)
        self.assertEqual(pipeline.voice_arbiter.pending(), 1)


if __name__ == "__main__":
    unittest.main()
