from __future__ import annotations

import asyncio
import inspect
from collections.abc import Awaitable, Callable, Mapping
from dataclasses import dataclass

from app.brain.event_bus import EventBus, RuntimeEvent
from app.twitch.automation import AutomationAction, AutomationEngine, AutomationEvent
from app.twitch.chat_voice import ChatVoiceRequest, ChatVoiceRouter
from app.twitch.commands import CommandContext, CommandResult, TwitchCommandEngine
from app.twitch.continuity import TwitchContinuityLedger
from app.twitch.events import TwitchEvent, normalize_twitch_event
from app.twitch.rate_limit import TwitchChatRateLimiter


ActionHandler = Callable[[AutomationAction], Awaitable[None] | None]
ChatResponder = Callable[[str], Awaitable[None]]


@dataclass(slots=True)
class TwitchControllerMetrics:
    events_received: int = 0
    chat_received: int = 0
    chat_read_aloud: int = 0
    commands_handled: int = 0
    commands_denied: int = 0
    commands_cooled_down: int = 0
    actions_dispatched: int = 0
    action_errors: int = 0
    action_unhandled: int = 0
    last_event: str | None = None
    last_command: str | None = None


class TwitchController:
    """Provider-neutral Twitch control plane.

    TwitchIO remains the transport adapter. This controller owns normalization,
    EventBus publication, local command policy, automation dispatch, public
    voice policy, rate limiting and action lifecycle. It never creates a socket.
    """

    def __init__(
        self,
        *,
        event_bus: EventBus,
        automation: AutomationEngine | None = None,
        action_handler: ActionHandler | None = None,
        chat_voice: ChatVoiceRouter | None = None,
        commands: TwitchCommandEngine | None = None,
        chat_rate_limiter: TwitchChatRateLimiter | None = None,
        continuity: TwitchContinuityLedger | None = None,
    ) -> None:
        self.event_bus = event_bus
        self.automation = automation or AutomationEngine()
        self.action_handler = action_handler
        self.chat_voice = chat_voice or ChatVoiceRouter()
        self.commands = commands or TwitchCommandEngine()
        self.chat_rate_limiter = chat_rate_limiter or TwitchChatRateLimiter()
        self.continuity = continuity or TwitchContinuityLedger()
        self.metrics = TwitchControllerMetrics()

    async def handle_websocket_welcome(
        self,
        session_id: str,
        keepalive_timeout_seconds: int | None,
        active_subscription_types: Mapping[str, object]
        | set[str]
        | frozenset[str]
        | tuple[str, ...]
        | list[str] = (),
    ) -> None:
        self.continuity.on_welcome(session_id, keepalive_timeout_seconds)

        if isinstance(active_subscription_types, Mapping):
            active = {getattr(item, "type", item) for item in active_subscription_types.values()}
        else:
            active = set(active_subscription_types)

        active_names = {
            str(getattr(item, "value", item))
            for item in active
        }
        verified = self.continuity.verify_subscription_types(active_names)
        snapshot = self.continuity.snapshot()
        snapshot["subscriptions_ok"] = verified
        self.event_bus.publish(RuntimeEvent("twitch_websocket_welcome", snapshot))

    async def handle_event(self, kind: str, payload: object) -> TwitchEvent:
        return await self.handle_normalized_event(normalize_twitch_event(kind, payload))

    async def handle_normalized_event(self, event: TwitchEvent) -> TwitchEvent:
        self.metrics.events_received += 1
        self.metrics.last_event = event.kind
        data = dict(event.data)

        self.event_bus.publish(
            RuntimeEvent("twitch_event", {"kind": event.kind, "data": data})
        )
        self.event_bus.publish(RuntimeEvent(f"twitch_{event.kind}", data))

        await self.dispatch_automation(event.automation_event())
        return event

    async def handle_chat(
        self,
        *,
        viewer: str,
        text: str,
        context: CommandContext | None = None,
        respond: ChatResponder | None = None,
    ) -> str:
        clean_viewer = viewer.strip() or "viewer"
        clean_text = " ".join(text.split()).strip()
        self.metrics.chat_received += 1

        self.event_bus.publish(
            RuntimeEvent(
                "twitch_chat_received",
                {"viewer": clean_viewer, "text": clean_text},
            )
        )

        public_voice = self.chat_voice.parse(clean_viewer, clean_text)
        if public_voice is not None:
            self.metrics.chat_read_aloud += 1
            await self._speak_public_chat(public_voice)
            await self.dispatch_automation(
                AutomationEvent(
                    "chat_read",
                    {"user": public_voice.viewer, "text": public_voice.text},
                )
            )
            return "chat_read"

        command_result = self.commands.execute(
            clean_text,
            context or CommandContext(clean_viewer),
        )
        if command_result.handled:
            await self._handle_command_result(
                clean_viewer,
                clean_text,
                command_result,
                respond,
            )
            return "command"

        await self.dispatch_automation(
            AutomationEvent(
                "chat_message",
                {"user": clean_viewer, "text": clean_text},
            )
        )
        return "chat_message"

    async def dispatch_automation(self, event: AutomationEvent) -> None:
        for action in self.automation.dispatch(event):
            await self.dispatch_action(action)

    async def dispatch_action(self, action: AutomationAction) -> None:
        self.metrics.actions_dispatched += 1
        self.event_bus.publish(
            RuntimeEvent(
                "twitch_action_scheduled",
                {
                    "kind": action.kind,
                    "value": action.value,
                    "delay_seconds": action.delay_seconds,
                },
            )
        )

        if action.delay_seconds > 0:
            await asyncio.sleep(action.delay_seconds)

        if self.action_handler is None:
            self.metrics.action_unhandled += 1
            self.event_bus.publish(
                RuntimeEvent(
                    "twitch_action_unhandled",
                    {"kind": action.kind, "value": action.value},
                )
            )
            return

        try:
            result = await asyncio.to_thread(self.action_handler, action)
            if inspect.isawaitable(result):
                await result
        except Exception as exc:  # noqa: BLE001 - one action must not kill the Twitch transport
            self.metrics.action_errors += 1
            self.event_bus.publish(
                RuntimeEvent(
                    "twitch_action_error",
                    {
                        "kind": action.kind,
                        "value": action.value,
                        "error": str(exc) or exc.__class__.__name__,
                    },
                )
            )
            return

        self.event_bus.publish(
            RuntimeEvent(
                "twitch_action_dispatched",
                {"kind": action.kind, "value": action.value},
            )
        )

    async def _speak_public_chat(self, request: ChatVoiceRequest) -> None:
        pipeline = getattr(self.action_handler, "pipeline", None)
        if pipeline is None or not callable(getattr(pipeline, "speak_manual", None)):
            self.event_bus.publish(
                RuntimeEvent(
                    "twitch_chat_voice_unhandled",
                    {"viewer": request.viewer, "text": request.text},
                )
            )
            return

        await asyncio.to_thread(
            pipeline.speak_manual,
            request.text,
            emotion="neutral",
            intensity=0.7,
        )
        self.event_bus.publish(
            RuntimeEvent(
                "chat_read_aloud",
                {"viewer": request.viewer, "text": request.text},
            )
        )

    async def _handle_command_result(
        self,
        viewer: str,
        text: str,
        result: CommandResult,
        respond: ChatResponder | None,
    ) -> None:
        if result.reason == "permission_denied":
            self.metrics.commands_denied += 1
        elif result.reason == "cooldown":
            self.metrics.commands_cooled_down += 1
        else:
            self.metrics.commands_handled += 1

        self.metrics.last_command = text
        self.event_bus.publish(
            RuntimeEvent(
                "twitch_command",
                {
                    "viewer": viewer,
                    "text": text,
                    "handled": result.handled,
                    "reason": result.reason,
                    "has_response": bool(result.response),
                },
            )
        )

        if result.response and respond is not None:
            await self.chat_rate_limiter.wait()
            await respond(result.response)

        if result.reason == "permission_denied":
            self.event_bus.publish(
                RuntimeEvent("twitch_command_denied", {"viewer": viewer, "text": text})
            )
        elif result.reason == "cooldown":
            self.event_bus.publish(
                RuntimeEvent("twitch_command_cooldown", {"viewer": viewer, "text": text})
            )

    def snapshot(self) -> dict[str, object]:
        return {
            "events_received": self.metrics.events_received,
            "chat_received": self.metrics.chat_received,
            "chat_read_aloud": self.metrics.chat_read_aloud,
            "commands_handled": self.metrics.commands_handled,
            "commands_denied": self.metrics.commands_denied,
            "commands_cooled_down": self.metrics.commands_cooled_down,
            "actions_dispatched": self.metrics.actions_dispatched,
            "action_errors": self.metrics.action_errors,
            "action_unhandled": self.metrics.action_unhandled,
            "last_event": self.metrics.last_event,
            "last_command": self.metrics.last_command,
            "continuity": self.continuity.snapshot(),
        }
