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


## 2026-09-21 — LOG-027
- Camera metrics now follow the active source instead of always reading WGC counters.
- No new metrics architecture added; existing status path corrected.
- Engineering ~71%, Product usable ~58%, Tracking ~65%.


## 2026-09-21 — LOG-028
- Added automated BITACORA continuity validator for canonical percentages, monotonic log IDs and required no-repeat sections.
- Added unit test and wired it into CI.
- Canonical progress unchanged: Engineering ~71%, Product usable ~58%, Tracking ~65%.


## 2026-09-21 — LOG-029
- Se actualiza la memoria canónica con investigación actual de MediaPipe y FFmpeg D3D11.
- Se añade avatar/asset-registry.js con GLB/GLTF y límite de 64 MiB cuando se conoce el tamaño.
- Se integra validación previa al renderer del overlay.
- Test portable del registry: PASS.
- Estado canónico sin cambio de porcentaje: Ingeniería ~71%, Producto usable ~58%, Seguimiento ~65%.
- P0 confirmado: compositor GPU -> encoder sin readback CPU por frame + evidencia Windows/E2E.
- No repetir: renderer, tracker, scheduler, supervisor FFmpeg ni boundary Live2D.

## 2026-09-21 — LOG-030
- Native Windows Build, CI, Character Runtime Tests y Actions Runner Diagnostic del HEAD 21f89448a04ed5eda26c68eb9506d4cb96c07694 terminan failure sin steps/logs observables.
- Estado: bloqueo de infraestructura; no se atribuye regresión a código.
- No repetir modificaciones funcionales para corregir estos failures sin evidencia de un step.
- Porcentaje canónico sin cambio: Ingeniería ~71%, Producto ~58%, Seguimiento ~65%.