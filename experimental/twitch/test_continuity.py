import unittest

from continuity import TwitchContinuityLedger


class TwitchContinuityTests(unittest.TestCase):
    def test_reconnect_creates_new_generation(self) -> None:
        ledger = TwitchContinuityLedger({"channel.chat.message"})
        first = ledger.on_welcome("socket-a", 10)
        self.assertEqual(first.generation, 1)
        self.assertEqual(first.reconnects, 0)
        self.assertTrue(ledger.verify_subscription_types({"channel.chat.message"}))

        second = ledger.on_welcome("socket-b", 10)
        self.assertEqual(second.generation, 2)
        self.assertEqual(second.reconnects, 1)
        self.assertFalse(second.last_verification_ok)
        self.assertFalse(ledger.verify_subscription_types(set()))

    def test_same_socket_welcome_does_not_count_as_reconnect(self) -> None:
        ledger = TwitchContinuityLedger()
        ledger.on_welcome("socket-a", 10)
        state = ledger.on_welcome("socket-a", 10)
        self.assertEqual(state.generation, 2)
        self.assertEqual(state.reconnects, 0)


if __name__ == "__main__":
    unittest.main()
