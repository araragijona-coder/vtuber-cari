# Cari Studio — Bitácora maestra de ingeniería

> Última actualización: 2026-09-20
> Rama: fix/native-windows-foundation
> PR: #2
> HEAD registrado al cierre de esta bitácora: fd1da8d91ca232c3a4f1d392faad0574dd2435d4
> Estado PR: abierto, draft, todavía no mergeable.

Esta bitácora existe para NO REPETIR trabajo. Antes de implementar algo nuevo hay que buscar aquí y en AUDIT_MATRIX.md. Una tarea marcada como IMPLEMENTADA no se vuelve a diseñar desde cero; si falta validación, se trabaja únicamente sobre el gate pendiente.

## 1. Estados obligatorios
- IMPLEMENTADO: existe código integrado y el contrato está definido.
- VERIFICADO: además tiene smoke/unit/integration test ejecutable que pasó.
- VALIDADO EN HARDWARE: además fue probado en Windows/hardware/servicio real cuando corresponde.
- PENDIENTE: todavía falta implementación.
- BLOQUEADO: existe implementación pero falta evidencia externa o infraestructura.
- DESCARTADO: intento o enfoque abandonado; no reutilizar como si estuviera vigente.

## 2. Arquitectura vigente — NO REDISEÑAR SIN MOTIVO

Electron Renderer → Electron Main → StudioSessionManager → stdin/stdout JSONL → Native Windows C++.

Native C++: Windows Graphics Capture + WASAPI + Voice DSP + AudioTimelineMixer + MediaClock/RealtimePacer + global A/V interleaver + bounded queues + MediaGraphController + RawPipe + FFmpeg supervisor/output.

Decisión: el motor nativo es la fuente de verdad de captura, audio, media graph y output. Electron es control plane. OBS no es dependencia del streaming directo.

## 3. Registro de trabajo realizado

### A. Fundación nativa Windows
- VERIFICADO — Win32 host.
- VERIFICADO — D3D11 device creation.
- IMPLEMENTADO — Windows Graphics Capture de ventanas.
- IMPLEMENTADO — captura de pantalla primaria mediante monitor.
- IMPLEMENTADO — enumeración de ventanas.
- IMPLEMENTADO — selección de ventana por índice.
- IMPLEMENTADO — frame callback y superficies DXGI.
- IMPLEMENTADO — recreate de frame pool ante resize.
- IMPLEMENTADO — recuperación ante DXGI device removed/reset/hung.
- PENDIENTE — validación exhaustiva de device loss/reconnect en hardware real.
- PENDIENTE — Game Capture dedicada.
- PENDIENTE — cámara Media Foundation.

### B. Audio
- IMPLEMENTADO — WASAPI microphone.
- IMPLEMENTADO — WASAPI system loopback.
- IMPLEMENTADO — timestamps de captura en el dominio temporal documentado.
- IMPLEMENTADO — VoiceEffectProcessor local.
- IMPLEMENTADO — perfil anime-bright.
- IMPLEMENTADO — AudioTimelineMixer.
- IMPLEMENTADO — normalización inicial de sample rate/canales.
- IMPLEMENTADO — gate contra cambio silencioso de formato durante output.
- IMPLEMENTADO — métricas de underrun/drop.
- PENDIENTE — pitch/formant voice engine real.
- PENDIENTE — drift correction/resampling basado en relojes físicos.
- PENDIENTE — validación prolongada con hardware real.

### C. A/V timing
- VERIFICADO — MediaClock.
- VERIFICADO — RealtimePacer.
- VERIFICADO — bounded queues.
- VERIFICADO — backpressure de conexión de pipes.
- VERIFICADO — global MediaInterleaver por PTS.
- VERIFICADO — prioridad determinista de audio en empate.
- VERIFICADO — límite de eventos por polling para evitar ráfagas.
- VERIFICADO — late/cadence metrics.
- IMPLEMENTADO — pacing contra reloj monotónico.
- BLOQUEADO — los PTS originales todavía no atraviesan el raw pipe.
- PENDIENTE — transporte con timestamp explícito o frontera equivalente.
- PENDIENTE — drift correction de producción.
- PENDIENTE — prueba A/V sostenida con FFmpeg y hardware.

### D. Raw transport / FFmpeg
- VERIFICADO — named pipes Windows overlapped.
- VERIFICADO — colas acotadas y cancelación.
- VERIFICADO — vídeo BGRA8.
- VERIFICADO — audio PCM float32 LE.
- IMPLEMENTADO — dos canales independientes hacia FFmpeg.
- IMPLEMENTADO — FFmpeg process supervisor.
- IMPLEMENTADO — quoting Windows/Unicode.
- IMPLEMENTADO — stderr limitado a 256 KiB.
- IMPLEMENTADO — EOF/flush antes de forced termination.
- IMPLEMENTADO — reconciliación ante salida inesperada.
- VERIFICADO — prueba de formato H.264 + AAC + Matroska con FFmpeg local.
- PENDIENTE — ejecución sostenida de named pipes + FFmpeg.
- PENDIENTE — grabación prolongada real.
- PENDIENTE — RTMP real.
- PENDIENTE — política de descubrimiento de FFmpeg.
- PENDIENTE — decisión final de redistribución/licencia de FFmpeg.

### E. Output resilience
- VERIFICADO — OutputRetryPolicy con backoff exponencial acotado.
- VERIFICADO — smoke test de backoff.
- VERIFICADO — clasificación de fallos de output.
- IMPLEMENTADO — retry condicionado a perfil RTMP.
- IMPLEMENTADO — solo errores de red elegibles se reintentan.
- IMPLEMENTADO — encoder/mux/input/permission no se reintentan a ciegas.
- IMPLEMENTADO — métricas de retry: pending, attempts, failure category.
- IMPLEMENTADO — stop manual cancela retry.
- PENDIENTE — validar reconexión contra RTMP real.

### F. Avatar / tracking
- IMPLEMENTADO — contrato neutral de avatar.
- IMPLEMENTADO — expression/mouth/blink/head/gaze normalizados.
- IMPLEMENTADO — ActingBridge desacoplado del renderer.
- IMPLEMENTADO — MediaPipe Face Landmarker adapter.
- IMPLEMENTADO — guardia contra timestamps no crecientes.
- IMPLEMENTADO — FaceTrackingBridge.
- IMPLEMENTADO — Three.js renderer.
- IMPLEMENTADO — GLB/glTF loader.
- IMPLEMENTADO — placeholder geometry.
- IMPLEMENTADO — morph-target aliases.
- IMPLEMENTADO — appearance profile/presets.
- IMPLEMENTADO — accesorios con anchors.
- IMPLEMENTADO — randomización reproducible.
- PENDIENTE — avatar real aprobado por usuario.
- PENDIENTE — lip-sync con audio real.
- PENDIENTE — composición del avatar dentro del frame final nativo.
- PENDIENTE — compositor GPU D3D11.
- PENDIENTE — validación de rendimiento tracking/render.
- PENDIENTE — Live2D adapter/runtime compatible y legal.

### G. Electron/security
- VERIFICADO — contextIsolation.
- VERIFICADO — nodeIntegration=false.
- VERIFICADO — sandbox.
- VERIFICADO — preload con API explícita.
- IMPLEMENTADO — navegación local restringida.
- IMPLEMENTADO — window.open bloqueado.
- IMPLEMENTADO — permiso media restringido al renderer local.
- IMPLEMENTADO — NativeEngine con request IDs/correlación.
- IMPLEMENTADO — cierre ordenado del proceso nativo.
- IMPLEMENTADO — OBS WebSocket 5.x opcional.
- PENDIENTE — package-lock reproducible.
- PENDIENTE — validación final de distribución Electron.

### H. OBS
- IMPLEMENTADO — integración opcional por obs-websocket v5.
- IMPLEMENTADO — StartStream/StopStream.
- IMPLEMENTADO — SetCurrentProgramScene.
- IMPLEMENTADO — GetStreamStatus.
- DECISIÓN — OBS no sustituye al motor nativo y no es obligatorio para streaming directo.

### I. Chat/eventos
- IMPLEMENTADO — arquitectura de EventSub/chat.
- IMPLEMENTADO — eventos follow/sub/gift/resub/cheer/raid/channel points/polls/predictions.
- IMPLEMENTADO — comandos locales.
- IMPLEMENTADO — TTS local gate.
- IMPLEMENTADO — StudioActionRouter.
- IMPLEMENTADO — runtime bindings.
- PENDIENTE — ejecución real de todos los backends nativos.
- PENDIENTE — multistream real.
- PENDIENTE — reconexión EventSub auditada en servicio real.

### J. CI / distribución
- IMPLEMENTADO — CMake Windows Release x64.
- IMPLEMENTADO — smoke tests nativos.
- IMPLEMENTADO — portable ZIP artifact.
- BLOQUEADO — runs recientes con steps=null no permiten atribuir fallo a código.
- PENDIENTE — CI Windows verde sobre HEAD actual.
- PENDIENTE — FFmpeg redistribuible.
- PENDIENTE — instalador.
- PENDIENTE — bundle de assets.
- PENDIENTE — logs/diagnóstico de usuario.

## 4. NO REPETIR
Estas áreas ya fueron trabajadas y no deben volver a implementarse desde cero:
1. MediaClock.
2. RealtimePacer.
3. Interleaver A/V global.
4. bounded queues.
5. Windows Graphics Capture de ventana.
6. Windows Graphics Capture de pantalla primaria.
7. enumeración/selección de ventanas.
8. WASAPI mic + loopback.
9. AudioTimelineMixer.
10. FFmpeg supervisor.
11. raw named pipes.
12. graceful FFmpeg EOF/flush.
13. MediaPipe timestamp monotonic guard.
14. FaceTrackingBridge.
15. Three.js/glTF base.
16. Electron security foundation.
17. NativeEngine request correlation.
18. OBS WebSocket v5 optional bridge.
19. output diagnostics.
20. RTMP retry/backoff skeleton.
21. smoke tests de los contratos anteriores.

Si una de estas áreas presenta un bug, corregir el componente existente; no crear una segunda implementación paralela.

## 5. Enfoques descartados
- DESCARTADO — capturePage() como compositor final. No usar snapshots del renderer Electron como transporte principal de vídeo.
- DESCARTADO — Python como motor principal. Python queda para tooling/test/prototipos; el runtime multimedia Windows es C++.
- DESCARTADO — OpenCV como reemplazo de Windows Graphics Capture. Puede usarse como procesamiento/cámara cuando aporte valor.
- DESCARTADO — Live2D propietario embebido sin resolver licencia/distribución.
- DESCARTADO — IA como requisito del streamer.
- DESCARTADO — reintentar cualquier error de FFmpeg.

## 6. Próxima cola de trabajo
### P0 — cierre del output real
1. Obtener build Windows ejecutable.
2. Ejecutar smoke tests nativos.
3. Ejecutar FFmpeg con named pipes reales.
4. Generar archivo real.
5. Inspeccionar con ffprobe.
6. Medir A/V sostenido.
7. Corregir PTS/drift si aparece.

### P1 — compositor final
1. Diseñar composición D3D11.
2. Integrar captura BGRA.
3. Integrar avatar render.
4. Resolver alpha/background.
5. Evitar readback CPU por frame.
6. Entregar frame compuesto al encoder.

### P2 — tracking/voz
1. Medir MediaPipe en cámara real.
2. Validar timestamps.
3. Lip-sync.
4. Mejorar voice DSP.
5. Añadir pitch/formant solo si la latencia permanece aceptable.

### P3 — streaming robusto
1. RTMP real.
2. Retry/backoff real.
3. reconnect.
4. métricas.
5. Twitch/YouTube.
6. multistream después de estabilidad single-output.

### P4 — producto Windows
1. cámara Media Foundation.
2. Game Capture.
3. presets/UI.
4. instalador.
5. FFmpeg packaging.
6. logs/diagnóstico.
7. hardware validation.

## 7. Regla para el porcentaje
El porcentaje global mide ingeniería completada, no archivos escritos. No aumenta por agregar scaffolding.

Estimación global vigente: ~60%.

## 8. Registro de cambios recientes
### 2026-09-20
- Añadido OutputRetryPolicy.
- Añadido smoke test del backoff.
- Añadida clasificación de errores de output.
- Integrado retry condicionado a RTMP.
- Añadidas métricas de retry.
- Corregida serialización del campo output en status.
- Afinada clasificación de fallos de red.
- Actualizado estado de proyecto a ~60%.
- Esta bitácora se convierte en fuente de continuidad.

## 9. Regla de cierre
IMPLEMENTADO → VERIFICADO → WINDOWS CI → HARDWARE REAL → SESIÓN PROLONGADA → STREAM/RECORD REAL → AUDITORÍA FINAL → RELEASE.

Mientras cualquiera de los gates críticos siga abierto, el código permanece bajo experimental/studio/ y no se presenta como producción.