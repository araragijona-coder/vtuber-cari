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
