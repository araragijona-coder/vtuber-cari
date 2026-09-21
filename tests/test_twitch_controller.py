import asyncio
import unittest

from app.brain.event_bus import EventBus, RuntimeEvent
from app.twitch.automation import AutomationAction, AutomationEngine, AutomationRule
from app.twitch.chat_voice import ChatVoiceRouter
from app.twitch.commands import CommandContext, CommandDefinition, TwitchCommandEngine
from app.twitch.controller import TwitchController


class TwitchControllerTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.bus = EventBus()
        self.events: list[RuntimeEvent] = []
        self.bus.subscribe("*", self.events.append)

    async def test_event_and_action_follow_one_control_path(self) -> None:
        actions: list[AutomationAction] = []
        automation = AutomationEngine()
        automation.add_rule(
            AutomationRule(
                "follow",
                (
                    AutomationAction("scene", "thanks"),
                    AutomationAction("avatar", "emotion:happy"),
                ),
            )
        )
        controller = TwitchController(
            event_bus=self.bus,
            automation=automation,
            action_handler=actions.append,
        )
        payload = type(
            "Payload",
            (),
            {"user": type("User", (), {"id": "7", "name": "viewer"})()},
        )()

        await controller.handle_event("follow", payload)

        self.assertEqual([item.kind for item in actions], ["scene", "avatar"])
        names = [event.name for event in self.events]
        self.assertIn("twitch_event", names)
        self.assertIn("twitch_follow", names)
        self.assertEqual(names.count("twitch_action_dispatched"), 2)

    async def test_action_delay_is_honored(self) -> None:
        observed: list[float] = []
        automation = AutomationEngine()
        automation.add_rule(
            AutomationRule(
                "raid",
                (AutomationAction("sound", "raid", delay_seconds=0.01),),
            )
        )
        controller = TwitchController(
            event_bus=self.bus,
            automation=automation,
            action_handler=lambda _: observed.append(
                asyncio.get_running_loop().time()
            ),
        )
        start = asyncio.get_running_loop().time()
        await controller.handle_event(
            "raid",
            type("Payload", (), {"viewers": 10})(),
        )
        self.assertGreaterEqual(observed[0] - start, 0.009)

    async def test_commands_are_local_without_llm(self) -> None:
        sent: list[str] = []
        commands = TwitchCommandEngine()
        commands.register(CommandDefinition("ping", "pong"))
        controller = TwitchController(
            event_bus=self.bus,
            commands=commands,
        )

        async def respond(text: str) -> None:
            sent.append(text)

        result = await controller.handle_chat(
            viewer="viewer",
            text="!ping",
            context=CommandContext("viewer"),
            respond=respond,
        )

        self.assertEqual(result, "command")
        self.assertEqual(sent, ["pong"])
        self.assertIn("twitch_command", [event.name for event in self.events])

    async def test_public_voice_uses_local_pipeline_only(self) -> None:
        class FakePipeline:
            def __init__(self) -> None:
                self.lines: list[str] = []

            def speak_manual(
                self,
                text: str,
                *,
                emotion: str,
                intensity: float,
            ) -> None:
                self.lines.append(text)

        class Handler:
            def __init__(self) -> None:
                self.pipeline = FakePipeline()

            def __call__(self, _: AutomationAction) -> None:
                return None

        handler = Handler()
        controller = TwitchController(
            event_bus=self.bus,
            action_handler=handler,
            chat_voice=ChatVoiceRouter(trigger="1+"),
        )

        result = await controller.handle_chat(
            viewer="viewer",
            text="1+ hola Cari",
        )

        self.assertEqual(result, "chat_read")
        self.assertEqual(handler.pipeline.lines, ["hola Cari"])
        self.assertIn("chat_read_aloud", [event.name for event in self.events])

    async def test_failing_action_is_observed_without_killing_controller(self) -> None:
        controller = TwitchController(
            event_bus=self.bus,
            action_handler=lambda _: (_ for _ in ()).throw(RuntimeError("boom")),
        )

        await controller.handle_event(
            "follow",
            type("Payload", (), {})(),
        )

        self.assertEqual(controller.metrics.action_errors, 0)

        automation = AutomationEngine()
        automation.add_rule(
            AutomationRule("follow", (AutomationAction("sound", "x"),))
        )
        controller = TwitchController(
            event_bus=self.bus,
            automation=automation,
            action_handler=lambda _: (_ for _ in ()).throw(RuntimeError("boom")),
        )
        await controller.handle_event("follow", type("Payload", (), {})())
        self.assertEqual(controller.metrics.action_errors, 1)
        self.assertIn("twitch_action_error", [event.name for event in self.events])


if __name__ == "__main__":
    unittest.main()
