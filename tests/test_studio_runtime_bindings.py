import unittest

from app.brain.event_bus import EventBus, RuntimeEvent
from app.studio.runtime_bindings import StudioRuntimeBindings


class StudioRuntimeBindingTests(unittest.TestCase):
    def test_registered_backend_consumes_action_and_updates_metrics(self) -> None:
        bus = EventBus()
        events: list[RuntimeEvent] = []
        bus.subscribe("*", events.append)
        received: list[str] = []
        runtime = StudioRuntimeBindings(bus)
        runtime.register("scene", received.append)

        bus.publish(RuntimeEvent("studio_action", {"kind": "scene", "value": "gameplay"}))

        self.assertEqual(received, ["gameplay"])
        self.assertEqual(runtime.snapshot()["handled"], 1)
        self.assertEqual(events[-1].name, "studio_action_handled")

    def test_backend_failure_is_isolated_and_counted(self) -> None:
        bus = EventBus()
        events: list[RuntimeEvent] = []
        bus.subscribe("*", events.append)
        runtime = StudioRuntimeBindings(bus)

        def broken(_: str) -> None:
            raise RuntimeError("boom")

        runtime.register("sound", broken)
        bus.publish(RuntimeEvent("studio_action", {"kind": "sound", "value": "ding"}))

        self.assertEqual(runtime.snapshot()["errors"], 1)
        self.assertEqual(events[-1].name, "studio_backend_error")

    def test_missing_backend_remains_visible(self) -> None:
        bus = EventBus()
        events: list[RuntimeEvent] = []
        bus.subscribe("*", events.append)
        runtime = StudioRuntimeBindings(bus)

        bus.publish(RuntimeEvent("studio_action", {"kind": "music", "value": "bgm_01"}))

        self.assertEqual(runtime.snapshot()["handled"], 0)
        self.assertEqual(events[-1].name, "studio_music_requested")


if __name__ == "__main__":
    unittest.main()
