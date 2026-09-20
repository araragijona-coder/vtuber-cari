# Cari Studio — Bitácora maestra de ingeniería

Fecha de actualización: 20/09/2026

## Propósito

Este archivo es el registro operativo para evitar repetir auditorías, implementaciones o pruebas ya realizadas. Una tarea solo puede volver a abrirse cuando aparece evidencia nueva, un cambio de arquitectura o un fallo reproducible distinto.

## Estados

- **IMPLEMENTADO:** existe código integrado en la rama de trabajo.
- **VERIFICADO:** existe una prueba reproducible que pasó.
- **VALIDADO EN HARDWARE:** probado en el Windows/PC objetivo.
- **PENDIENTE:** falta evidencia para cerrar el gate.
- **NO REPETIR:** no rehacer el trabajo; solo revisar si cambia la evidencia.

## Registro acumulado

### Arquitectura y shell

| Área | Estado | Evidencia / ubicación | No repetir |
|---|---|---|---|
| Arquitectura Electron + C++ nativo | IMPLEMENTADO | `experimental/studio/ARCHITECTURE.md` | NO REPETIR revisión general sin cambio arquitectónico |
| Electron context isolation / preload explícito | IMPLEMENTADO | `electron-shell/main.js`, `preload.js` | NO REPETIR salvo auditoría de seguridad nueva |
| NativeEngine request/response JSONL | IMPLEMENTADO | `electron-shell/runtime/native-engine.js` | NO REPETIR parser básico |
| Session manager con serialización/rollback/stop-only | IMPLEMENTADO + VERIFICADO | tests JS y runtime | NO REPETIR tests de serialización salvo regresión |

### Captura Windows

| Área | Estado | Evidencia / ubicación | No repetir |
|---|---|---|---|
| Windows Graphics Capture ventana | IMPLEMENTADO | `native-windows/capture_engine.*` | NO REPETIR desde cero |
| Windows Graphics Capture pantalla primaria | IMPLEMENTADO | `CreateForMonitor` | NO REPETIR |
| Enumeración de ventanas | IMPLEMENTADO + VERIFICADO | `window_sources.*`, smoke | NO REPETIR |
| Resize/recreate frame pool | IMPLEMENTADO | `capture_engine.*` | Reabrir solo con fallo de hardware |
| Device removed/reset/hung | IMPLEMENTADO | `capture_engine.*` | Falta VALIDADO EN HARDWARE |
| Media Foundation camera stream | PENDIENTE | solo enumeración de cámaras existe | NO volver a implementar enumeración; construir streaming real |
| Dedicated Game Capture | PENDIENTE | no implementado | NO repetir WGC; requiere backend específico |

### Audio y voz

| Área | Estado | Evidencia / ubicación | No repetir |
|---|---|---|---|
| WASAPI mic + system loopback foundation | IMPLEMENTADO | `wasapi_capture.*`, `audio_core_bridge.*` | NO REPETIR captura base |
| QPCPosition 100 ns | IMPLEMENTADO | documentación/auditoría | NO aplicar doble conversión |
| AudioTimelineMixer | IMPLEMENTADO + VERIFICADO | smoke mixer | NO repetir mezcla básica |
| Channel/sample-rate normalization | IMPLEMENTADO + VERIFICADO | mixer smoke | NO repetir |
| Voice anime-bright DSP | IMPLEMENTADO | `voice_effects.*` | NO confundir con pitch/formant |
| Pitch/formant engine | PENDIENTE | no existe | construir como etapa separada |
| Physical clock drift correction | PENDIENTE | requiere IAudioClock / hardware | siguiente bloque de audio |

### Multimedia / FFmpeg

| Área | Estado | Evidencia / ubicación | No repetir |
|---|---|---|---|
| Raw BGRA + PCM float32 contract | IMPLEMENTADO + VERIFICADO | adapter + FFmpeg synthetic test | NO repetir contrato de formato |
| FFmpeg process supervisor | IMPLEMENTADO + VERIFICADO | supervisor smoke | NO rehacer lifecycle |
| Graceful EOF/flush antes de force terminate | IMPLEMENTADO | `ffmpeg_av_output.cpp` | NO repetir shutdown básico |
| stderr bounded to 256 KiB | IMPLEMENTADO | `ffmpeg_av_output.*` | NO reemplazar por buffer infinito |
| MediaClock | IMPLEMENTADO + VERIFICADO | media clock smoke | NO repetir reloj |
| RealtimePacer | IMPLEMENTADO + VERIFICADO | scheduler smoke | NO repetir pacing base |
| Global A/V interleaver | IMPLEMENTADO + VERIFICADO | media scheduler smoke | NO volver a separar audio/video por bloques |
| Max 8 dispatch events/poll | IMPLEMENTADO | `MediaGraphController` | NO quitar límite sin benchmark |
| Startup pipe backpressure | IMPLEMENTADO | `main.cpp` | NO drenar mixer antes de conexión |
| Audio format session invariant | IMPLEMENTADO | `MediaGraphController` | NO permitir cambio silencioso |
| Output state/exit code metrics | IMPLEMENTADO | native status + renderer | NO rehacer serialización |
| Output error classification | IMPLEMENTADO + VERIFICADO | diagnostics smoke | Pendiente ampliar patrones con evidencia FFmpeg real |
| RTMP retry/backoff | IMPLEMENTADO + VERIFICADO (policy portable) | `output_retry.h`, smoke | **NO REPETIR policy**; falta probar fallo de red real |
| RTMP real sustained | PENDIENTE | requiere servicio/Windows | siguiente gate |
| Explicit PTS transport | PENDIENTE | raw pipe no conserva PTS | siguiente bloque principal |
| Avatar -> encoded frame | PENDIENTE | no conectado | siguiente bloque principal |
| GPU compositor D3D11 | PENDIENTE | software/reference path existe | siguiente bloque principal |
| Production recorder/mux validation | PENDIENTE | synthetic FFmpeg only | validar en Windows |

### Avatar / tracking

| Área | Estado | Evidencia / ubicación | No repetir |
|---|---|---|---|
| Neutral avatar contract | IMPLEMENTADO + VERIFICADO | `avatar-contract.js` + tests | NO REPETIR |
| Three.js WebGL renderer | IMPLEMENTADO | `three-avatar.js` | NO repetir carga básica GLB |
| GLTF/GLB path | IMPLEMENTADO | GLTFLoader | NO REPETIR |
| Placeholder avatar geometry | IMPLEMENTADO | renderer | NO generar assets propietarios |
| MediaPipe Face Landmarker | IMPLEMENTADO | `face-tracker.js` | NO volver a crear tracker |
| Monotonic timestamp guard | IMPLEMENTADO | `face-tracker.js` | NO REPETIR |
| Blendshape -> avatar state | IMPLEMENTADO | `face-tracking-bridge.js` | NO REPETIR |
| Live2D runtime | PENDIENTE / adapter-only | no se distribuye runtime propietario | requiere decisión de distribución/licencia |
| Native VRM compositor | PENDIENTE | no conectado al frame final | siguiente bloque |
| Audio-driven lip sync | PENDIENTE | no conectado | siguiente bloque |
| Final tracking performance | PENDIENTE | falta cámara/modelo/hardware | validar con hardware |

### Streaming / eventos

| Área | Estado | Evidencia / ubicación | No repetir |
|---|---|---|---|
| OBS WebSocket optional | IMPLEMENTADO | `obs-service.js` | NO convertirlo en dependencia |
| Direct RTMP/RTMPS output path | IMPLEMENTADO | native output profile | Falta validación real |
| Twitch EventSub/chat architecture | IMPLEMENTADO | local pipeline/runtime | NO rehacer transporte |
| Local command routing | IMPLEMENTADO | action router/runtime bindings | NO REPETIR |
| Real RTMP reconnect | PENDIENTE VALIDATION | backoff policy integrada | probar con red real |
| Multi-stream | PENDIENTE | no cerrar antes del single-output gate | NO construir distribución múltiple todavía |

## Intentos / pruebas que no deben repetirse a ciegas

1. La prueba sintética FFmpeg con archivos raw confirmó H.264/AAC/Matroska. No sustituye named pipes Windows.
2. La primera prueba basada en dos FIFOs expiró por el handshake/bloqueo del pipe. Eso no fue clasificado como fallo del encoder. No repetir esa forma sin aislar primero el handshake.
3. Los runs antiguos de GitHub Actions fallaban con `steps=null` antes de ejecutar steps.
4. Se reintentaron los runs anteriores y siguieron sin steps.
5. Los workflows se modificaron para ejecutar también en `fix/native-windows-foundation` y aceptar `workflow_dispatch`; los nuevos runs siguen terminando antes de registrar steps.
6. El branch compare está divergente de `main` por 2 commits históricos. No hacer force-rebase automáticamente.
7. No volver a declarar CI verde mientras el job no muestre steps/logs ejecutados.

## Estado actual de CI

La rama ya dispara los workflows de:
- Native Windows Build
- CI
- Character Runtime Tests

Los runs recientes continúan fallando/cancelándose con `steps=null` y sin `logs_url`. Esto impide verificar compilación Windows desde Actions.

## Prioridad siguiente

1. Transporte A/V con timestamps explícitos.
2. Compositor GPU/native que inserte avatar + cámara + fuentes en el frame final.
3. Prueba Windows end-to-end FFmpeg + named pipes + archivo.
4. Drift correction y políticas de audio.
5. Cámara Media Foundation.
6. RTMP real + fallo de red + backoff.
7. Lip-sync.
8. Game Capture.
9. Multistream.
10. Installer/distribution.

## Regla anti-repetición

No volver a implementar:
- otro parser JSON general;
- otro sistema de captura de pantalla para sustituir WGC;
- otro mixer básico;
- otro reloj multimedia;
- otra política de backoff;
- otro renderer Three.js básico;
- otro tracker MediaPipe básico;
- otro supervisor de FFmpeg.

Solo reabrir esos puntos cuando exista un bug reproducible o una nueva evidencia de hardware/API que cambie el diseño.

## Porcentaje

**Avance global de ingeniería estimado: 59%.**

Este porcentaje es una medida de cierre de requisitos, no una suma de líneas de código. El producto todavía no debe considerarse listo para uso diario de streaming porque faltan validaciones de Windows/hardware, compositor final, transporte PTS y pruebas sostenidas de FFmpeg/RTMP.
