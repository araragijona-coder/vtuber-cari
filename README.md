# VTuber Cari

Dependency-light, local-first foundation for a modular AI VTuber.

## What is working

- Local chat filtering, gating and deterministic comment ranking.
- Local rule responses for common conversation.
- **Local-first intelligence order: local rules -> Ollama -> cloud/API fallback.**
- Ollama is probed before use, so it is not called for messages already handled locally and is not waited on when the service is absent.
- Cloud/OpenAI-compatible API is secondary and only used when configured and Ollama is unavailable/fails.
- Session memory plus fail-closed persistent memory.
- Provider-neutral voice and avatar contracts.
- Optional local `pyttsx3` TTS.
- TwitchIO 3 production bridge with managed OAuth tokens and EventSub chat.
- Twitch OAuth authorization URL contract using TwitchIO 3's documented localhost callback.
- Dependency-free animated fallback avatar rendered directly in Tkinter.
- Desktop UI with chat, animated avatar, degraded diagnostics, and a live **CPU/provider usage strip** showing local, Ollama, API, failures and latency.
- Heavy synchronous pipeline/TTS work is moved off TwitchIO's asyncio event loop.
- Python 3.11/3.12 compile + unit-test CI.

The core intentionally stays dependency-free. Optional integrations are loaded only when enabled.

## Intelligence modes

Default mode is `auto`:

```text
message
  |
  +--> local rule? ---- yes --> answer
  |
  no
  |
  +--> Ollama running? ---- yes --> local model
  |                               |
  |                               +--> failure --> cloud/API (if configured)
  |
  no
  |
  +--> cloud/API (if configured)
  |
  no provider --> local degraded response
```

Force a mode with `CARI_LLM_MODE`:

```text
local   = rules only; never calls a model/API
ollama  = local Ollama only
api     = configured OpenAI-compatible API only

auto    = local rules -> Ollama -> API (default)
```

For the small local model requested for testing, use:

```bash
ollama run llama3.2:1b
```

Llama 3.2 officially provides a 1B text model intended for local/edge use and multilingual dialogue, including Spanish. citeturn0search0turn0search1

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

For a secondary OpenAI-compatible fallback:

```text
CARI_LLM_API_KEY=...
CARI_LLM_MODEL=...
CARI_LLM_ENDPOINT=https://api.openai.com/v1/chat/completions
```

Without a key/model, Cari remains fully local when Ollama is available and otherwise degrades to rules-only behavior.

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

The bot receives chat, sends accepted messages through the local-first pipeline, optionally uses Ollama, only then falls back to the configured API, speaks through TTS, and responds to Twitch with the generated text.

## Architecture

```text
Twitch EventSub
      |
      v
 filter -> gate -> rank
      |
      v
 local rules ----------------------> response
      |
      +---- no rule -> Ollama (if running)
                           |
                           +---- unavailable/failure -> API (if configured)
                                           |
                                           v
                                    AIResponse contract
                                      /             \
                                     v               v
                                  Voice             Avatar
                                   |                  |
                                  TTS          Tk fallback renderer

Memory: session -> explicit promotion -> persistent JSON
Usage: CPU/process time + local/Ollama/API counters + latency
Integrity: atomic write + fail-closed load
```

## Validation

```bash
python -m unittest discover -s tests -q
python -m compileall -q app tests
```

GitHub Actions runs the same checks on Python 3.11 and 3.12.

## Experimental isolation

Uncertain external programs, research patterns and benchmarks belong under `experimental/` until tested. They are not treated as production dependencies merely because an open-source project demonstrates the idea.

The current Ollama benchmark scripts can compare small local models on the actual machine instead of guessing performance. Llama 3.2 1B has official quantized variants as small as roughly 771 MB for Q4_0. citeturn0search2turn0search6

## Closure status

**Software foundation: GREEN only after the latest GitHub Actions run is verified.** CI is the automated gate; local model performance still needs a real run on the target PC.

Remaining external/operational items for literal **100% stream-ready**:

1. Real Cari artwork/model assets.
2. Twitch Developer application + OAuth authorization.
3. Production TTS voice.
4. OBS/capture configuration.
5. Real Twitch end-to-end rehearsal: chat -> decision -> answer -> voice -> avatar -> capture.
6. Benchmark Ollama on the target PC and choose the best small model.

These cannot honestly be marked green from repository CI alone because they require the user's local assets, accounts and streaming environment.