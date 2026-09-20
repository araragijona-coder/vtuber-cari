# Cari Studio — Bitácora de ingeniería

> Esta bitácora es parte del proyecto. Antes de comenzar una tarea nueva se debe revisar esta página y la sección **NO REPETIR**.

## Estado vigente

- Fecha: 2026-09-20
- Rama: `fix/native-windows-foundation`
- PR: #2
- Objetivo actual: llevar la base experimental a un streamer/VTuber Windows real sin introducir dependencias obligatorias de IA/cloud.
- Avance global de ingeniería: **60%**
- Regla: `IMPLEMENTADO` ≠ `VERIFICADO` ≠ `VALIDADO EN HARDWARE`.

## Registro cronológico

### 2026-09-19 → 2026-09-20 — Pacing y contrato A/V

**IMPLEMENTADO**
- `MediaClock`: dominio canónico de timestamps en ticks de 100 ns.
- `RealtimePacer`: pacing contra reloj monotónico.
- `MediaInterleaver`: orden global por PTS entre audio/video.
- `MediaGraphController`: colas acotadas y máximo 8 eventos despachados por polling.
- Rechazo de cambios de sample-rate/canales durante una salida.
- Métricas de late, cadence, format y presupuesto de pacing.

**VERIFICADO**
- Smoke portable C++20 con `-Wall -Wextra -Werror`.
- Interleaver con empate determinista a favor de audio.

**NO VALIDADO AÚN**
- PTS preservados dentro del transporte raw.
- Sincronización A/V sostenida sobre hardware.

### 2026-09-20 — Sesión, backpressure y FFmpeg

**IMPLEMENTADO**
- Invariante: no detener/cambiar captura mientras existe output activo.
- Invariante: no detener audio durante output activo.
- El mixer no drena audio hasta que ambos named pipes están conectados.
- Estado/código de salida de FFmpeg expuestos.
- stderr de FFmpeg limitado a 256 KiB.
- Clasificación de errores de output.
- Política de retry exponencial limitada a RTMP y solo para fallos clasificados como red.

**VERIFICADO**
- Prueba sintética FFmpeg 7.1.5: BGRA raw + PCM float32 → H.264/AAC → Matroska.
- RawPipe smoke existente.

**NO VALIDADO AÚN**
- Reintento RTMP contra una red real.
- Sesiones largas.
- Hardware Windows.

### 2026-09-20 — CI

**IMPLEMENTADO**
- Workflows ejecutables también en `fix/native-windows-foundation`.
- `workflow_dispatch`.
- Instalación explícita de FFmpeg en Windows CI mediante Chocolatey.
- Smoke e2e de named pipes + FFmpeg añadido al workflow.

**OBSERVADO**
- Runs anteriores y recientes terminaban en pocos segundos con jobs `steps=null`, sin logs.
- Los reintentos conservaron ese comportamiento.
- Esto impide atribuir esos fallos a un paso concreto del código.

**PRÓXIMA EVIDENCIA**
- El nuevo workflow debe alcanzar los steps de instalación, CMake y CTest.
- Mientras los jobs sigan sin steps/logs, CI no se marcará verde.

### 2026-09-20 — End-to-end named pipes

**IMPLEMENTADO**
- `ffmpeg_named_pipe_e2e_smoke.cpp`.
- Genera vídeo sintético BGRA 320x180/30 FPS.
- Genera audio PCM float32 48 kHz estéreo en paquetes de 20 ms.
- Arranca `FfmpegAvOutput`, espera conexión de ambos pipes.
- Envía aproximadamente 1 segundo de A/V por named pipes.
- Cierra pipes para provocar EOF/flush.
- Comprueba que el Matroska existe y tiene tamaño razonable.
- Reabre/decodifica la salida con FFmpeg y exige código de salida 0.

**ESTADO**
- IMPLEMENTADO.
- VERIFICADO EN ESTA MÁQUINA: aún requiere runner Windows.
- VALIDADO EN HARDWARE: pendiente.

## NO REPETIR

1. No volver a implementar otro scheduler PTS paralelo: `MediaClock + RealtimePacer + MediaInterleaver` ya existe.
2. No volver a crear otro RawPipe genérico: usar `RawPipe`.
3. No volver a crear otro supervisor FFmpeg: usar `FfmpegAvOutput`/wrapper existente.
4. No volver a añadir una segunda capa de OBS para capturar: OBS es integración opcional vía WebSocket.
5. No usar `capturePage()` como compositor de producción: el compositor nativo/GPU sigue siendo el objetivo.
6. No introducir OpenCV solo por costumbre: usar Windows Graphics Capture para pantalla/ventanas; OpenCV queda opcional para procesamiento de cámara si aporta una función concreta.
7. No afirmar sincronización de producción mientras los PTS originales no viajen explícitamente por el transporte.
8. No promover código de `experimental/` a producción por compilar solamente.
9. No reabrir el análisis del problema `steps=null` como si fuese un error de una línea concreta: ya se reintentó y continúa sin steps/logs.
10. No marcar RTMP como “completo” hasta una prueba de conexión sostenida y reconexión real.

## Decisiones que se mantienen

- Windows-native C++ para captura/audio/media.
- Electron como control plane, no como motor multimedia.
- Tres.js/glTF para backend de avatar abierto; Live2D solo como adaptador futuro por licencias/runtime.
- Sin IA/cloud obligatorio para operar el programa.
- Assets propietarios no se distribuyen.
- FFmpeg se mantiene como proceso local separado y supervisado.
- Cualquier integración incierta permanece en `experimental/`.

## Siguientes puntos por prioridad

### P0
- Obtener CI Windows con steps/logs reales.
- Pasar el smoke e2e named-pipe + FFmpeg.
- Probar grabación prolongada.
- Probar RTMP real.

### P1
- Transporte de PTS explícito.
- Compositor GPU D3D11.
- Avatar → frame final.
- Drift correction.
- Cámara Media Foundation.
- Game Capture.

### P2
- Lip-sync.
- Ejecutores reales de `studio_*`.
- EventSub reconnect test.
- Multistream.

### P3
- FFmpeg/codecs redistribution audit.
- Licencias/assets.
- Installer.
- Release validation.

## Commits/artefactos importantes recientes

- `MediaInterleaver` y pruebas de scheduler.
- métricas A/V y límites de formato.
- backpressure y budget de polling.
- bounded FFmpeg stderr.
- output diagnostics/retry policy.
- workflows de desarrollo.
- `ffmpeg_named_pipe_e2e_smoke.cpp`.

El HEAD actual debe consultarse en GitHub antes de continuar; esta bitácora nunca sustituye una lectura del código real.
