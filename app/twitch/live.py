from __future__ import annotations

import asyncio
import inspect
import os
from collections.abc import Awaitable, Callable

from app.brain.event_bus import RuntimeEvent
from app.pipeline.runtime import LocalPipeline
from app.twitch.automation import AutomationAction, AutomationEngine, AutomationEvent
from app.twitch.cari_actions import LocalCariActionHandler
from app.twitch.chat_voice import ChatVoiceRouter
from app.twitch.commands import CommandContext, TwitchCommandEngine, default_commands
from app.twitch.events import normalize_twitch_event
from app.twitch.models import ChatMessage
from app.twitch.rate_limit import TwitchChatRateLimiter


ActionHandler = Callable[[AutomationAction], Awaitable[None] | None]


class TwitchLiveBot:
    """TwitchIO runtime with commands, public chat voice and EventSub automation."""

    def __init__(
        self,
        pipeline: LocalPipeline,
        *,
        automation: AutomationEngine | None = None,
        action_handler: ActionHandler | None = None,
        chat_voice: ChatVoiceRouter | None = None,
    ) -> None:
        self.pipeline = pipeline
        self._bot = None
        self.commands = TwitchCommandEngine()
        self.automation = automation or AutomationEngine()
        self.action_handler = action_handler or LocalCariActionHandler(pipeline)
        self.chat_voice = chat_voice or ChatVoiceRouter()
        self.chat_rate_limiter = TwitchChatRateLimiter()
        for command in default_commands():
            self.commands.register(command)

    @property
    def connected(self) -> bool:
        return self._bot is not None

    async def _dispatch_action(self, action: AutomationAction) -> None:
        if self.action_handler is None:
            return
        result = await asyncio.to_thread(self.action_handler, action)
        if inspect.isawaitable(result):
            await result

    async def _dispatch_event(self, kind: str, payload) -> None:
        event = normalize_twitch_event(kind, payload).automation_event()
        for action in self.automation.dispatch(event):
            await self._dispatch_action(action)

    async def _dispatch_chat_read(self, viewer: str, text: str) -> None:
        event = AutomationEvent("chat_read", {"user": viewer, "text": text})
        for action in self.automation.dispatch(event):
            await self._dispatch_action(action)

    async def _send_chat(self, message, text: str) -> None:
        text = text.strip()[:500]
        if not text:
            return
        await self.chat_rate_limiter.wait()
        await message.respond(text)

    async def start(self) -> None:
        try:
            from twitchio import eventsub
            from twitchio.ext import commands
        except ImportError as exc:
            raise RuntimeError("Install the optional 'twitch' extra to enable Twitch") from exc

        client_id = os.environ.get("CARI_TWITCH_CLIENT_ID", "").strip()
        client_secret = os.environ.get("CARI_TWITCH_CLIENT_SECRET", "").strip()
        bot_id = os.environ.get("CARI_TWITCH_BOT_ID", "").strip()
        owner_id = os.environ.get("CARI_TWITCH_OWNER_ID", "").strip()
        if not all((client_id, client_secret, bot_id, owner_id)):
            raise RuntimeError(
                "CARI_TWITCH_CLIENT_ID, CARI_TWITCH_CLIENT_SECRET, "
                "CARI_TWITCH_BOT_ID and CARI_TWITCH_OWNER_ID are required"
            )

        pipeline = self.pipeline
        command_engine = self.commands
        parent = self

        class CariBot(commands.Bot):
            def __init__(self) -> None:
                super().__init__(
                    client_id=client_id,
                    client_secret=client_secret,
                    bot_id=bot_id,
                    owner_id=owner_id,
                    prefix="!",
                )

            async def setup_hook(self) -> None:
                subscriptions = (
                    eventsub.ChatMessageSubscription(
                        broadcaster_user_id=owner_id,
                        user_id=bot_id,
                    ),
                    eventsub.ChannelFollowSubscription(broadcaster_user_id=owner_id),
                    eventsub.ChannelSubscribeSubscription(broadcaster_user_id=owner_id),
                    eventsub.ChannelSubscriptionGiftSubscription(broadcaster_user_id=owner_id),
                    eventsub.ChannelSubscribeMessageSubscription(broadcaster_user_id=owner_id),
                    eventsub.ChannelCheerSubscription(broadcaster_user_id=owner_id),
                    eventsub.ChannelRaidSubscription(to_broadcaster_user_id=owner_id),
                    eventsub.ChannelPointsRedeemAddSubscription(broadcaster_user_id=owner_id),
                    eventsub.ChannelPollBeginSubscription(broadcaster_user_id=owner_id),
                    eventsub.ChannelPollEndSubscription(broadcaster_user_id=owner_id),
                    eventsub.ChannelPredictionBeginSubscription(broadcaster_user_id=owner_id),
                    eventsub.ChannelPredictionEndSubscription(broadcaster_user_id=owner_id),
                )
                for subscription in subscriptions:
                    await self.subscribe_websocket(payload=subscription)

            async def event_message(self, message) -> None:
                if getattr(message, "echo", False):
                    return
                author = getattr(message, "author", None)
                viewer = str(getattr(author, "name", None) or "viewer")
                message_id = str(getattr(message, "id", None) or f"{viewer}:{id(message)}")
                text = str(message.content)

                public_voice = parent.chat_voice.parse(viewer, text)
                if public_voice is not None:
                    await asyncio.to_thread(
                        pipeline.speak_manual,
                        public_voice.text,
                        emotion="neutral",
                        intensity=0.7,
                    )
                    pipeline.event_bus.publish(
                        RuntimeEvent(
                            "chat_read_aloud",
                            {"viewer": public_voice.viewer, "text": public_voice.text},
                        )
                    )
                    await parent._dispatch_chat_read(public_voice.viewer, public_voice.text)
                    return

                command_context = CommandContext(
                    viewer=viewer,
                    is_subscriber=bool(getattr(message, "subscriber", False)),
                    is_vip=bool(getattr(message, "vip", False)),
                    is_moderator=bool(getattr(message, "moderator", False)),
                    is_broadcaster=bool(getattr(message, "broadcaster", False)),
                )
                command_result = command_engine.execute(text, command_context)
                if command_result.handled:
                    if command_result.response:
                        await parent._send_chat(message, command_result.response)
                    return

                chat_message = ChatMessage.now(message_id, viewer, text)
                result = await asyncio.to_thread(pipeline.handle, chat_message)
                if result is None:
                    return
                response = result.response_text.strip()[:500]
                if response:
                    await parent._send_chat(message, response)

            async def event_follow(self, payload) -> None:
                await parent._dispatch_event("follow", payload)

            async def event_subscription(self, payload) -> None:
                await parent._dispatch_event("subscribe", payload)

            async def event_subscription_gift(self, payload) -> None:
                await parent._dispatch_event("subscription_gift", payload)

            async def event_subscription_message(self, payload) -> None:
                await parent._dispatch_event("subscription_message", payload)

            async def event_cheer(self, payload) -> None:
                await parent._dispatch_event("cheer", payload)

            async def event_raid(self, payload) -> None:
                await parent._dispatch_event("raid", payload)

            async def event_custom_redemption_add(self, payload) -> None:
                await parent._dispatch_event("channel_points", payload)

            async def event_poll_begin(self, payload) -> None:
                await parent._dispatch_event("poll_begin", payload)

            async def event_poll_end(self, payload) -> None:
                await parent._dispatch_event("poll_end", payload)

            async def event_prediction_begin(self, payload) -> None:
                await parent._dispatch_event("prediction_begin", payload)

            async def event_prediction_end(self, payload) -> None:
                await parent._dispatch_event("prediction_end", payload)

        self._bot = CariBot()
        await self._bot.start()

    async def close(self) -> None:
        if self._bot is not None:
            await self._bot.close()
            self._bot = None
