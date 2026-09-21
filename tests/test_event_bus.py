import unittest

from app.brain.event_bus import EventBus, EventJournal, RuntimeEvent


class EventBusTests(unittest.TestCase):
    def test_specific_and_wildcard_listeners_receive_event(self) -> None:
        bus = EventBus()
        received: list[str] = []
        bus.subscribe("message", lambda event: received.append(f"specific:{event.payload['id']}"))
        bus.subscribe("*", lambda event: received.append(f"all:{event.name}"))

        bus.publish(RuntimeEvent("message", {"id": "42"}))

        self.assertEqual(received, ["specific:42", "all:message"])
        self.assertEqual(bus.snapshot()["published"], 1)
        self.assertEqual(bus.snapshot()["delivered"], 2)

    def test_listener_failure_does_not_break_other_listeners(self) -> None:
        bus = EventBus()
        received: list[str] = []

        def broken(_: RuntimeEvent) -> None:
            raise RuntimeError("observer failed")

        bus.subscribe("response", broken)
        bus.subscribe("response", lambda _: received.append("ok"))
        bus.publish(RuntimeEvent("response"))

        self.assertEqual(received, ["ok"])
        self.assertEqual(bus.snapshot()["listener_errors"], 1)

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
        self.assertEqual(bus.listeners("x"), 0)

    def test_reentrant_publish_is_safe(self) -> None:
        bus = EventBus()
        received: list[str] = []

        def outer(_: RuntimeEvent) -> None:
            bus.publish(RuntimeEvent("inner"))

        bus.subscribe("outer", outer)
        bus.subscribe("inner", lambda _: received.append("inner"))

        bus.publish(RuntimeEvent("outer"))

        self.assertEqual(received, ["inner"])

    def test_journal_remains_bounded(self) -> None:
        journal = EventJournal(max_events=2)
        bus = EventBus(journal=journal)
        for number in range(3):
            bus.publish(RuntimeEvent("event", {"id": number}))

        self.assertEqual(len(journal), 2)
        self.assertEqual(
            [event.payload["id"] for event in journal.snapshot()],
            [1, 2],
        )

    def test_empty_event_name_is_rejected(self) -> None:
        with self.assertRaises(ValueError):
            EventBus().subscribe("", lambda _: None)

        with self.assertRaises(ValueError):
            EventBus().publish(RuntimeEvent("  "))


if __name__ == "__main__":
    unittest.main()
