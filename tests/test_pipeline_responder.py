from __future__ import annotations

import unittest

from app.brain.contracts import AIResponse, Emotion
from app.pipeline.runtime import LocalPipeline
from app.twitch.models import ChatMessage
from app.voice.tts import NullTTS


class _FakeLocalResponder:
    def __init__(self) -> None:
        self.calls: list[tuple[str, str]] = []

    def respond(self, viewer: str, text: str, memory: dict[str, object] | None = None) -> AIResponse:
        self.calls.append((viewer, text))
        return AIResponse(
            text="Respuesta local de prueba.",
            emotion=Emotion.HAPPY,
            animation="wave",
            priority=4,
        )


class PipelineResponderTests(unittest.TestCase):
    def test_responder_is_used_after_rule_router_has_no_answer(self) -> None:
        responder = _FakeLocalResponder()
        pipeline = LocalPipeline(responder=responder, tts=NullTTS())

        result = pipeline.handle(ChatMessage.now("1", "viewer", "cuéntame algo que no sea una regla"))

        self.assertIsNotNone(result)
        assert result is not None
        self.assertEqual(result.response_text, "Respuesta local de prueba.")
        self.assertEqual(responder.calls, [("viewer", "cuéntame algo que no sea una regla")])
        self.assertFalse(pipeline.avatar.current.speaking)


if __name__ == "__main__":
    unittest.main()
