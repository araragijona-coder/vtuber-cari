import os
import unittest
from unittest.mock import patch

from app.brain.contracts import AIResponse, Emotion
from app.intelligence.llm import LLMConfig
from app.voice.director import VoiceRequest
from app.voice.tts import NullTTS, build_tts


class TTSAndLLMTests(unittest.TestCase):
    def test_null_tts_records_request_without_audio_dependency(self) -> None:
        backend = NullTTS()
        request = VoiceRequest("hola", "default", Emotion.HAPPY.value, 0.7)
        backend.speak(request)
        self.assertEqual(backend.last_request, request)

    def test_tts_factory_is_dependency_free_by_default(self) -> None:
        self.assertIsInstance(build_tts("none"), NullTTS)

    def test_llm_config_requires_key_and_model(self) -> None:
        with patch.dict(os.environ, {"CARI_LLM_API_KEY": "", "CARI_LLM_MODEL": ""}, clear=False):
            self.assertIsNone(LLMConfig.from_env())
        with patch.dict(os.environ, {"CARI_LLM_API_KEY": "key", "CARI_LLM_MODEL": "model"}, clear=False):
            config = LLMConfig.from_env()
            self.assertIsNotNone(config)
            assert config is not None
            self.assertEqual(config.model, "model")

    def test_response_contract_accepts_plain_fallback(self) -> None:
        response = AIResponse.from_mapping({"text": "respuesta", "emotion": "not-real"})
        self.assertEqual(response.emotion, Emotion.NEUTRAL)


if __name__ == "__main__":
    unittest.main()
