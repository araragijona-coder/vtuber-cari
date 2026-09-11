import unittest

from app.brain.event_bus import EventBus, RuntimeEvent


class EventBusTests(unittest.TestCase):
    def test_specific_and_wildcard_listeners_receive_event(self) -> None:
        bus = EventBus()
        received: list[str] = []
        bus.subscribe("message", lambda event: received.append(f"specific:{event.payload['id']}"))
        bus.subscribe("*", lambda event: received.append(f"all:{event.name}"))

        bus.publish(RuntimeEvent("message", {"id": "42"}))

        self.assertEqual(received, ["specific:42", "all:message"])

    def test_listener_failure_does_not_break_other_listeners(self) -> None:
        bus = EventBus()
        received: list[str] = []

        def broken(_: RuntimeEvent) -> None:
            raise RuntimeError("observer failed")

        bus.subscribe("response", broken)
        bus.subscribe("response", lambda _: received.append("ok"))
        bus.publish(RuntimeEvent("response"))

        self.assertEqual(received, ["ok"])

    def test_duplicate_subscription_is_ignored_and_unsubscribe_works(self) -> None:
        bus = EventBus()
        received: list[str] = []
        listener = lambda _: received.append("hit")

        bus.subscribe("x", listener)
        bus.subscribe("x", listener)
        bus.publish(RuntimeEvent("x"))
        bus.unsubscribe("x", listener)
        bus.publish(RuntimeEvent("x"))

        self.assertEqual(received, ["hit"])

    def test_empty_event_name_is_rejected(self) -> None:
        with self.assertRaises(ValueError):
            EventBus().subscribe("", lambda _: None)


if __name__ == "__main__":
    unittest.main()
