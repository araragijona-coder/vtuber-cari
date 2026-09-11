# VTuber Cari

Dependency-light, local-first foundation for a modular AI VTuber.

## What is working

- Local chat filtering, gating and deterministic comment ranking.
- Local rule responses for common conversation.
- Optional OpenAI-compatible LLM fallback; no network call unless configured.
- Session memory plus fail-closed persistent memory.
- Provider-neutral voice and avatar contracts.
- Optional local `pyttsx3` TTS.
- Optional TwitchIO 3 adapter.
- Twitch OAuth authorization URL contract using TwitchIO 3's documented localhost callback.
- Dependency-free animated fallback avatar rendered directly in Tkinter.
- Desktop UI now shows chat + animated avatar + degraded-mode diagnostics.
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

TwitchIO 3 requires Python 3.11+. Its documented OAuth callback is `http://localhost:4343/oauth/callback`. Cari exposes that callback and the standard authorization URL parameters through `TwitchOAuthConfig`; the actual client ID, secret and user authorization remain operator configuration. The application never asks for a Twitch password.

The current `TwitchAdapter` accepts a managed user token and feeds incoming chat into the same `ChatMessage` pipeline used by the desktop UI. TwitchIO 3 also provides built-in token refresh/storage and EventSub support for the production OAuth flow.

## Architecture

```text
Twitch / desktop input
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

**Foundation: GREEN.** The latest CI run completed successfully on both Python 3.11 and 3.12 after the avatar/OAuth additions.

The remaining blockers for a literal **100% stream-ready** state are external/operational rather than missing core architecture:

1. Put the real Cari artwork/model assets into the project (the current renderer is a functional animated fallback).
2. Configure a Twitch Developer application and authorize the bot account.
3. Choose/install the production TTS voice.
4. Wire the chosen capture/output target (OBS or another capture path).
5. Perform one real Twitch end-to-end rehearsal: receive chat -> decide -> answer -> voice -> avatar -> capture.

Those steps require the user's actual assets, Twitch account/app credentials and local streaming environment, so they cannot honestly be marked green from CI alone.
