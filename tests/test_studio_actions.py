import unittest

from app.brain.event_bus import EventBus, RuntimeEvent
from app.studio.actions import StudioAction, StudioActionRouter


class StudioActionTests(unittest.TestCase):
    def test_action_normalizes_kind_and_value(self) -> None:
        action = StudioAction("  SCENE ", "  gameplay  ")
        self.assertEqual(action.kind, "scene")
        self.assertEqual(action.value, "gameplay")

    def test_expanded_control_kinds_are_supported(self) -> None:
        supported = StudioActionRouter.supported_kinds()
        for kind in (
            "stream",
            "recording",
            "source",
            "volume",
            "mute",
            "camera",
            "avatar",
            "expression",
            "tracking",
            "command",
            "voice",
        ):
            self.assertIn(kind, supported)

    def test_router_translates_unhandled_action_to_runtime_event(self) -> None:
        bus = EventBus()
        events: list[RuntimeEvent] = []
        bus.subscribe("*", events.append)
        StudioActionRouter(bus).dispatch(StudioAction("sound", "ding"))
        self.assertEqual(events[-1].name, "studio_sound_requested")
        self.assertEqual(events[-1].payload["value"], "ding")

    def test_stream_action_is_forwarded(self) -> None:
        bus = EventBus()
        events: list[RuntimeEvent] = []
        bus.subscribe("*", events.append)
        StudioActionRouter(bus).dispatch(StudioAction("stream", "start"))

        self.assertEqual(events[-1].name, "studio_stream_requested")
        self.assertEqual(events[-1].payload["value"], "start")

    def test_registered_handler_consumes_action_without_fallback_event(self) -> None:
        bus = EventBus()
        events: list[RuntimeEvent] = []
        bus.subscribe("*", events.append)
        consumed: list[StudioAction] = []
        router = StudioActionRouter(bus)
        router.register("chat", consumed.append)
        bus.publish(RuntimeEvent("studio_action", {"kind": "chat", "value": "hola"}))

        self.assertEqual(consumed, [StudioAction("chat", "hola")])
        self.assertNotIn(
            "studio_chat_requested",
            [event.name for event in events],
        )

    def test_invalid_event_is_audited_by_router(self) -> None:
        bus = EventBus()
        events: list[RuntimeEvent] = []
        bus.subscribe("*", events.append)
        StudioActionRouter(bus)
        bus.publish(
            RuntimeEvent(
                "studio_action",
                {"kind": "unknown", "value": "x"},
            )
        )

        self.assertIn("studio_action_invalid", [event.name for event in events])


if __name__ == "__main__":
    unittest.main()
