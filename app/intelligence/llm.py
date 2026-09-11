from __future__ import annotations

import json
import os
from dataclasses import dataclass
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.brain.contracts import AIResponse


def _parse_ai_content(content: str) -> AIResponse:
    """Accept strict JSON plus common fenced/extra-text model output."""
    raw = content.strip()
    candidates = [raw]
    if raw.startswith("```") and raw.endswith("```"):
        lines = raw.splitlines()
        candidates.append("\n".join(lines[1:-1]).strip())
    start = raw.find("{")
    end = raw.rfind("}")
    if start >= 0 and end > start:
        candidates.append(raw[start : end + 1])
    for candidate in candidates:
        try:
            data = json.loads(candidate)
        except json.JSONDecodeError:
            continue
        if isinstance(data, dict):
            return AIResponse.from_mapping(data)
    return AIResponse.from_mapping({"text": raw})


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
    """Cloud/API provider used only as a secondary fallback."""

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
        request = Request(self.config.endpoint, data=json.dumps(payload).encode("utf-8"), headers={"Authorization": f"Bearer {self.config.api_key}", "Content-Type": "application/json"}, method="POST")
        try:
            with urlopen(request, timeout=self.config.timeout) as response:
                body = json.loads(response.read().decode("utf-8"))
        except (HTTPError, URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
            raise RuntimeError("LLM request failed") from exc
        content = body["choices"][0]["message"]["content"]
        if not isinstance(content, str):
            raise RuntimeError("LLM returned invalid content")
        return _parse_ai_content(content)


@dataclass(frozen=True, slots=True)
class OllamaConfig:
    """Optional local Ollama settings. No external API key is required."""

    endpoint: str = "http://127.0.0.1:11434/api/chat"
    model: str = "qwen3:0.6b"
    timeout: float = 60.0
    probe_timeout: float = 0.35

    @classmethod
    def from_env(cls) -> "OllamaConfig":
        default_endpoint = "http://127.0.0.1:11434/api/chat"
        default_model = "qwen3:0.6b"
        return cls(
            endpoint=os.getenv("CARI_OLLAMA_ENDPOINT", default_endpoint).strip() or default_endpoint,
            model=os.getenv("CARI_OLLAMA_MODEL", default_model).strip() or default_model,
            timeout=float(os.getenv("CARI_OLLAMA_TIMEOUT", "60.0")),
            probe_timeout=float(os.getenv("CARI_OLLAMA_PROBE_TIMEOUT", "0.35")),
        )


class OllamaClient:
    """Local-only responder for Ollama's localhost HTTP API."""

    def __init__(self, config: OllamaConfig | None = None) -> None:
        self.config = config or OllamaConfig.from_env()

    def available(self) -> bool:
        """Probe Ollama quickly without generating or downloading a model."""
        tags_url = self.config.endpoint.rsplit("/api/chat", 1)[0] + "/api/tags"
        try:
            with urlopen(tags_url, timeout=self.config.probe_timeout) as response:
                return 200 <= getattr(response, "status", 200) < 300
        except (HTTPError, URLError, TimeoutError, OSError):
            return False

    def respond(self, viewer: str, text: str, memory: dict[str, object] | None = None) -> AIResponse:
        context = json.dumps(memory or {}, ensure_ascii=False)
        payload = {
            "model": self.config.model,
            "stream": False,
            "think": False,
            "options": {"temperature": 0.7},
            "messages": [
                {"role": "system", "content": "Eres Cari, una VTuber amistosa y energética. Responde en español, breve y natural. Devuelve SOLO JSON válido con las claves text, emotion, intensity, animation, voice, priority, remember. emotion: neutral,happy,sad,angry,surprised,shy,affectionate,playful."},
                {"role": "user", "content": f"viewer={viewer}\nmessage={text}\ncontext={context}"},
            ],
        }
        request = Request(self.config.endpoint, data=json.dumps(payload, ensure_ascii=False).encode("utf-8"), headers={"Content-Type": "application/json"}, method="POST")
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
        return _parse_ai_content(content)


class LocalFirstResponder:
    """Ollama first; cloud/API only when local is unavailable or fails."""

    def __init__(self, ollama: OllamaClient, api: OpenAICompatibleClient | None = None) -> None:
        self.ollama = ollama
        self.api = api

    def respond(self, viewer: str, text: str, memory: dict[str, object] | None = None) -> AIResponse:
        if self.ollama.available():
            try:
                return self.ollama.respond(viewer, text, memory)
            except RuntimeError:
                if self.api is None:
                    raise
        if self.api is not None:
            return self.api.respond(viewer, text, memory)
        raise RuntimeError("No local Ollama or cloud API provider available")
