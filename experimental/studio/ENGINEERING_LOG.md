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

## 2026-09-21 — LOG-031
- Reconciliación canónica: Ingeniería ~71%, Producto usable ~58%, Seguimiento ~65%, Producción NO listo.
- HEAD de partida auditado: 070c3481de17384bba353affb17a0f33abc38213.
- Bitácora consultada antes de continuar; no se reabrieron WGC/WASAPI/timing/tracker/renderer/supervisor.
- Investigación FFmpeg/D3D11 actualizada: AVCodecContext.hw_frames_ctx + AVHWFramesContext + AV_PIX_FMT_D3D11 son la ruta técnica para entregar superficies D3D11 a un encoder hardware compatible. citeturn420566search0turn420566search4turn420566search2
- Microsoft confirma recursos Texture2D compartibles D3D11 y sincronización con IDXGIKeyedMutex cuando corresponde. citeturn293684search0turn293684search6
- PTS E2E continúa en Libav: av_interleaved_write_frame exige timestamps correctos en el timebase del stream. citeturn293684search5
- CI sigue bloqueada porque los jobs del HEAD auditado terminan sin steps/logs observables.
- Siguiente foco: GPU compositor → encoder sin readback CPU por frame + E2E Windows observable.

## 2026-09-21 — LOG-032
- Añadido bridge D3D11 texture -> AVFrame hardware sin CPU readback.
- Añadido smoke experimental de encoder hardware que consulta AVCodecHWConfig y prueba h264_nvenc/h264_amf cuando el entorno lo permite.
- No se eleva el porcentaje: el gate sigue CODE_EXISTS y Windows/hardware pendiente.
- Siguiente foco: integrar el bridge en LibavMediaOutput y demostrar paquetes codificados D3D11 con PTS.

## 2026-09-21 — LOG-033
- OutputRetryPolicy + OutputFailureCategory implementados.
- Retry RTMP restringido a fallos clasificados como network.
- `Broken pipe` retirado de la categoría network genérica.
- Smoke portable de retry/diagnóstico PASS.
- CI sigue fallando antes de steps/logs observables.
- Progreso canónico sin incremento: Ingeniería ~71%, Producto usable ~58%, Seguimiento ~65%.

## 2026-09-21 — LOG-034
- LibavMediaOutput ampliado con ruta D3D11 hardware.
- Reutiliza D3D11AvFrameBridge y expone AV_PIX_FMT_D3D11 con PTS explícito.
- Smoke `libav_d3d11_output_smoke` añadido.
- Estado CODE_EXISTS / smoke preparado / Windows-hardware pendiente.
- Progreso canónico sin incremento: Ingeniería ~71%, Producto usable ~58%, Seguimiento ~65%.


## 2026-09-21 — LOG-035
- Checkpoint canónico confirmado: Ingeniería ~71%, Producto usable ~58%, Seguimiento ~65%, Producción NO READY.
- CI de Native Windows, CI, Character Runtime y Runner Diagnostic siguen terminando sin steps/logs observables.
- No se atribuye regresión de código a estos failures.
- Git compare está divergente y actualmente muestra ~1301 ahead / 67 behind; no se reescribe historia automáticamente.
- Siguiente foco P0: validar Libav + D3D11 hardware y E2E Windows observable.

## 2026-09-21 — LOG-036
- Auditoría específica del escenario OBS-as-streamer completada.
- Decisión: OBS conserva encoder/mux/RTMP/reconnect/escenas principales; Cari actúa como control-plane VTuber/automatización.
- ObsService ampliado con audio controls, Scene Items, Replay Buffer, batch transition, Scene Collection guard y bounded WebSocket reconnect.
- Corregido envelope OBS Main → Renderer: ahora usa eventType sin sobrescribir type=obs.event.
- Contrato UI/preload actualizado.
- OBS_USAGE_AUDIT.md añadido.
- Porcentaje canónico se mantiene: Ingeniería ~71%, Producto usable ~58%, Seguimiento ~65.
## 2026-09-21 — LOG-037
- OBS companion audit cerrado y registrado en OBS_USAGE_AUDIT.md.
- OBS queda como streamer principal en ese modo; Cari controla VTuber/automation.
- Added audio mute/volume, Scene Items, Replay Buffer, callBatch transition and bounded OBS WebSocket reconnect.
- Fixed OBS event envelope and preserved manual password only in memory for reconnect.
- Contract test expanded.
- Canonical progress unchanged: Engineering ~71%, Product usable ~58%, Tracking ~65%.