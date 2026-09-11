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
- Desktop Tkinter smoke UI.
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

For Twitch:

```bash
pip install -e ".[twitch]"
```

Twitch credentials are supplied to `TwitchConfig`; the application never asks for a Twitch password.

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
                     TTS              renderer

Memory: session -> explicit promotion -> persistent JSON
Integrity: atomic write + fail-closed load
```

## Validation

```bash
python -m unittest discover -s tests -q
python -m compileall -q app tests
```

GitHub Actions runs the same checks on Python 3.11 and 3.12.

## Current closure status

The software foundation is green. The remaining stream-specific work is operational rather than architectural: real Cari avatar assets/renderer, Twitch OAuth credentials, a chosen production TTS voice, OBS/capture wiring and a real end-to-end stream rehearsal.
