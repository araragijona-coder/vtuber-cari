# Cari Studio — estado de implementación

> **Checkpoint vigente — 2026-09-21:** Ingeniería **~71%** · Producto usable/end-user **~58%** · Seguimiento global **~65%** · Producción **NO listo**.
> Memoria canónica: `experimental/studio/BITACORA.md`.

# Cari Studio — checkpoint canónico vigente

> **Fuente de continuidad:** `experimental/studio/BITACORA.md`.  
> Los porcentajes y estados históricos que aparezcan más abajo no deben reemplazar este checkpoint.

- HEAD actual: consultar el PR #2
- Ingeniería: **~71%**
- Producto usable/end-user: **~58%**
- Seguimiento global: **~65%**
- Producción: **NO listo**

---

## CHECKPOINT VIGENTE — 2026-09-21

- HEAD canónico de esta rama: consultar el PR #2; último head auditado en continuidad: `070c3481de17384bba353affb17a0f33abc38213`.
- Ingeniería: **~71%**.
- Producto usable/end-user: **~58%**.
- Seguimiento global: **~65%**.
- Estado: **EXPERIMENTAL / NO listo para producción**.

### Cari V0 y control de habla
- [x] Avatar procedural de cuerpo completo en Three.js.
- [x] Estados canónicos: neutral, happy, angry, afraid, embarrassed, sad, exhausted, confused.
- [x] Acciones canónicas: talking y silent, además de acciones emocionales del Action Store.
- [x] Tracking facial con MediaPipe y estabilización de expresión.
- [x] Botón manual **Hablar** conectado al Action Store y al gate nativo del micrófono.
- [x] Botón **Auto** devuelve el movimiento/reacción al procesamiento local y mantiene el micrófono OFF.
- [x] Botones manuales de reacción para las expresiones canónicas.
- [x] Movimiento libre/idle procedural del avatar.
- [x] Actividades teclado, mando y móvil con control manual/automático.
- [x] Cámara de tracking oculta: no se renderiza la cara del usuario en Preview/Tracking.
- [x] Detector local de habla por amplitud/HPF/LPF/histéresis, sin speech-to-text ni cloud.
- [ ] Reconocimiento semántico del contenido hablado; no es requisito para activar la acción talking y no se añade IA obligatoria.
- [ ] Rig VRM/Live2D de producción; no mezclarlo con el V0 procedural.

### Continuidad
- `BITACORA.md` es la fuente canónica de anti-repetición.
- `ART_QUALITY_GATE.md` es la referencia del gate visual; el procedural V2 solo demuestra runtime, no calidad final.
- No rehacer WGC, WASAPI, MediaClock/Pacer/Interleaver, FFmpeg supervisor, OBS service, Twitch transport, Action Store ni renderer Three.js salvo regresión reproducible.
- Gates inmediatos: CI observable, E2E Windows, compositor GPU sin readback, PTS E2E, drift físico y validación en hardware.
- La cámara Media Foundation y el compositor D3D11 ya existen en la rama; queda su validación física/E2E.


## Producto objetivo

- [x] Superficie de Studio de escritorio estilo plataforma de streaming.
- [x] Navegación por En vivo, Panel, VTuber, Escenas, Chat, Eventos, Assets y Configuración.
- [x] Menú modular ampliado con Producción, Tracking, Avatar, Expresiones, Twitch Center, OBS Center y Hotkeys.
- [x] Catálogo visual de capacidades Twitch/OBS/VTuber con estados connected/prepared/planned.
- [x] Editor VTuber visible dentro de la aplicación.
- [x] Sistema de acciones con `＋ Nueva acción` y acciones iniciales Feliz/Triste/Hablar/Callar/Neutral/Enojada.
- [x] Assets de imagen por acción, múltiples frames, drag-and-drop, orden, loop y parámetros visuales.
- [x] Presets JSON export/import y persistencia local.
- [x] Acciones activables desde UI y comandos básicos del chat.
- [x] Base art PNG V0 de Cari (neutral/happy/angry) incluida en `assets/cari/expressions/`.

## Arquitectura

- [x] Núcleo local sin IA/API obligatoria.
- [x] Contratos de fuente, frame y audio.
- [x] Colas acotadas con métricas de descarte.
- [x] Escenas y capas ordenadas.
- [x] Mixer de audio lógico.
- [x] Frontera de encoder y salida.
- [x] OutputRetryPolicy y clasificación de fallos para RTMP.
- [x] Monitoring y clasificación de salud.
- [x] Cola temporal A/V con reloj maestro lógico de audio.
- [x] Emisión raw temporizada por PTS con `RealtimePacer` y colas acotadas.
- [x] Interleaver A/V global por PTS con prioridad determinista de audio en empate.
- [x] Compositor D3D11 experimental conectado al frame final mediante readback BGRA.
- [x] Adaptador experimental D3D11 texture -> AVFrame hardware sin readback CPU.
- [x] Readback de captura CPU lazy: solo diagnóstico/fallback; no se ejecuta antes de cada composición GPU.
- [x] Diagnóstico de salida FFmpeg con estado/código de salida y buffer stderr acotado.
- [x] Retry/backoff RTMP restringido a errores de red y métricas de categoría.
- [x] Reset de retry por nueva sesión manual, conservando intentos durante reconexiones automáticas.
- [x] Backpressure de arranque: el mixer no drena audio hasta que ambos pipes de salida están conectados.
- [x] Límite de despacho por polling para impedir ráfagas largas de recuperación A/V dentro de un solo tick.
- [x] Retry RTMP acotado por backoff, con clasificación de fallos y cancelación al detener manualmente el output.
- [x] Ruta Libav experimental D3D11 -> AVFrame hardware sin readback CPU en la entrega al encoder.
- [x] Manual Talk gate: el motor de audio arranca con micrófono OFF y solo se habilita por acción explícita de Hablar.
- [x] Auditoría de botones renderer y alineación de handlers OBS/Twitch/VTuber.
- [x] Test contractual UI→IPC→ObsService para evitar regresiones de botones y API.
- [x] Control Twitch ↔ avatar por comandos locales de chat y toggle de conexión desde Centro Twitch.
- [x] Bitácora técnica versionada con inventario de trabajo realizado, evidencia y lista NO REPETIR.
- [x] Validador automático de continuidad para detectar porcentajes desalineados, LOG duplicados y pérdida de reglas NO REPETIR.
- [x] Gate visual medible para Cari V1 y reconciliación contra su canon visual.
- [x] Action Store precarga las expresiones PNG base de Cari cuando no existen frames personalizados.
- [x] Test de coherencia UI para menú, vistas e IDs HTML.
- [x] Latest-frame worker fuera del callback WGC: el callback solo encola/reemplaza frames pendientes; el procesamiento pesado queda desacoplado del hilo de captura.
- [x] Diagnóstico y retry RTMP acotado por categoría de fallo.
- [x] Smoke end-to-end Windows de FFmpeg + named pipes implementado en código; **PENDIENTE DE VERIFICACIÓN** porque GitHub Actions no expone steps/logs ejecutados.
- [x] Política de retry RTMP con backoff exponencial acotado y clasificación de errores.
- [x] Bitácora maestra con ledger de trabajo realizado, descartado y pendiente.
- [x] Auditoría de licencias de dependencias runtime fijadas.
  - No habilita por sí sola redistribución de FFmpeg/codec; esa decisión sigue pendiente.
- [x] Perfil de tracking facial calibrable con smoothing, deadzone, sensibilidad y recuperación ante pérdida de rostro.
- [x] Hotkeys globales para expresiones, calibración y toggle de tracking.
- [x] Controles de cámara, calibración, reset, sensibilidad y suavizado en la vista Tracking.
- [x] Guardia que distingue frame duplicado de pérdida real de rostro.
- [x] Smoke test nativo para contratos core.
- [x] Smoke D3D11 compositor con WARP, incluyendo composición alpha de overlay.
- [x] Smoke D3D11 hardware encoder preparado para validar h264_nvenc/h264_amf; requiere Windows + driver + FFmpeg dev kit.
- [x] Reconstrucción del compositor ante cambio de ID3D11Device después de device-loss recovery.
- [ ] CI Windows verde sobre el head actual (los últimos runs y el workflow de diagnóstico siguen fallando antes de registrar steps/logs; no existe evidencia de ejecución del build).

## Windows

- [x] Win32 window foundation.
- [x] D3D11 device creation.
- [x] Windows Graphics Capture de ventana.
- [x] Windows Graphics Capture de pantalla primaria.
- [x] Frame callback con superficie DXGI.
- [x] Enumeración de ventanas capturables.
- [x] WASAPI microphone/loopback foundation.
- [x] Recreación del frame pool ante cambios de tamaño.
- [x] Módulo de captura de cámara Media Foundation implementado.
  - [x] Integración al runtime/control plane/UI como source=camera.
  - [ ] Validación en cámara real y reconexión en Windows.
- [ ] Game Capture dedicada con backend específico.
- [x] Recuperación explícita de device removed/reset/hung.
- [ ] Validación exhaustiva de device-loss/reconnect en hardware real.

## Multimedia

- [x] Compositor RGBA de referencia para validar escenas.
- [x] Fan-out conceptual de múltiples salidas.
- [x] Productor BGRA y audio mezclado conectados al boundary nativo de FFmpeg.
- [x] Perfil de salida y boundary de FFmpeg/RTMP.
- [x] Interleave temporal A/V en `StudioPipeline`.
- [x] Compositor D3D11 GPU experimental para captura + avatar-placeholder + overlays.
- [ ] Compositor GPU D3D11 de producción conectado al encoder.
- [ ] Encoder hardware/software real conectado al pipeline.
  - La ruta Libav/D3D11 existe y tiene smoke; requiere Windows + FFmpeg development kit + GPU/driver para verificación.
- [ ] Muxer/recorder de producción.
- [x] Proceso FFmpeg administrado por Cari y conectado a las salidas.
  - El cierre intenta primero EOF/flush antes de escalar a terminación forzada.
  - Se añadieron clasificación de fallos y retry exponencial limitado para RTMP de red.
  - El diagnóstico stderr queda limitado a 256 KiB para impedir crecimiento indefinido durante sesiones largas.
  - El estado/código de salida del proceso se publica en las métricas nativas y en la UI.
  - El cierre intenta primero EOF/flush antes de escalar a terminación forzada.
  - El estado nativo se reconcilia si FFmpeg termina inesperadamente.
  - El gate de verificación real sigue abierto: archivo/RTMP sostenido, sincronización, reconexión y hardware.
- [x] Estimator independiente de drift de reloj de audio implementado.
  - [ ] Corrección/resampling de producción con relojes físicos.
- [ ] Verificación sostenida del pacing A/V con FFmpeg real.
- [ ] Verificación de salida D3D11 hardware sostenida en Windows.
  - E2E sintético de named pipes reforzado a 5 s y listo para CI; la validación sigue bloqueada mientras Actions no ejecute steps.
- [ ] Verificación Windows del E2E named-pipe y del compositor D3D11.
- [x] Ruta Libav experimental para preservar PTS explícitos.
  - [ ] Compilación/verificación con kit de desarrollo FFmpeg en Windows.
- [ ] Verificación Windows real del named-pipe E2E.
  - Existe ahora un smoke Windows que ejerce ambos named pipes durante una sesión sintética y vuelve a decodificar el archivo resultante.
  - La planificación ahora interleavea globalmente por PTS; el transporte raw todavía no conserva los PTS originales.

## VTuber / cámara / voz

- [x] Contratos de avatar y actuación existentes.
- [x] Contrato normalizado de expresión/pose/gaze para renderer Three.js.
- [x] Registro/validación de assets GLB/GLTF antes de cargarlos en el overlay.
- [x] Estado de actuación independiente de apariencia.
- [x] Perfil de apariencia modular con cabello, outfit y accesorios.
- [x] Accesorios con ancla, posición, escala, rotación y color.
- [x] Selección aleatoria reproducible de accesorios.
- [x] Renderer Three.js/glTF experimental con fallback de cuerpo completo.
- [x] Fallback Three.js de cuerpo completo para validación de tracking/composición; ya no es un placeholder de solo cabeza.
- [x] Overlay Three.js/glTF integrado experimentalmente al compositor nativo mediante la ventana transparente capturada con WGC.
- [ ] Integración de avatar de producción sin readback CPU.
- [x] Lip-sync local por amplitud/VAD de micrófono conectado al `AvatarActingBridge`.
- [x] Tracking facial local integrado como adaptador MediaPipe.
  - [x] Estabilización de expresión y guard de timestamps.
  - [x] VAD local de micrófono para distinguir habla/silencio.
  - [ ] Validación final de rendimiento/modelo en hardware.
- [x] Cadena de voz local de baja latencia: HPF + presencia + compresión + saturación suave + limitador.
  - [ ] Validación integrada en Windows y medición sostenida.

## Streaming / eventos

- [x] Arquitectura de salida desacoplada de plataformas.
- [x] Controles de chat Twitch conectados a acciones locales del avatar y botones OBS conectados a su servicio real.
- [ ] Adaptador Twitch RTMP probado en máquina real.
- [ ] Adaptador YouTube RTMP probado en máquina real.
- [ ] Adaptadores adicionales.
- [x] Twitch chat con un único EventSub WebSocket compartido.
- [x] Comandos locales antes del pipeline de IA opcional.
- [x] Chat normal pasivo por defecto: no invoca IA/Responder.
- [x] Chat público `1+` con TTS local y evento `chat_read`.
- [x] Guardia local de salida del chat contra ráfagas.
- [x] EventSub follow, subscribe, gifted sub, resub message, cheer, raid, channel points, polls y predictions conectado al AutomationEngine.
- [x] Despachador local de acciones de avatar/voz sin IA.
- [x] Acciones `chat/sound/scene/overlay/music` no se pierden silenciosamente: se publican como `studio_action` para el runtime.
- [x] `StudioActionRouter` valida y traduce `studio_action` a eventos internos tipados.
- [x] `StudioActionRouter` queda conectado al `LocalPipeline`.
- [x] `StudioRuntimeBindings` permite registrar backends locales con métricas y aislamiento de errores.
- [x] Acciones desconocidas generan `automation_action_unhandled` para auditoría.
- [ ] Ejecutar realmente `studio_chat_requested`, `studio_sound_requested`, `studio_scene_requested` y equivalentes con los backends nativos.
- [x] Supervisor multi-stream experimental con hasta 4 destinos y retry independiente por destino.
  - [ ] Validación con múltiples endpoints RTMP reales.
- [x] Observabilidad de continuidad EventSub con ledger de generaciones y auditoría de suscripciones.
  - [ ] Prueba real de reconexión/re-suscripción con Twitch CLI o canal.

## Editor VTuber y Avatar Studio

- [x] Base de configuración separada del stream en directo.
- [x] Editor visual de acciones PNG/frames dentro del Studio.
- [x] Biblioteca local de acciones reutilizable en En vivo.
- [x] Modelo de apariencia intercambiable sin tocar el estado de actuación.
- [x] Puntos de anclaje para accesorios.
- [x] Randomización de accesorios con semilla reproducible.
- [x] Persistencia de presets JSON con validación de versión y nombres seguros.
- [ ] Editor visual de escritorio 3D completo (escena/modelo/assets); el editor de acciones 2D ya está implementado.
- [ ] Catálogo real de assets aprobado por el usuario.
- [ ] Previsualización VRM integrada.
- [ ] Guardado/carga de presets desde UI.

## Distribución

- [x] Workflow reproducible de compilación Release x64 en Windows CI.
- [x] Paquete portable x64 generado por CI como artifact.
- [ ] Bundle de assets de producción y modelo artístico final.
- [ ] FFmpeg/codec legalmente redistribuible elegido.
- [x] Configuración del instalador NSIS x64.
- [ ] Validación del instalador Windows en máquina/CI y firma.
- [ ] Diagnóstico/rollback y logs de usuario.

## Estimación de avance

**Estimación vigente: ingeniería ~71% · producto usable ~58% · seguimiento global ~65%.**

Los porcentajes vigentes se mantienen sincronizados con `BITACORA.md`: miden cierre de requisitos, no líneas de código ni disponibilidad para producción.

## Criterio de cierre

Un componente no se marca como completo por tener una interfaz. Debe:

1. compilar en Windows CI cuando corresponda;
2. tener smoke/unit/integration coverage apropiada;
3. funcionar con el hardware objetivo cuando sea hardware-dependent;
4. exponer métricas y errores útiles;
5. no convertir una integración opcional en dependencia obligatoria.

## Regla de reutilización

Cari estudia proyectos maduros y reutiliza librerías/componentes cuando sus licencias y límites de distribución sean compatibles. Para código con licencia incompatible, se adopta el patrón arquitectónico y se implementa una versión propia.


## Continuidad / bitácora

La única fuente canónica de continuidad y anti-repetición es `BITACORA.md`.

- HEAD canónico: consultar el HEAD actual del PR #2 y `BITACORA.md`
- Avance de ingeniería vigente: **65%**.
- Avance de producto usable vigente: **50%**.
- Los checkpoints anteriores son históricos y no deben usarse para decidir trabajo nuevo.

### Regla
Antes de modificar un componente, buscarlo en `BITACORA.md`. Si está IMPLEMENTADO/VERIFICADO, trabajar sobre su gate restante o sobre una regresión reproducible; no crear un reemplazo paralelo.

## Readiness

**Estado de uso actual: NO listo para producción.**

El proyecto tiene un build experimental con los componentes principales implementados, pero la validación Windows/hardware sigue abierta. La ausencia de jobs con steps/logs en GitHub Actions impide marcar el build nativo como verificado en CI.

**Build de desarrollo:** sí, una vez compilado en Windows y usado bajo prueba controlada.

**Streamer/VTuber estable para uso diario:** todavía no.

**Gate inmediato:** ejecutar y obtener PASS del E2E Windows named-pipe -> FFmpeg -> archivo y del build completo; después medir estabilidad sostenida y sincronización.

- [x] Harness local `validate-windows.ps1` para ejecutar build, smoke/E2E y checks de Electron con evidencia reproducible.

## Indicador de producto usable

El porcentaje de ingeniería y el porcentaje de producto listo para uso real se separan para evitar confundir infraestructura con experiencia de usuario.

- **Ingeniería implementada: ~65%**.
- **Producto usable/end-user: ~50%**.

Producto usable todavía requiere: prueba Windows real, Twitch real, RTMP sostenido, modelo artístico final, composición avatar→encoder, cámara final, Game Capture, drift correction, lip-sync, distribución FFmpeg y validación del PC objetivo.

## User-facing readiness update

- Twitch OAuth + EventSub chat está conectado al desktop shell con UI de conexión, chat entrante, envío y lectura local.
- Avatar GLB/glTF tiene selector y framing de cuerpo completo.
- Instalador NSIS x64 y launchers están definidos.
- La validación real del servicio/hardware continúa abierta.


## CI / Runner

El workflow de diagnóstico confirma el mismo bloqueo observado en los workflows principales: los jobs terminan antes de registrar steps/logs. El estado permanece BLOQUEADO hasta disponer de ejecución observable.

## Continuidad viva — 2026-09-20 — UI/Twitch/OBS y control contractual

Este bloque supersede los porcentajes históricos anteriores de este archivo.
- Ingeniería implementada: ~65%.
- Producto usable/end-user: ~50%.
- Estado de producción: NO listo para producción.

### Hecho en el último ciclo
- Auditoría automática de 57 botones estáticos del renderer: 0 botones sin handler/navegación.
- Auditoría Renderer→preload: 0 métodos OBS/Twitch usados sin wrapper IPC.
- Corrección de ui.engine para usar el elemento real #engine-chip.
- Test contractual electron-shell/test/controls-contract.test.mjs incorporado a npm test.
- OBS ahora espeja Stream, Record, Virtual Camera, Program/Preview y Studio Mode mediante eventos del websocket.
- Estado OBS se limpia correctamente ante disconnect/error.
- Twitch EventSub mantiene un único websocket, con lifecycle events, session_reconnect, keepalive watchdog, deduplicación y reconexión acotada.
- Eventos Twitch recibidos pueden accionar expresiones/estados del avatar.
- Output nativo mantiene retry RTMP restringido a fallos clasificados como red.
- Media pipeline mantiene interleaver A/V por PTS, backpressure de handshake y máximo 8 eventos por polling.

### Evidencia y límites
- Verificación estática del shell: positiva.
- FFmpeg sintético BGRA + PCM → H.264/AAC → Matroska: comprobado fuera de Windows.
- Validación Windows real de build, named pipes sostenidos, cámara, Game Capture, RTMP real, sincronización sostenida y hardware: pendiente.
- GitHub Actions continúa mostrando jobs que terminan antes de registrar steps/logs; CI no se considera verde.

### Gate siguiente — no repetir
1. No rehacer botones/navegación.
2. No crear otro OBS service/websocket.
3. No crear otro Twitch transport.
4. No crear otro Action Store/renderer/clock/interleaver.
5. Empezar por timestamps A/V explícitos, compositor GPU final, E2E Windows y drift correction.
## Twitch Control Plane — estado de continuidad

- [x] `TwitchController` provider-neutral conectado a `TwitchLiveBot`.
- [x] `EventBus` thread-safe y observable con journal acotado.
- [x] `StudioActionRouter` ampliado para stream, recording, source, volume, mute, camera, avatar, expression, tracking y command, además de chat/sound/scene/overlay/music.
- [x] Deduplicación bounded de eventos cuando existe `message_id`.
- [x] Continuity ledger conectado a `session_welcome`.
- [x] Puente Twitch experimental antiguo reducido a compatibilidad; no existe un segundo transporte.
- [ ] Backend Native/OBS ejecutando `studio_*_requested` en runtime real.
- [ ] Validación real Twitch de reconnect/resubscribe y canal.

## Continuidad 2026-09-21 — backend boundary

- [x] StudioRuntimeBindings funciona como frontera única de acciones entre automatización y backends.
- [x] NativeBackend definido como backend principal para el Native Engine local.
- [x] OBSBackend definido como backend opcional para obs-websocket.
- [x] Routing AUTO con prioridad Native y fallback OBS solo por disponibilidad/capacidad.
- [x] Fallback prohibido después de una excepción de ejecución para evitar side effects duplicados.
- [x] LocalPipeline integrado con StudioRuntimeBindings e inyección validada por EventBus.
- [x] Compatibilidad del snapshot de StudioRuntimeBindings mantenida.
- [x] Pruebas unitarias de selección de backend, fallback y errores agregadas.
- [x] Contrato documental de backends en RUNTIME_BACKENDS.md.
- [ ] Conexión física de NativeBackend con el canal de ejecución del Native Engine desde el integrador final.
- [ ] Validación real de OBSBackend contra una instancia OBS en Windows.

### Porcentaje canónico actualizado

**Ingeniería: ~67%.**  
**Producto usable: ~53%.**  
**Global de seguimiento: ~61%.**

Este porcentaje sigue siendo una estimación de cierre de requisitos, no una medida de líneas de código ni una afirmación de producción.

## Continuidad viva — 2026-09-21 — presencia de integraciones y control de recursos

- [x] Detector local de proceso OBS (obs64.exe/obs32.exe/obs.exe) con cache corta para distinguir OBS abierto de OBS controlable.
- [x] ObsService expone processDetected, processName y controlReady separados de connected.
- [x] Monitor de salud compartido OBS/Twitch publica un snapshot cada 2 s sin abrir conexiones automáticamente.
- [x] Twitch expone authorized, connected, streamOnline, lastEventAt y lastKeepaliveAt; la conexión se trata como plano de control/eventos, no como consumidor de vídeo.
- [x] Política de recursos centralizada: conexión a OBS o Twitch no activa captura/encoder por sí sola.
- [x] Configurar voz sin audio no arranca el engine nativo.
- [x] Output que creó captura/audio los libera al detenerse; captura/audio existentes por decisión del usuario no se destruyen automáticamente.
- [x] Worker nativo de captura no hace readback/composición si no existe un output nativo activo; se evita procesar frames hacia un sink inexistente.
- [x] Estado de presencia e integración accesible desde preload/renderer.
- [x] Tests de regresión de ciclo de vida y política de recursos.
- [ ] Detección de OBS no sustituye la conexión WS: OBS puede estar abierto y requerir credenciales/servidor no habilitado.
- [ ] Twitch no tiene un concepto de programa abierto equivalente: el estado canónico es autorización/conexión y estado del canal.

### Regla de consumo de recursos

| Condición | Captura nativa pesada | Encoder nativo | Render avatar | Control OBS/Twitch |
|---|---|---|---|---|
| Nada conectado / ningún output | NO | NO | Solo preview local visible | NO |
| OBS abierto, no conectado | NO | NO | Solo preview local visible | OBS detectado, no controlable |
| OBS conectado, sin stream/record/vcam | NO | NO | Solo preview local visible | SÍ |
| OBS con salida activa | Cari native media NO salvo demanda propia | NO | SÍ si avatar es sink | SÍ |
| Twitch conectado | NO | NO | NO por Twitch | SÍ |
| Cari local record/RTMP activo | SÍ | SÍ | SÍ si overlay/preview | Opcional |

La regla evita confundir servicio disponible con consumidor multimedia. Antes de añadir un nuevo proceso, renderer o loop debe existir un sink explícito en esta tabla.

### Porcentaje canónico actualizado

- Ingeniería: **~68%**.
- Producto usable: **~54%**.
- Seguimiento global: **~62%**.
## Checkpoint canónico — 2026-09-21

> Este bloque es el estado vigente. Los porcentajes de secciones históricas inferiores no deben utilizarse para planificar trabajo nuevo.

- HEAD auditado: `a49860c3393345759703e65090836a70f48c05bf`
- Ingeniería: **~68%**
- Producto usable/end-user: **~54%**
- Seguimiento global: **~62%**
- Producción: **NO listo**

### Continuidad

- `experimental/studio/BITACORA.md` es la fuente canónica de anti-repetición.
- `experimental/studio/VTUBER_ASSET_STRATEGY.md` fija la estrategia de PNGTuber / 2D / 3D.
- No crear implementaciones paralelas de captura, audio mixer, timing, Twitch transport, OBS service, Action Store o avatar contract.

### Correcciones verificadas en este ciclo

- Atajo `R`: ahora limpia retry y detiene el avatar overlay al detener una salida.
- Cambio de ventana: ahora detiene cualquier fuente activa, incluida cámara Media Foundation.
- Status nativo: serialización correcta del campo `output`.
- Clasificación de red: más restrictiva para no reintentar errores locales como networking.
- Workflows: `workflow_dispatch` corregido y los workflows también escuchan la rama de desarrollo.
- Includes nativos Windows: `ComPtr` y utilidades wide explícitos.
- Bitácora canónica actualizada para separar estado vigente de históricos.

### Evidencia

- C++20 portable con warnings como errors: PASS para timing/interleaver y smoke de retry/diagnóstico.
- FFmpeg sintético 7.1.5: BGRA raw + PCM float32 -> H.264/AAC -> Matroska: PASS.
- E2E Windows named-pipe -> FFmpeg: implementado, pero la ejecución sigue pendiente de una Actions observable.
- GitHub Actions sigue terminando jobs con `steps=null` / sin logs útiles; no se marca CI como verde.

### Avatar

- PNGTuber: soportado hoy por Action Store/editor.
- 2D abierto: Inochi2D/Inochi Creator, BSD-2-Clause, adapter futuro.
- Live2D: adapter opcional; no es open source.
- 3D: Three.js + glTF/VRM como ruta actual; VRoid Studio como authoring externo y Blender como authoring open-source.
- No se considera completo un avatar hasta superar carga, tracking, lip-sync, composición, rendimiento y licencia.


## Checkpoint canónico — 2026-09-21 — continuidad

- Ingeniería: **~71%**.
- Producto usable/end-user: **~58%**.
- Seguimiento global: **~65%**.
- Producción: **NO listo**.
- Bitácora maestra: `experimental/studio/BITACORA.md`.
- No repetir: captura WGC, WASAPI mixer, MediaClock/RealtimePacer/Interleaver, OBS service, Twitch transport, Action Store o avatar contract.
- Siguiente foco: CI observable → E2E Windows named-pipe/FFmpeg → compositor GPU sin readback → PTS explícitos Libav → drift correction → cámara/Game Capture → validación real de OBS/Twitch → release/hardware.


## Continuidad viva — 2026-09-21 — privacidad de micrófono

- [x] El atajo `A` ya no abre el micrófono automáticamente.
- [x] El motor de audio y el gate de micrófono permanecen separados.
- [ ] Validación con hardware WASAPI real.


## Prioridad ejecutiva P0-P3 — 2026-09-21

### P0
- [ ] Asset Cari V1 real.
- [ ] Revisión visual real contra ART_QUALITY_GATE.
- [ ] Tracking sostenido sobre V1.
- [ ] Compositor GPU → frame final sin readback CPU por frame.
- [ ] Validación Windows/E2E sostenida.

### P1
- [ ] PTS extremo a extremo.
- [ ] Drift correction físico.
- [ ] FFmpeg sostenido.
- [ ] Grabación prolongada.
- [ ] RTMP/reconexión real.

### P2
- [ ] Game Capture.
- [ ] Optimización GPU.
- [ ] Hardware real.

### P3
- [ ] Live2D adapter bajo licencia compatible.
- [ ] Multistream.
- [ ] Installer.
- [ ] Distribución.

Regla de progreso: el checkpoint vigente es Ingeniería ~71%, Producto usable ~58%, Seguimiento ~65%. Los porcentajes no suben por volumen de código.

## Continuidad — LOG-031

- Se consolida BITACORA.md como memoria canónica.
- No se reabren subsistemas ya cerrados sin regresión reproducible.
- P0 vigente: D3D11Compositor → encoder Libav/D3D11 sin readback CPU por frame + E2E Windows observable.
- Ingeniería: **~71%**.
- Producto usable/end-user: **~58%**.
- Seguimiento global: **~65%**.
- Producción: **NO listo**.


## Continuidad vigente — LOG-035

- Bitácora canónica: `experimental/studio/BITACORA.md`.
- Ingeniería: **~71%**.
- Producto usable/end-user: **~58%**.
- Seguimiento global: **~65%**.
- Producción: **NO listo**.
- CI: bloqueada porque los jobs recientes terminan sin `steps` ni `logs_url`.
- Git: rama divergente y detrás de `main`; no se hace reescritura automática.
- P0: validación Windows de Libav + D3D11 hardware y E2E observable.
