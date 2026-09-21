# Cari Studio — local streaming core

Cari Studio is the product direction for the application: a local-first creator/VTuber control center inspired by the practical parts of OBS, but intentionally narrower and easier to operate.

## Non-goals

- No OBS clone.
- No embedded OBS replacement.
- No mandatory AI, LLM or cloud API.
- No mandatory internet connection for local capture, audio, camera, VTuber and monitoring.

## Core modules

1. **Capture** — display, window and game sources.
2. **Scenes** — ordered source composition and quick scene switching.
3. **Audio mixer** — microphone, game, music and application sources with meters and mute/volume controls.
4. **Streaming** — platform profiles and optional multi-stream output.
5. **Voice** — local voice effects/anime-style voice processing as an independent provider.
6. **VTuber** — Cari or another supported character, with replaceable assets and no hard-coded appearance.
7. **Chat/events** — platform chat, follows, subscriptions, raids, commands and local event actions.
8. **Camera** — framing/preset control without requiring OBS.
9. **Monitoring** — CPU/GPU/RAM/FPS/bitrate/audio/capture health expressed as simple percentages/statuses.

## Core architecture

The native side is now organized around a reusable `experimental/studio/core` layer:

```text
source adapters
     ↓
SourceRegistry
     ↓
timestamped frame/audio contracts
     ↓
bounded queues
     ↓
scene + audio mixer
     ↓
encoder/output boundaries
     ↓
recording / streaming adapters
```

The core boundaries are intentionally independent of Windows APIs so that Windows Graphics Capture, WASAPI, camera, game capture and future multimedia libraries can be attached as adapters instead of forcing a rewrite of the engine.

## Design rule

The application must remain useful in **manual/offline mode**. Network integrations are adapters around the local engine, not the engine itself. AI is an optional future provider and must never be required for startup or normal capture/streaming workflows.

## Experimental boundary

This directory is deliberately experimental until the target Windows PC has been benchmarked. Hardware-specific capture and encoder choices must be validated before promotion into production.

The native Windows prototype now has a real Windows Graphics Capture/D3D11 path plus a native Cari Core smoke test. The smoke test validates source registration, scene management, audio mixing, bounded frame queues, monitoring classification and the output boundary; it does not yet prove real hardware capture/render/encoding.
