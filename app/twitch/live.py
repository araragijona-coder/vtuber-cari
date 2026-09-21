from __future__ import annotations

import os

from app.pipeline.runtime import LocalPipeline
from app.twitch.automation import AutomationEngine
from app.twitch.cari_actions import LocalCariActionHandler
from app.twitch.chat_voice import ChatVoiceRouter
from app.twitch.commands import (
    CommandContext,
    TwitchCommandEngine,
    default_commands,
)
from app.twitch.continuity import TwitchContinuityLedger
from app.twitch.controller import TwitchController
from app.twitch.rate_limit import TwitchChatRateLimiter


class TwitchLiveBot:
    """TwitchIO transport adapter for the provider-neutral TwitchController."""

    _EXPECTED_SUBSCRIPTIONS = frozenset(
        {
            "channel.chat.message",
            "channel.follow",
            "channel.subscribe",
            "channel.subscription.gift",
            "channel.subscription.message",
            "channel.cheer",
            "channel.raid",
            "channel.channel_points_custom_reward_redemption.add",
            "channel.poll.begin",
            "channel.poll.end",
            "channel.prediction.begin",
            "channel.prediction.end",
        }
    )

    def __init__(
        self,
        pipeline: LocalPipeline,
        *,
        automation: AutomationEngine | None = None,
        action_handler=None,
        chat_voice: ChatVoiceRouter | None = None,
        commands: TwitchCommandEngine | None = None,
        chat_rate_limiter: TwitchChatRateLimiter | None = None,
    ) -> None:
        self.pipeline = pipeline
        self._bot = None
        self.controller = TwitchController(
            event_bus=pipeline.event_bus,
            automation=automation,
            action_handler=action_handler or LocalCariActionHandler(pipeline),
            chat_voice=chat_voice,
            commands=commands or self._default_commands(),
            chat_rate_limiter=chat_rate_limiter,
            continuity=TwitchContinuityLedger(self._EXPECTED_SUBSCRIPTIONS),
        )

    @property
    def connected(self) -> bool:
        return self._bot is not None

    @staticmethod
    def _default_commands() -> TwitchCommandEngine:
        engine = TwitchCommandEngine()
        for command in default_commands():
            engine.register(command)
        return engine

    async def start(self) -> None:
        try:
            from twitchio import eventsub
            from twitchio.ext import commands
        except ImportError as exc:
            raise RuntimeError(
                "Install the optional 'twitch' extra to enable Twitch"
            ) from exc

        client_id = os.environ.get("CARI_TWITCH_CLIENT_ID", "").strip()
        client_secret = os.environ.get("CARI_TWITCH_CLIENT_SECRET", "").strip()
        bot_id = os.environ.get("CARI_TWITCH_BOT_ID", "").strip()
        owner_id = os.environ.get("CARI_TWITCH_OWNER_ID", "").strip()
        if not all((client_id, client_secret, bot_id, owner_id)):
            raise RuntimeError(
                "CARI_TWITCH_CLIENT_ID, CARI_TWITCH_CLIENT_SECRET, "
                "CARI_TWITCH_BOT_ID and CARI_TWITCH_OWNER_ID are required"
            )

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
                    eventsub.ChannelFollowSubscription(
                        broadcaster_user_id=owner_id,
                        moderator_user_id=owner_id,
                    ),
                    eventsub.ChannelSubscribeSubscription(
                        broadcaster_user_id=owner_id
                    ),
                    eventsub.ChannelSubscriptionGiftSubscription(
                        broadcaster_user_id=owner_id
                    ),
                    eventsub.ChannelSubscribeMessageSubscription(
                        broadcaster_user_id=owner_id
                    ),
                    eventsub.ChannelCheerSubscription(
                        broadcaster_user_id=owner_id
                    ),
                    eventsub.ChannelRaidSubscription(
                        to_broadcaster_user_id=owner_id
                    ),
                    eventsub.ChannelPointsRedeemAddSubscription(
                        broadcaster_user_id=owner_id
                    ),
                    eventsub.ChannelPollBeginSubscription(
                        broadcaster_user_id=owner_id
                    ),
                    eventsub.ChannelPollEndSubscription(
                        broadcaster_user_id=owner_id
                    ),
                    eventsub.ChannelPredictionBeginSubscription(
                        broadcaster_user_id=owner_id
                    ),
                    eventsub.ChannelPredictionEndSubscription(
                        broadcaster_user_id=owner_id
                    ),
                )
                for subscription in subscriptions:
                    await self.subscribe_websocket(payload=subscription)

            async def event_websocket_welcome(self, payload) -> None:
                active = self.websocket_subscriptions()
                active_types = {
                    getattr(subscription.type, "value", subscription.type)
                    for subscription in active.values()
                }
                await parent.controller.handle_websocket_welcome(
                    payload.id,
                    payload.keepalive_timeout_seconds,
                    active_types,
                )

            async def event_message(self, message) -> None:
                if getattr(message, "echo", False):
                    return

                author = getattr(message, "author", None)
                viewer = str(getattr(author, "name", None) or "viewer")
                text = str(getattr(message, "content", "")).strip()

                context = CommandContext(
                    viewer=viewer,
                    is_subscriber=bool(getattr(message, "subscriber", False)),
                    is_vip=bool(getattr(message, "vip", False)),
                    is_moderator=bool(getattr(message, "moderator", False)),
                    is_broadcaster=bool(getattr(message, "broadcaster", False)),
                )

                async def respond(content: str) -> None:
                    await message.respond(content)

                await parent.controller.handle_chat(
                    viewer=viewer,
                    text=text,
                    context=context,
                    respond=respond,
                    event_id=str(getattr(message, "id", "") or ""),
                )

            async def event_follow(self, payload) -> None:
                await parent.controller.handle_event("follow", payload)

            async def event_subscription(self, payload) -> None:
                await parent.controller.handle_event("subscribe", payload)

            async def event_subscription_gift(self, payload) -> None:
                await parent.controller.handle_event("subscription_gift", payload)

            async def event_subscription_message(self, payload) -> None:
                await parent.controller.handle_event("subscription_message", payload)

            async def event_cheer(self, payload) -> None:
                await parent.controller.handle_event("cheer", payload)

            async def event_raid(self, payload) -> None:
                await parent.controller.handle_event("raid", payload)

            async def event_custom_redemption_add(self, payload) -> None:
                await parent.controller.handle_event("channel_points", payload)

            async def event_poll_begin(self, payload) -> None:
                await parent.controller.handle_event("poll_begin", payload)

            async def event_poll_end(self, payload) -> None:
                await parent.controller.handle_event("poll_end", payload)

            async def event_prediction_begin(self, payload) -> None:
                await parent.controller.handle_event("prediction_begin", payload)

            async def event_prediction_end(self, payload) -> None:
                await parent.controller.handle_event("prediction_end", payload)

        self._bot = CariBot()
        await self._bot.start()

    async def close(self) -> None:
        if self._bot is not None:
            await self._bot.close()
            self._bot = None
