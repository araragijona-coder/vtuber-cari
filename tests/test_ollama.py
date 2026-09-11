from __future__ import annotations

import json
import unittest
from unittest.mock import patch

from app.brain.contracts import Emotion
from app.intelligence.llm import OllamaClient, OllamaConfig


class _Response:
    def __init__(self, payload: dict[str, object]) -> None:
        self.payload = payload

    def __enter__(self) -> "_Response":
        return self

    def __exit__(self, *_args: object) -> None:
        return None

    def read(self) -> bytes:
        return json.dumps(self.payload).encode("utf-8")


class OllamaClientTests(unittest.TestCase):
    def test_from_env_defaults_to_local_qwen(self) -> None:
        with patch.dict("os.environ", {}, clear=True):
            config = OllamaConfig.from_env()
        self.assertEqual(config.endpoint, "http://127.0.0.1:11434/api/chat")
        self.assertEqual(config.model, "qwen3:0.6b")

    def test_from_env_accepts_llama_3_2_one_b(self) -> None:
        with patch.dict("os.environ", {"CARI_OLLAMA_MODEL": "llama3.2:1b"}, clear=True):
            config = OllamaConfig.from_env()
        self.assertEqual(config.model, "llama3.2:1b")

    def test_respond_parses_structured_cari_response(self) -> None:
        payload = {
            "message": {
                "content": json.dumps(
                    {
                        "text": "¡Hola!",
                        "emotion": "happy",
                        "intensity": 0.7,
                        "animation": "wave",
                        "voice": "default",
                        "priority": 5,
                        "remember": False,
                    },
                    ensure_ascii=False,
                )
            }
        }
        client = OllamaClient(OllamaConfig(model="qwen3:0.6b"))
        with patch("app.intelligence.llm.urlopen", return_value=_Response(payload)) as mocked:
            result = client.respond("viewer", "hola")
        self.assertEqual(result.text, "¡Hola!")
        self.assertEqual(result.emotion, Emotion.HAPPY)
        self.assertEqual(mocked.call_args.kwargs["timeout"], 60.0)

    def test_respond_accepts_markdown_fenced_json(self) -> None:
        payload = {
            "message": {
                "content": "```json\n{\"text\":\"Hola local\",\"emotion\":\"playful\"}\n```"
            }
        }
        client = OllamaClient(OllamaConfig(model="llama3.2:1b"))
        with patch("app.intelligence.llm.urlopen", return_value=_Response(payload)):
            result = client.respond("viewer", "hola")
        self.assertEqual(result.text, "Hola local")
        self.assertEqual(result.emotion, Emotion.PLAYFUL)

    def test_respond_degrades_with_local_service_error(self) -> None:
        client = OllamaClient(OllamaConfig())
        with patch("app.intelligence.llm.urlopen", side_effect=OSError("offline")):
            with self.assertRaisesRegex(RuntimeError, "Ollama local request failed"):
                client.respond("viewer", "hola")


if __name__ == "__main__":
    unittest.main()
