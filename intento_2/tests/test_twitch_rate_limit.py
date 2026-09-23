import unittest

from app.twitch.rate_limit import TwitchChatRateLimiter


class TwitchRateLimitTests(unittest.TestCase):
    def test_first_message_is_immediate(self) -> None:
        limiter = TwitchChatRateLimiter()
        self.assertEqual(limiter.next_delay(now=100.0), 0.0)
        limiter.record(now=100.0)
        self.assertGreaterEqual(limiter.next_delay(now=100.1), 0.89)

    def test_window_expires(self) -> None:
        limiter = TwitchChatRateLimiter()
        limiter.record(now=100.0)
        self.assertEqual(limiter.next_delay(now=101.0), 0.0)
        self.assertEqual(limiter.next_delay(now=130.0), 0.0)

    def test_burst_limit_is_enforced(self) -> None:
        limiter = TwitchChatRateLimiter(per_second=0.001, burst_window_seconds=30.0, burst_limit=2)
        limiter.record(now=100.0)
        self.assertEqual(limiter.next_delay(now=100.001), 0.0)
        limiter.record(now=100.001)
        self.assertGreater(limiter.next_delay(now=100.002), 29.9)


if __name__ == "__main__":
    unittest.main()
