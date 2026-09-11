from __future__ import annotations

import re
from collections.abc import Callable

from .contracts import AIResponse, Emotion

Rule = Callable[[str, str], AIResponse | None]


class RuleRouter:
    """Local-first response router. Rules run before any LLM provider."""

    def __init__(self) -> None:
        self._rules: list[Rule] = [self._greeting, self._thanks, self._goodbye]

    def route(self, viewer: str, text: str) -> AIResponse | None:
        normalized = re.sub(r"\s+", " ", text).strip()
        if not normalized:
            return None
        for rule in self._rules:
            response = rule(viewer, normalized)
            if response is not None:
                return response
        return None

    @staticmethod
    def _greeting(_viewer: str, text: str) -> AIResponse | None:
        if text.casefold() in {"hola", "holaa", "holaaa", "hello", "hi"}:
            return AIResponse(text="¡Holaaa! ♡ ¿Cómo están?", emotion=Emotion.HAPPY, intensity=0.7, animation="wave")
        return None

    @staticmethod
    def _thanks(_viewer: str, text: str) -> AIResponse | None:
        if any(token in text.casefold() for token in ("gracias", "muchas gracias")):
            return AIResponse(text="¡De nada! ♡", emotion=Emotion.AFFECTIONATE, intensity=0.6, animation="happy")
        return None

    @staticmethod
    def _goodbye(_viewer: str, text: str) -> AIResponse | None:
        if text.casefold() in {"chau", "adios", "adiós", "bye"}:
            return AIResponse(text="¡Nos vemos! Gracias por pasar por el stream ♡", emotion=Emotion.HAPPY, intensity=0.6, animation="wave")
        return None
