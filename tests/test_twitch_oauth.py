import unittest

from app.twitch.oauth import DEFAULT_REDIRECT_URI, TwitchOAuthConfig


class TwitchOAuthTests(unittest.TestCase):
    def test_authorization_url_contains_required_parameters(self) -> None:
        config = TwitchOAuthConfig(client_id="abc")
        url = config.authorization_url(state="state-123")
        self.assertIn("client_id=abc", url)
        self.assertIn("redirect_uri=", url)
        self.assertIn("response_type=code", url)
        self.assertIn("state=state-123", url)
        self.assertIn("force_verify=true", url)

    def test_default_callback_matches_twitchio_v3_setup(self) -> None:
        self.assertEqual(DEFAULT_REDIRECT_URI, "http://localhost:4343/oauth/callback")

    def test_empty_state_is_rejected(self) -> None:
        with self.assertRaises(ValueError):
            TwitchOAuthConfig(client_id="abc").authorization_url(state="")


if __name__ == "__main__":
    unittest.main()
