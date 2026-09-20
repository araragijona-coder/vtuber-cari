# Cari Studio — Bitácora maestra de desarrollo y auditoría

> Objetivo: evitar repetir análisis o implementaciones ya realizadas. Esta bitácora es parte del repositorio y debe actualizarse en cada bloque relevante.

## Estado actual

- Repositorio: `araragijona-coder/vtuber-cari`
- Rama de trabajo: `fix/native-windows-foundation`
- PR: #2 — `fix: harden native Windows foundation`
- Estado PR: abierto, draft.
- Avance global estimado: **59% de ingeniería**.
- Regla de interpretación: porcentaje de ingeniería respecto del producto objetivo; no significa que el 59% esté validado en hardware.
- Regla principal: un componente no pasa a producción solo porque compile o exista una API.

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

## Implementado y no debe rehacerse

### Captura
- Windows Graphics Capture para ventana.
- Windows Graphics Capture para pantalla primaria.
- `CreateForMonitor` para pantalla primaria.
- Enumeración de ventanas capturables.
- Selección explícita de ventana por índice.
- Frame callback con superficie DXGI.
- Recreación de frame pool ante resize.
- Recuperación de D3D11 device removed/reset/hung.
- Puente BGRA a la capa multimedia.

### Audio
- WASAPI microphone.
- WASAPI system loopback.
- `AudioTimelineMixer`.
- Normalización inicial de sample-rate y canales.
- PTS temporal compartido.
- Bloques de mezcla de 20 ms.
- Voice DSP local `anime-bright`.
- El efecto de voz actual NO es pitch/formant shifting.
- Se rechazan cambios de sample-rate/canales durante una sesión de salida.

### Multimedia / timing
- `MediaClock` en ticks de 100 ns.
- `RealtimePacer` contra reloj monotónico.
- Colas A/V acotadas.
- Descarte medible de video tardío/overflow/cadencia.
- `MediaInterleaver` global por PTS.
- Empates A/V resueltos a favor de audio.
- Máximo de 8 eventos multimedia despachados por polling.
- Backpressure de arranque: el mixer no drena audio hasta que ambos pipes estén conectados.

### FFmpeg
- `ProcessRunner` Windows con `CreateProcessW`.
- Quoting de argumentos.
- Captura y drenaje de stderr.
- `FfmpegSupervisor`.
- `FfmpegAvOutput`.
- Dos named pipes independientes para video/audio.
- Cierre por EOF/flush antes de terminación forzada.
- Estado/código de salida expuestos.
- stderr acotado a 256 KiB.
- Perfil local-record y RTMP/RTMPS.
- Variables `CARI_FFMPEG_EXECUTABLE`.

### Resiliencia de output
- `OutputFailureCategory`.
- Clasificación de network/encoder/input/mux/permission/unknown.
- `OutputRetryPolicy`.
- Backoff exponencial acotado.
- Máximo de 5 intentos con configuración actual.
- Solo se reintentan fallos clasificados como de red.
- Fallos de encoder/mux/input/permiso no se reintentan ciegamente.
- Estado de retry visible en métricas/UI.

### Sesión y seguridad
- `StudioSessionManager`.
- Serialización de cambios.
- Rollback al fallar el arranque.
- Stop-only seguro.
- No se permite cambiar fuente mientras output está activo.
- No se permite detener captura/audio mientras output está activo.
- Electron: `contextIsolation=true`, `nodeIntegration=false`, `sandbox=true`.
- Renderer local `file://`.
- Permiso de cámara limitado al renderer local.
- `pathToFileURL` para rutas Windows.

### Avatar / tracking
- Contrato neutral de avatar.
- Estado de actuación independiente de apariencia.
- FaceTrackingBridge.
- MediaPipe Face Landmarker.
- Guardia contra timestamps no crecientes en modo VIDEO.
- Three.js WebGL renderer.
- GLTF/GLB mediante GLTFLoader.
- Avatar geométrico de prueba.
- Live2D permanece adapter-only y no se distribuye runtime propietario.
- No se distribuyen assets propietarios de Cari.

### UI / control
- Renderer de tres columnas.
- Captura, ventana, screen, output, voice, camera/tracking, avatar y métricas.
- Request IDs.
- Respuestas JSONL.
- OBS WebSocket opcional; OBS no es dependencia del motor.

## Evidencia de pruebas ya obtenida

- Smoke C++ portable con C++20 + `-Wall -Wextra -Werror`.
- `MediaClock` + `RealtimePacer` + `MediaInterleaver`.
- Tests portables de sesión/avatar.
- Selección de ventana por índice.
- Prueba sintética de FFmpeg 7.1.5:
  BGRA raw + PCM float32 stereo -> H.264 + AAC -> Matroska.
- La prueba sintética FFmpeg valida formato/mapping/encoder/mux, pero NO sustituye Windows real, named pipes reales, captura/hardware, RTMP sostenido ni drift correction.

## CI: estado y aprendizaje

- Los workflows se configuraron para ejecutar también sobre `fix/native-windows-foundation`.
- Se añadió `workflow_dispatch`.
- Esto permitió demostrar que los jobs llegan a crearse en la rama.
- Los runs recientes siguen terminando antes de registrar steps: `steps=null`, `logs_url=null`.
- Los reintentos también reprodujeron el fallo previo a steps.
- Por tanto, NO marcar CI como verde.
- No atribuir esos fallos a una línea concreta del código hasta disponer de logs/steps.
- Los workflows históricos que sí terminaron correctamente siguen siendo evidencia histórica, no evidencia del head actual.

## Intentos que NO deben repetirse

1. Prueba inicial con dos FIFOs que expiró por el handshake/bloqueo de pipes. No constituye una regresión funcional demostrada.
2. Primer intento automático de integrar retry en `main.cpp` que no coincidió con los anchors; la escritura se abortó antes de aplicar ese cambio.
3. Intentos de arreglar la divergencia de historia de main mediante reescritura forzada. Se decidió preservar la historia.
4. Declarar CI verde basándose en runs con `steps=null`. No hacerlo.
5. Convertir el compositor software de referencia en compositor de producción. Sigue siendo referencia/diagnóstico.
6. Tratar el scheduler PTS como garantía de timestamps extremo a extremo. El transporte raw todavía no conserva los PTS originales.
7. Añadir OpenCV solo por añadirlo. La captura nativa Windows + MediaPipe ya cubren el núcleo; OpenCV queda opcional para preprocessing futuro.
8. Distribuir Live2D/runtime propietario dentro del repositorio. Mantener adapter-only.

## Pendientes prioritarios

### Bloque A — salida multimedia
- Transporte con timestamps explícitos o mecanismo equivalente.
- Validación sostenida con FFmpeg real y named pipes en Windows.
- Mux/record prolongado.
- RTMP real.
- Reconexión/backoff validado en Windows.
- Clasificación de stderr más completa.

### Bloque B — composición VTuber
- Compositor GPU D3D11.
- Integrar el estado/avatar renderizado en el frame final.
- Evitar `capturePage`/snapshots como ruta de producción.
- Resolver textura/surface sharing sin readback innecesario.
- Lip-sync con audio real.

### Bloque C — Windows
- Streaming de cámara Media Foundation.
- Game Capture dedicada.
- Validación de device-loss/reconnect.
- Pruebas reales sobre hardware objetivo.

### Bloque D — sincronización
- Observación de relojes físicos.
- Drift correction.
- Resampling adaptativo.
- Validación de A/V prolongada.

### Bloque E — producto
- Multistream real.
- Editor visual de avatar.
- Presets UI.
- Diagnóstico/logs de usuario.
- Bundle legal de FFmpeg/codecs.
- Instalador Windows.

## Decisiones de arquitectura que siguen vigentes

- Core local; IA/cloud no obligatorios.
- OBS opcional.
- Electron = control plane; C++ nativo = media plane.
- Captura y audio no viven en el renderer.
- El renderer no lanza procesos.
- Código incierto permanece en `experimental/`.
- No promover a producción sin evidencia.
- No copiar código de proyectos con licencia incompatible; sí estudiar patrones.
- Mantener interfaces pequeñas y contratos testeables.

## Regla de trabajo para próximas iteraciones

Antes de implementar algo nuevo:
1. revisar esta bitácora;
2. buscar si existe ya en el repositorio;
3. revisar `PROJECT_STATUS.md`;
4. revisar `AUDIT_MATRIX.md`;
5. verificar qué evidencia existe;
6. modificar solo el hueco real;
7. añadir prueba;
8. actualizar esta bitácora;
9. actualizar el porcentaje solo cuando el nuevo bloque represente progreso real.

## Último objetivo alcanzado

La base de output ya no solo tiene pacing/interleave: también tiene diagnóstico categorizado y política de retry con backoff restringida a fallos de red. El siguiente salto grande debe concentrarse en **timestamp explícito extremo a extremo + compositor/avatar dentro de la señal final**, no en repetir la construcción básica del motor.
