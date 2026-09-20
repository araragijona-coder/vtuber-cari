# Cari Studio — matriz de auditoría rigurosa

Esta matriz separa tres estados distintos:

- **Implementado:** existe código y contrato estable.
- **Verificado:** CI/smoke/integration lo ejecuta y pasa.
- **Validado en objetivo:** requiere Windows real, hardware real o servicio externo.

Un componente solo se considera **cerrado para prueba real** cuando la parte verificable está verde y cualquier validación externa restante está explícitamente identificada.

## Fuentes de referencia

| Área | Fuente | Uso en Cari |
|---|---|---|
| Captura Windows | Microsoft Learn — Windows.Graphics.Capture | Frame pool, D3D11, resize y recreate ante cambios de dispositivo/tamaño. |
| Audio timing | Microsoft Learn — IAudioCaptureClient / WASAPI | QPCPosition como base temporal de los paquetes de audio. Microsoft documenta que GetBuffer convierte QPC a unidades de 100 ns y lo entrega como timestamp del primer frame. citeturn0search0 |
| Audio clock | Microsoft Learn — IAudioClock::GetPosition | Referencia para reloj de captura/render y futura corrección de drift. citeturn0search2 |
| Pipes Windows | Microsoft Learn — named pipes / overlapped I/O | Transporte asíncrono para no bloquear productores y mantener backpressure explícito. |
| EventSub | Twitch Developers — WebSocket handling | Welcome, keepalive, reconnect sin perder suscripciones. |
| OAuth | Twitch Developers — scopes/authentication | Verificación de permisos mínimos y separación broadcaster/bot. |
| Twitch runtime | TwitchIO 3.x documentation/changelog | Gestión de WebSocket y correcciones de reconexión; evitar duplicar transporte en Cari. |
| Streaming architecture | OBS Studio docs | Separación de sources, scenes, encoders, outputs y services; comparación arquitectónica. |
| Captura ejemplo | MicrosoftDocs/SimpleRecorder | Patrón oficial de captura Windows.Graphics.Capture hacia vídeo. |
| Windows samples | microsoft/WindowsAppSDK-Samples | Patrones de aplicación Windows nativa y distribución. |
| OBS reference implementation | obsproject/obs-studio | Comparación de arquitectura y comportamiento, sin copiar implementación incompatible. |
| A/V timestamps | FFmpeg documentation | Tratamiento explícito de timestamps y formatos raw. |
| FFmpeg raw audio/video | FFmpeg documentation | Los muxers raw no llevan timestamps/metadata; la metadata temporal debe existir antes de la frontera de salida. citeturn0search8 |
| FFmpeg outputs | FFmpeg formats documentation | `tee`/`fifo` para múltiples destinos y tolerancia a distinta latencia/fallo. |
| Character design | Writers.com — character development | Separación de rasgos, valores, defectos, objetivos y arco para mantener coherencia de personaje. |

## Gates

### Core multimedia

- [x] Contratos Frame/AudioPacket.
- [x] Bounded queues con descarte medible.
- [x] Scene/layers.
- [x] Software compositor de referencia.
- [x] Output interface.
- [x] Fan-out output.
- [x] Output profile validation.
- [x] Encoder boundary.
- [x] Interleave temporal A/V con reloj maestro lógico de audio.
- [x] Pacing de emisión raw por PTS mediante un reloj monotónico compartido y colas acotadas.
- [x] Interleaver global de audio/video por PTS con empate determinista a favor de audio.
- [x] Límite de eventos despachados por polling para acotar ráfagas durante recuperación de atraso.
- [x] Smoke tests de orden, tolerancia y late-drop.
- [x] Mezclador temporal de audio para micrófono + sistema + futuras pistas como TTS.
- [x] Normalización inicial de canales y sample rate en el mezclador.
- [x] Gate de formato de entrada: sample rate/canales no pueden cambiar silenciosamente durante una salida.
- [ ] Drift correction / resampling de producción basado en relojes de dispositivos.
- [ ] Encoder real conectado.
- [ ] Mux/record real.
- [ ] RTMP real desde el pipeline.

### Windows

- [x] Win32 host.
- [x] D3D11 device.
- [x] Windows Graphics Capture.
- [x] Captura de pantalla primaria con `CreateForMonitor`.
- [x] Selección explícita de ventana por índice en el protocolo nativo.
- [x] Free-threaded frame callback.
- [x] Window enumeration.
- [x] WASAPI foundation.
- [x] Camera enumeration.
- [x] Frame-pool recreate ante cambios de tamaño.
- [ ] Media Foundation camera streaming.
- [ ] Dedicated game capture.
- [x] Device-loss recovery para removed/reset/hung.
- [ ] Exhaustive device-loss/reconnect path.
- [ ] Real-machine hardware validation.

### Process / output infrastructure

- [x] Native process runner.
- [x] Windows process lifecycle management.
- [x] Argument quoting.
- [x] CMake integration.
- [x] Native smoke test for process execution.
- [x] Process stderr capture and draining.
- [x] Graceful FFmpeg input close before bounded forced termination.
- [x] Supervised FFmpeg process boundary: validation, launch, poll, stderr and exit state.
- [x] CI smoke for FFmpeg supervisor failure/validation path.
- [x] Native FFmpeg A/V output boundary with independent video/audio named pipes.
- [x] Retención acotada de stderr FFmpeg (256 KiB) para sesiones prolongadas.
- [x] Explicit FFmpeg two-input `-map 0:v:0 -map 1:a:0` contract.
- [ ] FFmpeg binary discovery policy.
- [ ] FFmpeg legal redistribution decision.
- [x] Raw video producer connected to FFmpeg A/V output.
- [x] Mixed raw audio producer connected to FFmpeg A/V output.
- [x] Temporal audio mixer implemented before the single FFmpeg audio pipe.
- [x] Output failure classification for network/encoder/input/mux/permission/unknown.
- [ ] Output stderr classification / structured diagnostics.
  - Estado/código de salida ya están expuestos; queda pendiente clasificar mensajes de stderr en categorías estables.
- [x] Automatic output reconnect/backoff policy skeleton with bounded attempts for RTMP network failures.
  - Integration remains subject to real Windows/RTMP validation; non-network failures are intentionally not retried.

### Raw media transport

- [x] Windows named pipe con modo byte.
- [x] I/O `OVERLAPPED` persistente para conexión y escritura.
- [x] Cola acotada en memoria con métrica de descarte.
- [x] Cancelación de I/O pendiente durante cierre.
- [x] Smoke CI del transporte en Native Windows Build previo.
- [x] Cliente Windows de smoke conecta y comprueba payload + métricas.
- [x] Contrato de dos canales: vídeo BGRA8 y audio PCM float32 LE.
- [x] Generación de nombres únicos de pipe por proceso/secuencia.
- [x] Integración de captura BGRA → canal de vídeo.
- [x] Integración de AudioTimelineMixer → canal PCM float.
- [ ] Alimentación sostenida de ambos canales durante ejecución real.
- [ ] Verificación sostenida de que el pacing mantiene A/V estable con FFmpeg real.
- [ ] Prueba local con FFmpeg real y archivo de salida.
- [ ] Verificación de sincronización A/V sostenida y drift/resampling.

### Twitch

- [x] EventSub WebSocket path.
- [x] Chat messages.
- [x] Follow/sub/gift/resub/cheer/raid.
- [x] Channel points/polls/predictions.
- [x] Local command engine.
- [x] `1+` public TTS gate.
- [x] Local chat output rate guard.
- [x] TwitchIO owns WebSocket connection management and subscription delegation.
- [ ] Explicit reconnection/re-subscription integration test.
- [ ] Token refresh lifecycle test.
- [ ] Live broadcaster/bot validation.

### Cari / Avatar

- [x] Acting state independent of appearance.
- [x] Appearance profile.
- [x] Hair/outfit/accessories.
- [x] Accessory anchors and transforms.
- [x] Seeded randomization.
- [x] JSON presets.
- [x] Canonical Cari personality bible with explicit invariants and data classification.
- [ ] Character behavior engine consuming personality/value/state layers.
- [x] Neutral avatar contract consumed by the Three.js renderer.

- [ ] Native VRM renderer.
- [ ] Audio-driven lip-sync.
- [ ] Final tracking.
- [ ] Real-time voice processing.

### Avatar Studio

- [x] Preset data model.
- [x] Save/load validation.
- [ ] Desktop editor.
- [ ] Asset catalog.
- [ ] Integrated preview.
- [ ] UI preset management.

### License / distribution

- [x] Runtime dependency versions pinned.
- [x] Dependency license audit documented in `experimental/studio/DEPENDENCY_LICENSE_AUDIT.md`.
- [ ] Final asset/model license audit.
- [ ] FFmpeg/codec redistribution decision.

### Distribution

- [x] Windows x64 CI build.
- [x] Portable ZIP packaging in CI.
- [x] Native executable existence gate.
- [ ] Runtime dependency audit.
- [ ] FFmpeg/codec redistribution package.
- [ ] Installer.
- [ ] Diagnostics/log folder policy.
- [ ] Release smoke test on target PC.

## Evidencia actual

- `FfmpegAvOutput::stop()` cierra primero los named pipes para permitir EOF/flush del muxer y solo fuerza la terminación si FFmpeg no sale dentro de un plazo acotado.
- `PollMediaGraph()` ya desactiva el estado lógico de salida cuando FFmpeg termina o el polling falla, evitando reportar un output fantasma.
- `MediaGraphController::poll()` ahora selecciona siempre el evento A/V con menor PTS entre las dos colas; el empate favorece audio y la decisión `late` de audio se contabiliza sin descartarlo para evitar huecos audibles.
- `MediaGraphController` rechaza cambios de sample rate/canales respecto del contrato FFmpeg y los expone como `audio_dropped_format`.
- `FfmpegAvOutput` mantiene únicamente los últimos 256 KiB de stderr y expone estado/código de salida para diagnóstico sin crecimiento indefinido.
- La entrada de audio solo se extrae del mixer cuando ambos named pipes están conectados; esto evita consumir la cola durante el handshake inicial.
- Cada polling del media graph despacha como máximo 8 eventos A/V; si se alcanza el presupuesto, queda una métrica pacing_budget_exhausted para diagnóstico.

- El head de trabajo se actualiza en cada modificación de esta continuación; el último head de referencia de esta bitácora es **75e62403561b04e4d70cc79ffd84028f8b9c4ef4**.
- Se corrigió previamente el timestamp WASAPI para usar el `QPCPosition` ya convertido por Windows a 100 ns. Microsoft documenta explícitamente esa unidad; no debe volver a tratarse como ticks QPC crudos. citeturn0search0
- `AudioTimelineMixer` introduce una frontera temporal única para micrófono, audio del sistema y futuras pistas como TTS. Normaliza canales/sample-rate, conserva PTS, produce bloques de 20 ms y mantiene métricas de rechazo, resampling, mezcla y underrun.
- El smoke de `AudioTimelineMixer` verifica mezcla de micrófono + sistema, avance monotónico de PTS, resampling de una pista de 44.1 kHz y rechazo de paquetes malformados.
- El mezclador todavía no se considera sincronización de producción: dos dispositivos físicos pueden tener relojes ligeramente distintos. La corrección de drift requiere observar los relojes de los dispositivos y ajustar/resamplear de forma continua; `IAudioClock::GetPosition` queda como referencia para esa etapa. citeturn0search2
- `FfmpegAvOutput` sigue siendo la frontera A/V nativa: dos named pipes independientes y dos entradas raw. Los formatos raw de FFmpeg no transportan timestamps por sí mismos, por lo que la continuidad temporal debe mantenerse antes de escribir al pipe. citeturn0search8
- La captura BGRA y el audio mezclado ya atraviesan `MediaGraphController` → `NativeMediaOutputBridge` → `FfmpegAvOutput`. El gate restante es demostrar funcionamiento sostenido con FFmpeg real, A/V sincronizado y hardware Windows.
- CI no se marca como verde en este punto: el commit `4384d72e053a51fcf93114496bc5e85a29d3be0f` no mostró ejecuciones asociadas al consultar GitHub. Las nuevas modificaciones de esta continuación necesitan una ejecución Windows nueva antes de declararse verificadas.
- La validación final de cámara, GPU, juegos, audio, rendimiento, FFmpeg real, RTMP y reconexión continúa requiriendo una máquina Windows objetivo; CI no sustituye esa prueba.

## Estimación de avance

**Estimación global de ingeniería: ~60%.**

El incremento es pequeño porque el mezclador temporal cierra una pieza importante del diseño de audio, pero todavía no conecta productores reales al output. El mayor bloque pendiente continúa siendo la unión sostenida de captura BGRA + audio mezclado → FFmpeg, encoder/mux real, RTMP/reconexión y validación en hardware.

## Regla de cierre

No convertir **"compila"** en **"funciona"**.

No convertir **"funciona en CI"** en **"funciona en tu PC"**.

No convertir **"la API existe"** en **"la integración está completa"**.

No convertir **"una frase funciona"** en **"la personalidad está definida"**.

Cada pendiente debe indicar qué evidencia falta antes de pasar a `[x]`.

## Bitácora

La bitácora maestra de continuidad está en `experimental/studio/BITACORA_CARI_STUDIO.md` y debe consultarse antes de implementar un punto ya auditado.


## Continuidad

La bitácora maestra de continuidad es `experimental/studio/BITACORA_CARI_STUDIO.md`. Los estados IMPLEMENTADO/VERIFICADO/VALIDADO EN HARDWARE deben mantenerse separados.
