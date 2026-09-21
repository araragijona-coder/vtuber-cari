# Cari Studio — Engineering Log

Fuente canónica de continuidad: experimental/studio/BITACORA.md.

## Checkpoint 2026-09-21

- Branch: fix/native-windows-foundation
- PR: #2
- HEAD: 6ca4117b5a2416deaa31c2a21ee421e93d1b4f1c
- Engineering: ~68%
- Product usable: ~54%
- Tracking global: ~62%
- Production: NOT READY

## Current focus
1. Obtener CI/E2E Windows observable.
2. Compositor GPU sin readback CPU por frame.
3. Transporte temporal explícito y validación A/V extremo a extremo.
4. Drift correction físico.
5. Validación de cámara/Game Capture/RTMP en Windows.
6. Validación del asset Cari V1 sobre el renderer existente.

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