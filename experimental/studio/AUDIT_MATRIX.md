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
| EventSub | Twitch Developers — WebSocket handling | Welcome, keepalive, reconnect sin perder suscripciones. |
| OAuth | Twitch Developers — scopes/authentication | Verificación de permisos mínimos y separación broadcaster/bot. |
| Twitch runtime | TwitchIO 3.x documentation/changelog | Gestión de WebSocket y correcciones de reconexión; evitar duplicar transporte en Cari. |
| Streaming architecture | OBS Studio docs | Separación de sources, scenes, encoders, outputs y services; buffers temporales y PTS monotónicos. |
| Captura ejemplo | MicrosoftDocs/SimpleRecorder | Patrón oficial de captura Windows.Graphics.Capture hacia vídeo. |
| Windows samples | microsoft/WindowsAppSDK-Samples | Patrones de aplicación Windows nativa y distribución. |
| OBS reference implementation | obsproject/obs-studio | Comparación de arquitectura y comportamiento, sin copiar implementación incompatible. |
| A/V timestamps | FFmpeg documentation | Modos de sincronización de vídeo y tratamiento explícito de timestamps. |
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
- [ ] FFmpeg binary discovery policy.
- [ ] FFmpeg legal redistribution decision.
- [ ] Supervised FFmpeg streaming process.
- [ ] Output stderr/log capture.
- [ ] Automatic output reconnect policy.

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

- El head `f48b00811c57e0e8fa86a9c43459490a3a3dca32` pasó `CI` run 338, `Character Runtime Tests` run 9 y `Native Windows Build` run 124.
- El Native Windows workflow pasó configuración CMake x64, compilación de ambos targets, `cari-core-smoke`, existencia de `cari-studio-native.exe`, empaquetado y upload del ZIP portable.
- `StudioPipeline` ya incorpora `AvSyncController`; el smoke cubre orden temporal, tolerancia y late-drop.
- `main` sigue apuntando al SHA base del PR y la rama de trabajo contiene la implementación experimental.
- El código de captura se mantiene deliberadamente separado del hardware final; la prueba física sigue siendo necesaria para validar cámara, GPU, juegos, audio y rendimiento.

## Regla de cierre

No convertir **"compila"** en **"funciona"**.

No convertir **"funciona en CI"** en **"funciona en tu PC"**.

No convertir **"la API existe"** en **"la integración está completa"**.

No convertir **"una frase funciona"** en **"la personalidad está definida"**.

Cada pendiente debe indicar qué evidencia falta antes de pasar a `[x]`.
