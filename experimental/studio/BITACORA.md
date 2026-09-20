# Cari Studio — Bitácora maestra de ingeniería y continuidad

> **Fuente canónica única de continuidad.**
> Antes de tocar un módulo, una prueba o un workflow, revisar este archivo. Los checkpoints históricos anteriores quedan archivados aquí como referencia y **no deben usarse para decidir el estado actual**.

**Última auditoría:** 20/09/2026 13:32 ART
**HEAD canónico:** fb1abc8fb53d969cf447fb1a05fed2fa3a805f7e
**PR:** #2 — `fix/native-windows-foundation`  
**PR:** abierto / draft / no mergeable  
**Avance global de ingeniería:** **63%**
**Readiness:** experimental; **NO listo para producción**.

## 1. Estados de evidencia

- **IMPLEMENTADO:** existe código integrado.
- **VERIFICADO:** existe una prueba reproducible ejecutada y observada.
- **VALIDADO EN HARDWARE:** probado en Windows/PC objetivo.
- **PENDIENTE:** existe implementación o diseño, pero falta evidencia para cerrar el gate.
- **NO REPETIR:** no rehacer el componente; trabajar únicamente sobre su gate restante o una regresión reproducible.

## 2. Trabajo ya realizado — NO REPETIR

### Shell / arquitectura

| Componente | Estado | Evidencia | Regla |
|---|---|---|---|
| Electron + Native Windows C++ | IMPLEMENTADO | `ARCHITECTURE.md` | NO replantear arquitectura sin cambio de requisitos |
| contextIsolation + preload explícito + sandbox | IMPLEMENTADO | `electron-shell/main.js`, `preload.js` | NO rehacer |
| NativeEngine + correlación JSONL | IMPLEMENTADO | `runtime/native-engine.js` | Solo corregir regresiones |
| Session manager: serialización/rollback/stop-only | IMPLEMENTADO + VERIFICADO | tests JS/runtime | NO repetir pruebas básicas |

### Captura

| Componente | Estado | Evidencia | Regla |
|---|---|---|---|
| Windows Graphics Capture de ventana | IMPLEMENTADO | `capture_engine.*` | NO sustituir por OpenCV |
| WGC de pantalla primaria | IMPLEMENTADO | `CreateForMonitor` | NO rehacer |
| Enumeración/selección de ventanas | IMPLEMENTADO + VERIFICADO | `window_sources.*` + smoke | NO rehacer |
| Resize/frame-pool recreate | IMPLEMENTADO | `capture_engine.*` | Reabrir solo por regresión/hardware |
| Device removed/reset/hung | IMPLEMENTADO | `capture_engine.*` | Falta VALIDADO EN HARDWARE |
| Cámara Media Foundation | PENDIENTE | solo enumeración existe | Construir streaming real; NO repetir enumeración |
| Game Capture dedicado | PENDIENTE | no implementado | Backend específico; NO reutilizar WGC como sustituto |

### Audio / voz

| Componente | Estado | Evidencia | Regla |
|---|---|---|---|
| WASAPI mic + system loopback | IMPLEMENTADO | `wasapi_capture.*`, bridge | NO rehacer captura base |
| QPCPosition en 100 ns | IMPLEMENTADO | auditoría/documentación | NO aplicar doble conversión |
| AudioTimelineMixer | IMPLEMENTADO + VERIFICADO | smoke mixer | NO repetir mezcla básica |
| Normalización canales/sample-rate | IMPLEMENTADO + VERIFICADO | mixer smoke | NO rehacer |
| Voice `anime-bright` | IMPLEMENTADO | `voice_effects.*` | NO confundir con pitch/formant |
| Pitch/formant real | PENDIENTE | no implementado | Añadir etapa independiente |
| Drift correction físico | PENDIENTE | requiere relojes reales | Siguiente bloque de audio |

### Multimedia / FFmpeg / output

| Componente | Estado | Evidencia | Regla |
|---|---|---|---|
| Contrato BGRA + PCM float32 | IMPLEMENTADO + VERIFICADO | adapter + FFmpeg synthetic | NO repetir contrato |
| RawPipe OVERLAPPED + bounded queue | IMPLEMENTADO + smoke | `raw_pipe.*` | NO crear otro transporte |
| FFmpeg supervisor | IMPLEMENTADO + VERIFICADO | supervisor smoke | NO rehacer lifecycle |
| EOF/flush antes de force terminate | IMPLEMENTADO | `ffmpeg_av_output.cpp` | NO rehacer shutdown |
| stderr limitado a 256 KiB | IMPLEMENTADO | `ffmpeg_av_output.*` | NO volver a buffer ilimitado |
| MediaClock | IMPLEMENTADO + VERIFICADO | clock smoke | NO crear otro reloj |
| RealtimePacer | IMPLEMENTADO + VERIFICADO | scheduler smoke | NO crear otro scheduler |
| Global A/V interleaver por PTS | IMPLEMENTADO + VERIFICADO | scheduler smoke | NO volver al despacho por bloques |
| Dispatch budget máximo 8/tick | IMPLEMENTADO | MediaGraphController | NO quitar sin benchmark |
| Backpressure de arranque | IMPLEMENTADO | main/native graph | NO drenar mixer antes de conectar pipes |
| Invariante de formato de audio | IMPLEMENTADO | MediaGraphController | NO permitir cambio silencioso |
| Output state/exit code metrics | IMPLEMENTADO | native + renderer | NO rehacer |
| Error classification | IMPLEMENTADO + VERIFICADO | diagnostics smoke | Ampliar solo con errores reales nuevos |
| RTMP retry/backoff | IMPLEMENTADO + VERIFICADO (policy) | `output_retry.*` | NO crear otra policy |
| Retry solo network | IMPLEMENTADO | `main.cpp` | NO reintentar encoder/mux/input a ciegas |
| D3D11 compositor GPU experimental | IMPLEMENTADO + VERIFICADO en WARP | `d3d11_compositor.*` + smoke | NO rehacer compositor base |
| Overlay alpha GPU | IMPLEMENTADO + VERIFICADO en WARP | compositor smoke | Falta hardware |
| Readback CPU | IMPLEMENTADO como fallback/diagnóstico | compositor/frame bridge | NO usar como camino de producción |
| E2E named-pipe -> FFmpeg -> decode | IMPLEMENTADO EN CÓDIGO | `ffmpeg_named_pipe_e2e_smoke.cpp` | **NO marcar VERIFIED sin ejecución Windows observable** |
| PTS explícitos dentro del transporte | PENDIENTE | raw pipe no los conserva | Próximo bloque de tiempo |
| Encoder/mux sostenido | PENDIENTE | synthetic FFmpeg sí; Windows sostenido no | Validar, no rehacer supervisor |
| RTMP sostenido real | PENDIENTE | endpoint real/hardware requerido | Validar policy existente |

### Avatar / tracking

| Componente | Estado | Evidencia | Regla |
|---|---|---|---|
| Avatar contract | IMPLEMENTADO + VERIFICADO | `avatar-contract.js` + tests | NO repetir |
| Three.js WebGL | IMPLEMENTADO | `three-avatar.js` | NO rehacer renderer base |
| GLTF/GLB | IMPLEMENTADO | GLTFLoader | NO rehacer |
| Placeholder procedural | IMPLEMENTADO | renderer | NO generar assets propietarios |
| MediaPipe Face Landmarker | IMPLEMENTADO | `face-tracker.js` | NO crear otro tracker |
| Timestamp monotónico MediaPipe | IMPLEMENTADO | `face-tracker.js` | NO repetir |
| Blendshape -> avatar state | IMPLEMENTADO | `face-tracking-bridge.js` | NO rehacer mapping básico |
| D3D11 avatar placeholder overlay | IMPLEMENTADO EXPERIMENTAL | `avatar_gpu_overlay.*` | NO confundir con avatar final |
| Lip-sync por amplitud | IMPLEMENTADO | AudioCoreBridge + AvatarActingBridge | NO declararlo como viseme/phoneme |
| Avatar real -> frame final | PENDIENTE | falta asset/modelo/runtime neutral real | Próximo bloque |
| Native VRM renderer completo | PENDIENTE | integración final no cerrada | Próximo bloque |
| Live2D | PENDIENTE / adapter-only | runtime propietario no distribuido | Requiere decisión legal/distribución |
| Tracking rendimiento final | PENDIENTE | cámara/modelo/hardware | Validación hardware |

### Streaming / eventos / distribución

| Componente | Estado | Regla |
|---|---|---|
| OBS WebSocket v5 | IMPLEMENTADO, opcional | NO convertir OBS en dependencia |
| Twitch EventSub/chat | IMPLEMENTADO | NO rehacer transporte |
| Local action router/runtime bindings | IMPLEMENTADO | NO rehacer |
| Real Twitch/YouTube RTMP | PENDIENTE VALIDACIÓN | Usar output existente |
| EventSub reconnection integration test | PENDIENTE | Validar ciclo real |
| Multistream | PENDIENTE | NO construir antes de estabilizar single-output |
| Dependency license audit | IMPLEMENTADO | NO repetir salvo cambio de dependency |
| FFmpeg redistribution decision | PENDIENTE | Resolver antes de release |
| Installer/logging/asset packaging | PENDIENTE | Última fase |

## 3. Cambios realizados en la continuación actual

1. Auditada la rama/PR actual contra el estado real de GitHub.
2. Confirmado que el compositor D3D11 ya existe y dispone de smoke con WARP; se evitó reconstruirlo.
3. Confirmada la existencia del E2E Windows named-pipe -> FFmpeg -> decode en código.
4. Confirmado que retry/backoff ya está integrado y debe permanecer restringido a fallos de red.
5. Corregida la serialización del campo `output` en el estado nativo para no producir una clave vacía.
6. Añadidos/registrados smoke tests de retry y clasificación de errores.
7. El workflow CI fue preparado para la rama de desarrollo y `workflow_dispatch`.
8. El backpressure inicial, límite de 8 eventos/tick e invariantes de sesión quedaron documentados.
9. Se consolidaron los pendientes para impedir volver a abrir componentes terminados.
10. Esta bitácora fue normalizada para eliminar checkpoints históricos contradictorios y usar el PR como referencia viva del HEAD.

## 4. Intentos y pruebas que NO deben repetirse a ciegas

| Intento | Resultado | Acción futura |
|---|---|---|
| FFmpeg con archivos raw BGRA + PCM | PASS en Linux | Ya validado; solo repetir con cambios |
| Primer ensayo de dos FIFOs | expiró durante handshake | NO usarlo como diagnóstico de encoder |
| Reintentos de Actions antiguos | fallaron con `steps=null` | No inferir causa de código |
| Workflow sobre branch de desarrollo | se dispara | Falta que runner ejecute steps |
| Smoke D3D11 WARP | PASS | No repetir salvo cambio del compositor |
| Smoke retry/diagnostics portable | PASS | No repetir salvo cambio de policy |
| OpenCV como sustituto de WGC | descartado | NO reintroducir como backend principal |
| `capturePage()` como transporte de vídeo | descartado | NO reintroducir |

## 5. CI vigente

Runs asociados al HEAD actual `06bc51a98585f4d48c546ad4df3430698ba0e3c8`:

- Native Windows Build: run `35521317319` — failure; jobs sin `steps` y sin `logs_url`.
- Character Runtime Tests: run `35521317323` — failure; jobs sin `steps` y sin `logs_url`.
- CI: run `35521317333` — failure; jobs sin `steps` y sin `logs_url`.

Esto **no permite afirmar que el código de esos jobs haya comenzado a ejecutarse**. No marcar CI como verde ni atribuir la falla a una línea concreta.

## 6. Cola de trabajo — orden de entrada

### P0
1. Conseguir ejecución Windows observable de CI con steps/logs.
2. Ejecutar E2E named-pipe -> FFmpeg -> archivo -> decode.
3. Guardar evidencia reproducible: commit, versión FFmpeg, resolución, FPS, sample-rate, canales, duración, bytes, streams y errores.

### P1
1. Diseñar transporte explícito de PTS extremo a extremo.
2. Eliminar readback CPU del camino de producción.
3. Conectar avatar real/neutral al compositor D3D11.
4. Mantener estable el contrato Frame/PTS.

### P2
1. Media Foundation camera source.
2. Device clocks.
3. Drift correction/resampling.
4. Lip-sync avanzado.

### P3
1. RTMP/RTMPS real prolongado.
2. Prueba real de caída de red.
3. Validar retry existente.
4. Twitch/YouTube reales.
5. Multistream solo después del single-output gate.

### P4
1. Game Capture.
2. Installer.
3. Redistribución FFmpeg/codec.
4. Logs/rollback de usuario.
5. Asset packaging.
6. Hardware validation final.

## 7. Regla anti-repetición

Antes de programar:

1. Buscar el componente aquí.
2. Si está **IMPLEMENTADO**, trabajar sobre su gate pendiente.
3. Si está **VERIFICADO**, no repetir la misma prueba sin evidencia nueva.
4. Si está **VALIDADO EN HARDWARE**, no reabrir salvo regresión.
5. Si aparece un hallazgo nuevo, registrarlo aquí antes de crear otra implementación.
6. No crear un segundo parser, mixer, reloj, scheduler, transporte raw, supervisor FFmpeg, retry policy, tracker MediaPipe, renderer Three.js o compositor D3D11 para sustituir los existentes.

## 8. Evidencia añadida en la auditoría actual

Smoke tests portables ejecutados localmente con **C++20 + `-Wall -Wextra -Werror`**:
- `media_scheduler_smoke`: PASS.
- `output_retry_smoke`: PASS.
- `output_diagnostics_smoke`: PASS.

Estos resultados verifican contratos core portables; no sustituyen Windows CI ni hardware.

## 9. Estado canónico

**Avance global: 63% de ingeniería.**

El 62% no significa 62% de código ni disponibilidad para producción. La ruta principal está construida, pero quedan gates de validación Windows/hardware, transporte PTS explícito, composición de avatar final, cámara, drift, RTMP sostenido, Game Capture, multistream y distribución.

**Producto: NO listo para producción.**

## 10. Snapshot de continuidad — 20/09/2026

| Área | Estado canónico | Próximo gate | NO REPETIR |
|---|---|---|---|
| Arquitectura Electron + Native C++ | IMPLEMENTADO | solo regresiones/integración | no replantear |
| Windows Graphics Capture | IMPLEMENTADO | hardware real + device-loss exhaustivo | no sustituir por OpenCV |
| WASAPI + AudioTimelineMixer | IMPLEMENTADO + VERIFICADO en smoke | device clocks + drift correction | no rehacer mixer |
| MediaClock + RealtimePacer + A/V interleaver | IMPLEMENTADO + VERIFICADO | E2E Windows/PTS explícitos | no crear otro scheduler |
| RawPipe + FFmpeg boundary | IMPLEMENTADO | E2E Windows sostenido | no crear otro transporte |
| D3D11 compositor + avatar placeholder | IMPLEMENTADO EXPERIMENTAL + WARP VERIFIED | eliminar readback CPU + avatar real | no reconstruir compositor base |
| MediaPipe tracking | IMPLEMENTADO | rendimiento/cámara/modelo real | no crear segundo tracker |
| Three.js avatar | IMPLEMENTADO | avatar real + compositor final | no rehacer renderer base |
| OutputRetryPolicy | IMPLEMENTADO + VERIFICADO en contrato | RTMP real + caída de red | no crear otra policy |
| Error classification | IMPLEMENTADO + VERIFICADO | ampliar con errores reales nuevos | no reintentar fallos locales |
| CI workflows | DISPARO CONFIGURADO | runner debe ejecutar steps/logs | no cambiar workflow sin evidencia |
| Dependency license audit | IMPLEMENTADO | revisar solo al cambiar dependencias/assets | no repetir auditoría sin cambios |

### Cambios de la última iteración que quedan cerrados

- se registró retry RTMP con backoff exponencial acotado y máximo de intentos;
- el retry automático solo se activa para fallos clasificados como red;
- `Broken pipe` ya no se considera automáticamente un error de red;
- se agregaron patrones de `Connection reset by peer`, `No route to host` y resolución DNS fallida;
- status del output expone estado, exit code, categoría de fallo, intentos y presupuesto de pacing;
- stderr de FFmpeg permanece limitado a 256 KiB;
- el mixer no drena audio antes de que ambos pipes estén conectados;
- el despacho A/V permanece limitado a 8 eventos por polling;
- captura/audio no pueden modificarse mientras el output está activo;
- los workflows CI pueden ejecutarse sobre la rama de desarrollo.

### Evidencia disponible

- smoke `media_scheduler_smoke`: PASS;
- smoke `output_retry_smoke`: PASS;
- smoke `output_diagnostics_smoke`: PASS;
- FFmpeg sintético BGRA raw + PCM float32 -> H.264/AAC -> Matroska: PASS;
- D3D11 compositor smoke con WARP: PASS, según el estado registrado en `PROJECT_STATUS.md`;
- E2E Windows named-pipe -> FFmpeg -> decode: IMPLEMENTADO EN CÓDIGO, todavía no VERIFIED por ausencia de steps/logs observables en Actions.

### No repetir

- no volver a implementar captura de escritorio con OpenCV;
- no convertir `capturePage()` en transporte de vídeo;
- no crear otro `RawPipe`, mixer, scheduler, retry policy, compositor D3D11, tracker MediaPipe o renderer Three.js;
- no marcar `CI=VERIFIED` por un run `failure` con `steps=null`;
- no marcar el E2E Windows como VERIFIED hasta observar su ejecución y métricas;
- no considerar el smoke sintético de FFmpeg equivalente a una prueba Windows sostenida;
- no implementar multistream antes del single-output RTMP sostenido.

### Cola única de trabajo

**P0 — Validación**
1. Obtener CI Windows observable con steps/logs.
2. Ejecutar el E2E Windows named-pipe -> FFmpeg -> archivo -> decode.
3. Guardar evidencia de resolución/FPS/audio/duración/bytes/streams/errores.

**P1 — Pipeline final**
1. Transporte de PTS explícitos extremo a extremo.
2. Eliminar readback CPU del camino de producción.
3. Avatar real/neutral dentro del compositor final.

**P2 — Audio/cámara**
1. Media Foundation camera streaming.
2. Device clocks.
3. Drift correction/resampling.
4. Lip-sync avanzado.

**P3 — Streaming**
1. RTMP/RTMPS prolongado.
2. Simulación de caída de red.
3. Validación de retry/backoff existente.
4. Twitch/YouTube reales.

**P4 — Plataforma/release**
1. Game Capture.
2. Multistream.
3. Installer.
4. Redistribución FFmpeg/codec.
5. Asset packaging.
6. Hardware validation final.

### Regla de actualización

Cada nueva iteración debe modificar esta sección o añadir una sección posterior solo cuando exista evidencia nueva. No duplicar el mismo pendiente bajo otro nombre.

**HEAD observado de esta entrada:** b42edae76160aeb0b4d0de643dcad7cfaa2d2764
**Avance global canónico:** **62%**.
**Producto:** NO listo para producción.

## 11. Snapshot de continuidad — 20/09/2026 13:18 ART

**HEAD observado:** 76be712d88964f4255a189280871f0c716411ecd
**Avance global:** 62%
**PR:** #2 — abierto / draft / no mergeable

### Cambios incorporados desde el snapshot anterior

- MediaGraphController mantiene orden A/V global por PTS y límite de 8 eventos por polling.
- La extracción del mixer queda bloqueada hasta que ambos pipes están conectados.
- Cambios de captura/audio quedan bloqueados mientras existe una salida activa.
- OutputRetryPolicy usa backoff exponencial acotado y máximo de 5 intentos; el runtime solo lo aplica a fallos clasificados como red.
- OutputFailureCategory distingue red, encoder, input, mux, permisos y desconocido; no se reintenta indiscriminadamente.
- El estado del output expone estado, exit code, categoría de fallo, intentos y presupuesto de pacing.
- stderr de FFmpeg permanece limitado a 256 KiB.
- Se agregaron smoke tests portables para retry y clasificación.
- La UI expone las métricas nuevas de output/pacing.
- Los workflows CI aceptan la rama de desarrollo y workflow_dispatch.

### Evidencia nueva observada en esta iteración

- media_scheduler_smoke: PASS con C++20, -Wall -Wextra -Werror.
- output_retry_smoke: PASS con C++20, -Wall -Wextra -Werror.
- output_diagnostics_smoke: PASS con C++20, -Wall -Wextra -Werror.
- Los últimos runs de Native Windows Build, CI y Character Runtime Tests siguen terminando con failure antes de registrar steps (steps=null, logs_url=null).
- El run de Native Windows Build asociado al HEAD actual también presenta jobs sin steps/logs; por tanto CI sigue NO VERIFICADO.

### NO REPETIR desde ahora

- No rehacer Windows Graphics Capture.
- No sustituir WGC por OpenCV como backend principal.
- No rehacer WASAPI/AudioTimelineMixer.
- No crear otro MediaClock, RealtimePacer, MediaInterleaver, RawPipe, FFmpeg supervisor, retry policy, diagnostics classifier, compositor D3D11, tracker MediaPipe o renderer Three.js.
- No repetir el smoke FFmpeg sintético salvo que cambie el contrato de entrada/salida.
- No considerar failure + steps=null como evidencia de regresión del código.
- No marcar el E2E Windows named-pipe -> FFmpeg -> decode como VERIFIED hasta disponer de ejecución observable con métricas.

### Próximo bloque único de trabajo

P0 — validación Windows observable: conseguir un run de CI que registre steps/logs y ejecutar el E2E Windows ya implementado.

P1 — pipeline final: transportar PTS explícitos extremo a extremo y reemplazar el readback CPU del camino de producción.

P2 — avatar final: conectar avatar real/neutral al compositor D3D11 y después a la señal codificada.

P3 — audio/cámara: Media Foundation camera streaming + device clocks + drift correction + lip-sync avanzado.

P4 — streaming/release: RTMP prolongado + caída de red + validación del retry existente + Game Capture + multistream + installer + redistribución FFmpeg.

Regla: trabajar únicamente sobre el primer gate no cerrado; no abrir nuevamente componentes ya marcados como IMPLEMENTADO/VERIFICADO sin evidencia de regresión.
## 11. Cierre de continuidad — 20/09/2026 13:24 ART

**HEAD canónico:** consultar siempre el HEAD vivo del PR #2.
**PR #2:** abierto / draft / no mergeable.
**Avance canónico:** **62%**. No se incrementa por parches menores que no cierren un gate.

### Cambios de esta iteración
- Se auditó nuevamente el árbol real antes de tocar módulos.
- Se confirmó que compositor D3D11 experimental, overlay GPU y E2E Windows de named pipes ya existen; no se creó una segunda implementación.
- Se confirmó OutputRetryPolicy + clasificación de fallos y su integración condicionada a RTMP/network.
- Se corrigió la serialización del estado output.
- Se endureció el límite de despacho A/V por polling y se expone pacing_budget_exhausted.
- Se añadió backpressure de arranque para no drenar audio antes de conectar ambos pipes.
- Se endurecieron invariantes de sesión para impedir cambios de captura/audio durante una salida.
- Los workflows CI quedaron preparados para ejecutarse en la rama de desarrollo y mediante workflow_dispatch.
- Se agregaron y documentaron los smoke tests de retry/clasificación.
- Se actualizó la bitácora como fuente única de continuidad y anti-repetición.

### Hallazgos que NO deben reabrirse
- No sustituir Windows Graphics Capture por OpenCV: WGC sigue siendo el backend principal de captura Windows.
- No usar capturePage() del renderer Electron como transporte de vídeo.
- No crear otro MediaClock, scheduler, interleaver, RawPipe, mixer, FFmpeg supervisor, retry policy, tracker MediaPipe, renderer Three.js o compositor D3D11.
- No convertir el compositor D3D11 experimental en producción mientras exista readback CPU por frame.
- No declarar el E2E named-pipe como VERIFIED hasta obtener ejecución Windows observable con steps/logs.
- No declarar RTMP/reconnect VERIFIED hasta probar un servidor real y una caída de red controlada.
- No reintentar fallos de encoder/mux/input/permission como si fueran network.
- No aumentar el porcentaje por scaffolding, documentación o parches menores.

### Cola exacta para la siguiente iteración
1. CI Windows: obtener steps/logs observables.
2. E2E named-pipe + FFmpeg + decode sobre Windows.
3. Capturar evidencia del E2E: commit, FFmpeg, resolución, FPS, sample-rate, canales, duración, bytes, streams, exit code y stderr.
4. Diseñar transporte de timestamps explícitos o equivalente temporal verificable.
5. Eliminar readback CPU del camino de producción.
6. Integrar avatar real/neutral en el compositor GPU.
7. Validar captura sostenida WGC/WASAPI y device-loss.
8. Implementar/validar drift correction.
9. Validar RTMP y retry contra servidor real.
10. Después: cámara Media Foundation, Game Capture, multistream, installer y distribución.

### Registro de intentos descartados de esta iteración
- Una edición inicial de workflow introdujo workflow_dispatch debajo de una clave con paths; se corrigió a workflow_dispatch sin filtros. No reutilizar la versión malformed.
- Un primer intento de integrar retry directamente sobre un bloque de main.cpp no coincidió con las anclas actuales y no se escribió. La integración final se hizo sobre el archivo real. No repetir el parche por texto antiguo.

### Regla de transferencia
La próxima sesión debe empezar leyendo BITACORA.md → AUDIT_MATRIX.md → PROJECT_STATUS.md → estado vivo del PR #2.
Después se trabaja únicamente sobre el primer gate pendiente que tenga evidencia nueva disponible.

### Estado vivo al cierre
- PR #2 HEAD: 306dcdd344e4f53946d4696380778b0de3ffcf18
- Commits del PR: 754
- Archivos modificados: 172
- Avance canónico: **62%**
- CI: todavía sin steps/logs observables en los runs recientes; no declarar verde.


## 11. BLOQUEO DEL PORCENTAJE — MODELO PERMANENTE

### Regla matemática canónica

El avance global se calcula con 100 puntos de cierre de ingeniería, repartidos una sola vez entre gates. No se recalcula por cantidad de archivos, líneas, commits ni sensación de avance.

**Avance canónico actual: 62/100 = 62%.**

Un gate suma sus puntos una sola vez al pasar a VERIFICADO o VALIDADO EN HARDWARE, según corresponda. No pierde puntos por añadir código nuevo. No se considera cerrado porque exista una interfaz. No vuelve a abrirse salvo regresión reproducible. Una prueba sintética no sustituye una validación Windows/hardware cuando el gate la exige.

### Los 38 puntos que actualmente impiden llegar al 100%

| ID | Gate que falta | Puntos | Evidencia necesaria para cerrar | No confundir con |
|---|---|---:|---|---|
| P01 | CI Windows observable | 3 | Job Windows con steps/logs reales y build/smoke PASS sobre el HEAD | Un run failure con steps=null |
| P02 | E2E Windows named-pipe -> FFmpeg -> archivo -> decode | 4 | Ejecución Windows observable, archivo válido y verificación de streams | El smoke existe en código |
| P03 | A/V sostenido con FFmpeg real | 4 | Sesión prolongada con audio+video, sin fallos de pipe y métricas estables | Prueba sintética Linux |
| P04 | PTS explícitos extremo a extremo | 4 | Transporte que conserve timestamps de captura hasta el muxer/encoder con contrato probado | Pacing por reloj antes del pipe |
| P05 | Compositor GPU de producción sin readback CPU | 3 | Ruta final captura/overlay/avatar -> texture GPU -> encoder sin readback por frame | Compositor D3D11 experimental/WARP |
| P06 | Avatar real integrado al frame final | 4 | Modelo real permitido + estado de actuación + composición en el frame que llega al encoder | Placeholder procedural / Three.js aislado |
| P07 | Cámara Media Foundation en streaming | 3 | Captura real de cámara, formato/cadencia, lifecycle y reconexión en Windows | Enumerar cámaras |
| P08 | Drift correction de relojes físicos | 3 | Medición de relojes de dispositivos y corrección/resampling sostenido | Mixer y normalización inicial |
| P09 | Voz de producción | 2 | Procesamiento local con baja latencia y medición estable | anime-bright DSP básico |
| P10 | RTMP/RTMPS sostenido + reconexión real | 3 | Sesión prolongada + caída de red controlada + recuperación correcta | Retry policy y clasificación de errores |
| P11 | Twitch reconnection/re-subscription | 1 | Test real del ciclo welcome/keepalive/reconnect y restauración de suscripciones | EventSub normal funcionando |
| P12 | Game Capture dedicado | 1 | Backend específico validado contra una aplicación/juego real | Windows Graphics Capture |
| P13 | Distribución Windows completa | 2 | Decisión FFmpeg/codec, bundle legal, instalador y logs/rollback de usuario | ZIP portable de CI |
| P14 | Multistream real | 1 | Más de un destino real, límites, backpressure y fallo independiente por destino | Fan-out conceptual |

**Total pendiente: 38 puntos.**

### Por qué el porcentaje no puede cerrarse todavía

1. P01 + P02: falta evidencia observable del build/E2E Windows. Los runners recientes terminan antes de steps/logs.
2. P03 + P04: el scheduler usa PTS antes del transporte, pero el protocolo raw todavía no conserva los PTS originales.
3. P05 + P06: existe compositor D3D11 experimental y placeholder GPU, pero la ruta de producción aún requiere avatar real y eliminación del readback CPU por frame.
4. P07 + P08: enumerar cámara y mezclar audio no equivale a streaming de cámara ni a corregir drift entre relojes físicos.
5. P09 + P10: existe DSP local básico y retry policy, pero falta comportamiento sostenido y validado con hardware/endpoint real.
6. P11 + P12 + P13 + P14: son gates independientes de integración/distribución; no se cierran por tener interfaces o esqueletos.

### Regla anti-reinicio

- Un componente IMPLEMENTADO no vuelve a cero.
- Un componente VERIFICADO no se vuelve a probar sin una causa nueva.
- Un componente VALIDADO EN HARDWARE solo se reabre por regresión.
- Los nuevos commits solo modifican el gate abierto, salvo una regresión demostrable.
- El 62% solo cambia cuando uno de los 38 puntos cambia de estado con evidencia.

## 12. Snapshot de continuidad actual

- PR #2: fix/native-windows-foundation.
- Rama: fix/native-windows-foundation.
- Estado: abierto, draft, no mergeable.
- Avance canónico: 62%.
- E2E Windows named-pipe -> FFmpeg -> decode: implementado en código, pendiente de ejecución observable.
- D3D11 compositor: implementado experimentalmente, smoke WARP registrado.
- MediaPipe: integrado como único tracker facial; no crear un segundo tracker.
- Three.js: renderer base existente; no rehacerlo.
- RawPipe: transporte único; no crear otro.
- AudioTimelineMixer: mixer único; no crear otro.
- MediaClock/RealtimePacer/MediaInterleaver: reloj/scheduler únicos.
- OutputRetryPolicy: policy única para reconexión.

### Lista exacta de trabajo nuevo

Primero P01/P02. Después P04/P05/P06. Luego P07/P08/P09. Después P10/P11. Al final P12/P13/P14.

**Objetivo de la bitácora:** evitar que una nueva sesión vuelva a analizar o implementar de nuevo componentes ya cerrados.
## 11. Continuación actual — foco exclusivo en pendientes (20/09/2026)

### Trabajo realizado
- No se reabrieron WGC, WASAPI, MediaClock, RealtimePacer, interleaver, compositor D3D11 base, Three.js renderer base, MediaPipe tracker base ni las políticas ya marcadas como cerradas.
- Se implementó MediaFoundationCamera como nueva fuente nativa independiente:
  - enumeración de dispositivos de vídeo mediante Media Foundation;
  - activación por índice;
  - solicitud de RGB32/BGRA8;
  - fallback al formato nativo con conversión RGB32;
  - IMFSample → buffer BGRA;
  - PTS de Media Foundation en el dominio de 100 ns;
  - estadísticas de frames/samples/formato/errores;
  - worker con ciclo de vida start/stop.
- Se agregó media_foundation_camera_smoke.cpp.
- Se registró la fuente en el ejecutable nativo y su smoke en CMake.
- Se corrigió la enumeración del worker para exigir MF_DEVSOURCE_ATTRIBUTE_SOURCE_TYPE_VIDCAP_GUID.

### Estado exacto
| Elemento | Estado | Próximo gate | NO REPETIR |
|---|---|---|---|
| MediaFoundationCamera módulo | IMPLEMENTADO | integración al runtime/UI | no crear otra fuente MF |
| MF camera enumeration smoke | IMPLEMENTADO + VERIFICACIÓN PENDIENTE EN WINDOWS | ejecutar en runner Windows con cámara/no-camera | no duplicar smoke |
| Cámara como fuente del output principal | PENDIENTE | extender control/runtime sin reabrir WGC | no reemplazar WGC |
| Cámara + MediaPipe + avatar | PENDIENTE | conectar frames de cámara al tracker | no crear segundo tracker |

### Regla de trabajo vigente
El siguiente trabajo debe atacar exclusivamente un gate PENDIENTE. Una pieza marcada IMPLEMENTADO/VERIFICADO se conserva y solo se modifica ante una regresión concreta.

### CI
Los runs continúan fallando antes de registrar steps/logs_url; no se usa ese resultado para afirmar que la cámara compila en Windows. La verificación real del módulo queda condicionada a un runner Windows observable.
## 12. Cierre de esta iteración — 20/09/2026 13:46 ART

- Se mantuvieron intactos los componentes que la bitácora ya marca IMPLEMENTADO/VERIFICADO.
- Nuevo módulo: MediaFoundationCamera, fuente nativa de vídeo con PTS de Media Foundation y salida BGRA.
- Nuevo smoke: media_foundation_camera_smoke.cpp.
- CMake registra el módulo y el smoke sin sustituir WGC.
- Gate de cámara cambió de PENDIENTE DE IMPLEMENTACIÓN a IMPLEMENTADO; siguen pendientes integración al runtime/control y validación en Windows real.
- CI: los runs del HEAD actual siguen terminando en failure sin steps/logs_url observables; no se usa ese resultado para atribuir fallos al código.
- No se repiten: WGC, WASAPI, MediaClock, RealtimePacer, interleaver, RawPipe, FFmpeg supervisor, compositor D3D11, Three.js renderer y MediaPipe tracker.

### Siguiente foco obligatorio
1. Integrar MediaFoundationCamera al runtime sin duplicar el control plane existente.
2. Obtener una ejecución Windows observable del E2E y del nuevo smoke.
3. Solo después avanzar a drift/PTS explícito y avatar real → frame final.