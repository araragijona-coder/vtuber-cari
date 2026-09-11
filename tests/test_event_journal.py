import unittest

from app.brain.event_bus import EventBus, EventJournal, RuntimeEvent
from app.pipeline.runtime import LocalPipeline


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

    def test_pipeline_has_bounded_journal_by_default(self) -> None:
        pipeline = LocalPipeline()

        self.assertIsNotNone(pipeline.event_journal)
        self.assertIs(pipeline.event_journal, pipeline.event_bus.journal)

        pipeline.event_bus.publish(RuntimeEvent("probe"))
        self.assertEqual([event.name for event in pipeline.event_journal.snapshot()], ["probe"])

    def test_pipeline_accepts_explicit_journal(self) -> None:
        journal = EventJournal(max_events=3)
        pipeline = LocalPipeline(event_journal=journal)

        self.assertIs(pipeline.event_journal, journal)
        self.assertIs(pipeline.event_bus.journal, journal)

    def test_pipeline_rejects_ambiguous_event_configuration(self) -> None:
        with self.assertRaises(ValueError):
            LocalPipeline(event_bus=EventBus(), event_journal=EventJournal())


if __name__ == "__main__":
    unittest.main()
