# Cari Studio — Engineering Log

Fuente canónica de continuidad: experimental/studio/BITACORA.md.

## Checkpoint 2026-09-21

- Branch: fix/native-windows-foundation
- PR: #2
- HEAD: consultar PR #2
- Engineering: ~71%
- Product usable: ~58%
- Tracking global: ~65%
- Production: NOT READY

## Current focus
1. P0 — Asset Cari V1 real + revisión visual + tracking sobre V1.
2. P0 — Compositor GPU → frame final sin readback CPU por frame + E2E Windows observable.
3. P1 — PTS extremo a extremo con la ruta Libav explícita.
4. P1 — Drift físico + FFmpeg sostenido + grabación larga + RTMP/reconexión real.
5. P2 — Game Capture + optimización GPU + hardware real.
6. P3 — Live2D adapter + multistream + installer + distribución.

## Do not repeat
- Windows Graphics Capture
- WASAPI + AudioTimelineMixer
- MediaClock/RealtimePacer/Interleaver
- FFmpeg supervisor
- RawPipe
- MediaPipe timestamp guard
- FaceTrackingBridge
- Three.js/glTF renderer base
- Electron security foundation
- OBS optional bridge

## Evidence states
CODE_EXISTS | UNIT_TESTED | INTEGRATION_TESTED | CI_VERIFIED | WINDOWS_VERIFIED | HARDWARE_VALIDATED | PRODUCTION_VALIDATED

A demo image is visual reference only.

## 2026-09-21 — LOG-023 continuity

- Canonical progress: Engineering ~71%, Product usable ~58%, Tracking ~65%.
- Canonical priority: P0 > P1 > P2 > P3.
- Raw FFmpeg path no longer depends on use_wallclock_as_timestamps; explicit timestamp work remains on Libav gate.
- Do not repeat already completed WGC/WASAPI/timing/tracker/renderer/supervisor work without regression evidence.

## 2026-09-21 — LOG-026
- Libav PTS hardening: encoded packet PTS bounds are now recorded and the audio clock re-anchors at empty FIFO boundaries.
- Smoke expanded to verify encoded packet timestamp bounds, not only stream presence.
- Bitácora canonical update: do not repeat timing/supervisor/tracker/renderer work without regression evidence.
- Canonical progress remains Engineering ~71%, Product usable ~58%, Tracking ~65%.
- Next focus remains P0 GPU compositor -> final frame + observable Windows E2E.
