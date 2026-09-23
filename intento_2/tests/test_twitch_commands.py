import unittest

from app.twitch.commands import CommandContext, CommandDefinition, TwitchCommandEngine, default_commands


class TwitchCommandEngineTests(unittest.TestCase):
    def test_default_commands_register_and_execute(self) -> None:
        engine = TwitchCommandEngine()
        for command in default_commands():
            engine.register(command)
        result = engine.execute("!hola", CommandContext("TioOtaku"), now=100.0)
        self.assertTrue(result.handled)
        self.assertEqual(result.response, "¡Hola TioOtaku! ♡")

    def test_case_insensitive_and_arguments(self) -> None:
        engine = TwitchCommandEngine()
        engine.register(CommandDefinition("say", "{user}: {args}"))
        result = engine.execute("!SAY hola chat", CommandContext("Viewer"), now=10.0)
        self.assertEqual(result.response, "Viewer: hola chat")

    def test_cooldown_is_per_viewer(self) -> None:
        engine = TwitchCommandEngine()
        engine.register(CommandDefinition("ping", "pong", cooldown_seconds=10))
        self.assertEqual(engine.execute("!ping", CommandContext("one"), now=10).response, "pong")
        self.assertEqual(engine.execute("!ping", CommandContext("one"), now=15).reason, "cooldown")
        self.assertEqual(engine.execute("!ping", CommandContext("two"), now=15).response, "pong")

    def test_permissions_are_ranked(self) -> None:
        engine = TwitchCommandEngine()
        engine.register(CommandDefinition("mod", "ok", permission="moderator"))
        self.assertEqual(engine.execute("!mod", CommandContext("viewer"), now=1).reason, "permission_denied")
        self.assertEqual(
            engine.execute("!mod", CommandContext("mod", is_moderator=True), now=1).response,
            "ok",
        )

    def test_unknown_or_non_command_message_is_ignored(self) -> None:
        engine = TwitchCommandEngine()
        engine.register(CommandDefinition("ping", "pong"))
        self.assertFalse(engine.execute("hello", CommandContext("viewer"), now=1).handled)
        self.assertFalse(engine.execute("!missing", CommandContext("viewer"), now=1).handled)


if __name__ == "__main__":
    unittest.main()
