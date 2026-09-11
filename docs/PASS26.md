# Pass 26 — Runtime integration closure

## Added

- Optional local TTS adapter (`pyttsx3`) behind a provider-neutral `TTSBackend` contract.
- Safe `NullTTS` backend for CI and machines without audio dependencies.
- Opt-in stdlib-only OpenAI-compatible LLM client.
- LLM configuration through `CARI_LLM_API_KEY`, `CARI_LLM_MODEL` and `CARI_LLM_ENDPOINT`.
- Pipeline fallback: local rules first, configured LLM second.
- Pipeline now sends the final voice request to the configured TTS backend.
- Desktop UI wires persistent memory, optional LLM and optional TTS.
- README updated to describe the real runtime state instead of the old Pass 21 snapshot.

## Design decision

No provider is mandatory. A fresh checkout can run without API keys, network access or optional packages. This keeps the local-first path deterministic and cheap while allowing a real provider to be enabled later.

The LLM is never treated as the source of truth for memory: only `AIResponse.remember=True` promotes data to persistent memory.

## Remaining 100% product gate

The code foundation is green, but a true stream-ready 100% still requires physical integration tests with the user's Twitch account, selected voice, actual Cari avatar assets/renderer and OBS/capture. Those cannot be honestly marked green from CI alone.
