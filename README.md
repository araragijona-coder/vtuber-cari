# VTuber Cari

Dependency-light, local-first foundation for a modular AI VTuber.

## What is working

- Local chat filtering, gating and deterministic comment ranking.
- Local rule responses for common conversation.
- Optional OpenAI-compatible LLM fallback; no network call unless configured.
- Session memory plus fail-closed persistent memory.
- Provider-neutral voice and avatar contracts.
- Optional local `pyttsx3` TTS.
- TwitchIO 3 production bridge with managed OAuth tokens and EventSub chat.
- Twitch OAuth authorization URL contract using TwitchIO 3's documented localhost callback.
- Dependency-free animated fallback avatar rendered directly in Tkinter.
- Desktop UI now shows chat + animated avatar + degraded-mode diagnostics.
- Heavy synchronous pipeline/TTS work is moved off TwitchIO's asyncio event loop.
- Python 3.11/3.12 compile + unit-test CI.

The core intentionally stays dependency-free. Optional integrations are loaded only when enabled.

## Run locally

```bash
python main.py
```

For local Windows speech:

```bash
pip install -e ".[tts]"
set CARI_TTS=pyttsx3
python main.py
```

For an OpenAI-compatible LLM (OpenAI, OpenRouter or another compatible endpoint):

```text
CARI_LLM_API_KEY=...
CARI_LLM_MODEL=...
CARI_LLM_ENDPOINT=https://api.openai.com/v1/chat/completions
```

The LLM is a fallback: greetings/thanks/goodbyes are answered locally first. Without a key/model, Cari remains local-only.

## Twitch

Install the optional integration:

```bash
pip install -e ".[twitch]"
```

The production entrypoint is:

```bash
python run_twitch.py
```

Configure these environment variables:

```text
CARI_TWITCH_CLIENT_ID=...
CARI_TWITCH_CLIENT_SECRET=...
CARI_TWITCH_BOT_ID=...
CARI_TWITCH_OWNER_ID=...
```

TwitchIO 3's documented OAuth callback is `http://localhost:4343/oauth/callback`. The built-in web adapter handles authorization and managed token persistence. TwitchIO can refresh stored user tokens automatically, and the bot subscribes to `ChatMessageSubscription` over WebSocket EventSub. Cari never asks for a Twitch password. citeturn0search0turn0search6

On a real machine, authorize the bot account through the Twitch OAuth page opened by TwitchIO. The bot then receives chat, sends each accepted message through Cari's local-first pipeline, optionally falls back to the configured LLM, speaks through the configured TTS backend, and responds to Twitch with the generated text.

## Architecture

```text
Twitch EventSub
      |
      v
 filter -> gate -> rank
      |
      v
 local rules ---------> response
      |
      +---- no rule -> optional LLM
                              |
                              v
                       AIResponse contract
                         /             \
                        v               v
                     Voice             Avatar
                      |                  |
                     TTS          Tk fallback renderer

Memory: session -> explicit promotion -> persistent JSON
Integrity: atomic write + fail-closed load
```

## Validation

```bash
python -m unittest discover -s tests -q
python -m compileall -q app tests
```

GitHub Actions runs the same checks on Python 3.11 and 3.12.

## Closure status

**Software foundation: GREEN.** The CI suite is the automated gate. The production Twitch bridge now follows the current TwitchIO 3 OAuth/EventSub model instead of the older token-constructor pattern. TwitchIO's current Bot API requires `client_id`, `client_secret`, `bot_id` and uses managed tokens; chat can be subscribed through WebSocket EventSub. citeturn1search0turn1search1

The remaining items for a literal **100% stream-ready** state are external/operational:

1. Put the real Cari artwork/model assets into the project (the current renderer is a functional animated fallback).
2. Create/configure the Twitch Developer application and complete OAuth once.
3. Choose/install the production TTS voice.
4. Configure OBS/capture if the stream output is required.
5. Perform one real Twitch end-to-end rehearsal: receive chat -> decide -> answer -> voice -> avatar -> capture.

These cannot honestly be marked green from GitHub CI alone because they require the user's local assets, Twitch account authorization and streaming environment.
