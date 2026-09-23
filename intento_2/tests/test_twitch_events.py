import unittest
from types import SimpleNamespace

from app.twitch.events import normalize_twitch_event


class TwitchEventNormalizationTests(unittest.TestCase):
    def test_follow_maps_user(self) -> None:
        payload = SimpleNamespace(user=SimpleNamespace(id="42", name="viewer"))
        event = normalize_twitch_event("follow", payload)
        self.assertEqual(event.kind, "follow")
        self.assertEqual(event.data["user"], "viewer")
        self.assertEqual(event.data["user_id"], "42")

    def test_eventsub_message_id_is_preserved(self) -> None:
        payload = SimpleNamespace(
            metadata=SimpleNamespace(message_id="evt-123"),
            user=SimpleNamespace(id="42", name="viewer"),
        )
        event = normalize_twitch_event("follow", payload)
        self.assertEqual(event.data["event_id"], "evt-123")

    def test_cheer_maps_bits_and_message(self) -> None:
        payload = SimpleNamespace(
            user=SimpleNamespace(name="viewer"),
            bits=100,
            message="Cari!",
        )
        event = normalize_twitch_event("cheer", payload)
        self.assertEqual(event.data["bits"], "100")
        self.assertEqual(event.data["message"], "Cari!")

    def test_raid_maps_raider_and_viewers(self) -> None:
        payload = SimpleNamespace(
            user=SimpleNamespace(name="target"),
            from_broadcaster=SimpleNamespace(name="raider"),
            viewers=25,
        )
        event = normalize_twitch_event("raid", payload)
        self.assertEqual(event.data["user"], "target")
        self.assertEqual(event.data["raider"], "raider")
        self.assertEqual(event.data["viewers"], "25")

    def test_subscription_gift_maps_totals(self) -> None:
        payload = SimpleNamespace(
            user=SimpleNamespace(name="gifter"),
            total=5,
            cumulative_total=15,
            tier="1000",
        )
        event = normalize_twitch_event("subscription_gift", payload)
        self.assertEqual(event.data["total"], "5")
        self.assertEqual(event.data["cumulative_total"], "15")
        self.assertEqual(event.data["tier"], "1000")

    def test_channel_points_maps_reward_and_input(self) -> None:
        payload = SimpleNamespace(
            user=SimpleNamespace(name="viewer"),
            reward=SimpleNamespace(id="reward-1", title="Cafe para Cari"),
            user_input="sin azucar",
        )
        event = normalize_twitch_event("channel_points", payload)
        self.assertEqual(event.data["reward_id"], "reward-1")
        self.assertEqual(event.data["reward"], "Cafe para Cari")
        self.assertEqual(event.data["input"], "sin azucar")


if __name__ == "__main__":
    unittest.main()
