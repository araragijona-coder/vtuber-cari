from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol

from app.avatar.controller import AvatarCommand, AvatarController
from app.brain.contracts import AIResponse
from app.brain.router import RuleRouter
from app.intelligence.comment_filter import CommentFilter
from app.intelligence.comment_gate import CommentGate
from app.intelligence.comment_intelligence import CommentIntelligence
from app.memory.persistent import PersistentMemoryStore
from app.memory.session import SessionMemory
from app.twitch.models import ChatMessage
from app.voice.director import VoiceDirector, VoiceRequest
from app.voice.tts import NullTTS, TTSBackend


class Responder(Protocol):
    def respond(self, viewer: str, text: str, memory: dict[str, object] | None = None) -> AIResponse: ...


@dataclass(frozen=True, slots=True)
class LocalPipelineResult:
    response_text: str
    voice_request: VoiceRequest
    avatar_command: AvatarCommand
    memory_context: dict[str, object] = field(default_factory=dict)


class LocalPipeline:
    """Local-first path with optional LLM/TTS adapters and persistent memory."""

    def __init__(
        self,
        *,
        persistent_memory: PersistentMemoryStore | None = None,
        responder: Responder | None = None,
        tts: TTSBackend | None = None,
    ) -> None:
        self.filter = CommentFilter()
        self.gate = CommentGate()
        self.intelligence = CommentIntelligence()
        self.router = RuleRouter()
        self.voice = VoiceDirector()
        self.avatar = AvatarController()
        self.memory = SessionMemory()
        self.persistent_memory = persistent_memory
        self.responder = responder
        self.tts = tts or NullTTS()
        if persistent_memory is not None:
            for item in persistent_memory.load():
                self.memory.remember(item.key, item.value, source=item.source, timestamp=item.timestamp)

    def handle(self, message: ChatMessage) -> LocalPipelineResult | None:
        return self.handle_batch([message])

    def handle_batch(self, messages: list[ChatMessage]) -> LocalPipelineResult | None:
        candidates: list[tuple[ChatMessage, str]] = []
        for message in messages:
            filtered = self.filter.check(message)
            if not filtered.accepted:
                continue
            gated = self.gate.allow(message, filtered.normalized_text)
            if gated.accepted:
                candidates.append((message, filtered.normalized_text))

        selection = self.intelligence.rank(candidates)
        if selection.selected is None:
            return None
        selected = selection.selected
        message = selected.message
        response = self.router.route(message.viewer_name, selected.normalized_text)
        if response is None and self.responder is not None:
            response = self.responder.respond(
                message.viewer_name,
                selected.normalized_text,
                self.memory.context(),
            )
        if response is None:
            return None

        voice_request = self.voice.build(response)
        command = AvatarCommand(
            emotion=response.emotion,
            intensity=response.intensity,
            animation=response.animation,
            speaking=True,
        )
        self.avatar.apply(command)
        self.tts.speak(voice_request)
        self.intelligence.mark_answered(message)
        self.memory.add_turn(message.viewer_name, selected.normalized_text, response.text)
        if response.remember:
            self.memory.remember(
                f"viewer:{message.viewer_name}",
                selected.normalized_text,
                source="conversation",
            )
            if self.persistent_memory is not None:
                self.persistent_memory.save(self.memory.remembered())
        return LocalPipelineResult(
            response.text,
            voice_request,
            command,
            self.memory.context(),
        )
