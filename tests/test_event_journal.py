import unittest

from app.brain.event_bus import EventBus, EventJournal, RuntimeEvent


class EventJournalTests(unittest.TestCase):
    def test_journal_is_bounded_and_keeps_newest_events(self) -> None:
        journal = EventJournal(max_events=2)
        for name in ("one", "two", "three"):
            journal.record(RuntimeEvent(name))

        self.assertEqual([event.name for event in journal.snapshot()], ["two", "three"])
        self.assertEqual(len(journal), 2)

    def test_bus_records_events_before_observers_run(self) -> None:
        journal = EventJournal(max_events=4)
        bus = EventBus(journal=journal)
        observed: list[str] = []

        def observer(event: RuntimeEvent) -> None:
            observed.append(journal.snapshot()[-1].name)
            observed.append(event.name)

        bus.subscribe("message", observer)
        bus.publish(RuntimeEvent("message", {"id": "7"}))

        self.assertEqual(observed, ["message", "message"])

    def test_snapshot_can_filter_event_names_and_clear(self) -> None:
        journal = EventJournal(max_events=4)
        journal.record(RuntimeEvent("message"))
        journal.record(RuntimeEvent("speech"))
        journal.record(RuntimeEvent("message"))

        self.assertEqual([event.name for event in journal.snapshot(names=("message",))], ["message", "message"])
        journal.clear()
        self.assertEqual(journal.snapshot(), ())

    def test_invalid_capacity_is_rejected(self) -> None:
        with self.assertRaises(ValueError):
            EventJournal(max_events=0)


if __name__ == "__main__":
    unittest.main()
