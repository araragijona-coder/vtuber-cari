from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from .director import VoiceRequest


class TTSBackend(Protocol):
    """Minimal contract for speech providers."""

    def speak(self, request: VoiceRequest) -> None: ...


@dataclass(slots=True)
class NullTTS:
    """Safe no-op backend for tests, CI and machines without a speech engine."""

    last_request: VoiceRequest | None = None

    def speak(self, request: VoiceRequest) -> None:
        self.last_request = request


class Pyttsx3TTS:
    """Optional local Windows-friendly TTS adapter.

    The import is delayed so the core remains dependency-free.
    """

    def __init__(self, *, rate: int = 175, volume: float = 1.0) -> None:
        try:
            import pyttsx3
        except ImportError as exc:
            raise RuntimeError("Install the optional 'tts' extra to enable pyttsx3") from exc
        self._engine = pyttsx3.init()
        self._engine.setProperty("rate", int(rate))
        self._engine.setProperty("volume", max(0.0, min(1.0, float(volume))))

    def speak(self, request: VoiceRequest) -> None:
        self._engine.say(request.text)
        self._engine.runAndWait()


def build_tts(kind: str = "none") -> TTSBackend:
    """Create a speech backend without forcing optional dependencies."""
    normalized = kind.strip().casefold()
    if normalized in {"none", "null", "off"}:
        return NullTTS()
    if normalized in {"pyttsx3", "local"}:
        return Pyttsx3TTS()
    raise ValueError(f"Unknown TTS backend: {kind}")
