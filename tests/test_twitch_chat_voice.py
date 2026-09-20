import unittest

from app.twitch.chat_voice import ChatVoiceRouter


class TwitchChatVoiceTests(unittest.TestCase):
    def test_only_prefixed_messages_are_public(self) -> None:
        router = ChatVoiceRouter()
        self.assertIsNone(router.parse("viewer", "hola Cari"))
        request = router.parse("viewer", "1+ hola Cari")
        self.assertIsNotNone(request)
        self.assertEqual(request.text, "hola Cari")
        self.assertEqual(request.viewer, "viewer")

    def test_trigger_is_case_insensitive(self) -> None:
        router = ChatVoiceRouter(trigger="1+")
        self.assertEqual(router.parse("viewer", "1+ HOLA").text, "HOLA")

    def test_empty_and_oversized_messages_are_handled(self) -> None:
        router = ChatVoiceRouter(max_length=10)
        self.assertIsNone(router.parse("viewer", "1+"))
        request = router.parse("viewer", "1+   uno   dos   tres   cuatro")
        self.assertEqual(request.text, "uno dos tr")


if __name__ == "__main__":
    unittest.main()
