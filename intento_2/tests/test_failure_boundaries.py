import unittest

from app.brain.contracts import AIResponse, Emotion
from app.pipeline.runtime import LocalPipeline
from app.twitch.models import ChatMessage
from app.voice.director import VoiceRequest
from app.voice.safe import SafeTTS


class BrokenResponder:
    def respond(self, viewer, text, memory=None):
        raise RuntimeError("provider offline")


class BrokenTTS:
    def speak(self, request: VoiceRequest) -> None:
        raise RuntimeError("audio device unavailable")


class FixedResponder:
    def respond(self, viewer, text, memory=None):
        return AIResponse(text="respuesta", emotion=Emotion.HAPPY)


class FailureBoundaryTests(unittest.TestCase):
    def test_tts_failure_isolated(self):
        safe = SafeTTS(BrokenTTS())
        safe.speak(VoiceRequest("hola", "default", "happy", 0.5))
        self.assertFalse(safe.healthy)
        self.assertIn("audio", safe.last_error or "")

    def test_llm_failure_does_not_raise(self):
        pipeline = LocalPipeline(responder=BrokenResponder())
        result = pipeline.handle(ChatMessage.now("1", "viewer", "¿qué haces?"))
        self.assertIsNone(result)

    def test_tts_failure_does_not_kill_response(self):
        pipeline = LocalPipeline(responder=FixedResponder(), tts=BrokenTTS())
        result = pipeline.handle(ChatMessage.now("2", "viewer", "cuéntame algo"))
        self.assertIsNotNone(result)
        self.assertEqual(result.response_text, "respuesta")
        self.assertIn("audio", result.tts_error or "")


if __name__ == "__main__":
    unittest.main()
