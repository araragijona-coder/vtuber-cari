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


---

## Checkpoint canónico — 20/09/2026

### Estado confirmado del repositorio

**HEAD:** e8f33bff3d9ee1012b4c9ce5334d4f9393325bbe

**Avance global documentado:** 62%.

El porcentaje se toma del estado actual de `PROJECT_STATUS.md` y refleja avance de ingeniería, no disponibilidad para producción.

### Trabajo adicional ya existente y contabilizado

| Área | Estado | Evidencia | No repetir |
|---|---|---|---|
| Compositor D3D11 experimental | IMPLEMENTADO | bridge/compositor nativo + smoke WARP | NO rehacer compositor base |
| Captura CPU lazy para fallback/diagnóstico | IMPLEMENTADO | frame bridge / compositor path | NO volver a introducir readback por frame por defecto |
| Overlay alpha sobre compositor GPU | IMPLEMENTADO + VERIFICADO | smoke compositor WARP | NO repetir smoke básico |
| Lip-sync local por amplitud | IMPLEMENTADO | runtime/avatar path | NO asumir que esto equivale a viseme/lip-sync fonémico |
| Auditoría de licencias de dependencias runtime fijadas | IMPLEMENTADO | documentación de proyecto | NO repetir auditoría completa salvo cambio de dependencia |
| Retry RTMP network-only | IMPLEMENTADO | `OutputRetryPolicy` + clasificación | NO ampliar retries a encoder/mux/input sin evidencia |
| Reset de retry | IMPLEMENTADO | lifecycle de output | NO duplicar estados de retry |
| E2E Windows named-pipe smoke | IMPLEMENTADO EN CÓDIGO, NO VERIFICADO | workflow preparado | NO darlo por probado hasta obtener logs/steps Windows |

### Corrección reciente de salida

La serialización del campo `output` fue corregida para no emitir una clave vacía antes de `output_state`.

### CI actual

Los workflows ya se ejecutan sobre la rama de desarrollo, pero los runs más recientes siguen terminando antes de registrar steps:

- Native Windows Build: failure, `steps=null`, `logs_url=null`
- CI: failure/cancelled, `steps=null`, `logs_url=null`
- Character Runtime Tests: failure/cancelled, `steps=null`, `logs_url=null`

**Conclusión:** todavía no hay evidencia de compilación/test ejecutados en GitHub Actions.

### Lo que ya NO necesita volver a hacerse

- Replantear Windows Graphics Capture.
- Replantear WASAPI mic + loopback.
- Crear otro MediaClock.
- Crear otro RealtimePacer.
- Crear otro interleaver A/V.
- Crear otro mixer temporal básico.
- Crear otro supervisor FFmpeg.
- Crear otra política de retry general.
- Crear otro renderer Three.js/glTF básico.
- Crear otro guard de timestamps monotónicos de MediaPipe.
- Crear otro compositor software de referencia.

### Trabajo prioritario siguiente

1. Obtener una ejecución real de CI Windows con steps/logs.
2. Validar el smoke E2E named-pipe + FFmpeg + decodificación.
3. Diseñar e implementar transporte de timestamps explícitos.
4. Conectar compositor D3D11 al frame final que alimenta encoder.
5. Completar cámara Media Foundation.
6. Validar audio drift correction.
7. Validar RTMP real + caída de red + recuperación.
8. Integrar lip-sync más preciso si el requisito lo necesita.
9. Game Capture.
10. Multistream y distribución.

### Readiness

**NO listo para producción.**

**Sí sirve como build experimental/desarrollo**, una vez compilado en Windows.

Para uso diario como software de streaming/VTuber faltan todavía los gates Windows/hardware y la ruta final avatar/captura → compositor → encoder/output.

### Regla de evidencia

Un estado cambia de IMPLEMENTADO a VERIFICADO únicamente cuando existe una prueba ejecutada y observable.

Un estado cambia a VALIDADO EN HARDWARE únicamente después de una prueba en la máquina objetivo.

No elevar un estado por documentación, existencia de código o éxito en un entorno diferente.


## CI checkpoint definitivo — 20/09/2026

HEAD observado: 5fe62e56d30daa7f3dc90b5402157a171d201488

Los runs nuevos generados después de habilitar la rama de desarrollo, `workflow_dispatch`, instalación de FFmpeg y smoke E2E continúan en el mismo estado:
- Native Windows Build: failure, jobs sin steps y sin logs observables.
- CI: failure/cancelled, jobs sin steps y sin logs observables.
- Character Runtime Tests: failure/cancelled, jobs sin steps y sin logs observables.

No se modifica el porcentaje de avance por este incidente. El código E2E ya está preparado; falta que GitHub Actions ejecute y exponga realmente los steps.

**NO REPETIR:** no volver a crear workflows paralelos para el mismo propósito hasta disponer de evidencia nueva del runner o de una causa reproducible distinta.



## Checkpoint canónico — 20/09/2026

**HEAD actual del PR:** 42d11e9891682abc627cb557422aef5b74fc166e
**Avance global vigente:** **62%**  
**Estado:** experimental / no listo para producción

### Hecho en esta continuación
- Política `OutputRetryPolicy` con backoff exponencial acotado.
- Clasificación de fallos de output.
- Retry automático **solo** para fallos clasificados como red.
- Estado/código de salida FFmpeg expuestos.
- stderr FFmpeg limitado a 256 KiB.
- Interleaver A/V global por PTS.
- Máximo 8 eventos multimedia por polling.
- Backpressure de audio hasta conectar ambos pipes.
- Bloqueo de cambios de captura/audio mientras existe output activo.
- Protección contra cambio de sample-rate/canales durante una sesión.
- Métricas de pacing/output visibles en la UI.
- Workflows CI habilitados para la rama de desarrollo y `workflow_dispatch`.
- E2E Windows named-pipe → FFmpeg → decode ya existe en código y está conectado al workflow.
- Compositor D3D11 experimental + alpha overlay ya existe.
- Lip-sync por amplitud ya existe.
- Auditoría de licencias runtime ya existe.
- Esta bitácora consolidada pasa a ser el registro maestro de continuidad.

### Evidencia verificada
- Smoke C++ portable C++20 con `-Wall -Wextra -Werror`: PASS.
- MediaClock / RealtimePacer / MediaInterleaver: PASS.
- OutputRetryPolicy: PASS.
- OutputFailureCategory: PASS.
- FFmpeg 7.1.5 sintético en Linux, BGRA + PCM float32 → H.264/AAC → Matroska: PASS.

### Evidencia NO verificada todavía
- Build completo Windows en CI.
- E2E named-pipe en runner Windows.
- Captura sostenida WGC + WASAPI en hardware.
- Compositor D3D11 sostenido conectado a encoder sin readback de producción.
- RTMP real y recuperación de red real.
- Drift correction de relojes físicos.

### Problema CI actual
Los workflows se están disparando sobre la rama de desarrollo, pero los jobs recientes siguen terminando antes de registrar steps/logs observables (`steps=null`, sin `logs_url`). No contar esto como PASS de código.

### NO REPETIR
- No rehacer WGC.
- No rehacer WASAPI mic/loopback.
- No crear otro mixer temporal básico.
- No crear otro MediaClock.
- No crear otro RealtimePacer.
- No crear otro interleaver.
- No crear otra política de retry.
- No crear otro supervisor FFmpeg.
- No crear otro renderer Three.js/glTF básico.
- No crear otro tracker MediaPipe básico.
- No crear otro compositor D3D11 base.
- No crear workflows paralelos para resolver el mismo problema CI.

### Próximo foco obligatorio
1. Conseguir una ejecución Windows con steps/logs reales.
2. Validar el E2E named-pipe → FFmpeg → archivo → decode.
3. Definir y transportar timestamps explícitos extremo a extremo.
4. Eliminar el readback CPU del camino de producción.
5. Integrar avatar real al compositor D3D11.
6. Completar cámara Media Foundation.
7. Medir/corregir drift de audio.
8. Probar RTMP real y reconexión.
9. Completar Game Capture.
10. Multistream y distribución.

### Criterio de evidencia
`IMPLEMENTADO` = código integrado.  
`VERIFICADO` = prueba observable pasada.  
`VALIDADO EN HARDWARE` = prueba en Windows/PC objetivo.

No subir de estado por documentación o por la simple existencia del código.

### Estado de producto
**62% de ingeniería.**  
No equivale a 62% de tiempo ni a 62% de disponibilidad para producción.

**Readiness actual: NO listo para uso diario de streaming.**


## Cierre de auditoría — 20/09/2026

**HEAD observado:** f17d752d121390337248ea67bc495bf1a08cb945

### Resultado

- Avance vigente del proyecto: **62%**.
- El código de retry/backoff y diagnóstico existe e incluye smoke tests portables.
- El compositor D3D11 experimental, alpha overlay, lip-sync por amplitud y E2E Windows named-pipe ya existen en el repositorio.
- El E2E Windows está implementado pero no puede marcarse VERIFIED hasta observar una ejecución real.
- Los workflows se disparan sobre la rama de desarrollo, pero los jobs recientes siguen terminando con `failure` y `steps=null`, sin `logs_url`; por tanto no se cuenta como build/test ejecutado.
- No se creó otro sistema de captura, mixer, scheduler, retry, tracker, renderer ni compositor para sustituir los existentes.

### Próximo punto único de entrada

La próxima iteración debe comenzar leyendo esta bitácora y continuar en P0/P1:

1. evidencia Windows real de build/test;
2. E2E named-pipe + FFmpeg + decode;
3. timestamps explícitos extremo a extremo;
4. compositor GPU sin readback CPU de producción;
5. avatar real dentro del frame final.

### Regla de cierre

No marcar un gate como verificado por la existencia del archivo o del workflow. Debe existir ejecución observable y reproducible.

