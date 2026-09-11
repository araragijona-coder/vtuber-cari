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
