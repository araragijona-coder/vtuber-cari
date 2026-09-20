# Cari Studio — Bitácora maestra de desarrollo y auditoría

> Objetivo: evitar repetir análisis o implementaciones ya realizadas. Esta bitácora es parte del repositorio y debe actualizarse en cada bloque relevante.

## Estado actual

- Fecha de corte: 2026-09-20
- Último head comprobado: `75e62403561b04e4d70cc79ffd84028f8b9c4ef4`
- Repositorio: `araragijona-coder/vtuber-cari`
- Rama: `fix/native-windows-foundation`
- PR: #2 — `fix: harden native Windows foundation`
- Estado PR: abierto, draft.
- Avance global estimado: **59% de ingeniería**.
- Interpretación: mide avance frente al producto objetivo completo; no equivale a validación en hardware.
- Regla de promoción: mantener en `experimental/` hasta cerrar los gates correspondientes.

## Estados usados

- **IMPLEMENTADO**: código/contrato integrado.
- **VERIFICADO**: prueba reproducible ejecutada y pasada.
- **VALIDADO EN HARDWARE**: prueba realizada en Windows/PC objetivo o servicio externo real.
- **PENDIENTE**: falta implementación o evidencia.
- **NO REPETIR**: ya realizado; solo reabrir por regresión, nueva evidencia o cambio de requisito.

## Arquitectura consolidada

```
Electron Renderer
  UI / escenas / controles / cámara / MediaPipe / avatar
        |
        v
Electron Main
  NativeEngine / lifecycle / IPC / OBS opcional
        |
        v
Native Windows C++
  Windows Graphics Capture
    - ventana
    - pantalla primaria
  WASAPI
    - micrófono
    - system loopback
  VoiceEffectProcessor
  AudioTimelineMixer
  FrameBridge
  MediaClock
  RealtimePacer
  MediaInterleaver
  MediaGraphController
  RawPipe
  FFmpeg supervisor/output
        |
        +--> local recording
        +--> RTMP/RTMPS
```

## IMPLEMENTADO — no rehacer

### Captura Windows
- Win32 host.
- D3D11.
- Windows Graphics Capture para ventanas.
- Windows Graphics Capture para pantalla primaria.
- `CreateForMonitor` para pantalla primaria.
- Enumeración de ventanas capturables.
- Selección explícita por índice.
- Frame callback con superficie DXGI.
- Recreate del frame pool ante resize.
- Recuperación de D3D11 device removed/reset/hung.
- FrameBridge BGRA hacia el pipeline.

### Audio
- WASAPI microphone.
- WASAPI system loopback.
- VoiceEffectProcessor local.
- Perfil `anime-bright`.
- AudioTimelineMixer.
- Normalización inicial de sample rate/canales.
- Bloques de mezcla.
- PTS/timeline común.
- Métricas de mezcla/underrun/rechazo.
- Rechazo de cambios de sample-rate/canales durante una salida.

### Timing A/V
- `MediaClock` en ticks de 100 ns.
- `RealtimePacer`.
- `MediaInterleaver` global por PTS.
- Empates a favor de audio.
- Colas acotadas.
- Late-drop y cadence-drop de video.
- Límite de 8 eventos por polling.
- Métricas `audio_late`, `pacing_budget_exhausted`.
- Backpressure de arranque: audio no se drena antes de conectar ambos pipes.

### FFmpeg/output
- `ProcessRunner` Windows con `CreateProcessW`.
- Quoting de argumentos.
- stderr capture/drain.
- `FfmpegSupervisor`.
- `FfmpegAvOutput`.
- `NativeMediaOutputBridge`.
- Named pipes independientes para video BGRA8/audio PCM float32.
- Mapping explícito `0:v:0` y `1:a:0`.
- Grabación Matroska.
- RTMP/RTMPS directo.
- EOF/flush antes de terminación forzada.
- Estado y exit code expuestos.
- stderr limitado a 256 KiB.
- `OutputFailureCategory`.
- `OutputRetryPolicy` con backoff acotado para fallos de red RTMP.
- Error de encoder/mux/input/permission no se reintenta ciegamente.

### Sesión y seguridad
- `StudioSessionManager`.
- Serialización.
- Rollback.
- Stop-only.
- No cambiar fuente durante output.
- No detener captura/audio durante output.
- Electron `contextIsolation=true`.
- Electron `nodeIntegration=false`.
- Electron `sandbox=true`.
- Renderer local `file://`.
- Permiso de cámara restringido al renderer local.
- `pathToFileURL`.
- Renderer no lanza procesos.

### Avatar/tracking
- Contrato neutral de avatar.
- ActingBridge independiente de apariencia.
- MediaPipe Face Landmarker.
- Guard de timestamps no crecientes en modo VIDEO.
- FaceTrackingBridge.
- Three.js.
- GLTFLoader.
- GLTF/GLB.
- Placeholder geométrico.
- Morph aliases básicos.
- Presets/appearance/accessories.
- Live2D adapter-only.

### UI/OBS/eventos
- UI local en tres columnas.
- Capture/output/voice/camera/tracking/avatar/metrics.
- Request IDs y JSONL.
- OBS WebSocket opcional.
- Infraestructura de chat/EventSub/AutomationEngine existente.
- Acciones locales desacopladas de IA.

## VERIFICADO

- Smoke C++20 con `-Wall -Wextra -Werror` para MediaClock/RealtimePacer/MediaInterleaver.
- Smoke de mixer: mezcla mic/system, PTS monotónico, resampling y rechazos.
- Tests portables de sesión/avatar.
- Selección de ventana por índice.
- Prueba FFmpeg 7.1.5: BGRA raw + PCM float32 -> H.264/AAC -> Matroska.
- Smoke de política de retry.
- Smoke de clasificación de errores.
- CMake registra los nuevos smoke tests.
- Workflow Windows incluye scheduler/retry/diagnostics smokes.

## PENDIENTE — no marcar como completo

### Multimedia
- Transporte que preserve PTS explícitos extremo a extremo o sustitución de la frontera raw por un mecanismo equivalente.
- FFmpeg + named pipes sostenidos en Windows.
- Grabación prolongada.
- RTMP real.
- Drift correction.
- Resampling adaptativo basado en relojes físicos.
- Clasificación de stderr más exhaustiva.

### Compositor/VTuber
- Compositor GPU D3D11 de producción.
- Avatar + captura + overlays dentro del frame final.
- Evitar CPU readback por frame en la ruta final.
- Lip-sync de audio real.
- Validación de performance de tracking.
- Modelo/avatar final.
- Live2D real bajo licencia/runtime auditados.

### Windows
- Camera streaming mediante Media Foundation.
- Game Capture dedicada.
- Validación de device-loss/reconnect en hardware real.
- Prueba integral sobre PC objetivo.

### Streaming/eventos
- Reconexión RTMP real comprobada.
- Ejecución real de acciones studio_* contra backends nativos.
- Multi-stream real.
- Reconexión EventSub verificada con ciclo real.

### Distribución
- Política de descubrimiento de FFmpeg.
- Decisión legal de redistribución FFmpeg/codecs.
- Installer.
- Logs/diagnóstico de usuario.
- Asset/model license audit.

## CI — estado real

- Los workflows ahora aceptan push sobre la rama de desarrollo y `workflow_dispatch`.
- Los runs recientes todavía fallan antes de registrar steps: `steps=null`, `logs_url=null`.
- Esto significa que no hay evidencia del build/test del código en esos runs.
- No atribuir ese fallo a una línea concreta del código.
- No marcar CI como verde.

## Intentos descartados / no repetir

1. Prueba con dos FIFOs que expiró por handshake/bloqueo. Se repitió con archivos raw para aislar encoder/mapping/mux.
2. Primer intento de `workflow_dispatch` con YAML incorrecto. Corregido: `workflow_dispatch` ya no lleva el bloque `paths`.
3. Intentos automáticos de integrar retry con anchors que no coincidían. Se abortaron antes de escribir el cambio.
4. Reescritura forzada de historial para eliminar la divergencia de main. No se hace; se preserva historia.
5. Tratar scheduler como preservación de PTS extremo a extremo. No lo es.
6. Promocionar SoftwareCompositor/FrameBridge CPU a producción. Son referencia/diagnóstico.
7. Añadir OpenCV solo por añadirlo. Captura nativa + MediaPipe cubren el núcleo; OpenCV queda opcional para preprocessing.
8. Distribuir runtime/asset propietario de Live2D sin auditoría específica.

## NO REPETIR — componentes cerrados

- MediaClock.
- RealtimePacer.
- MediaInterleaver.
- AudioTimelineMixer base.
- WGC ventana/pantalla.
- FrameBridge CPU de referencia.
- SoftwareCompositor de referencia.
- Three.js/GLTFLoader adapter.
- MediaPipe timestamp guard.
- Electron security hardening.
- NativeEngine/request correlation.
- FFmpeg EOF/flush.
- stderr cap 256 KiB.
- OutputRetryPolicy base.
- OutputFailureCategory base.
- CI branch trigger + workflow_dispatch structure.
- Smoke registration básica.

## Próxima cola por prioridad

### P0
- Recuperar CI con steps/logs reales.
- Named pipes + FFmpeg sostenidos en Windows.
- Grabación prolongada.
- A/V sync y drift.
- RTMP real + reconnect.

### P1
- PTS explícitos extremo a extremo.
- Compositor GPU D3D11.
- Integración avatar -> frame final.
- Camera Media Foundation.
- Game Capture.
- Lip-sync.

### P2
- Acciones chat/sound/scene reales.
- Multi-stream.
- EventSub reconnect.
- Editor/presets UI.

### P3
- FFmpeg/codecs packaging.
- Third-party notices.
- Installer.
- Asset catalog.
- Release smoke test.

## Regla de reapertura

Una tarea marcada NO REPETIR solo vuelve a abrirse cuando exista:
- regresión;
- nueva evidencia de CI/hardware;
- cambio de requisito;
- cambio de dependencia;
- nueva restricción legal.

Al reabrirla hay que registrar primero el motivo y la prueba nueva.

## Snapshot

**59% — ingeniería.**

El siguiente avance debe venir de cerrar gates de producción, no de duplicar la infraestructura ya implementada.

## Registro de esta continuación

### Output resilience
**IMPLEMENTADO**
- `OutputRetryPolicy`: 1 s → 2 s → 4 s ... con tope de 30 s y máximo de 5 intentos.
- Clasificación inicial de errores: network/encoder/input/mux/permission/unknown.
- Retry integrado solo para fallos clasificados como network en RTMP.
- Métricas de retry visibles.
- stderr limitado a 256 KiB.
- Estado/exit code FFmpeg visibles.

### CI
**IMPLEMENTADO**
- Push sobre la rama de desarrollo.
- `workflow_dispatch`.
- Native Windows ejecuta también media scheduler, retry y diagnostics smokes.

**VERIFICADO LOCALMENTE**
- `media_scheduler_smoke`: PASS.
- `output_retry_smoke`: PASS.
- `output_diagnostics_smoke`: PASS.

**NO VERIFICADO POR CI**
- Los últimos runs del head actual fallan con `steps=null` y `logs_url=null` antes de iniciar steps.

### Continuidad
- Este ledger es la fuente maestra para impedir repetir trabajo ya cerrado.
- `DEPENDENCY_LICENSE_AUDIT.md` registra licencias de runtime y separa esa cuestión de las licencias de modelos/assets.

## Registro de continuidad — 2026-09-20

### IMPLEMENTADO
- Bitácora maestra consolidada como fuente canónica de continuidad.
- Estado del progreso alineado a 59% para evitar inflar el porcentaje sin nueva validación.
- PROJECT_STATUS corregido para apuntar a la bitácora real existente.
- OutputRetryPolicy integrado en el host nativo para RTMP con reintento limitado y backoff.
- Clasificación de fallos refinada para no tratar errores locales de I/O como fallos de red automáticamente.
- Métricas de retry y categoría de fallo expuestas al estado del estudio.
- Serialización del campo output corregida para no producir un valor vacío.

### VERIFICADO
- media_scheduler_smoke: PASS.
- output_retry_smoke: PASS.
- output_diagnostics_smoke: PASS.
- Prueba sintética FFmpeg BGRA + PCM float32 -> H.264/AAC -> Matroska: PASS en Linux.

### NO VERIFICADO
- Compilación Windows del último head.
- Named pipes sostenidos en Windows.
- RTMP real y reconexión contra endpoint real.
- Hardware/cámara/Game Capture.
- Avatar dentro del frame codificado.
- Drift correction y lip-sync.

### NO REPETIR
- No volver a diseñar WGC/WASAPI/MediaClock/RealtimePacer/MediaInterleaver.
- No volver a crear la política básica de retry.
- No volver a introducir OpenCV como dependencia del núcleo sin un problema concreto que resolver.
- No intentar resolver la ausencia de PTS del transporte raw únicamente aumentando el pacing: son problemas distintos.
- No marcar CI verde mientras los jobs no tengan steps/logs ejecutados.

### Siguiente trabajo
P0 -> recuperar CI real -> prueba Windows sostenida -> A/V/PTS/drift -> RTMP real/reconnect -> compositor GPU/avatar.
