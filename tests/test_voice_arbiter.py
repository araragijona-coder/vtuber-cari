import unittest

from app.voice.arbiter import VoiceArbiter, VoiceItem
from app.voice.director import VoiceRequest


class VoiceArbiterTests(unittest.TestCase):
    def request(self, text: str) -> VoiceRequest:
        return VoiceRequest(text=text, voice="default", emotion="neutral", intensity=0.5)

    def test_priority_gets_voice_floor(self) -> None:
        arbiter = VoiceArbiter()
        arbiter.enqueue(VoiceItem(self.request("low"), priority=1))
        arbiter.enqueue(VoiceItem(self.request("alert"), priority=9))
        active = arbiter.start_next()
        self.assertIsNotNone(active)
        self.assertEqual(active.request.text, "alert")
        self.assertTrue(arbiter.busy)
        self.assertIsNone(arbiter.start_next())
        arbiter.finish()
        self.assertFalse(arbiter.busy)

    def test_same_key_coalesces(self) -> None:
        arbiter = VoiceArbiter()
        arbiter.enqueue(VoiceItem(self.request("old"), priority=1, key="status"))
        arbiter.enqueue(VoiceItem(self.request("new"), priority=1, key="status"))
        self.assertEqual(arbiter.pending(), 1)
        self.assertEqual(arbiter.start_next().request.text, "new")

    def test_full_queue_rejects_lower_priority(self) -> None:
        arbiter = VoiceArbiter(max_items=1)
        arbiter.enqueue(VoiceItem(self.request("important"), priority=8))
        accepted = arbiter.enqueue(VoiceItem(self.request("noise"), priority=1))
        self.assertFalse(accepted)
        self.assertEqual(arbiter.start_next().request.text, "important")

    def test_finish_returns_previous_active_item(self) -> None:
        arbiter = VoiceArbiter()
        item = VoiceItem(self.request("hello"))
        arbiter.enqueue(item)
        self.assertIs(arbiter.start_next(), item)
        self.assertIs(arbiter.finish(), item)
        self.assertIsNone(arbiter.finish())


if __name__ == "__main__":
    unittest.main()
