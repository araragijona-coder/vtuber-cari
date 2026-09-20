# Cari Studio — Bitácora canónica de ingeniería

> **Fuente única de continuidad.** Esta bitácora existe para impedir que el trabajo ya realizado vuelva a implementarse, auditarse o discutirse desde cero.
>
> Regla de estados:
> - **IMPLEMENTADO** = el código/contrato existe en GitHub.
> - **VERIFICADO** = existe una prueba reproducible que pasó.
> - **VALIDADO EN HARDWARE** = probado en Windows/PC objetivo o servicio externo real.
> - **PENDIENTE** = requiere implementación o evidencia.
> - **NO REPETIR** = solo reabrir ante regresión, nueva evidencia, cambio de requisito, dependencia o restricción legal.

## Snapshot actual

- Fecha de corte: 2026-09-20
- Repositorio: `araragijona-coder/vtuber-cari`
- Rama: `fix/native-windows-foundation`
- PR: #2 — `fix: harden native Windows foundation`
- Estado PR: abierto, draft.
- Avance global: **60% de ingeniería**.
- Interpretación del porcentaje: avance frente al producto completo; **no** equivale a validación de hardware ni a CI verde.
- Regla de promoción: mantener la implementación en `experimental/` hasta cerrar los gates.

## Arquitectura congelada

```
Electron Renderer
  UI / escenas / controles / cámara / MediaPipe / avatar / métricas
        │
        ▼
Electron Main
  NativeEngine / lifecycle / IPC / OBS WebSocket opcional
        │ JSONL
        ▼
Native Windows C++
  Windows Graphics Capture
    ├─ ventana
    └─ pantalla primaria
  WASAPI
    ├─ micrófono
    └─ system loopback
  VoiceEffectProcessor
  AudioTimelineMixer
  FrameBridge
  MediaClock
  RealtimePacer
  MediaInterleaver
  MediaGraphController
  RawPipe
  FfmpegAvOutput / supervisor
        ├─ grabación local
        └─ RTMP/RTMPS
```

## IMPLEMENTADO — NO REHACER

### Captura Windows
- Win32 host.
- D3D11 device.
- Windows Graphics Capture de ventana.
- Windows Graphics Capture de pantalla primaria.
- `CreateForMonitor`.
- Enumeración de ventanas capturables.
- Selección explícita por índice.
- Frame callback con superficie DXGI.
- Recreate del frame pool ante resize.
- Recuperación de device removed/reset/hung.
- FrameBridge BGRA → pipeline.

### Audio
- WASAPI microphone.
- WASAPI system loopback.
- VoiceEffectProcessor local.
- Perfil `anime-bright`.
- AudioTimelineMixer.
- Normalización inicial de sample rate/canales.
- Timeline/PTS común y bloques de mezcla.
- Métricas de mezcla/underrun/rechazo.
- Rechazo de cambios de sample-rate/canales durante una salida.

### Timing A/V
- `MediaClock` en ticks de 100 ns.
- `RealtimePacer`.
- `MediaInterleaver` global por PTS.
- Empates a favor de audio.
- Colas acotadas.
- Late-drop/cadence-drop de vídeo.
- Presupuesto de 8 eventos por polling.
- Métricas `audio_late` y `pacing_budget_exhausted`.
- Backpressure: el mixer no drena audio hasta conectar ambos pipes.

### FFmpeg / Output
- `ProcessRunner` con `CreateProcessW`.
- Quoting de argumentos.
- Captura/drain de stderr.
- `FfmpegSupervisor`.
- `FfmpegAvOutput`.
- `NativeMediaOutputBridge`.
- Named pipes independientes vídeo BGRA8 / audio PCM float32.
- Mapping `0:v:0` / `1:a:0`.
- Matroska y RTMP/RTMPS directo.
- EOF/flush antes de terminación forzada.
- Estado y exit code visibles.
- stderr limitado a 256 KiB.
- `OutputFailureCategory`.
- `OutputRetryPolicy`: backoff 1→2→4… con tope 30 s y máximo 5 intentos.
- Retry automático restringido a RTMP + fallos clasificados como red.

### Sesión / seguridad
- `StudioSessionManager`.
- Serialización.
- Rollback.
- Stop-only.
- Fuente no modificable durante output.
- Captura/audio no se detienen durante output.
- Electron `contextIsolation=true`.
- `nodeIntegration=false`.
- `sandbox=true`.
- Renderer local `file://`.
- Permiso de cámara restringido al renderer local.
- `pathToFileURL`.
- Renderer no lanza procesos.

### Avatar / tracking
- Contrato neutral de avatar.
- ActingBridge independiente de apariencia.
- MediaPipe Face Landmarker.
- Guard contra timestamps no crecientes en VIDEO.
- FaceTrackingBridge.
- Three.js + GLTFLoader.
- GLTF/GLB.
- Placeholder geométrico.
- Morph aliases básicos.
- Appearance/presets/accessories.
- Live2D: solo adaptador futuro; no se distribuye runtime propietario.

### UI / OBS / eventos
- UI local de capture/output/voice/camera/tracking/avatar/metrics.
- Request IDs + JSONL.
- OBS WebSocket opcional; no es dependencia del streaming.
- Infraestructura existente de chat/EventSub/AutomationEngine.
- Acciones locales desacopladas de IA.

## VERIFICADO

- Smoke C++20 estricto para MediaClock/RealtimePacer/MediaInterleaver.
- Smoke de AudioTimelineMixer: mezcla, PTS monotónico, resampling y rechazos.
- Tests portables de sesión/avatar.
- Selección de ventana por índice.
- Prueba FFmpeg sintética: BGRA raw + PCM float32 → H.264/AAC → Matroska.
- Smoke de `OutputRetryPolicy`.
- Smoke de `OutputFailureCategory`.
- Workflow registra scheduler/retry/diagnostics smoke.
- Smoke e2e `ffmpeg_named_pipe_e2e_smoke.cpp` implementado para Windows: genera A/V sintético, abre ambos named pipes, fuerza EOF/flush y vuelve a decodificar el Matroska.
- CI intenta instalar FFmpeg explícitamente para ese gate.

## VALIDACIÓN EXTERNA PENDIENTE

### P0
- Conseguir runs de GitHub Actions con steps/logs ejecutados.
- Ejecutar smoke e2e named-pipe + FFmpeg en Windows.
- Grabación prolongada real.
- A/V sync sostenido.
- RTMP real.

### P1
- Transporte con PTS explícitos extremo a extremo, o sustituir la frontera raw por un mecanismo equivalente.
- Compositor GPU D3D11.
- Avatar + captura + overlays dentro del frame final.
- Evitar CPU readback por frame en la ruta final.
- Drift correction y resampling adaptativo.
- Cámara Media Foundation.
- Game Capture.

### P2
- Lip-sync real.
- Ejecución real de `studio_chat_requested`, `studio_sound_requested`, `studio_scene_requested` y equivalentes.
- Reconexión EventSub verificada.
- Multistream.

### P3
- Política final de descubrimiento/distribución de FFmpeg.
- Auditoría legal final de codecs/assets/modelos.
- Installer.
- Logs de usuario/rollback.
- Release smoke test.

## CI — estado real

Los workflows ahora tienen:
- push sobre `fix/native-windows-foundation`;
- `workflow_dispatch`;
- workflow Windows con FFmpeg instalado explícitamente;
- smoke tests adicionales.

Los runs del head actual continúan terminando con:
- `failure`;
- `steps=null`;
- `logs_url=null`.

Conclusión: **no existe evidencia suficiente para afirmar que CMake/CTest se ejecutaron en esos runs**. No atribuir estos fallos a una línea concreta del código.

## NO REPETIR

1. No crear otro scheduler PTS paralelo.
2. No crear otro `RawPipe`.
3. No crear otro supervisor/boundary FFmpeg.
4. No convertir OBS en dependencia del camino nativo.
5. No usar `capturePage()` como compositor de producción.
6. No añadir OpenCV al núcleo solo por costumbre; usar WGC/WASAPI para el core y OpenCV solo si resuelve una función concreta de cámara/preprocesamiento.
7. No declarar A/V sincronizado en producción mientras los PTS originales no estén preservados extremo a extremo.
8. No promover `experimental/` por compilación aislada.
9. No reinterpretar `steps=null` como un error del código sin logs/steps.
10. No marcar RTMP completo sin conexión sostenida y prueba de reconexión.
11. No instalar FFmpeg del sistema como dependencia de runtime del producto; la instalación actual es **solo CI**.
12. No crear otra bitácora paralela: esta `BITACORA.md` es la canónica.
13. No repetir el smoke e2e básico: ampliarlo con nuevos casos.
14. No reescribir la historia de la rama para resolver la divergencia con `main`; conservarla salvo una razón de integración real.

## Intentos / decisiones descartadas registrados

### FIFO inicial que expiró
Una prueba con dos FIFOs se atascó durante el handshake. Se reemplazó la validación inicial por prueba con archivos raw para aislar encoder/mapping/mux y luego se implementó un smoke Windows dedicado para named pipes.

### Primer YAML de workflow_dispatch
El primer intento colocó `paths` debajo de `workflow_dispatch` de forma inválida. Se corrigió; ahora `workflow_dispatch` es un evento independiente.

### Integraciones por anchors que no coincidieron
Algunos intentos automáticos de parchear `main.cpp` fueron abortados antes de escribir cuando los anchors no coincidieron. No deben repetirse como si fueran cambios pendientes.

## Decisiones congeladas

- Windows native C++ para captura/audio/media.
- Electron como control plane.
- Three.js/glTF para backend abierto de avatar.
- MediaPipe local para tracking.
- Live2D únicamente detrás de auditoría de runtime/licencia.
- Sin IA/cloud obligatorio para el funcionamiento principal.
- FFmpeg como proceso local supervisado.
- Código incierto permanece en `experimental/`.

## Regla de reapertura

Un punto de **NO REPETIR** solo vuelve a abrirse si existe:
- regresión;
- nueva evidencia de prueba;
- cambio de requisito;
- cambio de dependencia;
- nueva restricción legal.

Al reabrirlo, registrar primero **motivo + evidencia nueva**.

## Snapshot de continuidad

**Avance global: 60% de ingeniería.**

El siguiente trabajo debe cerrar gates de producción, no duplicar infraestructura existente.
