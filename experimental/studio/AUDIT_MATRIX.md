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
| Audio timing | Microsoft Learn — IAudioCaptureClient / WASAPI | QPCPosition como base temporal de los paquetes de audio. |
| Pipes Windows | Microsoft Learn — named pipes / overlapped I/O | Transporte asíncrono para no bloquear productores y mantener backpressure explícito. |
| EventSub | Twitch Developers — WebSocket handling | Welcome, keepalive, reconnect sin perder suscripciones. |
| OAuth | Twitch Developers — scopes/authentication | Verificación de permisos mínimos y separación broadcaster/bot. |
| Twitch runtime | TwitchIO 3.x documentation/changelog | Gestión de WebSocket y correcciones de reconexión; evitar duplicar transporte en Cari. |
| Streaming architecture | OBS Studio docs | Separación de sources, scenes, encoders, outputs y services; comparación arquitectónica. |
| Captura ejemplo | MicrosoftDocs/SimpleRecorder | Patrón oficial de captura Windows.Graphics.Capture hacia vídeo. |
| Windows samples | microsoft/WindowsAppSDK-Samples | Patrones de aplicación Windows nativa y distribución. |
| OBS reference implementation | obsproject/obs-studio | Comparación de arquitectura y comportamiento, sin copiar implementación incompatible. |
| A/V timestamps | FFmpeg documentation | Modos de sincronización de vídeo y tratamiento explícito de timestamps. |
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
- [ ] Drift correction / resampling de producción.
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
- [ ] FFmpeg binary discovery policy.
- [ ] FFmpeg legal redistribution decision.
- [ ] Raw video pipe connected to FFmpeg.
- [ ] Raw audio pipe connected to FFmpeg.
- [ ] Output stderr classification / structured diagnostics.
- [ ] Automatic output reconnect/backoff policy.

### Raw media transport

- [x] Windows named pipe con modo byte.
- [x] I/O `OVERLAPPED` persistente para conexión y escritura.
- [x] Cola acotada en memoria con métrica de descarte.
- [x] Cancelación de I/O pendiente durante cierre.
- [x] Smoke CI del transporte en Native Windows Build #147.
- [x] Cliente Windows de smoke conecta y comprueba payload + métricas.
- [ ] Integración video BGRA → RawPipe.
- [ ] Integración audio PCM float → RawPipe.
- [ ] Segundo canal/entrada FFmpeg para audio.
- [ ] Mapeo A/V y política de timestamps en FFmpeg.
- [ ] Prueba local con FFmpeg real y archivo de salida.

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

- `Native Windows Build` run **147** terminó en `success` sobre el head **229f03ba0ac644b67f6aa730b365ea0fc8851846**.
- Run 147 configuró CMake, compiló todos los targets, ejecutó `cari-core-smoke`, `cari-ffmpeg-supervisor-smoke` y `cari-raw-pipe-smoke`, verificó el ejecutable y generó/subió el ZIP portable.
- `RawPipe` implementa `CreateNamedPipeW` con `FILE_FLAG_OVERLAPPED`, mantiene vivas las estructuras `OVERLAPPED`, limita la cola en memoria y permite cancelar I/O pendiente al cerrar.
- `FfmpegSupervisor` sigue siendo únicamente frontera de proceso: todavía no recibe los bytes multimedia reales y, por tanto, no se considera streaming A/V completo.
- El perfil FFmpeg actual sigue construyendo una entrada de vídeo raw por `stdin`; el audio todavía no está mapeado al proceso, así que los gates de audio/output real permanecen abiertos.
- `StudioPipeline` ya incorpora `AvSyncController`; el smoke existente cubre orden temporal, tolerancia y late-drop, pero no corrección de drift/resampling de producción.
- La validación final de cámara, GPU, juegos, audio, rendimiento y reconexión continúa requiriendo una máquina Windows objetivo; CI no sustituye esa prueba.

## Estimación de avance

**Estimación global de ingeniería: ~50%.**

Este porcentaje es una medida de madurez funcional estimada, no una suma de archivos ni una promesa de funcionamiento final. La base nativa, contratos core, captura Windows, audio foundation, escenas, automatización Twitch y la infraestructura de CI ya tienen bastante trabajo implementado; el mayor bloque pendiente sigue siendo el camino multimedia de producción (compositor GPU, encoder/muxer real, A/V real hacia FFmpeg, RTMP/reconexión) y la validación en hardware.

## Regla de cierre

No convertir **"compila"** en **"funciona"**.

No convertir **"funciona en CI"** en **"funciona en tu PC"**.

No convertir **"la API existe"** en **"la integración está completa"**.

No convertir **"una frase funciona"** en **"la personalidad está definida"**.

Cada pendiente debe indicar qué evidencia falta antes de pasar a `[x]`.
