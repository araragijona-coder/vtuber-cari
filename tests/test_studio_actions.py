import unittest

from app.brain.event_bus import EventBus, RuntimeEvent
from app.studio.actions import StudioAction, StudioActionRouter


class StudioActionTests(unittest.TestCase):
    def test_action_normalizes_kind_and_value(self) -> None:
        action = StudioAction("  SCENE ", "  gameplay  ")
        self.assertEqual(action.kind, "scene")
        self.assertEqual(action.value, "gameplay")

    def test_router_translates_unhandled_action_to_runtime_event(self) -> None:
        bus = EventBus()
        events: list[RuntimeEvent] = []
        bus.subscribe("*", events.append)
        StudioActionRouter(bus).dispatch(StudioAction("sound", "ding"))
        self.assertEqual(events[-1].name, "studio_sound_requested")
        self.assertEqual(events[-1].payload["value"], "ding")

    def test_registered_handler_consumes_action_without_fallback_event(self) -> None:
        bus = EventBus()
        events: list[RuntimeEvent] = []
        bus.subscribe("*", events.append)
        consumed: list[StudioAction] = []
        router = StudioActionRouter(bus)
        router.register("chat", consumed.append)
        bus.publish(RuntimeEvent("studio_action", {"kind": "chat", "value": "hola"}))
        self.assertEqual(consumed, [StudioAction("chat", "hola")])
        self.assertNotIn("studio_chat_requested", [event.name for event in events])

    def test_invalid_event_is_audited(self) -> None:
        bus = EventBus()
        events: list[RuntimeEvent] = []
        bus.subscribe("*", events.append)
        bus.publish(RuntimeEvent("studio_action", {"kind": "unknown", "value": "x"}))
        self.assertEqual(events[-1].name, "studio_action_invalid")


if __name__ == "__main__":
    unittest.main()
