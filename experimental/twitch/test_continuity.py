from continuity import TwitchContinuityLedger


def main() -> None:
    ledger = TwitchContinuityLedger({"channel.chat.message"})
    first = ledger.on_welcome("socket-a", 10)
    assert first.generation == 1
    assert first.reconnects == 0
    assert ledger.verify_subscription_types({"channel.chat.message"})
    assert ledger.state.last_verification_ok is True

    second = ledger.on_welcome("socket-b", 10)
    assert second.generation == 2
    assert second.reconnects == 1
    assert second.session_id == "socket-b"
    assert ledger.state.last_verification_ok is False
    assert not ledger.verify_subscription_types(set())

    third = ledger.on_welcome("socket-b", 10)
    assert third.generation == 3
    assert third.reconnects == 1

    print("Twitch continuity ledger smoke: PASS")


if __name__ == "__main__":
    main()
