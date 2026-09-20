import unittest

from app.twitch.automation import AutomationAction, AutomationEngine, AutomationEvent, AutomationRule


class TwitchAutomationTests(unittest.TestCase):
    def test_dispatch_renders_event_data(self) -> None:
        engine = AutomationEngine()
        engine.add_rule(
            AutomationRule(
                "follow",
                (
                    AutomationAction("chat", "¡Gracias {user}!"),
                    AutomationAction("avatar", "happy", delay_seconds=0.5),
                ),
            )
        )
        actions = engine.dispatch(AutomationEvent("follow", {"user": "viewer"}))
        self.assertEqual(actions[0].value, "¡Gracias viewer!")
        self.assertEqual(actions[1].delay_seconds, 0.5)

    def test_disabled_rules_do_not_fire(self) -> None:
        engine = AutomationEngine()
        engine.add_rule(AutomationRule("raid", (AutomationAction("scene", "raid"),), enabled=False))
        self.assertEqual(engine.dispatch(AutomationEvent("raid", {"count": "10"})), ())

    def test_multiple_rules_keep_registration_order(self) -> None:
        engine = AutomationEngine()
        engine.add_rule(AutomationRule("follow", (AutomationAction("sound", "one"),)))
        engine.add_rule(AutomationRule("follow", (AutomationAction("sound", "two"),)))
        self.assertEqual(
            [action.value for action in engine.dispatch(AutomationEvent("follow", {}))],
            ["one", "two"],
        )

    def test_invalid_action_delay_is_rejected(self) -> None:
        engine = AutomationEngine()
        with self.assertRaises(ValueError):
            engine.add_rule(
                AutomationRule("sub", (AutomationAction("sound", "x", delay_seconds=-1),))
            )


if __name__ == "__main__":
    unittest.main()
