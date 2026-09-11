from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol

from app.avatar.controller import AvatarCommand, AvatarController
from app.brain.contracts import AIResponse
from app.brain.event_bus import EventBus, EventJournal, RuntimeEvent
from app.brain.router import RuleRouter
from app.intelligence.comment_filter import CommentFilter
from app.intelligence.comment_gate import CommentGate
from app.intelligence.comment_intelligence import CommentIntelligence
from app.memory.persistent import PersistentMemoryStore
from app.memory.session import SessionMemory
from app.twitch.models import ChatMessage
from app.voice.arbiter import VoiceArbiter, VoiceItem
from app.voice.director import VoiceDirector, VoiceRequest
from app.voice.safe import SafeTTS
from app.voice.tts import NullTTS, TTSBackend


class Responder(Protocol):
    def respond(self, viewer: str, text: str, memory: dict[str, object] | None = None) -> AIResponse: ...


@dataclass(frozen=True, slots=True)
class LocalPipelineResult:
    response_text: str
    voice_request: VoiceRequest
    avatar_command: AvatarCommand
    memory_context: dict[str, object] = field(default_factory=dict)
    llm_error: str | None = None
    tts_error: str | None = None


class LocalPipeline:
    """Local-first path with optional LLM/TTS adapters and persistent memory."""

    def __init__(
        self,
        *,
        persistent_memory: PersistentMemoryStore | None = None,
        responder: Responder | None = None,
        tts: TTSBackend | None = None,
        event_bus: EventBus | None = None,
        event_journal: EventJournal | None = None,
    ) -> None:
        self.filter = CommentFilter()
        self.gate = CommentGate()
        self.intelligence = CommentIntelligence()
        self.router = RuleRouter()
        self.voice = VoiceDirector()
        self.voice_arbiter = VoiceArbiter()
        self.avatar = AvatarController()
        self.memory = SessionMemory()
        self.persistent_memory = persistent_memory
        self.responder = responder
        self.tts = SafeTTS(tts or NullTTS())
        if event_bus is not None and event_journal is not None:
            raise ValueError("provide event_bus or event_journal, not both")
        self.event_bus = event_bus or EventBus(journal=event_journal or EventJournal())
        self.event_journal = self.event_bus.journal
        if persistent_memory is not None:
            for item in persistent_memory.load():
                self.memory.remember(item.key, item.value, source=item.source, timestamp=item.timestamp)

    def handle(self, message: ChatMessage) -> LocalPipelineResult | None:
        return self.handle_batch([message])

    def handle_batch(self, messages: list[ChatMessage]) -> LocalPipelineResult | None:
        candidates: list[tuple[ChatMessage, str]] = []
        for message in messages:
            self.event_bus.publish(RuntimeEvent("message_received", {"viewer": message.viewer_name, "message_id": message.id}))
            filtered = self.filter.check(message)
            if not filtered.accepted:
                self.event_bus.publish(RuntimeEvent("message_filtered", {"viewer": message.viewer_name}))
                continue
            gated = self.gate.allow(message, filtered.normalized_text)
            if gated.accepted:
                candidates.append((message, filtered.normalized_text))
            else:
                self.event_bus.publish(RuntimeEvent("message_gated", {"viewer": message.viewer_name}))
        selection = self.intelligence.rank(candidates)
        if selection.selected is None:
            self.event_bus.publish(RuntimeEvent("response_dropped", {"reason": "no_candidate"}))
            return None
        selected = selection.selected
        message = selected.message
        response = self.router.route(message.viewer_name, selected.normalized_text)
        llm_error: str | None = None
        if response is None and self.responder is not None:
            try:
                response = self.responder.respond(message.viewer_name, selected.normalized_text, self.memory.context())
            except Exception as exc:  # noqa: BLE001 - provider failures degrade locally
                llm_error = str(exc) or exc.__class__.__name__
                self.event_bus.publish(RuntimeEvent("llm_error", {"viewer": message.viewer_name, "error": llm_error}))
        if response is None:
            self.event_bus.publish(RuntimeEvent("response_dropped", {"reason": "no_response", "viewer": message.viewer_name}))
            return None
        self.event_bus.publish(RuntimeEvent("response_ready", {"viewer": message.viewer_name, "priority": response.priority}))
        voice_request = self.voice.build(response)
        command = AvatarCommand(emotion=response.emotion, intensity=response.intensity, animation=response.animation, speaking=True)
        self.avatar.apply(command)

        # Keep speech ownership explicit even while TTS is synchronous today. This gives
        # the async Twitch runtime a deterministic hand-off point for queued/interruptible speech.
        speech = VoiceItem(voice_request, priority=response.priority, key=f"viewer:{message.viewer_name}")
        if self.voice_arbiter.enqueue(speech):
            active = self.voice_arbiter.start_next()
            if active is not None:
                self.event_bus.publish(RuntimeEvent("speech_started", {"viewer": message.viewer_name, "priority": response.priority}))
                try:
                    self.tts.speak(active.request)
                finally:
                    self.voice_arbiter.finish()
                    self.event_bus.publish(RuntimeEvent("speech_finished", {"viewer": message.viewer_name}))
        else:
            self.event_bus.publish(RuntimeEvent("response_dropped", {"reason": "voice_queue_full", "viewer": message.viewer_name}))

        if self.tts.last_error:
            self.event_bus.publish(RuntimeEvent("tts_error", {"viewer": message.viewer_name, "error": self.tts.last_error}))

        self.intelligence.mark_answered(message)
        self.memory.add_turn(message.viewer_name, selected.normalized_text, response.text)
        if response.remember:
            self.memory.remember(f"viewer:{message.viewer_name}", selected.normalized_text, source="conversation")
            if self.persistent_memory is not None:
                self.persistent_memory.save(self.memory.remembered())
                self.event_bus.publish(RuntimeEvent("memory_saved", {"viewer": message.viewer_name}))
        return LocalPipelineResult(response.text, voice_request, command, self.memory.context(), llm_error, self.tts.last_error)
