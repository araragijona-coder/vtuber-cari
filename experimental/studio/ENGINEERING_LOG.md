# Cari Studio — Engineering Log

Fecha de corte: 2026-09-22

Esta es la bitácora operativa para evitar repetir trabajo. Antes de implementar algo nuevo se debe consultar esta bitácora, PROJECT_STATUS.md y AUDIT_MATRIX.md.

Estados: IMPLEMENTADO = existe código/documentación. VERIFICADO = pasó una prueba reproducible. VALIDADO EN HARDWARE = comprobado en Windows/PC objetivo.

## Núcleo multimedia
- VERIFICADO: MediaClock.
- VERIFICADO: RealtimePacer.
- VERIFICADO: interleaver A/V global por PTS, empate determinista a favor de audio.
- VERIFICADO: presupuesto máximo de 8 eventos A/V por polling.
- IMPLEMENTADO: bounded queues, métricas, backpressure inicial.
- IMPLEMENTADO: formato de audio invariante durante una sesión.
- IMPLEMENTADO: bloqueo de cambios de captura durante output.
- PENDIENTE: transportar PTS original explícitamente extremo a extremo por raw transport.
- PENDIENTE: corrección de drift de relojes físicos.

## Captura Windows
- IMPLEMENTADO: Windows Graphics Capture de pantalla primaria.
- IMPLEMENTADO: captura de ventanas indexadas.
- IMPLEMENTADO: D3D11, resize/recreate y recuperación de device loss.
- IMPLEMENTADO/NO PRODUCCIÓN: CPU readback mediante staging texture.
- PENDIENTE: compositor/camino GPU D3D11 definitivo.
- PENDIENTE: Game Capture real.
- PENDIENTE: cámara Media Foundation validada en hardware.

## Audio/voz
- IMPLEMENTADO: WASAPI microphone.
- IMPLEMENTADO: WASAPI system loopback.
- IMPLEMENTADO: AudioTimelineMixer.
- IMPLEMENTADO: anime-bright basado en HPF/presence/soft clip.
- PENDIENTE: pitch/formant shifting real.
- PENDIENTE: drift correction.

## FFmpeg/output
- IMPLEMENTADO: supervisor CreateProcessW + stderr.
- VERIFICADO POR INSPECCIÓN: conversiones UTF-8/UTF-16 explícitas.
- IMPLEMENTADO: local-record y RTMP/RTMPS profiles.
- VERIFICADO: FFmpeg 7.1.5 sintético BGRA + PCM float32 -> H.264/AAC -> Matroska.
- IMPLEMENTADO: clasificación network/encoder/input/mux/permission/unknown.
- VERIFICADO: OutputRetryPolicy con backoff y máximo de intentos.
- IMPLEMENTADO: reconnect RTMP condicionado a fallos clasificados como network.
- PENDIENTE: endpoint RTMP real, named pipes Windows sostenidos y reconexión validada en hardware.

## Electron/seguridad
- IMPLEMENTADO: contextIsolation, nodeIntegration=false, sandbox.
- IMPLEMENTADO: renderer local file:// mediante pathToFileURL.
- IMPLEMENTADO: permiso camera/media solo para renderer local.
- IMPLEMENTADO: NativeEngine con correlación request/response.
- IMPLEMENTADO: OBS WebSocket opcional.
- IMPLEMENTADO: navegación/ventanas remotas bloqueadas.

## Avatar/tracking
- IMPLEMENTADO: Avatar contract y clamping.
- IMPLEMENTADO: MediaPipe FaceLandmarker VIDEO + blendshapes + matrices.
- VERIFICADO: timestamps no crecientes rechazados.
- IMPLEMENTADO: FaceTrackingBridge.
- IMPLEMENTADO: Three.js + GLTFLoader para glTF/GLB.
- PENDIENTE: Live2D runtime/licensing.
- PENDIENTE: avatar -> compositor nativo -> frame FFmpeg.
- PENDIENTE: lip-sync audio->viseme.
- PENDIENTE: compositor GPU D3D11.

## CI/release
- IMPLEMENTADO: CMake C++20 / W4 / WX / permissive-.
- IMPLEMENTADO: Native Windows workflow configure/build/test/package.
- IMPLEMENTADO: Character Runtime workflow.
- IMPLEMENTADO: workflow_dispatch y ejecución sobre rama de desarrollo.
- NO VERIFICADO: CI verde actual; los runs recientes con steps=null no prueban compilación/test.
- PENDIENTE: FFmpeg runtime/redistribución, installer, signing y release gate.

## Asset Runtime — Scavenged Art
- IMPLEMENTADO: `webapp/js/scavenged/canvas/combat.js`.
- IMPLEMENTADO: renderer Canvas con caché de `ImageBitmap`, `requestAnimationFrame`, DPR máximo 2 y FPS configurable.
- IMPLEMENTADO: loader rechaza cualquier candidato sin `status` verificable y `local_path` local.
- IMPLEMENTADO: composición visual de fondos/tarjetas/HUD con violeta `#8b00ff` y rojo `#ff1a1a`.
- BLOQUEADO DELIBERADAMENTE: el `ASSET_MANIFEST.json` actual no contiene entradas `verified` con `local_path`; por tanto no se copió ningún binario no verificado.

## Asset Sweep — Scavenged Art
Ruta: webapp/assets/scavenged_art/
Subcarpetas: waifus/, bikes/, backgrounds/, trash/
Manifest: webapp/assets/scavenged_art/ASSET_MANIFEST.json

Política:
- No importar binarios de reposts o foros sin licencia verificable.
- CC0/public domain preferido.
- Cada asset debe tener provenance.
- trash/ puede conservar material defectuoso solo si su redistribución también es legal.

Candidatos catalogados en el barrido:
- Free Pixel Art Cyberpunk Character Portraits Pack — CC0; AI-assisted disclosure.
- Cyberpunk City Streetview Backgrounds — CC0; Midjourney disclosure.
- Cyberpunk Cityscape Backgrounds — CC0 candidate.
- Neon Node — CC0; retro/cyberpunk/neon/vehicle.
- Cyber Inventory Mega Pack — CC0; fuente declara base AI y reconstrucción/refinado manual.
- CC0 Asset Index — catálogo de assets CC0 con validación por registro.
- 2D CC0 asset library — characters/vehicles/UI.

Estado de estos candidatos: candidate-review/catalog-only; todavía no son assets integrados.

## NO REPETIR
1. MediaClock.
2. RealtimePacer.
3. Interleaver A/V básico.
4. Captura primaria de pantalla.
5. Enumeración/selección de ventanas.
6. WASAPI mic/loopback base.
7. Three.js/glTF loader base.
8. Guard de timestamps MediaPipe.
9. No declarar CI verde sin steps/evidencia.
10. No llamar pitch shifting al efecto anime-bright.
11. No llamar avatar integrado en streaming hasta compositor -> frame codificado.
12. No importar assets solo por estética: primero provenance/licencia.

## Próximo orden
1. Validar smoke retry + diagnostics.
2. Verificar reconnect sin destruir captura/audio.
3. Añadir/validar prueba de resolución, cadencia y presupuesto A/V.
4. End-to-end FFmpeg Windows/named pipes.
5. Compositor D3D11/GPU y avatar -> frame final.
6. Camera/Game Capture.
7. RTMP real + reconnect.
8. Drift correction.
9. Lip-sync.
10. Importación física de assets con provenance verificada — BLOQUEADO hasta que existan entradas `verified` + `local_path` en manifest.
11. Installer/runtime FFmpeg.
12. Hardware validation y release gate.

## NO REPETIR — Asset Runtime
- No rehacer `combat.js` como loader básico.
- No importar candidatos `candidate-review`/`catalog-only`.
- No considerar un asset "integrado" hasta que exista binario local + provenance/licencia trazable + manifest `verified`.

## Decisiones descartadas
- OBS no es dependencia obligatoria.
- No IA/cloud para funcionamiento normal.
- OpenCV no se añade solo por cumplir una lista; WGC + MediaPipe cubren el camino principal.
- No distribuir Live2D sin resolver licencia.
- No usar capturas periódicas del renderer como compositor de producción.
- No hacer multistream antes de estabilizar un output.


---

## Reconciliación histórica desde `main`

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
## 2026-09-21 — LOG-038
- Scene Items visibility control added to OBS Center.
- Reuses existing ObsService and preload/IPC contracts.
- Canonical progress unchanged: Engineering ~71%, Product usable ~58%, Tracking ~65%.
## 2026-09-21 — LOG-039
- Bitácora canónica actualizada con el estado de resiliencia de output y la nueva cobertura explícita de CI.
- OutputRetryPolicy ya integrado y restringido a fallos de red.
- Native Windows workflow ejecuta smoke de retry y diagnóstico.
- Progreso canónico sin cambio: Ingeniería ~71%, Producto usable ~58%, Seguimiento ~65%.
- Siguiente foco: evidencia Windows de D3D11 → Libav/encoder y E2E observable.
## 2026-09-21 — LOG-040
- HEAD auditado: eab7897a5c971a64acc9c31cdf5c4557ffaf4b8f.
- Native Windows, CI, Character Runtime y Runner Diagnostic fallan sin steps/logs observables.
- Se consolida el bloqueo como infraestructura; no se atribuye regresión de código.
- Bitácora maestra actualizada para impedir repetir correcciones funcionales sin evidencia.
- Progreso canónico: Ingeniería ~71%, Producto usable ~58%, Seguimiento ~65%.
- Siguiente foco: D3D11 → Libav/encoder, compositor final y validación OBS/Windows real.
## 2026-09-21 — LOG-041
- Se auditó primero BITACORA.md, PROJECT_STATUS.md, AUDIT_MATRIX.md y ENGINEERING_LOG.md antes de continuar.
- Se confirma Ingeniería ~71%, Producto usable ~58%, Seguimiento global ~65%, Producción NO READY.
- Se detecta y resuelve una inconsistencia: ya existía el validator canónico en experimental/studio/tools/verify_bitacora.py; tools/verify_bitacora.py queda como wrapper de compatibilidad, no como segunda implementación.
- El validator canónico ahora comprueba porcentajes, IDs LOG monotónicos, secciones mínimas, declaración de continuidad, último LOG y regla de progreso.
- La cobertura unittest se amplía a caso válido, IDs duplicados, deriva de porcentajes y deriva de HEAD.
- CI ejecuta el validator canónico y su suite de continuidad.
- GitHub Actions continúa bloqueado por falta de steps/logs observables; no se atribuye regresión de código.
- No se reabren WGC, WASAPI, MediaClock/RealtimePacer/Interleaver, MediaPipe, Three.js, FFmpeg supervisor, RawPipe, OBS bridge ni D3D11 bridge.
- Próximo foco: evidencia Windows observable del camino D3D11 → Libav/encoder, compositor final y PTS E2E; validación OBS real y hardware después de esa evidencia.
## 2026-09-21 — LOG-042
- Se corrigió la persistencia del presupuesto de retry RTMP: una reconexión automática ya no reinicia el contador de intentos.
- Sesión manual limpia el retry budget; reconexión automática conserva intentos hasta alcanzar el máximo o una sesión estable.
- HEAD auditado: f49c882a2982e7eed38ec4f6a8d72a8da7c90931.
- CI Native Windows, CI, Character Runtime, Runner Diagnostic e Installer continúan fallando con jobs sin steps/logs observables.
- Progreso canónico sin cambio: Ingeniería ~71%, Producto usable ~58%, Seguimiento ~65%.
- Próximo foco: D3D11 → Libav/encoder observable en Windows + PTS E2E.
- NO REPETIR: OutputRetryPolicy, clasificación de errores y lógica de sesión de retry salvo regresión reproducible.
## 2026-09-21 — LOG-043 GPU -> Libav runtime
- Se integró LibavRuntimeBackend como backend opt-in.
- La textura reusable del compositor D3D11 no se entrega directamente al encoder.
- D3D11AvFrameBridge obtiene un frame desde AVHWFramesContext y realiza CopyResource GPU->GPU.
- CARI_ENABLE_LIBAV_OUTPUT=ON habilita el backend; CARI_OUTPUT_BACKEND=libav-d3d11 lo selecciona.
- Selección de encoder: h264_nvenc/h264_amf solo con capacidad D3D11 + HW_FRAMES_CTX.
- Estado: CODE_EXISTS / TEST_PREPARED / WINDOWS_PENDING.
- Progreso canónico: Ingeniería ~71%, Producto usable ~58%, Seguimiento ~65%.
- NO REPETIR: WGC, WASAPI/mixer, timing, tracker, renderer, compositor y FFmpeg supervisor.
## 2026-09-21 — LOG-045 Cari V1 asset package
- Se revisó BITACORA antes de tocar el runtime.
- Se convirtió la dirección canónica de Cari en un paquete 2D/3D backend-neutral.
- Manifest canónico de 29 entradas contando neck como soporte; piezas requeridas exactamente según dirección artística.
- Se añadieron manifest de parámetros, expression sheet, checklist de artista/rigger, especificaciones 2D/3D y registro de licencia.
- Validator de asset añadido y conectado a CI.
- No se modifica el porcentaje global por SPEC_ONLY: Ingeniería ~71%, Producto usable ~58%, Seguimiento ~65%.
- Próximo foco exclusivo: arte V1 real -> rigging -> tracking, sin reabrir renderer/tracker.
## 2026-09-21 — LOG-046 Cari V1 package checkpoint
- Contrato de asset 2D/3D cerrado.
- Manifest canónico de capas + parameter manifest + expression spec + artist/rigger checklist.
- Validator de asset y test integrados.
- Estructura 2D/3D de source/layers/exports completa.
- No cambio de porcentaje: Ingeniería 71%, Producto usable 58%, Seguimiento 65%.
- Próximo foco: arte V1 real y rigging; no reabrir renderer/tracker.
## 2026-09-21 — LOG-047 Blender FBX → VRM 1.0
- Se añadió un único pipeline Blender para importar FBX, auditar malla/UV/Armature, reparar weights, preparar shape keys, mapear Humanoid VRM 1.0, configurar metadata/MToon, exportar y reimportar.
- Se añadieron configuración JSON, binding backend-neutral, wrapper PowerShell, especificación técnica y test contractual.
- CI incorpora py_compile y validación JSON del pipeline.
- Blender no está instalado en el entorno de auditoría actual; la ejecución con FBX real y el reimport audit quedan pendientes en Windows/Blender.
- No cambia el porcentaje canónico: Ingeniería ~71%, Producto usable ~58%, Seguimiento ~65%.
- NO REPETIR: no crear otro pipeline Blender, manifest de bones, namespace facial, renderer ni tracker.
- Siguiente foco: ejecutar con el FBX real y pasar los gates de rigging/tracking/composición.
## 2026-09-21 — LOG-059 First launch incident
- Se determinó que la experiencia de “descargó algo, pidió una tecla y se cerró” correspondía al `Cari-Setup.bat`, no al Studio.
- Se modificó el setup para lanzar Cari Studio automáticamente tras éxito sin argumentos.
- Se añadió `Cari-Launch.bat`.
- Se amplió la detección del ejecutable al directorio `build-validation`.
- No se reabren WGC/WASAPI/timing/tracker/renderer/FFmpeg supervisor.
- Progreso canónico: Ingeniería ~71%, Producto usable ~58%, Seguimiento ~65%.
- Próximo gate: Setup → Electron → Native Engine sobre Windows real.