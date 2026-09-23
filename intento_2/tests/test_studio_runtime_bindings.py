import unittest

from app.brain.event_bus import EventBus, RuntimeEvent
from app.studio.runtime_bindings import (
    BackendPreference,
    NativeBackend,
    OBSBackend,
    StudioRuntimeBindings,
)


class StudioRuntimeBindingTests(unittest.TestCase):
    @staticmethod
    def _names(events: list[RuntimeEvent]) -> list[str]:
        return [event.name for event in events]

    def test_native_backend_is_primary_in_auto_mode(self) -> None:
        bus = EventBus()
        events: list[RuntimeEvent] = []
        bus.subscribe("*", events.append)
        calls: list[str] = []
        runtime = StudioRuntimeBindings(
            bus,
            native=NativeBackend(
                {"scene": lambda action: calls.append(f"native:{action.value}")}
            ),
            obs=OBSBackend(
                {"scene": lambda action: calls.append(f"obs:{action.value}")}
            ),
        )

        result = runtime.dispatch_payload({"kind": "scene", "value": "gameplay"})

        self.assertTrue(result)
        self.assertEqual(calls, ["native:gameplay"])
        self.assertEqual(runtime.snapshot()["metrics"]["native_handled"], 1)
        self.assertIn("studio_backend_selected", self._names(events))
        self.assertNotIn("studio_backend_fallback", self._names(events))

    def test_obs_fallback_requires_native_unavailable_or_unsupported(self) -> None:
        bus = EventBus()
        events: list[RuntimeEvent] = []
        bus.subscribe("*", events.append)
        calls: list[str] = []
        runtime = StudioRuntimeBindings(
            bus,
            native=NativeBackend(
                {"scene": lambda action: calls.append(f"native:{action.value}")},
                availability=lambda: False,
            ),
            obs=OBSBackend({"scene": lambda action: calls.append(f"obs:{action.value}")}),
        )

        self.assertTrue(
            runtime.dispatch_payload({"kind": "scene", "value": "gameplay"})
        )
        self.assertEqual(calls, ["obs:gameplay"])
        self.assertEqual(runtime.snapshot()["metrics"]["fallback_count"], 1)
        self.assertEqual(runtime.snapshot()["metrics"]["obs_handled"], 1)
        self.assertIn("studio_backend_unavailable", self._names(events))
        self.assertIn("studio_backend_fallback", self._names(events))

    def test_auto_mode_falls_back_when_native_lacks_capability(self) -> None:
        bus = EventBus()
        calls: list[str] = []
        runtime = StudioRuntimeBindings(
            bus,
            native=NativeBackend({"capture": lambda _: calls.append("native")}),
            obs=OBSBackend({"scene": lambda _: calls.append("obs")}),
        )

        self.assertTrue(
            runtime.dispatch_payload({"kind": "scene", "value": "main"})
        )
        self.assertEqual(calls, ["obs"])
        self.assertEqual(runtime.snapshot()["metrics"]["unsupported"], 1)

    def test_explicit_native_never_falls_back_to_obs(self) -> None:
        bus = EventBus()
        calls: list[str] = []
        runtime = StudioRuntimeBindings(
            bus,
            native=NativeBackend(
                {"scene": lambda _: calls.append("native")},
                availability=lambda: False,
            ),
            obs=OBSBackend({"scene": lambda _: calls.append("obs")}),
            preference=BackendPreference.NATIVE,
        )

        self.assertFalse(
            runtime.dispatch_payload({"kind": "scene", "value": "main"})
        )
        self.assertEqual(calls, [])
        self.assertIsNone(runtime.snapshot()["metrics"]["last_backend"])

    def test_explicit_obs_uses_obs_when_configured(self) -> None:
        bus = EventBus()
        calls: list[str] = []
        runtime = StudioRuntimeBindings(
            bus,
            native=NativeBackend({"scene": lambda _: calls.append("native")}),
            obs=OBSBackend({"scene": lambda _: calls.append("obs")}),
            preference=BackendPreference.OBS,
        )

        self.assertTrue(runtime.dispatch_payload({"kind": "scene", "value": "main"}))
        self.assertEqual(calls, ["obs"])

    def test_backend_exception_does_not_trigger_duplicate_side_effects(self) -> None:
        bus = EventBus()
        events: list[RuntimeEvent] = []
        bus.subscribe("*", events.append)
        calls: list[str] = []
        runtime = StudioRuntimeBindings(
            bus,
            native=NativeBackend(
                {"stream": lambda _: (_ for _ in ()).throw(RuntimeError("native failed"))}
            ),
            obs=OBSBackend({"stream": lambda _: calls.append("obs")}),
        )

        self.assertFalse(
            runtime.dispatch_payload({"kind": "stream", "value": "start"})
        )
        self.assertEqual(calls, [])
        self.assertIn("studio_backend_error", self._names(events))

    def test_unhandled_action_remains_visible_without_fake_backend(self) -> None:
        bus = EventBus()
        events: list[RuntimeEvent] = []
        bus.subscribe("*", events.append)
        runtime = StudioRuntimeBindings(bus)

        self.assertFalse(
            runtime.dispatch_payload({"kind": "music", "value": "bgm_01"})
        )
        self.assertEqual(runtime.snapshot()["metrics"]["handled"], 0)
        self.assertIn("studio_music_requested", self._names(events))
        self.assertIn("studio_action_unhandled", self._names(events))

    def test_legacy_register_uses_native_by_default(self) -> None:
        bus = EventBus()
        events: list[RuntimeEvent] = []
        bus.subscribe("*", events.append)
        received: list[str] = []
        runtime = StudioRuntimeBindings(bus)
        runtime.register("scene", lambda action: received.append(action.value))

        bus.publish(
            RuntimeEvent("studio_action", {"kind": "scene", "value": "gameplay"})
        )

        self.assertEqual(received, ["gameplay"])
        self.assertEqual(runtime.snapshot()["metrics"]["handled"], 1)
        self.assertIn("studio_action_handled", self._names(events))

    def test_backend_failure_is_isolated_and_counted(self) -> None:
        bus = EventBus()
        events: list[RuntimeEvent] = []
        bus.subscribe("*", events.append)
        runtime = StudioRuntimeBindings(bus)

        runtime.register(
            "sound",
            lambda _: (_ for _ in ()).throw(RuntimeError("boom")),
        )

        bus.publish(
            RuntimeEvent("studio_action", {"kind": "sound", "value": "ding"})
        )

        snapshot = runtime.snapshot()
        self.assertEqual(snapshot["metrics"]["errors"], 1)
        self.assertIn("studio_backend_error", self._names(events))


if __name__ == "__main__":
    unittest.main()
