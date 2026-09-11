from __future__ import annotations

import re
from collections.abc import Callable

from .contracts import AIResponse, Emotion

Rule = Callable[[str, str], AIResponse | None]


class RuleRouter:
    """Local-first response router. Rules run before any LLM provider."""

    def __init__(self) -> None:
        self._rules: list[Rule] = [
            self._greeting,
            self._how_are_you,
            self._identity,
            self._thanks,
            self._goodbye,
        ]

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
    def _simple_form(text: str) -> str:
        """Normalize harmless terminal punctuation for short local commands."""
        return re.sub(r"[!?.,;:]+$", "", text.casefold()).strip()

    @classmethod
    def _greeting(cls, _viewer: str, text: str) -> AIResponse | None:
        if cls._simple_form(text) in {
            "hola", "holaa", "holaaa", "holi", "buenas", "buenas tardes",
            "buenas noches", "hola cari", "buenas cari", "hello", "hi",
        }:
            return AIResponse(text="¡Holaaa! ♡ ¿Cómo están?", emotion=Emotion.HAPPY, intensity=0.7, animation="wave")
        return None

    @classmethod
    def _how_are_you(cls, _viewer: str, text: str) -> AIResponse | None:
        if cls._simple_form(text) in {
            "como estas", "cómo estás", "que tal", "qué tal",
        }:
            return AIResponse(
                text="¡Estoy muy bien! ♡ Lista para charlar y acompañarlos.",
                emotion=Emotion.HAPPY, intensity=0.6, animation="happy",
            )
        return None

    @classmethod
    def _identity(cls, _viewer: str, text: str) -> AIResponse | None:
        if cls._simple_form(text) in {
            "quien eres", "quién eres", "quien sos", "quién sos",
            "como te llamas", "cómo te llamas",
        }:
            return AIResponse(
                text="Soy Cari ♡ Tu compañera virtual.",
                emotion=Emotion.AFFECTIONATE, intensity=0.6, animation="happy",
            )
        return None

    @classmethod
    def _thanks(cls, _viewer: str, text: str) -> AIResponse | None:
        if cls._simple_form(text) in {"gracias", "muchas gracias", "gracias cari", "muchas gracias cari"}:
            return AIResponse(text="¡De nada! ♡", emotion=Emotion.AFFECTIONATE, intensity=0.6, animation="happy")
        return None

    @classmethod
    def _goodbye(cls, _viewer: str, text: str) -> AIResponse | None:
        if cls._simple_form(text) in {"chau", "adios", "adiós", "bye", "nos vemos"}:
            return AIResponse(
                text="¡Nos vemos! Gracias por pasar por el stream ♡",
                emotion=Emotion.HAPPY, intensity=0.6, animation="wave",
            )
        return None
