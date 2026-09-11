from __future__ import annotations

import json
import os
from dataclasses import dataclass
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.brain.contracts import AIResponse


@dataclass(frozen=True, slots=True)
class LLMConfig:
    """OpenAI-compatible provider settings. Nothing is enabled unless configured."""

    endpoint: str
    api_key: str
    model: str
    timeout: float = 20.0

    @classmethod
    def from_env(cls) -> "LLMConfig | None":
        key = os.getenv("CARI_LLM_API_KEY", "").strip()
        endpoint = os.getenv("CARI_LLM_ENDPOINT", "https://api.openai.com/v1/chat/completions").strip()
        model = os.getenv("CARI_LLM_MODEL", "").strip()
        if not key or not model:
            return None
        return cls(endpoint=endpoint, api_key=key, model=model)


class OpenAICompatibleClient:
    """Small stdlib-only fallback for OpenAI-compatible chat APIs.

    It is intentionally opt-in: no key means no network call.
    """

    def __init__(self, config: LLMConfig) -> None:
        self.config = config

    def respond(self, viewer: str, text: str, memory: dict[str, object] | None = None) -> AIResponse:
        context = json.dumps(memory or {}, ensure_ascii=False)
        payload = {
            "model": self.config.model,
            "temperature": 0.8,
            "messages": [
                {"role": "system", "content": "You are Cari, a friendly VTuber. Answer briefly in Spanish. Return JSON with keys text, emotion, intensity, animation, voice, priority, remember."},
                {"role": "user", "content": f"viewer={viewer}\nmessage={text}\ncontext={context}"},
            ],
        }
        request = Request(
            self.config.endpoint,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Authorization": f"Bearer {self.config.api_key}", "Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urlopen(request, timeout=self.config.timeout) as response:
                body = json.loads(response.read().decode("utf-8"))
        except (HTTPError, URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
            raise RuntimeError("LLM request failed") from exc

        content = body["choices"][0]["message"]["content"]
        if not isinstance(content, str):
            raise RuntimeError("LLM returned invalid content")
        try:
            data = json.loads(content)
        except json.JSONDecodeError:
            data = {"text": content}
        return AIResponse.from_mapping(data)


@dataclass(frozen=True, slots=True)
class OllamaConfig:
    """Optional local Ollama settings. No external API key is required."""

    endpoint: str = "http://127.0.0.1:11434/api/chat"
    model: str = "qwen3:0.6b"
    timeout: float = 60.0

    @classmethod
    def from_env(cls) -> "OllamaConfig":
        default_endpoint = "http://127.0.0.1:11434/api/chat"
        default_model = "qwen3:0.6b"
        default_timeout = 60.0
        return cls(
            endpoint=os.getenv("CARI_OLLAMA_ENDPOINT", default_endpoint).strip() or default_endpoint,
            model=os.getenv("CARI_OLLAMA_MODEL", default_model).strip() or default_model,
            timeout=float(os.getenv("CARI_OLLAMA_TIMEOUT", str(default_timeout))),
        )


class OllamaClient:
    """Local-only responder for Ollama's HTTP API.

    Ollama serves the API on localhost by default, so this path does not need an
    OpenAI/Gemini key and does not contact a remote provider unless the endpoint
    is explicitly changed by the user.
    """

    def __init__(self, config: OllamaConfig | None = None) -> None:
        self.config = config or OllamaConfig.from_env()

    def respond(self, viewer: str, text: str, memory: dict[str, object] | None = None) -> AIResponse:
        context = json.dumps(memory or {}, ensure_ascii=False)
        payload = {
            "model": self.config.model,
            "stream": False,
            "think": False,
            "options": {"temperature": 0.7},
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "Eres Cari, una VTuber amistosa y energética. Responde en español, de forma breve y natural. "
                        "Devuelve SOLO JSON válido con las claves text, emotion, intensity, animation, voice, priority, remember. "
                        "emotion debe ser una de neutral,happy,sad,angry,surprised,shy,affectionate,playful."
                    ),
                },
                {"role": "user", "content": f"viewer={viewer}\nmessage={text}\ncontext={context}"},
            ],
        }
        request = Request(
            self.config.endpoint,
            data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urlopen(request, timeout=self.config.timeout) as response:
                body = json.loads(response.read().decode("utf-8"))
        except (HTTPError, URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
            raise RuntimeError("Ollama local request failed") from exc

        try:
            content = body["message"]["content"]
        except (KeyError, TypeError) as exc:
            raise RuntimeError("Ollama returned invalid content") from exc
        if not isinstance(content, str):
            raise RuntimeError("Ollama returned invalid content")
        try:
            data = json.loads(content)
        except json.JSONDecodeError:
            data = {"text": content}
        return AIResponse.from_mapping(data)
