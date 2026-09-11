from __future__ import annotations

from dataclasses import dataclass

from app.brain.contracts import AIResponse


@dataclass(frozen=True, slots=True)
class VoiceRequest:
    text: str
    voice: str
    emotion: str
    intensity: float


class VoiceDirector:
    """Provider-neutral voice contract. Actual TTS remains an adapter."""

    def build(self, response: AIResponse) -> VoiceRequest:
        return VoiceRequest(response.text, response.voice, response.emotion.value, response.intensity)
