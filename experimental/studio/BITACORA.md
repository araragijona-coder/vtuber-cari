# Cari Studio — Bitácora maestra

Última actualización: 2026-09-20
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
