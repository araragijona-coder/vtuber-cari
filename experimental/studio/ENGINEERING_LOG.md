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
