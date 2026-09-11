from __future__ import annotations

from dataclasses import dataclass

from .director import VoiceRequest
from .tts import TTSBackend


@dataclass(slots=True)
class SafeTTS:
    """Fail-closed TTS wrapper: speech errors never kill the chat pipeline."""

    backend: TTSBackend
    last_error: str | None = None

    def speak(self, request: VoiceRequest) -> None:
        try:
            self.backend.speak(request)
            self.last_error = None
        except Exception as exc:  # noqa: BLE001 - hardware/driver errors are isolated here
            self.last_error = str(exc) or exc.__class__.__name__

    @property
    def healthy(self) -> bool:
        return self.last_error is None
