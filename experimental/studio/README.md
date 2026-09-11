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

## Design rule

The application must remain useful in **manual/offline mode**. Network integrations are adapters around the local engine, not the engine itself. AI is an optional future provider and must never be required for startup or normal capture/streaming workflows.

## Experimental boundary

This directory is deliberately experimental until the target Windows PC has been benchmarked. Hardware-specific capture and encoder choices must be validated before promotion into production.
