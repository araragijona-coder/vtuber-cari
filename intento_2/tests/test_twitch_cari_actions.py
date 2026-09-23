import unittest

from app.brain.event_bus import EventJournal
from app.pipeline.runtime import LocalPipeline
from app.twitch.automation import AutomationAction
from app.twitch.cari_actions import LocalCariActionHandler


class TwitchCariActionHandlerTests(unittest.TestCase):
    def test_studio_action_is_forwarded_as_runtime_event(self) -> None:
        pipeline = LocalPipeline(event_journal=EventJournal())
        handler = LocalCariActionHandler(pipeline)
        handler(AutomationAction("scene", "raid"))
        events = pipeline.event_journal.snapshot(names=["studio_action"])
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0].payload, {"kind": "scene", "value": "raid"})

    def test_unknown_action_is_audited(self) -> None:
        pipeline = LocalPipeline(event_journal=EventJournal())
        handler = LocalCariActionHandler(pipeline)
        handler(AutomationAction("future_action", "x"))
        events = pipeline.event_journal.snapshot(names=["automation_action_unhandled"])
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0].payload["kind"], "future_action")


if __name__ == "__main__":
    unittest.main()
