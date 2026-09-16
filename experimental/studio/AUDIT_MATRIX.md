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

## Character-behavior audit rule

The new `CARI_CHARACTER_BIBLE.md` is the canonical personality source for runtime design. New acts, reactions, comments, missions, voice lines and automatic behaviors must declare whether they are `CANON_CONFIRMED`, `CANON_DEVELOPING`, `RUNTIME_BEHAVIOR`, `SUGGESTED` or `UNKNOWN`.

`UNKNOWN` data must not be silently converted into canon. In particular, Cami is confirmed as Cari's sister, while detailed sibling dynamics remain undefined until explicitly established.

Expressions are not personality. Emotional state, acting, appearance and personality remain separate layers so that a blush, angry face or comedic reaction cannot silently redefine who Cari is.

## Evidencia actual

- `main` fue devuelta a la SHA base del PR para eliminar la contaminación experimental detectada; el PR vuelve a ser la única línea de implementación.
- El nuevo `AvSyncController` ya está integrado en `StudioPipeline` y cubierto por smoke tests del nativo.
- La sincronización temporal actual utiliza timestamps de audio y ventanas de tolerancia; todavía no hace drift correction ni resampling.
- CI Python/Native había alcanzado estado verde en un commit anterior; el head actual debe volver a observar un run exitoso antes de ser marcado como verificado.
- El workflow nativo construye Release x64, ejecuta `cari-core-smoke`, verifica el ejecutable y prepara `CariStudio-Windows-x64.zip`.
- TwitchIO 3.x documenta `subscribe_websocket()` como gestor de suscripciones WebSocket y su changelog registra correcciones específicas de reconexión. Esto evita implementar un segundo transporte dentro de Cari; queda pendiente una prueba de integración propia.
- El código de captura se mantiene deliberadamente separado del hardware final; la primera prueba física sigue siendo necesaria para validar cámara, GPU, juegos, audio y rendimiento.
- La bibliografía de diseño de personajes usada para esta capa destaca que rasgos recurrentes, valores, objetivos, defectos y filosofía deben formar patrones coherentes de decisión y evolución.

## Regla de cierre

No convertir **"compila"** en **"funciona"**.

No convertir **"funciona en CI"** en **"funciona en tu PC"**.

No convertir **"la API existe"** en **"la integración está completa"**.

No convertir **"una frase funciona"** en **"la personalidad está definida"**.

Cada pendiente debe indicar qué evidencia falta antes de pasar a `[x]`.
