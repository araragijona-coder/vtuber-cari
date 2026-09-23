from __future__ import annotations

import unittest
from unittest.mock import Mock

from app.brain.contracts import AIResponse
from app.intelligence.llm import LocalFirstResponder


class LocalFirstResponderTests(unittest.TestCase):
    def _response(self, text: str) -> AIResponse:
        return AIResponse.from_mapping({"text": text})

    def test_uses_ollama_before_api(self) -> None:
        ollama = Mock()
        ollama.available.return_value = True
        ollama.respond.return_value = self._response("local")
        api = Mock()
        api.respond.return_value = self._response("cloud")
        responder = LocalFirstResponder(ollama, api)
        result = responder.respond("viewer", "pregunta")
        self.assertEqual(result.text, "local")
        self.assertEqual(responder.last_provider, "ollama")
        api.respond.assert_not_called()

    def test_falls_back_to_api_when_ollama_is_down(self) -> None:
        ollama = Mock()
        ollama.available.return_value = False
        api = Mock()
        api.respond.return_value = self._response("cloud")
        responder = LocalFirstResponder(ollama, api)
        result = responder.respond("viewer", "pregunta")
        self.assertEqual(result.text, "cloud")
        self.assertEqual(responder.last_provider, "api")
        ollama.respond.assert_not_called()

    def test_uses_no_api_when_both_are_unavailable(self) -> None:
        ollama = Mock()
        ollama.available.return_value = False
        responder = LocalFirstResponder(ollama)
        with self.assertRaisesRegex(RuntimeError, "No local Ollama"):
            responder.respond("viewer", "pregunta")


if __name__ == "__main__":
    unittest.main()
