## CHECKPOINT VIGENTE — 2026-09-21 — CARI V1 RUNTIME

- HEAD auditado: consultar PR #2
- Ingeniería: ~71% · Producto usable: ~58% · Seguimiento: ~65%
- Avatar Cari V0/V1 procedural, Talk/Auto, VAD/lip-sync, reacciones manuales, idle y actividades keyboard/controller/phone: IMPLEMENTADOS.
- Cámara de tracking: visualmente oculta; el frame del usuario no forma parte del output visual.
- Próximos gates: CI observable, E2E Windows, GPU compositor sin readback, PTS E2E, drift, hardware.

## CHECKPOINT VIGENTE — 2026-09-21

| Área | Estado | Próximo gate |
|---|---|---|
| Cari V0 procedural | IMPLEMENTADO | Validación visual/tracking; reemplazar meshes sin cambiar contrato |
| Avatar contract | IMPLEMENTADO + smoke | Mantener contrato único |
| Action Store | IMPLEMENTADO + regression test | No crear otro almacenamiento |
| FaceTrackingBridge | IMPLEMENTADO | Benchmark y validación real |
| D3D11 compositor | EXPERIMENTAL | Eliminar CPU readback y conectar encoder |
| FFmpeg named-pipe E2E | IMPLEMENTADO | Verificar en Windows |
| RTMP retry/backoff | IMPLEMENTADO | Probar caída/reconexión real |
| CI | BLOQUEADO | Obtener jobs con steps/logs |

### Evidencia de continuidad
- La bitácora canónica es `experimental/studio/BITACORA.md`.
- El avatar no se considera arte final: V0 es una implementación funcional de runtime para preview/overlay, tracking y acciones.
- No se crean nuevos routers/stores/renderers cuando el componente equivalente ya existe.

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

## Producto / UX

- [x] Superficie de Studio de escritorio tipo plataforma de streaming.
- [x] Navegación por En vivo, Panel, VTuber, Escenas, Chat, Eventos, Assets y Configuración.
- [x] Editor de acciones VTuber con `＋ Nueva acción`.
- [x] Acciones iniciales Feliz, Triste, Hablar, Callar, Neutral y Enojada.
- [x] Imágenes por acción, múltiples frames, drag-and-drop, orden, loop, escala, opacidad y offsets.
- [x] Persistencia local y presets JSON.
- [x] Base visual PNG de Cari (neutral/happy/angry) con manifest y reglas visuales.
- [x] Verificación automática del manifest y firmas PNG en `electron-shell/test/avatar-assets.test.mjs`.
- [x] Activación de acciones desde UI y comandos básicos del chat.
- [x] Action Store puede precargar el arte base empaquetado de Cari sin crear un segundo sistema de assets.
- [x] Bitácora `BITACORA.md` con estados y lista NO REPETIR.

## Gates

### Core multimedia

- [x] Contratos Frame/AudioPacket.
- [x] Bounded queues con descarte medible.
- [x] Scene/layers.
- [x] Software compositor de referencia.
- [x] D3D11 compositor experimental con avatar placeholder y alpha blending.
- [x] D3D11 compositor experimental con placeholder GPU y frame final BGRA.
- [x] Output interface.
- [x] Fan-out output.
- [x] Output profile validation.
- [x] Encoder boundary.
- [x] Interleave temporal A/V con reloj maestro lógico de audio.
- [x] Pacing de emisión raw por PTS mediante un reloj monotónico compartido y colas acotadas.
- [x] Interleaver global de audio/video por PTS con empate determinista a favor de audio.
- [x] Manual Talk gate sin activación automática del micrófono.
- [x] Límite de eventos despachados por polling para acotar ráfagas durante recuperación de atraso.
- [x] Smoke tests de orden, tolerancia y late-drop.
- [x] Mezclador temporal de audio para micrófono + sistema + futuras pistas como TTS.
- [x] Normalización inicial de canales y sample rate en el mezclador.
- [x] Gate de formato de entrada: sample rate/canales no pueden cambiar silenciosamente durante una salida.
- [x] Estimator de drift basado en PTS vs frames con smoothing y clamp implementado como módulo independiente.
- [x] P08: estimador independiente de drift implementado y testeable.
- [ ] Drift correction / resampling de producción basado en relojes de dispositivos.
- [x] D3D11 compositor GPU experimental con overlay RGBA y output texture.
- [x] Readback de captura CPU lazy: diagnóstico/fallback solamente.
- [x] Smoke D3D11 compositor con WARP.
- [x] Ruta experimental directa libavcodec/libavformat con PTS explícitos.
- [x] P04: ruta experimental Libav con PTS explícitos.
- [ ] Encoder real conectado.
  - FFmpeg recibe actualmente el frame final de la ruta experimental; falta validación sostenida y eliminación del readback CPU para producción.
- [ ] Mux/record real sostenido en Windows.
- [ ] RTMP real sostenido desde el pipeline.

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
- [x] Media Foundation camera streaming implementado como source nativa experimental.
  - [ ] Validación física y reconexión en hardware Windows.
  - Implementación nativa e integración al control plane/output ya realizadas; falta verificación Windows con cámara real y reconexión.
- [ ] Dedicated game capture.
- [x] Device-loss recovery para removed/reset/hung.
- [ ] Exhaustive device-loss/reconnect path.
- [ ] Real-machine hardware validation.

### Process / output infrastructure

- [x] Native process runner.
- [x] Windows process lifecycle management.
- [x] Argument quoting.
- [x] CMake integration.
- [x] Smoke e2e Windows registrado: genera BGRA/PCM, usa dos named pipes, cierra por EOF y verifica decodificación con FFmpeg.
- [x] Native smoke test for process execution.
- [x] Process stderr capture and draining.
- [x] Graceful FFmpeg input close before bounded forced termination.
- [x] Supervised FFmpeg process boundary: validation, launch, poll, stderr and exit state.
- [x] CI smoke for FFmpeg supervisor failure/validation path.
- [x] Native FFmpeg A/V output boundary with independent video/audio named pipes.
- [x] Retención acotada de stderr FFmpeg (256 KiB) para sesiones prolongadas.
- [x] `OutputRetryPolicy` con backoff exponencial, máximo de intentos y tope de demora.
- [x] Explicit FFmpeg two-input `-map 0:v:0 -map 1:a:0` contract.
- [ ] FFmpeg binary discovery policy.
  - CI usa instalación temporal; la política de redistribución del producto sigue pendiente.
  - CI instala FFmpeg para pruebas, pero la distribución de producto continúa sin decidir.
- [ ] FFmpeg legal redistribution decision.
- [x] Raw video producer connected to FFmpeg A/V output.
- [x] Mixed raw audio producer connected to FFmpeg A/V output.
- [x] Temporal audio mixer implemented before the single FFmpeg audio pipe.
- [x] Output failure classification for network/encoder/input/mux/permission/unknown.
- [x] Clasificación inicial de fallos de output por categoría.
- [x] Output stderr failure categorization inicial.
- [ ] Output stderr classification / structured diagnostics.
  - Estado/código de salida ya están expuestos; queda pendiente clasificar mensajes de stderr en categorías estables.
- [x] Automatic output reconnect/backoff policy skeleton with bounded attempts for RTMP network failures.
- [x] Reset del contador de retry entre sesiones manuales, conservando los intentos durante una reconexión automática.
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
- [x] Prueba local de contrato FFmpeg con archivo de salida sintético.
- [x] Smoke experimental de output Libav con dos streams y timebases explícitas implementado; requiere kit de desarrollo FFmpeg para ejecutarse.
- [ ] Prueba Windows sostenida en CI/hardware con FFmpeg + named pipes.
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
- [x] Ledger de continuidad EventSub y observación de `session_welcome` integrado sin duplicar TwitchIO.
- [ ] Explicit reconnection/re-subscription integration test con Twitch CLI/canal real.
- [ ] Token refresh lifecycle test.
- [ ] Live broadcaster/bot validation.

### Cari / Avatar

### Cari V0 — habla y reacciones
- [x] Runtime activity controller: idle/movimiento libre, keyboard, controller y phone.
- [x] Cámara de tracking oculta en la interfaz; webcam no entra como frame visual de output.
- [x] Manual Hablar/Callar y Auto conectados al gate de micrófono y lip-sync.
- [x] Acción canónica `talking` en el Action Store existente.
- [x] Gate nativo `microphone.set` para mutear/activar solo el micrófono.
- [x] Botón manual **Hablar** activa micrófono y acción `talking`.
- [x] Modo **Auto** retorna la expresión al tracking/VAD.
- [x] Reacciones manuales reutilizan el Action Store.
- [x] VAD local con captura de micrófono + HPF/LPF + RMS + histéresis.
- [ ] Validación de VAD con ruido, música y múltiples dispositivos Windows.


### Cari V0 — habla y reacciones

- [x] Acción canónica `talking` existente en el Action Store.
- [x] Gate nativo `microphone.set` para mutear/activar el micrófono sin detener system loopback.
- [x] Botón manual **Hablar**: activa audio/mic y selecciona `talking`.
- [x] Modo **Auto**: devuelve la expresión al tracking y usa VAD local para disparar lip-sync.
- [x] Botones manuales para las expresiones canónicas.
- [x] VAD local por RMS + HPF/LPF + histéresis; no requiere reconocimiento de voz ni cloud.
- [ ] VAD comparado en hardware con ruido, música y micrófonos diferentes.


- [x] Acting state independent of appearance.
- [x] Modos completos deterministas de actividad con objeto, brazos, intensidad y pose.
- [x] Appearance profile.
- [x] Hair/outfit/accessories.
- [x] Accessory anchors and transforms.
- [x] Seeded randomization.
- [x] JSON presets.
- [x] Editor de acciones PNG/frame dentro del Studio.
- [x] Canonical Cari personality bible with explicit invariants and data classification.
- [ ] Character behavior engine consuming personality/value/state layers.
- [x] Neutral avatar contract consumed by the Three.js renderer.
- [x] Mapa chibi procedural de preview, separado de la señal de streaming.
- [x] Manual talk/reaction control layer sobre el Action Store existente.

- [x] Overlay Three.js/glTF capturable e integrado experimentalmente al compositor D3D11 existente.
- [ ] Native VRM renderer de producción sin readback CPU.
- [x] Lip-sync de amplitud local conectado al `AudioCoreBridge` y al `AvatarActingBridge` como fallback cuando tracking facial no está activo.
- [ ] Final tracking.
  - Falta validación sostenida en la cámara/hardware objetivo y tuning final por dispositivo.
- [x] Procesamiento de voz local: HPF + presencia + compresión + saturación + limitador.
- [ ] Real-time voice processing sustained on target Windows audio devices.

### Avatar Studio

- [x] Preset data model.
- [x] Save/load validation.
- [ ] Desktop editor 3D completo; el editor de acciones visuales ya está implementado.
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
- [x] NSIS x64 installer configuration and packaging workflow.
- [ ] Windows release installer validation and signing.
- [ ] Diagnostics/log folder policy.
- [ ] Release smoke test on target PC.

## Continuity checkpoint — 2026-09-20

- HEAD actual auditado: `c9e75775698814359aeb3ccab59c25efc2aa10e3`.
- Ingeniería: ~65%; producto usable: ~50%.
- Nuevos módulos recientes: Media Foundation camera, D3D11 compositor experimental, LatestItemQueue, drift estimator, Libav experimental, named-pipe E2E, multistream supervisor, ActionStore/editor y Twitch desktop UI.
- Ninguno de estos se promociona a producción mientras falte su gate externo correspondiente.

## Evidencia actual

- Auditoría de botones renderer: 57 botones con ID; se corrigieron los dos controles de overlay lateral sin handler y se eliminó el handler fantasma de `header-stream`.
- Contrato OBS: Electron Main fue contrastado con `ObsService`; `obs:status` fue corregido a `status()`. Se añadió `ui-obs-contract.test.mjs` para detectar desalineaciones futuras.

- `AvatarActionStore` centraliza acciones, frames, persistencia local y presets JSON; no se creó un almacenamiento paralelo para el editor.
- `renderer/main.js` y `action-store.js` pasan la comprobación sintáctica aislada; los IDs estáticos del renderer coinciden con `index.html`.

- `AvatarActionStore` centraliza acciones, persistencia local, frames y export/import; la UI no mantiene un segundo almacenamiento paralelo.
- El editor visual permite crear acciones con `＋`, asignar imágenes, ordenar frames y reproducirlos en preview; la promoción a composición nativa sigue siendo un gate multimedia separado.

- Existe `ffmpeg_named_pipe_e2e_smoke.cpp` conectado a CMake y al workflow Windows; queda clasificado como IMPLEMENTADO pero no VERIFICADO mientras el runner no ejecute los steps.

- `FfmpegAvOutput::stop()` cierra primero los named pipes para permitir EOF/flush del muxer y solo fuerza la terminación si FFmpeg no sale dentro de un plazo acotado.
- `PollMediaGraph()` ya desactiva el estado lógico de salida cuando FFmpeg termina o el polling falla, evitando reportar un output fantasma.
- `MediaGraphController::poll()` ahora selecciona siempre el evento A/V con menor PTS entre las dos colas; el empate favorece audio y la decisión `late` de audio se contabiliza sin descartarlo para evitar huecos audibles.
- `MediaGraphController` rechaza cambios de sample rate/canales respecto del contrato FFmpeg y los expone como `audio_dropped_format`.
- `FfmpegAvOutput` mantiene únicamente los últimos 256 KiB de stderr y expone estado/código de salida para diagnóstico sin crecimiento indefinido.
- El FaceTracker distingue frames duplicados del video de una pérdida real de rostro; los duplicados no disparan el fade de tracking.
- La entrada de audio solo se extrae del mixer cuando ambos named pipes están conectados; esto evita consumir la cola durante el handshake inicial.
- Cada polling del media graph despacha como máximo 8 eventos A/V; si se alcanza el presupuesto, queda una métrica pacing_budget_exhausted para diagnóstico.

- Se corrigió previamente el timestamp WASAPI para usar el `QPCPosition` ya convertido por Windows a 100 ns. Microsoft documenta explícitamente esa unidad; no debe volver a tratarse como ticks QPC crudos. citeturn0search0
- `AudioTimelineMixer` introduce una frontera temporal única para micrófono, audio del sistema y futuras pistas como TTS. Normaliza canales/sample-rate, conserva PTS, produce bloques de 20 ms y mantiene métricas de rechazo, resampling, mezcla y underrun.
- El smoke de `AudioTimelineMixer` verifica mezcla de micrófono + sistema, avance monotónico de PTS, resampling de una pista de 44.1 kHz y rechazo de paquetes malformados.
- El mezclador todavía no se considera sincronización de producción: dos dispositivos físicos pueden tener relojes ligeramente distintos. La corrección de drift requiere observar los relojes de los dispositivos y ajustar/resamplear de forma continua; `IAudioClock::GetPosition` queda como referencia para esa etapa. citeturn0search2
- `FfmpegAvOutput` sigue siendo la frontera A/V nativa: dos named pipes independientes y dos entradas raw. Los formatos raw de FFmpeg no transportan timestamps por sí mismos, por lo que la continuidad temporal debe mantenerse antes de escribir al pipe. citeturn0search8
- La captura BGRA, el compositor D3D11 experimental y el audio mezclado atraviesan `MediaGraphController` → `NativeMediaOutputBridge` → `FfmpegAvOutput`. El gate restante es demostrar funcionamiento sostenido con FFmpeg real, A/V sincronizado y hardware Windows.
- CI no se marca como verde en este punto: los runs recientes siguen fallando antes de registrar steps/logs observables. La bitácora canónica conserva los run IDs y evita atribuir la falla a una línea de código.
- La validación final de cámara, GPU, juegos, audio, rendimiento, FFmpeg real, RTMP y reconexión continúa requiriendo una máquina Windows objetivo; CI no sustituye esa prueba.

## Estimación de avance

**Estimación global de ingeniería: ~71%.**

El 65% refleja que la ruta principal y varios componentes experimentales ya están implementados, mientras permanecen abiertos los gates de validación Windows/hardware, PTS extremo a extremo, compositor de producción, cámara, drift, RTMP sostenido y distribución.

## Regla de cierre

No convertir **"compila"** en **"funciona"**.

No convertir **"funciona en CI"** en **"funciona en tu PC"**.

No convertir **"la API existe"** en **"la integración está completa"**.

No convertir **"una frase funciona"** en **"la personalidad está definida"**.

Cada pendiente debe indicar qué evidencia falta antes de pasar a `[x]`.

## Bitácora y continuidad

La fuente canónica de continuidad y anti-repetición es `BITACORA.md`; `BITACORA.md` queda congelada como histórico. Consultarla antes de reabrir una tarea, prueba o componente.
## Evidencia adicional — 2026-09-20
- P1 dejó de ser solo diagnóstico: el callback nativo puede componer captura + placeholder GPU y enviar el frame final BGRA al MediaGraphController.
- El readback CPU se mantiene explícitamente como limitación de rendimiento y no se marca como producción.
- Los nuevos smoke portable de retry/diagnóstico pasan C++20 con warnings como errors.
### Production readiness

- **Estado actual:** NO listo para producción.
- **Build experimental:** arquitectura y componentes principales implementados.
- **Verificación Windows:** pendiente mientras Actions no ejecute steps/logs observables.
- **Uso diario estable:** pendiente de captura/audio/FFmpeg/RTMP/hardware sostenidos.
- **Promoción fuera de experimental:** bloqueada hasta cerrar P0 + P1 + P2 y el hardware gate.


### Instrumentación de validación P01/P02

- **Harness local Windows `validate-windows.ps1`: IMPLEMENTADO.** Ejecuta configure/build CMake, todos los CTest registrados, el E2E FFmpeg named-pipe y los checks/tests del Electron shell; guarda `environment.txt`, salidas de cada fase y `SUMMARY.txt`.
- El harness no cambia el estado de ningún gate: P01/P02 siguen pendientes hasta disponer de una ejecución Windows observable con resultados PASS.

## User-facing gates

Estas capacidades ahora tienen UI/acción accesible, pero siguen separadas de la validación real:

- Twitch Connect → OAuth → EventSub chat → Chat panel → Send Chat.
- Load GLB/glTF → Three.js full-body framing → overlay controls.
- Start Cari Engine → capture → audio → local record/RTMP.
- NSIS installer workflow → packaged native engine.

La existencia de botón, módulo o workflow no equivale por sí sola a validación de servicio/hardware.

## Continuidad viva — 2026-09-20

- Checkpoint de HEAD observado antes de esta entrada: `c8b44f1107408897ad837ff5a343d3ba3cfd5820`.
- No usar este SHA como HEAD permanente; consultar el PR #2 para el estado vivo.
- Ingeniería vigente: ~65%; producto usable/end-user: ~50%.
- Bitácora canónica: `experimental/studio/BITACORA.md`.


## CI runner checkpoint — 2026-09-20

- Native Windows Build run 369: `failure`; jobs sin steps/logs.
- CI y Character Runtime Tests asociados al mismo período: failures previos a steps útiles.
- Actions Runner Diagnostic: job `probe` también termina sin steps/logs.
- Estado correcto: **BLOQUEADO**, no “código roto”.
- Próximo gate: conseguir una ejecución que realmente llegue a Checkout/CMake/npm/CTest.

## Continuidad viva — 2026-09-20 — control plane audit

- Engineering tracking: ~65%.
- End-user/product readiness: ~50%.
- UI contract audit: 57 static buttons, 0 missing handlers/navigation.
- Renderer OBS/Twitch calls: 0 missing preload wrappers.
- OBS runtime event mirror: implemented.
- Twitch EventSub lifecycle/reconnect/keepalive path: implemented.
- Contractual UI test is part of the Electron shell test suite.
- Production gates still open: explicit A/V timestamps, final GPU compositor, Windows E2E, physical drift correction, real Twitch/OBS validation, hardware and installer release validation.
- No-repeat: continue on existing ObsService, TwitchChatService, StudioSessionManager, AvatarActionStore, MediaClock, RealtimePacer and compositor bridge; do not fork parallel implementations without reproducible regression.
## Twitch control plane — 21/09/2026

| Componente | Estado | Evidencia faltante |
|---|---|---|
| TwitchController provider-neutral | IMPLEMENTADO | canal real |
| EventBus thread-safe | IMPLEMENTADO | carga concurrente real |
| StudioActionRouter ampliado | IMPLEMENTADO | backend runtime real |
| Chat dedup por message ID | IMPLEMENTADO | canal real |
| EventSub continuity ledger | IMPLEMENTADO | reconexión real |
| Native/OBS dual backend execution | PENDIENTE | integrar StudioRuntimeBindings con backends |

### No repetir
- No crear otro EventSub WebSocket.
- No crear otro EventBus ni router.
- No copiar la reconexión interna de TwitchIO.
- No usar IDs de entidad como sustitutos de `message_id`.
## Continuidad 2026-09-21 — integración opcional y gobernanza de recursos

### OBS
- [x] Detección de proceso local independiente de la conexión WebSocket.
- [x] Separación explícita entre proceso detectado, control WS conectado y outputs activos.
- [ ] Validación OBS real con websocket/credenciales y cambios de outputs.

### Twitch
- [x] Estado de autorización y conexión expuesto al desktop shell.
- [x] Estado stream online/offline derivado de EventSub.
- [x] Keepalive/reconnect state observable.
- [ ] Validación real de canal y reconexión.

### Resource gating
- [x] Conexión OBS no arranca Native Engine.
- [x] Conexión Twitch no arranca Native Engine.
- [x] Voice config sin audio no arranca Native Engine.
- [x] OutputStop libera captura/audio que el propio output levantó.
- [x] Captura nativa evita readback/composición cuando no existe sink de salida.
- [x] Política central resource-policy.mjs y tests.
- [ ] Preview de captura nativa real: todavía no existe un consumidor de frame en el renderer; por eso el gate nativo descarta el trabajo pesado cuando no hay output.

### No-repeat gate
- No crear otro detector OBS.
- No crear otro supervisor Twitch.
- No convertir Twitch conectado en razón para capturar vídeo.
- No convertir OBS abierto en razón para iniciar encoder.
- No ejecutar compositor/readback de frames si no hay sink explícito.
## Checkpoint canónico — 2026-09-21

- Ingeniería: **~68%**.
- Producto usable/end-user: **~54%**.
- Seguimiento global: **~62%**.
- Producción: **NO listo**.
- HEAD auditado: `a49860c3393345759703e65090836a70f48c05bf`.

### Auditoría de errores del ciclo

- Atajo `R` limpiado para cerrar output, retry y avatar overlay.
- Cambio de fuente desde cámara a ventana corregido para no dejar una fuente activa.
- Status output serializado correctamente.
- Clasificación de fallos de red restringida.
- Workflows de CI corregidos para rama de desarrollo y `workflow_dispatch`.
- Includes Windows explícitos.

### Avatar externo

- PNGTuber: sin nuevo runtime; reutiliza Action Store.
- Inochi2D: opción 2D abierta, BSD-2-Clause.
- Live2D Cubism: software propietario, adapter opcional.
- VRoid/VRM y Blender/three-vrm: ruta 3D compatible con el renderer existente.

### Gate de rendimiento

El compositor D3D11 ya compone captura + overlay, pero el frame final se hace CPU-readback antes de la frontera FFmpeg. Esta ruta sigue siendo experimental y debe sustituirse por un encoder capaz de consumir la textura GPU o por un puente equivalente antes de declararla producción.

## Cari — invariantes visuales actuales

- [x] Piel morena/tan.
- [x] Cabello marrón medio con inner hair marrón claro.
- [x] Cola de caballo media.
- [x] Ahoge centrado.
- [x] Ojos marrones con pupilas blancas redondas.
- [x] Curita en la nariz.
- [x] Ropa deportiva de corredora, con remera ajustada o atada a la cintura y shorts/bike-shorts negros.
- [x] Dirección estilizada entre chibi 2D y 3D, evitando realismo y anime extremo.
- [x] Prohibición de diademas, hairpins, joyería, props, objetos y prendas extra.
- [ ] Arte final profesional / rig Live2D / VRM: todavía pendiente.

## Evidencia adicional — privacidad de micrófono — 2026-09-21

- El camino de atajo `A` fue auditado contra el contrato `microphone_set`.
- El atajo ya no habilita el micrófono de forma implícita.
- Invariante: arrancar audio != arrancar micrófono.
- Estado del gate: IMPLEMENTADO; validación de dispositivo real pendiente.


## Arte / calidad visual

- [x] Dirección artística Cari V1 documentada.
- [x] Restricciones canónicas de Cari reconciliadas con la dirección V1.
- [x] Gate visual medible en ART_QUALITY_GATE.md.
- [x] Fallback procedural Three.js elevado visualmente.
- [ ] Asset V1 final producido y aprobado.
- [ ] Revisión visual de thumbnail/plano medio/cuerpo completo.
- [ ] Tracking + expresiones + lip-sync sobre asset V1.
- [ ] Validación Windows/hardware del asset V1.

**No repetir:** no introducir accesorios o prendas extra para mejorar la silueta mientras contradigan el canon; resolver primero mediante proporción, color, material y construcción de las prendas ya definidas.
