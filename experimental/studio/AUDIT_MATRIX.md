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
- [x] Smoke tests de orden, tolerancia y late-drop.
- [x] Mezclador temporal de audio para micrófono + sistema + futuras pistas como TTS.
- [x] Normalización inicial de canales y sample rate en el mezclador.
- [ ] Drift correction / resampling de producción basado en relojes de dispositivos.
- [ ] Encoder real conectado.
- [ ] Mux/record real.
- [ ] RTMP real desde el pipeline.

### Windows

- [x] Win32 host.
- [x] D3D11 device.
- [x] Windows Graphics Capture.
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
- [x] Supervised FFmpeg process boundary: validation, launch, poll, stderr and exit state.
- [x] CI smoke for FFmpeg supervisor failure/validation path.
- [x] Native FFmpeg A/V output boundary with independent video/audio named pipes.
- [x] Explicit FFmpeg two-input `-map 0:v:0 -map 1:a:0` contract.
- [ ] FFmpeg binary discovery policy.
- [ ] FFmpeg legal redistribution decision.
- [ ] Raw video producer connected to FFmpeg A/V output.
- [ ] Mixed raw audio producer connected to FFmpeg A/V output.
- [x] Temporal audio mixer implemented before the single FFmpeg audio pipe.
- [ ] Output stderr classification / structured diagnostics.
- [ ] Automatic output reconnect/backoff policy.

### Raw media transport

- [x] Windows named pipe con modo byte.
- [x] I/O `OVERLAPPED` persistente para conexión y escritura.
- [x] Cola acotada en memoria con métrica de descarte.
- [x] Cancelación de I/O pendiente durante cierre.
- [x] Smoke CI del transporte en Native Windows Build previo.
- [x] Cliente Windows de smoke conecta y comprueba payload + métricas.
- [x] Contrato de dos canales: vídeo BGRA8 y audio PCM float32 LE.
- [x] Generación de nombres únicos de pipe por proceso/secuencia.
- [ ] Integración de captura BGRA → canal de vídeo.
- [ ] Integración de AudioTimelineMixer → canal PCM float.
- [ ] Alimentación sostenida de ambos canales durante ejecución real.
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

- El head de trabajo actual de esta auditoría es **cb9659da4f411d9a965c385588c3bb410ec5e3b1** en `fix/native-windows-foundation`.
- Se corrigió previamente el timestamp WASAPI para usar el `QPCPosition` ya convertido por Windows a 100 ns. Microsoft documenta explícitamente esa unidad; no debe volver a tratarse como ticks QPC crudos. citeturn0search0
- `AudioTimelineMixer` introduce una frontera temporal única para micrófono, audio del sistema y futuras pistas como TTS. Normaliza canales/sample-rate, conserva PTS, produce bloques de 20 ms y mantiene métricas de rechazo, resampling, mezcla y underrun.
- El smoke de `AudioTimelineMixer` verifica mezcla de micrófono + sistema, avance monotónico de PTS, resampling de una pista de 44.1 kHz y rechazo de paquetes malformados.
- El mezclador todavía no se considera sincronización de producción: dos dispositivos físicos pueden tener relojes ligeramente distintos. La corrección de drift requiere observar los relojes de los dispositivos y ajustar/resamplear de forma continua; `IAudioClock::GetPosition` queda como referencia para esa etapa. citeturn0search2
- `FfmpegAvOutput` sigue siendo la frontera A/V nativa: dos named pipes independientes y dos entradas raw. Los formatos raw de FFmpeg no transportan timestamps por sí mismos, por lo que la continuidad temporal debe mantenerse antes de escribir al pipe. citeturn0search8
- La captura BGRA y el audio real todavía no están conectados al `NativeMediaOutputBridge`; esa conexión es el siguiente gate técnico.
- CI no se marca como verde en este punto: el commit `4384d72e053a51fcf93114496bc5e85a29d3be0f` no mostró ejecuciones asociadas al consultar GitHub. Las nuevas modificaciones de esta continuación necesitan una ejecución Windows nueva antes de declararse verificadas.
- La validación final de cámara, GPU, juegos, audio, rendimiento, FFmpeg real, RTMP y reconexión continúa requiriendo una máquina Windows objetivo; CI no sustituye esa prueba.

## Estimación de avance

**Estimación global de ingeniería: ~54%.**

El incremento es pequeño porque el mezclador temporal cierra una pieza importante del diseño de audio, pero todavía no conecta productores reales al output. El mayor bloque pendiente continúa siendo la unión sostenida de captura BGRA + audio mezclado → FFmpeg, encoder/mux real, RTMP/reconexión y validación en hardware.

## Regla de cierre

No convertir **"compila"** en **"funciona"**.

No convertir **"funciona en CI"** en **"funciona en tu PC"**.

No convertir **"la API existe"** en **"la integración está completa"**.

No convertir **"una frase funciona"** en **"la personalidad está definida"**.

Cada pendiente debe indicar qué evidencia falta antes de pasar a `[x]`.
