import unittest

from app.pipeline.runtime import LocalPipeline
from app.twitch.models import ChatMessage


class PipelineMemoryTests(unittest.TestCase):
    def test_accepted_local_turn_is_added_to_session_memory(self) -> None:
        pipeline = LocalPipeline()
        result = pipeline.handle(ChatMessage.now("1", "viewer", "hola"))
        self.assertIsNotNone(result)
        assert result is not None
        turns = result.memory_context["recent_turns"]
        self.assertEqual(len(turns), 1)
        self.assertEqual(turns[0].viewer, "viewer")
        self.assertEqual(turns[0].text, "hola")
        self.assertEqual(turns[0].response, result.response_text)

    def test_rejected_message_does_not_create_memory_turn(self) -> None:
        pipeline = LocalPipeline()
        self.assertIsNone(pipeline.handle(ChatMessage.now("1", "viewer", "aaaaaaaaaaaaaaaaaaaa")))
        self.assertEqual(pipeline.memory.recent_turns(), ())


if __name__ == "__main__":
    unittest.main()
