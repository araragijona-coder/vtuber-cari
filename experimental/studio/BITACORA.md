# Cari Studio — Bitácora maestra

Última actualización: 2026-09-21
Rama: fix/native-windows-foundation
PR: #2

Regla: no repetir una tarea ya cerrada; continuar desde la evidencia registrada.

## Estados

- IMPLEMENTADO: existe código/contrato.
- VERIFICADO: existe una prueba reproducible que pasa.
- VALIDADO EN HARDWARE/SERVICIO: comprobado en Windows o servicio objetivo.
- PENDIENTE: falta evidencia concreta.
- NO REPETIR: ya fue investigado o implementado; solo volver ante evidencia nueva de regresión.

## Núcleo multimedia

| Área | Estado | Ubicación/evidencia | No repetir |
|---|---|---|---|
| Arquitectura local-first | IMPLEMENTADO | experimental/studio/ARCHITECTURE.md | No introducir IA/cloud como requisito del core |
| Frame/Audio/Output contracts | IMPLEMENTADO | experimental/studio/core | No crear contratos paralelos |
| Windows Graphics Capture ventana | IMPLEMENTADO | native-windows/capture_engine.* | No rehacer backend de ventana |
| Windows Graphics Capture pantalla primaria | IMPLEMENTADO | native-windows/capture_engine.* | No duplicar capturador |
| Enumeración de ventanas | IMPLEMENTADO | native-windows/window_sources.* | Extender el existente |
| WASAPI mic + loopback | IMPLEMENTADO | native-windows/wasapi_capture.* + audio_core_bridge.* | No crear otro capturador WASAPI |
| AudioTimelineMixer | IMPLEMENTADO + smoke | native-windows/audio_timeline_mixer.* | Drift físico sigue pendiente |
| Voice anime-bright | IMPLEMENTADO | native-windows/voice_effects.* | No llamarlo pitch/formant |
| MediaClock 100 ns | IMPLEMENTADO + smoke | core/media_clock.h | Mantener un único dominio temporal |
| RealtimePacer | IMPLEMENTADO + smoke | core/media_scheduler.h | No sustituir por timers UI |
| A/V interleaver global | IMPLEMENTADO + smoke | core/media_scheduler.h | No volver a dos loops separados |
| Colas A/V | IMPLEMENTADO | MediaGraphController | Mantener métricas de drop |
| Límite de despacho por poll | IMPLEMENTADO | MediaGraphController | No quitar el límite sin medir ráfagas |
| RawPipe | IMPLEMENTADO + smoke histórico | native-windows/raw_pipe.* | PTS aún no viajan por pipe |
| FFmpeg A/V boundary | IMPLEMENTADO | native-windows/ffmpeg_av_output.* | Falta Windows sostenido |
| EOF/flush | IMPLEMENTADO | ffmpeg_av_output.cpp | No volver a kill inmediato |
| stderr acotado | IMPLEMENTADO | ffmpeg_av_output.* | Límite 256 KiB |
| Failure categories | IMPLEMENTADO | core/output_diagnostics.h | No reintentar encoder/mux ciegamente |
| RTMP retry/backoff | IMPLEMENTADO | core/output_retry.h + main.cpp | Solo errores clasificados de red |
| Backpressure de arranque | IMPLEMENTADO | main.cpp | No drenar audio antes de conectar ambos pipes |
| Invariantes de sesión | IMPLEMENTADO | main.cpp + session-manager.js | No cambiar captura/audio durante output activo |

## VTuber

| Área | Estado | No repetir |
|---|---|---|
| Contrato de avatar | IMPLEMENTADO | No crear otro contrato |
| Three.js GLB/glTF | IMPLEMENTADO | No añadir otro renderer 3D sin evidencia |
| MediaPipe Face Landmarker | IMPLEMENTADO | Mantener guard de timestamps |
| FaceTrackingBridge | IMPLEMENTADO | Extender el puente existente |
| AudioLipSync | IMPLEMENTADO | No crear segundo mouth pipeline |
| Action Store | IMPLEMENTADO | Usar action-store.js |
| Acciones PNG/JPG/WebP | IMPLEMENTADO | No crear otro editor de acciones |
| JSON presets | IMPLEMENTADO | Extender formato existente |
| Overlay transparente | IMPLEMENTADO | Compositor nativo sigue pendiente |
| Live2D | PENDIENTE | No declarar integrado |
| VRM native compositor | PENDIENTE | Falta GPU/D3D11 real |

## Twitch

Actualmente el menú representa las capacidades relevantes del canal: chat, follows, subscriptions, gifts, resubs, cheers, raids, Channel Points, polls, predictions, Hype Train, ads, schedule, moderation, VIP/moderators, shoutouts, suspicious users, shared chat, Guest Star, power-ups y stream lifecycle.

Estado:
- Chat + OAuth + EventSub WebSocket: IMPLEMENTADO.
- Reconexión base de EventSub: IMPLEMENTADO.
- Catálogo visual de capacidades: IMPLEMENTADO.
- Helix broadcaster management avanzado: PREPARADO / PENDIENTE de scopes, endpoints y pruebas.

NO REPETIR: no crear otro WebSocket Twitch; el transporte existente es la fuente única.

## OBS

Superficie de UI y backend preparada para:
- streaming y estado;
- recording y estado;
- scenes, program y preview;
- inputs/sources y kinds;
- profiles y scene collections;
- Studio Mode y transición;
- virtual camera;
- stats.

Estado:
- WebSocket base: IMPLEMENTADO.
- Control ampliado: IMPLEMENTADO en contrato/UI.
- Validación contra OBS real: PENDIENTE.

NO REPETIR: OBS sigue siendo opcional y no es dependencia del core nativo.

## UI / menú

- menu-config.js es la fuente central de navegación.
- Grupos: Studio, Producción, VTuber, Twitch, OBS, Automatización y Sistema.
- El menú tiene buscador.
- Existen vistas para live, dashboard, scenes, sources, audio, outputs, editor, tracking, avatar, expressions, assets, chat, Twitch center, events, OBS center, hotkeys y settings.
- UI_SYSTEM_CATALOG.md contiene el mapa de capacidades y estados.

NO REPETIR: no volver a la navegación estática de siete paneles.

## CI

- Los workflows fueron habilitados también para la rama de desarrollo.
- workflow_dispatch está disponible.
- Los runs recientes del entorno continúan terminando antes de registrar steps en varios jobs; mientras no existan logs/steps ejecutables, no marcar CI como verde.
- Un fallo previo a steps no debe atribuirse automáticamente a una línea de código.

## Pruebas ya realizadas

- C++20 portable con -Wall -Wextra -Werror: PASS para contratos de timing/interleaving.
- FFmpeg 7.1.5 sintético: BGRA raw + PCM float32 -> H.264/AAC -> Matroska: PASS en Linux.
- Tests Electron existentes de sesión/avatar: evidencia previa PASS.

Estas pruebas no sustituyen Windows real, named pipes sostenidos, cámara, Game Capture, RTMP real ni hardware objetivo.

## NO REPETIR — índice rápido

1. No rehacer captura de pantalla/ventana.
2. No rehacer WASAPI mixer.
3. No rehacer MediaClock/RealtimePacer/interleaver.
4. No crear otro parser de control.
5. No crear otro WebSocket Twitch.
6. No sustituir Three.js sin un motivo medible.
7. No rehacer Action Store/editor.
8. No declarar Live2D, RTMP, drift, camera, Game Capture o hardware como terminados sin evidencia.
9. No tratar el catálogo de UI como backend implementado.
10. No perseguir CI a ciegas sin steps/logs.

## Siguiente orden de trabajo

1. Transporte A/V con timestamps explícitos.
2. Compositor GPU D3D11 y entrada del avatar en el frame final.
3. FFmpeg + named pipes sostenidos en Windows.
4. Drift correction basada en relojes WASAPI.
5. Cámara Media Foundation.
6. Game Capture.
7. Twitch Helix avanzado y scopes.
8. OBS scene/source/filter control completo.
9. Multistream aislado por output.
10. Hardware objetivo + instalador.

## Regla de cierre

IMPLEMENTADO no implica VERIFICADO.
VERIFICADO no implica VALIDADO EN HARDWARE.
Una tarjeta del menú no convierte una capacidad en una función terminada.

## Actualización 2026-09-20 — UI y sistemas

- El menú fue centralizado en renderer/menu-config.js.
- La navegación ahora cubre Studio, Producción, VTuber, Twitch, OBS, Automatización y Sistema.
- Se agregó buscador de herramientas y hotkeys de navegación.
- Se agregó Centro Twitch con catálogo de capacidades y estados.
- Se agregó Centro OBS con escenas, inputs, stats, recording, virtual camera, Studio Mode, profiles y scene collections.
- Se agregó separación VTuber entre Editor, Tracking, Avatar, Expresiones y Assets.
- Se agregó catálogo documental UI_SYSTEM_CATALOG.md.
- Se agregó test de coherencia para que cada item del menú tenga una vista y que los IDs HTML sean únicos.
- Se extendió preload/Main/ObsService para la superficie OBS.
- Se añadieron indicadores visuales de estado de Engine/Twitch/OBS y parámetros de tracking/audio.
- No se marca como implementada una capacidad solo por estar visible en el menú.

### Estado de continuidad

- Ingeniería vigente: 66%.
- Producto usable vigente: 52%.
- Porcentaje global reportado: 60%.
- Esta iteración mejora superficie y control, pero no cierra validación Windows/hardware.
- Próximo trabajo debe comenzar en los gates listados en este archivo y no volver a diseñar la navegación.

### Evidencia CI de esta iteración

- Los workflows ahora se disparan sobre la rama de desarrollo y tienen workflow_dispatch.
- Los últimos jobs observados siguen terminando como failure sin evidencia útil de steps/logs; Native Windows, CI y Character Runtime siguen sin validación real del build.

### No repetir

- No reconstruir menú estático.
- No crear un segundo Centro Twitch.
- No crear un segundo Centro OBS.
- No duplicar el Action Store/editor.
- No convertir el catálogo de capacidades en backend ficticio.


## Actualización 2026-09-20 — botones, acciones y puente Twitch/OBS/VTuber

### Hecho

- Se auditó la relación entre los 57 botones con ID del renderer y sus handlers.
- Se corrigieron los dos huecos encontrados: se eliminó el handler fantasma de `header-stream` y se conectaron `overlay-show-side` / `overlay-hide-side`.
- Se auditó Electron Main contra `ObsService`: el handler `obs:status` estaba llamando a un método inexistente (`getStatus`) y quedó alineado con `status()`; el resto de handlers OBS fue contrastado contra el servicio.
- Se añadió `test/ui-obs-contract.test.mjs` para detectar botones sin handler y llamadas OBS desalineadas.
- El botón Twitch conecta mediante el único servicio `TwitchChatService`; no se creó un segundo WebSocket.
- El chat Twitch ya puede disparar acciones locales del avatar con `!happy`, `!sad`, `!talk`, `!silent`, `!angry` y `!neutral`.
- OBS mantiene control de stream, grabación, virtual camera, escenas, inputs, Studio Mode, perfiles, scene collections y estadísticas.
- El overlay del avatar se puede activar/desactivar desde el panel lateral y desde la vista Avatar.
- El control de salida nativa continúa desacoplado de OBS: Cari puede grabar/emitir directamente por FFmpeg.

### Evidencia

- Auditoría estática: 57 botones con ID; únicamente quedaron los dos casos laterales sin handler y el handler fantasma, todos corregidos.
- Comparación renderer/main/ObsService: no quedan llamadas directas a métodos inexistentes del servicio OBS.
- El test contractual queda incluido en `npm test`.
- CI todavía no ejecuta steps en los runs recientes, por lo que esta capa se considera implementada y preparada para verificación, no verificada por CI.

### No repetir

- No rehacer la navegación.
- No crear otro `ObsService`.
- No crear otro `TwitchChatService` ni otro WebSocket EventSub.
- No volver a usar nombres `getStatus/getSceneList/getInputList` en Electron Main cuando el servicio expone `status/getSceneList/getInputList`; mantener el contrato existente.
- No declarar las tarjetas de capacidades Twitch como backend implementado; siguen separadas de la superficie funcional real.
- No mover el compositor del avatar a producción hasta integrar el frame final.

### Siguiente foco

1. Transporte A/V con timestamps explícitos.
2. Compositor GPU D3D11: avatar + captura -> frame final.
3. FFmpeg/named pipes sostenidos en Windows.
4. Drift correction WASAPI.
5. Cámara Media Foundation y Game Capture.
6. Twitch EventSub avanzado con scopes/endpoints.
7. OBS scene/source/filter actions ampliadas.
8. Hardware, instalador y release.

## Actualización 2026-09-20 — cierre de auditoría de botones

- Centro Twitch: el botón Conectar alterna conexión/desconexión según el estado real.
- El estado de conexión se refleja en el Centro Twitch.
- Se mantiene un único TwitchChatService/EventSub WebSocket.
- El test UI↔OBS↔botones cubre botones con ID y botones declarativos.
- PROJECT_STATUS.md se sincronizó a un porcentaje global de **60%**.
- Referencia de seguimiento: ingeniería 66%, producto usable 52%, porcentaje global 60%.

## Actualización 2026-09-20 — verificación final de continuidad

HEAD auditado: d47c008e3384f84f0da923a60205428f6ca14228

Resultado de auditoría UI:
- 57 botones estáticos con ID.
- 0 handlers estáticos apuntando a IDs inexistentes.
- 0 llamadas desde Electron Main a métodos inexistentes de ObsService.
- 1 control estático deshabilitado sin acción: Pitch / Formant, marcado intencionalmente como futuro.
- `action-add-images` es un control dinámico creado por el inspector; no debe añadirse al HTML base solo para satisfacer el test.
- Overlay lateral quedó conectado.
- Centro Twitch quedó conectado con toggle y estado.
- Test contractual UI↔OBS fue ampliado para cubrir botones declarativos, controles deshabilitados y elementos dinámicos conocidos.

Regla de continuidad:
- Antes de implementar nuevas acciones, ejecutar la auditoría de botones y revisar esta bitácora.
- Las capacidades Twitch/OBS mostradas como catálogo no se consideran backend hasta tener endpoint/handler, prueba y servicio real.

Estado global:
- Porcentaje global de seguimiento: **60%**.
- Ingeniería: **66%**.
- Producto usable: **52%**.

Pendientes prioritarios que no deben reemplazarse por trabajo repetido:
1. timestamps A/V explícitos extremo a extremo;
2. compositor GPU D3D11 con avatar dentro del frame final;
3. FFmpeg + named pipes sostenidos en Windows;
4. drift correction WASAPI;
5. cámara Media Foundation / Game Capture;
6. Twitch EventSub avanzado y scopes;
7. OBS controls adicionales;
8. hardware, multistream e instalador.

## Actualización 2026-09-20 — ciclo actual: botones + Twitch + OBS + continuidad

### Hecho
- Se corrigió el renderer para usar el elemento real #engine-chip.
- Se agregó controls-contract.test.mjs y quedó incorporado al test de Electron.
- Auditoría automática: 57 botones con ID; 0 sin handler/navegación; 0 métodos OBS/Twitch consumidos desde renderer sin wrapper en preload.
- OBS quedó con espejo de runtime: Stream, Record, Virtual Camera, Program, Preview y Studio Mode, con eventos hacia renderer y limpieza de estado ante desconexión.
- Twitch mantiene un único EventSub websocket; lifecycle events, keepalive watchdog, reconnect transfer y deduplicación están centralizados en TwitchChatService.
- Los eventos Twitch de lifecycle pueden activar acciones locales del avatar.
- El ciclo nativo mantiene retry RTMP acotado a fallos de red, diagnóstico básico, stderr acotado, backpressure y presupuesto de 8 eventos por polling.

### Correcciones durante este ciclo
- Se detectó y reparó una mutilación de #scheduleReconnect() provocada por una edición del watchdog.
- Se detectó y reparó el formato del nuevo test contractual, que inicialmente contenía saltos de línea literales en lugar de saltos reales.
- Se corrigió el orden de serialización del campo output en el estado nativo.

### Evidencia
- Parseo sintáctico independiente: TwitchChatService, ObsService, Electron Main, preload y renderer: OK.
- Auditoría estática UI: OK.
- Pruebas C++20 strict y FFmpeg sintético: PASS según evidencias ya registradas.
- CI actual: BLOQUEADO por jobs que terminan con steps=null y sin logs observables.

### NO REPETIR
- No rehacer navegación.
- No crear otro ObsService, TwitchChatService, EventSub websocket o Action Store.
- No volver a usar #engine; el elemento correcto es #engine-chip.
- No declarar Twitch, OBS, RTMP o hardware como validados solo porque el botón existe.
- No rehacer MediaClock, RealtimePacer o MediaInterleaver.
- No sustituir Windows Graphics Capture por OpenCV para escritorio sin evidencia.
- No convertir capturePage en compositor de producción.

### Siguiente foco
1. Transporte A/V con timestamps explícitos.
2. Compositor GPU final: captura + avatar + overlays → frame codificado.
3. E2E Windows FFmpeg/named pipes.
4. Drift correction WASAPI.
5. Cámara Media Foundation y Game Capture.
6. Twitch scopes/endpoints adicionales y pruebas reales.
7. OBS scene items/filters/hotkeys.
8. Hardware, multistream e instalador.

### Porcentaje canónico actual
- Ingeniería: ~65%.
- Producto usable: ~50%.

## Actualización 2026-09-21 — StudioRuntimeBindings y selección de backend

### Hecho

- Se evolucionó app/studio/runtime_bindings.py desde un registro simple de callbacks a una frontera explícita de backends.
- NativeBackend quedó definido como backend principal, prioridad 100.
- OBSBackend quedó definido como backend opcional, prioridad 50.
- AUTO prueba NativeBackend primero y solo usa OBS cuando Native no está disponible o no soporta la acción.
- NATIVE no hace fallback a OBS.
- OBS solo se usa cuando se selecciona explícitamente o cuando AUTO necesita fallback.
- Un error durante la ejecución del backend no provoca un segundo intento en otro backend; esto evita efectos duplicados o parciales.
- Las acciones no atendidas siguen publicando el evento tipado studio_*_requested y además studio_action_unhandled; no se inventa una implementación.
- Se conservaron register/unregister para compatibilidad; register usa NativeBackend por defecto.
- snapshot conserva las métricas planas anteriores y agrega la vista detallada de backends.
- dispatch_payload valida que el payload sea un objeto antes de leer kind/value.
- LocalPipeline ahora acepta studio_bindings inyectado y usa StudioRuntimeBindings por defecto.
- Se valida que un StudioRuntimeBindings inyectado pertenezca al mismo EventBus del pipeline.
- tests/test_studio_runtime_bindings.py cubre backend native prioritario, fallback OBS, selección explícita, errores sin duplicación, acciones no atendidas y compatibilidad.
- tests/test_pipeline_events.py cubre la integración del nuevo boundary en LocalPipeline.
- experimental/studio/RUNTIME_BACKENDS.md documenta la arquitectura y la regla de no duplicar routers/backend bindings.

### Estado

- StudioRuntimeBindings: IMPLEMENTADO.
- NativeBackend: IMPLEMENTADO como adaptador inyectable; la conexión física al Native Engine debe ser provista por el integrador.
- OBSBackend: IMPLEMENTADO como adaptador inyectable; el transporte real sigue perteneciendo a ObsService/obs-websocket.
- Verificación CI: BLOQUEADA por el problema de Actions observado; los jobs recientes continúan terminando con steps=null.
- Validación en Windows/OBS real: PENDIENTE.

### NO REPETIR

1. No crear otro StudioRuntimeBindings.
2. No crear un segundo router de backend para OBS.
3. No convertir OBS en dependencia del Native Engine.
4. No hacer fallback automático después de una excepción de ejecución del backend.
5. No declarar una acción funcional solo porque está registrada en la UI.
6. No conectar credenciales ni SDKs de plataforma directamente al router de acciones.
7. Nuevas plataformas deben implementar el contrato de backend existente y cubrirlo con pruebas, no modificar la semántica de StudioAction.

### Siguiente foco

1. Transporte A/V con timestamps explícitos.
2. Compositor GPU D3D11 de producción dentro del frame que entra al encoder.
3. Verificación E2E Windows de named pipes + FFmpeg.
4. Drift correction de relojes WASAPI.
5. Cámara Media Foundation y Game Capture real.
6. OBS scene/source/filter actions adicionales con prueba real.
7. Twitch scopes/endpoints avanzados y prueba real.
8. Hardware, multistream y release.

### Porcentaje canónico

- Ingeniería: ~67%.
- Producto usable: ~53%.
- Global de seguimiento: ~61%.

HEAD registrado de esta actualización: f10bd6ef024c52c077f5c69a29b2ea497e6eb297.
