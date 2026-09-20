import unittest

from twitchio import eventsub


class TwitchSubscriptionContractTests(unittest.TestCase):
    def test_channel_follow_includes_required_moderator(self) -> None:
        payload = eventsub.ChannelFollowSubscription(
            broadcaster_user_id="broadcaster-1",
            moderator_user_id="broadcaster-1",
        )
        self.assertEqual(payload.condition["broadcaster_user_id"], "broadcaster-1")
        self.assertEqual(payload.condition["moderator_user_id"], "broadcaster-1")

    def test_chat_message_uses_bot_user_id(self) -> None:
        payload = eventsub.ChatMessageSubscription(
            broadcaster_user_id="broadcaster-1",
            user_id="bot-1",
        )
        self.assertEqual(payload.condition["broadcaster_user_id"], "broadcaster-1")
        self.assertEqual(payload.condition["user_id"], "bot-1")


if __name__ == "__main__":
    unittest.main()
