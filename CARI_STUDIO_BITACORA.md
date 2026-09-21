# Cari Studio — Bitácora maestra de ingeniería y continuidad

> **Fuente canónica única de continuidad.**
> Antes de tocar un módulo, una prueba o un workflow, revisar este archivo. Los checkpoints históricos anteriores quedan archivados aquí como referencia y **no deben usarse para decidir el estado actual**.

**Última auditoría:** 21/09/2026
**HEAD canónico:** b3b0184b7c3dde6c6d397359875bcf8f20795165
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

## 5. Incidente de clonación local

El error de PowerShell:
`remote: Repository not found` + `fatal: repository ... not found`
no demuestra que el repositorio haya sido borrado. La verificación de GitHub confirma que `araragijona-coder/vtuber-cari` existe, es **privado** y la conexión de GitHub usada por la auditoría tiene permisos `admin/pull/push`.

Diagnóstico: la sesión Git local de Windows no tiene credenciales válidas para esa cuenta privada, o está usando credenciales de otra cuenta.

Procedimiento canónico de recuperación:
1. `gh auth login -h github.com -p https -w`
2. `gh auth status` — debe mostrar la cuenta con acceso al repo.
3. `gh auth setup-git`
4. Desde `C:\Users\USER`: `git clone -b fix/native-windows-foundation https://github.com/araragijona-coder/vtuber-cari.git`
5. `cd vtuber-cari`

Alternativa SSH ya configurada:
`git clone -b fix/native-windows-foundation git@github.com:araragijona-coder/vtuber-cari.git`

NO crear otro repositorio ni cambiar el nombre. NO volver a empezar la aplicación por este error.

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
- E2E Windows named-pipe -> FFmpeg -> decode: IMPLEMENTADO EN CÓDIGO, todavía no VERIFIED por ausencia de steps/logs observables en Actions.### No repetir- no volver a implementar captura de escritorio con OpenCV;
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
**Avance global:** 63%
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

**HEAD canónico:** b254ed6a70ceb9b775dda5689c94ed3ab3f1dc35
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
### CILos runs continúan fallando antes de registrar steps/logs_url; no se usa ese resultado para afirmar que la cámara compila en Windows. La verificación real del módulo queda condicionada a un runner Windows observable.
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
## 13. Continuación — cámara nativa conectada al runtime (20/09/2026)

### Trabajo realizado
- Se respetó la regla anti-repetición: WGC, WASAPI, MediaClock, RealtimePacer, MediaInterleaver, RawPipe, FFmpeg supervisor, D3D11 compositor, Three.js renderer y MediaPipe tracker no fueron reimplementados.
- Se corrigió MediaFoundationCamera para usar MFSetAttributeSize/MFSetAttributeRatio y leer el formato negociado con MFGetAttributeSize/MFGetAttributeRatio.
- El smoke de cámara valida enumeración, intenta captura real cuando existe dispositivo y permite exigir recepción de frames con CARI_CAMERA_SMOKE_REQUIRED.
- capture.start fue extendido de forma compatible a source=camera.
- Se añadió camera_index separado de window_index.
- StudioSessionManager conserva cameraIndex independiente y envía camera_index.
- El runtime nativo conecta MediaFoundationCamera al MediaGraphController existente.
- StartOutput obtiene resolución/FPS de la fuente activa, incluida la cámara.
- La UI añade selección de cámara nativa separada de la cámara usada por MediaPipe.
- Se agregó prueba de sesión para el enrutamiento source=camera.
- Se corrigió el caso de cambiar de cámara mientras otra cámara está activa.
- No se creó un segundo transporte raw ni un segundo control plane.

### Estado
| Elemento | Estado | Gate restante |
|---|---|---|
| MediaFoundationCamera | IMPLEMENTADO | cámara real/reconexión Windows |
| source=camera en control plane | IMPLEMENTADO | validación Windows |
| Cámara → MediaGraphController | IMPLEMENTADO | E2E sostenido |
| UI cámara nativa | IMPLEMENTADO | prueba real |
| Smoke cámara | IMPLEMENTADO | ejecución Windows observable |
| Cámara + MediaPipe + avatar | PENDIENTE | conectar frames al tracker existente sin duplicarlo |

### No repetir
- No crear otro backend Media Foundation.
- No sustituir WGC por OpenCV.
- No crear otro tracker facial.
- No crear otro protocolo de control.
- No crear otro RawPipe.

### Evidencia
- Código y CMake del smoke están integrados.
- Los runners actuales de Actions siguen sin exponer steps/logs observables.
- source=camera es una extensión del protocolo existente.

### Porcentaje
- Avance canónico: 63%.
- P07 permanece abierto hasta observar captura/cadencia/lifecycle/reconexión en Windows.
- No sumar puntos por la misma implementación dos veces.

## 14. Hardening de la integración de cámara nativa (20/09/2026)

### Cambios
- Corregida la negociación Media Foundation para usar los atributos de tamaño y framerate con sus helpers oficiales.
- El smoke de cámara ahora intenta captura cuando existe dispositivo y puede exigir frames con CARI_CAMERA_SMOKE_REQUIRED.
- capture.start acepta source=camera y camera_index, manteniendo window_index separado.
- StudioSessionManager y la UI distinguen cámara nativa de la cámara de tracking.
- El output principal acepta la cámara como fuente y toma su resolución/FPS negociados.
- Seleccionar una cámara diferente mientras otra está activa ahora reinicia correctamente la fuente.
- Añadida cobertura de sesión para source=camera.
- El workflow Windows ejecutará el smoke de Media Foundation cuando el runner sea operativo.

### Estados
| Gate | Estado | Evidencia faltante |
|---|---|---|
| Implementación Media Foundation | IMPLEMENTADO | ninguna adicional de código en este bloque |
| Cámara como fuente del output | IMPLEMENTADO | E2E Windows sostenido |
| Smoke de cámara | IMPLEMENTADO | ejecución Windows observable |
| Cámara real/reconexión | PENDIENTE | hardware/runner Windows |
| Cámara → MediaPipe → avatar | PENDIENTE | integración con tracker existente |

### No repetir
- No crear otro backend Media Foundation.
- No reemplazar WGC.
- No crear otro tracker MediaPipe.
- No crear otro transporte RawPipe.
- No volver a escribir el control plane.

### Continuidad
- El avance canónico permanece en 63%; P07 no suma los 3 puntos hasta obtener la evidencia Windows requerida.
- PR #2 HEAD observado al cierre: 106a18c4a56f2052907ced0d17b932603cd58080.
- El PR sigue abierto/draft/no mergeable.

## 15. P04/P08/P14 — nuevos bloques sin reabrir componentes cerrados (20/09/2026)

### P04 — PTS explícitos extremo a extremo
- Añadido LibavMediaOutput como ruta experimental opcional.
- Usa libavcodec/libavformat/libavutil/libswscale/libswresample.
- El PTS de Frame/AudioPacket se normaliza a un origen común y se rescalea a las timebases de encoder/stream.
- Los AVPacket resultantes conservan PTS para el muxer.
- El FIFO de audio respeta el frame_size normal del encoder y deja el remanente para flush.
- El path de named pipes/CLI sigue siendo el predeterminado y no fue reemplazado.
- Estado: IMPLEMENTADO / NO VERIFICADO.

### P08 — estimación de drift
- Añadido AudioClockDriftEstimator independiente del mixer ya cerrado.
- Calcula sample rate observado, drift ppm y corrección de signo inverso.
- Aplica smoothing y límite de seguridad de ppm.
- Smoke determinista incluido.
- Estado: IMPLEMENTADO / NO VERIFICADO EN DISPOSITIVOS REALES.

### P14 — multistream
- Añadido MultiStreamOutput independiente de FanoutOutput.
- Máximo de 4 destinos.
- Cada destino tiene FFmpeg, estado, métricas, clasificación de fallo y retry independiente.
- Solo los fallos de red de RTMP son candidatos a retry.
- Smoke con dos destinos locales simultáneos incluido.
- Validación real de múltiples endpoints RTMP pendiente.
- Estado: IMPLEMENTADO / NO VERIFICADO.

### No repetir
- No reemplazar FfmpegAvOutput hasta cerrar P04 con evidencia Windows.
- No modificar AudioTimelineMixer para implementar drift mientras no exista evidencia de hardware que lo justifique.
- No reemplazar FanoutOutput; MultiStreamOutput es un supervisor específico del runtime nativo.
- No crear otro transport protocol ni otro tracker.

### Regla de porcentaje
- El avance canónico permanece en 63%.
- P04, P08 y P14 no suman puntos hasta sus gates de verificación correspondientes.

## 16. Diagnóstico de Actions — fallo previo a steps (20/09/2026)

### Evidencia
- Se añadió `.github/workflows/actions-diagnostic.yml`, una workflow mínima con checkout y un `echo` sobre ubuntu-latest.
- El run de la workflow mínima también terminó en `failure` con `steps=null` y `logs_url=null`.
- Los workflows de CI, Character Runtime y Native Windows presentan el mismo patrón: job creado, terminado casi inmediatamente y sin steps observables.
- El status público de GitHub consultado el 20/09/2026 indica `All Systems Operational` y Actions `Operational`; por eso no se afirma una caída global de GitHub como causa.

### Conclusión operativa
- El bloqueo de verificación no puede atribuirse a una línea de Cari con la evidencia disponible.
- No se debe seguir modificando código para intentar adivinar la causa mientras los jobs no entreguen logs/steps.
- La workflow diagnóstica queda como instrumento permanente de comprobación de runner.

### No repetir
- No reescribir las workflows de producto sin evidencia nueva.
- No marcar CI verde por el mero hecho de que el run exista.
- No atribuir failure pre-step a CMake, C++, Python o Electron sin logs.

## 17. P11 — continuidad Twitch (20/09/2026)

### Cambios
- Añadido experimental/twitch/continuity.py con TwitchContinuityLedger.
- Registra generaciones de WebSocket a partir de event_websocket_welcome.
- Detecta reconexiones mediante cambio de session id.
- Audita localmente que las suscripciones esperadas sigan activas usando la API pública de TwitchIO.
- Integrado en CariTwitchBot; TwitchIO conserva la responsabilidad del transporte, reconexión y resubscribe.
- Añadido test_continuity.py como test determinista para cambio de generación y auditoría de suscripciones.
- README de Twitch actualizado para dejar explícita la frontera de responsabilidades.

### Estado
| Gate | Estado | Evidencia faltante |
|---|---|---|
| Continuity ledger | IMPLEMENTADO | ninguna de código |
| TwitchIO reconnect/resubscribe ownership | IMPLEMENTADO | prueba real de canal |
| Reconnect integration test | PENDIENTE DE VALIDACIÓN | Twitch CLI o canal real |

### No repetir
- No implementar otro WebSocket manager.
- No copiar la lógica interna de reconnect/resubscribe de TwitchIO.
- No introducir IRC como transporte alternativo.

### Evidencia externa
- Twitch documenta que una pérdida de WebSocket obliga a volver a suscribirse y que un mensaje session_reconnect debe usar su reconnect_url; TwitchIO implementa ese flujo internamente y resuscribe suscripciones después de reconnect. citeturn720701search0turn404085view0
- El test local verifica solo el ledger; no es equivalente a una sesión Twitch real.

### Porcentaje
- Avance canónico: 63%.
- P11 no suma su punto hasta disponer de evidencia real de reconexión/resuscripción.
## 18. P02/P03 — E2E sostenido por named pipes (20/09/2026)

### Cambios
- No se creó un segundo E2E: se reforzó `ffmpeg_named_pipe_e2e_smoke.cpp`, que ya era el harness correcto.
- La prueba pasó de 1 s aproximado a 5 s: 150 frames de vídeo a 30 FPS y 250 bloques de audio de 20 ms.
- El productor sintético se pacea con espera cercana al tiempo real y luego espera a que todos los writes overlapped terminen.
- El verificador existente usa FFmpeg real para decodificar ambos streams del archivo producido.

### Estado
| Gate | Estado | Evidencia faltante |
|---|---|---|
| Named pipes reales | IMPLEMENTADO | runner Windows observable |
| FFmpeg real + H.264/AAC + Matroska | IMPLEMENTADO | runner Windows observable |
| E2E 5 s paced | IMPLEMENTADO | runner Windows observable |
| Validación sostenida en CI | PENDIENTE | GitHub Actions debe ejecutar steps |
| A/V sostenido con hardware real | PENDIENTE | Windows + captura/audio reales |

### No repetir
- No crear otro harness de named pipes.
- No volver a validar solamente que el archivo exista; este smoke ya verifica decodificación de vídeo y audio.
- No confundir este E2E sintético con validación de WGC/WASAPI real.
## 19. P09 — cadena DSP local de voz (20/09/2026)

### Cambios
- Se amplió VoiceEffectProcessor, que era un gate pendiente y por tanto no estaba protegido por la regla de módulos cerrados.
- `anime_bright` ahora usa HPF suave + presencia + compresión + saturación suave + limitador de techo configurable.
- Los parámetros drive/presence/gain/threshold/ratio/ceiling se acotan para evitar valores peligrosos.
- La duración, sample rate, canales y número de muestras del bloque no cambian.
- Se agregaron comprobaciones de transitorio limitado, valores finitos y silencio.

### Evidencia
- Compilación local C++20 con `-Wall -Wextra -Werror -pedantic`: PASS.
- Smoke local de transitorio/limitador: PASS.

### Estado
- IMPLEMENTADO.
- VERIFICADO EN ENTORNO PORTABLE.
- P09 sigue abierto para validación integrada en Windows y escucha/medición sostenida.

### No repetir
- No añadir otra cadena de voz paralela.
- No introducir IA/voice cloud.
- No introducir pitch shifting externo hasta que exista una decisión explícita de dependencia/licencia; el modificador actual no lo necesita para operar.

## 20. P06 — integración del avatar real al frame final (20/09/2026 14:33 ART)

### Trabajo realizado
- No se reabrieron WGC, WASAPI, MediaClock, RealtimePacer, MediaInterleaver, RawPipe, FFmpeg supervisor, compositor D3D11 base, MediaPipe tracker ni renderer Three.js base.
- Se creó una ventana Electron transparente, frameless, click-through y local para alojar el mismo renderer Three.js/glTF ya existente.
- El Main process conserva el último estado del avatar y lo reenvía tras `did-finish-load`, evitando perder el primer estado durante el arranque.
- `CARI_AVATAR_MODEL_PATH` permite cargar un modelo GLB/glTF real; si no existe o falla, el overlay mantiene el placeholder procedural.
- El HWND de la ventana se registra mediante `CARI_AVATAR_HWND`.
- Native Windows reutiliza el `CaptureEngine`/WGC existente para capturar la ventana del avatar.
- La captura del overlay se convierte BGRA→RGBA y se entrega al `GpuOverlay` del compositor D3D11 existente.
- Se añadieron métricas `avatar_overlay`, `avatar_overlay_frames`, `avatar_overlay_failures` y `avatar_overlay_error`.
- La UI refleja el estado del overlay y el shell check incluye el nuevo preload/renderer.
- P05 no se reabre: el frame final sigue usando readback CPU porque el boundary raw actual todavía lo requiere.

### Estado de evidencia
| Elemento | Estado | Próximo gate |
|---|---|---|
| Overlay Electron | IMPLEMENTADO | validación Windows |
| Estado actuación → overlay | IMPLEMENTADO | validación de sincronía |
| GLB/glTF configurable | IMPLEMENTADO | prueba con modelo real |
| Overlay → WGC | IMPLEMENTADO EXPERIMENTAL | transparencia/cadencia Windows |
| WGC → compositor D3D11 | IMPLEMENTADO EXPERIMENTAL | prueba E2E |
| Avatar → FFmpeg | IMPLEMENTADO EXPERIMENTAL | E2E Windows sostenido |
| P06 completo | PENDIENTE | modelo real + salida Windows + rendimiento |

### No repetir
- No crear otro renderer Three.js.
- No crear otro tracker MediaPipe.
- No crear otro compositor D3D11.
- No crear otro RawPipe.- No usar `capturePage()` como transporte de vídeo.
- No sustituir WGC por OpenCV.
- No marcar P06 como VERIFIED hasta ejecutar el flujo real en Windows.

### CI observado
HEAD de esta iteración: `46080690edf3df3cd669ce3fda7a6dc4282cb87b`.
Los runs recientes de la rama ya se disparan mediante el workflow de desarrollo. Los intentos anteriores siguen terminando con jobs sin `steps`/`logs_url`; por eso P01 y P02 siguen abiertos.

### Porcentaje
**Avance canónico: 63/100 = 63%.**
P06 tiene implementación experimental, pero sus 4 puntos permanecen abiertos hasta verificar modelo real, transparencia, composición y salida sostenida en Windows.

## 21. Regla permanente de continuidad

`CARI_STUDIO_BITACORA.md` es la única fuente canónica de continuidad. Antes de modificar una pieza:
1. Buscar su entrada.
2. Si figura IMPLEMENTADO/VERIFICADO, no crear un reemplazo; atacar únicamente el gate restante o una regresión reproducible.
3. Registrar primero cualquier hallazgo nuevo que justifique tocar un componente cerrado.
4. No sumar puntos al porcentaje por implementar dos veces la misma capacidad.
5. Mantener separados implementación, verificación y validación en hardware.

## 22. Estado CI y continuidad — 20/09/2026 14:35 ART

### HEAD canónico observado
- PR #2 / rama `fix/native-windows-foundation`.
- HEAD: `d272442776dbc501cc46a4a035194749d5bb0b53`.
- Avance canónico: **63%**.

### CI observado en este HEAD
| Workflow | Run | Estado | Evidencia |
|---|---:|---|---|
| Native Windows Build | 35526287906 | failure | jobs `electron-shell-check` y `build` sin `steps` ni `logs_url` |
| CI | 35526287890 | failure | jobs Python sin `steps` ni `logs_url` |
| Actions Runner Diagnostic | 35526287874 | failure | job `probe` sin `steps` ni `logs_url` |
| Character Runtime Tests | 35526287879 | failure | jobs sin `steps` ni `logs_url` |

El workflow diagnóstico mínimo reproduce el mismo patrón. No se modifica C++/CMake/Python para adivinar una causa que no tiene logs. P01 permanece pendiente.

### P06 estado actual
- Overlay transparente Electron + Three.js/glTF: **IMPLEMENTADO EXPERIMENTAL**.
- Estado de actuación persistente durante carga del overlay: **IMPLEMENTADO**.
- Overlay capturado por WGC y enviado al compositor D3D11: **IMPLEMENTADO EXPERIMENTAL**.
- Modelo real mediante `CARI_AVATAR_MODEL_PATH`: **IMPLEMENTADO / CONFIGURABLE**.
- P06 completo: **PENDIENTE DE VALIDACIÓN** en Windows con modelo real, transparencia, rendimiento y salida sostenida.
- P05 continúa separado: el boundary raw requiere readback CPU, así que no se considera compositor GPU de producción.

### No repetir
- No rehacer WGC, WASAPI, MediaClock, RealtimePacer, MediaInterleaver, RawPipe, FFmpeg supervisor, retry policy, compositor D3D11 base, MediaPipe tracker ni renderer Three.js.
- No crear otro transporte para el avatar.
- No marcar P06 como VERIFIED por el código existente.
- No marcar P01 como VERIFIED por un run `failure` con `steps=null`.

### Siguiente cola única

## 24. Snapshot de continuidad actual — 20/09/2026 14:58 ART

- HEAD canónico real del PR #2: `b254ed6a70ceb9b775dda5689c94ed3ab3f1dc35`.
- Avance canónico: **63/100 = 63%**.
- P06: overlay Three.js/glTF → ventana Electron transparente → WGC → compositor D3D11 existente: **IMPLEMENTADO EXPERIMENTAL**.
- P05: sigue abierto porque el frame compuesto utiliza readback CPU en el boundary raw.
- P01/P02: sigue abierto; Actions continúa creando jobs que terminan `failure` sin `steps` ni `logs_url`. Existe un harness local único `validate-windows.ps1` para ejecutar la validación sobre el PC Windows.
- No se reabrió ninguna capacidad marcada `IMPLEMENTADO/VERIFICADO` en la bitácora.

### Últimos commits de esta continuidad
- integración del overlay de avatar y captura WGC;
- persistencia del estado del avatar después de `did-finish-load`;
- check de sintaxis para preload y overlay renderer;
- harness local único para build/CTest/E2E/Electron;
- registro de evidencia CI actualizada.

### No repetir
- No volver a crear renderer, tracker, compositor, RawPipe, mixer, scheduler, retry policy ni supervisor FFmpeg.
- No volver a ejecutar el smoke sintético de FFmpeg sin un cambio de contrato.
- No marcar P06 como VERIFIED por código solamente.
- No marcar P01/P02 como VERIFIED por jobs sin steps/logs.


## 13. Auditoría estructural actual — 20/09/2026 14:42 ART

**HEAD auditado:** d89dde52dbbef57f82d5d5966f0b3ea45e8ce5aa
**Estado:** experimental / NO listo para producción
**Avance canónico:** **63%**

Los snapshots anteriores son históricos. Esta sección es la referencia activa de problemas y no debe abrir componentes ya cerrados.

### P0 — antes de agregar nuevas features

| ID | Hallazgo | Estado | Próximo paso |
|---|---|---|---|
| P0-01 | La bitácora tenía HEAD y snapshots contradictorios con el PR real. | CORREGIDO DOCUMENTALMENTE | Mantener el HEAD del PR como referencia viva. |
| P0-02 | El callback de Windows Graphics Capture realiza trabajo pesado: readback CPU, composición GPU, readback CPU y envío al MediaGraph. | ABIERTO | Mover el procesamiento a una cola/worker acotada y mantener ligero el callback. |
| P0-03 | D3D11 comparte un immediate context entre subsistemas sin una política global de sincronización. | ABIERTO | Unificar ownership del context o proteger explícitamente todo acceso. |
| P0-04 | El transporte raw no conserva los PTS originales; wallclock de FFmpeg no equivale al timestamp de origen. | ABIERTO | Elegir una sola ruta de PTS explícitos y promoverla después de probarla. |

### P1 — integración y bugs detectados

| ID | Hallazgo | Estado | Próximo paso |
|---|---|---|---|
| P1-01 | Media Foundation Camera usa el timestamp del Source Reader como Frame.pts sin correlación demostrada con WGC/WASAPI. | ABIERTO | Medir offset y drift entre relojes. |
| P1-02 | Camera stop hace join mientras ReadSample puede estar bloqueado. | ABIERTO | Diseñar cancelación o callback asíncrono. |
| P1-03 | Conversión RGB32 de cámara asume pitch lineal width*4. | ABIERTO | Validar stride y copiar por fila. |
| P1-04 | El compositor GPU sigue haciendo readback CPU por frame antes de FFmpeg. | ABIERTO | Crear frontera de encoder GPU/surface real. |
| P1-05 | Avatar overlay hace WGC + CPU readback + conversión + upload GPU + readback CPU. | ABIERTO | Reducir cruces y compartir surface/texture. |
| P1-06 | El avatar usa el último frame disponible sin asociación temporal con el frame final. | ABIERTO | Asociar estado/frame de avatar por timestamp. |
| P1-07 | AudioLipSync del renderer se actualiza desde el refresh y se excluye cuando hay FaceTracker. | ABIERTO | Crear un reloj de lip-sync de baja latencia y combinarlo con tracking. |
| P1-08 | MediaPipe usa VIDEO síncrono dentro de requestAnimationFrame. | ABIERTO | Evaluar LIVE_STREAM o Worker; no crear segundo tracker. |
| P1-09 | Libav preserva PTS de vídeo, pero el audio usa solo el PTS inicial y luego next_audio_pts continuo. | ABIERTO | Definir política explícita para gaps/overlaps de audio. |
| P1-10 | Selección de sample-rate en Libav inicializa la distancia respecto de 48 kHz en lugar de la entrada en todos los casos. | ABIERTO | Corregir y agregar regresión 44.1/48/32 kHz. |
| P1-11 | MultiStreamOutput no pasa por MediaGraphController, pacing ni interleave global. | ABIERTO | No promover multistream hasta compartir el mismo contrato temporal. |
| P1-12 | E2E named-pipe existe pero no tiene ejecución Windows observable en CI y no mide sincronización fuerte. | ABIERTO | Exigir logs/steps y medir duración, PTS, offset y streams. |
| P1-13 | Status nativo usa g_capture.stats para frames/fps incluso cuando source=camera. | ABIERTO | Unificar métricas de fuente activa. |
| P1-14 | NativeEngine.stop puede limpiar child antes de observar el exit. | ABIERTO | Esperar terminación explícita antes de permitir nuevo start. |
| P1-15 | Electron shell no tiene package-lock visible. | ABIERTO | Fijar lockfile para reproducibilidad. |

### P2 — deuda y riesgos secundarios

| ID | Hallazgo | Estado |
|---|---|---|
| P2-01 | WGC está orientado a BGRA8 SDR; HDR no está cubierto. | ABIERTO |
| P2-02 | Camera tracking del renderer y camera source nativa pueden competir por el mismo dispositivo. | ABIERTO |
| P2-03 | file:// está endurecido pero puede migrar a protocolo local propio cuando el shell madure. | ABIERTO |
| P2-04 | Electron está en 44.4.2 y existe 44.4.3. | ABIERTO |
| P2-05 | AudioClockDriftEstimator existe pero no cierra un loop de corrección real. | ABIERTO |
| P2-06 | anime-bright es DSP tonal/dinámico, no pitch/formant. | DOCUMENTADO |
| P2-07 | Live2D sigue adapter-only y no debe empaquetarse un runtime propietario sin revisión legal. | DOCUMENTADO |

### No repetir

- No crear otro scheduler, mixer, RawPipe, supervisor FFmpeg, retry policy, compositor D3D11, tracker MediaPipe o renderer Three.js.
- No volver a usar OpenCV como sustituto de Windows Graphics Capture.
- No volver a usar capturePage como transporte de vídeo.
- No marcar E2E Windows como VERIFIED hasta observar una ejecución real con pasos y métricas.
- No tratar el smoke sintético de FFmpeg como prueba de Windows sostenida.
- No implementar multistream por separado del contrato temporal del single-output.

### Evidencia oficial relevante

- Microsoft documenta que SystemRelativeTime de Windows Graphics Capture es tiempo QPC del render del compositor. citeturn224142search0turn224142search1
- Microsoft indica que el Source Reader entrega el tiempo de presentación del media sample. Esto no demuestra equivalencia con el QPC usado por WGC. citeturn224142search7
- Microsoft documenta que el immediate context de D3D11 no es thread-safe y que el acceso compartido requiere sincronización. citeturn294595search0turn294595search1
- MediaPipe exige timestamps crecientes en VIDEO y ofrece LIVE_STREAM asíncrono para entradas en vivo. citeturn691949search1
- FFmpeg raw no transporta los PTS de origen dentro de los bytes; la ruta con wallclock no sustituye un protocolo de timestamps explícitos. citeturn691949search0

### Cola de trabajo después de la auditoría

1. P0-02: sacar el trabajo pesado del callback de captura.
2. P0-03: resolver ownership/sincronización del immediate context.
3. P0-04: cerrar diseño de PTS explícitos y elegir la ruta principal.
4. P1-01 a P1-03: cerrar reloj y calidad de cámara.
5. P1-07 y P1-08: corregir latencia de tracking/lip-sync.
6. Solo después: validación RTMP, multistream, distribución y hardware.

Esta sección debe ser actualizada cuando un hallazgo cambie de estado. No duplicar entradas con otro nombre.


## 25. Auditoría de rendimiento y corrección multimedia — 20/09/2026 15:04 ART

**HEAD auditado:** 59952e8e68c9857aa9c4e528218503fc7ab7cddd  
**PR:** #2 — `fix/native-windows-foundation`  
**Estado:** experimental / NO listo para producción  
**Avance canónico:** **63%**

### P0 confirmados

| ID | Hallazgo confirmado | Evidencia en código | Riesgo | Acción |
|---|---|---|---|---|
| P0-02 | El callback `Windows.Graphics.Capture` sigue siendo demasiado pesado. | `main.cpp`: `FrameArrived` crea el frame final, ejecuta composición D3D11 y, para la salida FFmpeg actual, llama `copy_output_to_cpu()`; el fallback `FrameBridge::copy_to_cpu()` también crea staging + `Map`. | Alta latencia, pérdida de frames, sincronización GPU/CPU y presión de memoria. | Callback = adquirir/enqueue solamente. Worker de composición/readback acotado y con política de drop-oldest/latest-frame. |
| P0-04 | Los PTS originales no viajan por el protocolo raw y FFmpeg recibe `use_wallclock_as_timestamps=1`. | `output_profile.h` aplica la opción a ambas entradas raw. | Se pierde la continuidad temporal de origen; además FFmpeg documenta que forzar wallclock tiene resultados indefinidos con B-frames. | Implementar transporte con header/framing de PTS o abandonar raw pipe para el boundary final; no usar wallclock como sustituto permanente. |
| P0-05 | El compositor GPU cachea device/context y no detecta cambio de dispositivo después de device-loss recovery. | `main.cpp` reusa `g_gpu_compositor`; `needs_init` solo comprueba null/tamaño, no identidad del `ID3D11Device`. | Después de device removed/reset, el compositor puede conservar recursos del dispositivo antiguo y operar contra una textura del nuevo. | Invalidación/reinicialización explícita del compositor cuando cambia el device; test de recovery antes de cerrar el gate. |

### P0-02: cadena exacta observada

La descripción anterior de la bitácora debe leerse así; no se debe volver a usar la versión simplificada:

```
WGC FrameArrived (worker interno de FramePool)
    ↓
captured.surface
    ↓
D3D11 GPU composition
    ├─ CopyResource(capture → output)
    ├─ upload_overlay(...)
    └─ Draw(...)
    ↓
CopyResource(output → staging)
    ↓
Map(D3D11_MAP_READ)
    ↓
CPU BGRA buffer
    ↓
MediaGraphController
    ↓
RawPipe
    ↓
FFmpeg
```

Cuando la composición GPU no está disponible o en diagnóstico:

```
WGC FrameArrived
    ↓
FrameBridge::copy_to_cpu
    ↓
CreateTexture2D(STAGING)
    ↓
CopyResource
    ↓
Map(READ)
    ↓
CPU buffer
```

**Corrección importante:** no existe una segunda "GPU→CPU readback después de un compositor software" como describían algunos snapshots antiguos. El camino actual de producción experimental es **GPU compositor → CPU readback**. El compositor software aparece como diagnóstico/fallback.

Microsoft documenta que `CreateFreeThreaded` hace que `FrameArrived` se ejecute en el worker interno del frame pool. Eso no vuelve barato el callback: el trabajo síncrono del callback sigue bloqueando el consumo de frames de ese worker. urlCreateFreeThreaded — Microsoft Learnhttps://learn.microsoft.com/en-us/uwp/api/windows.graphics.capture.direct3d11captureframepool.createfreethreaded?view=winrt-26100

Microsoft también documenta que el immediate context de D3D11 no es thread-safe; el acceso compartido requiere sincronización. En el diseño actual el acceso principal está serializado por el propio callback/compositor, pero no debe expandirse a más workers sin definir ownership explícito. urlDirect3D 11 multithreading — Microsoft Learnhttps://learn.microsoft.com/en-us/windows/win32/direct3d11/overviews-direct3d-11-render-multi-thread-intro

### P1 confirmados en esta revisión

| ID | Hallazgo | Evidencia | Próximo gate |
|---|---|---|---|
| P1-16 | `D3D11Compositor::upload_overlay()` crea una textura `IMMUTABLE` + SRV por overlay y por frame. | `d3d11_compositor.cpp`. | Cachear textura/SRV; actualizar solo cuando cambie el bitmap. |
| P1-17 | `D3D11Compositor::copy_output_to_cpu()` crea un staging texture nuevo por frame. | `d3d11_compositor.cpp`. | Pool de staging/readback asíncrono; eliminar del camino final cuando exista encoder GPU. |
| P1-18 | Overlay del avatar hace WGC → readback CPU cada 2 frames → BGRA→RGBA → upload GPU en el compositor. | callback de `g_avatar_capture` + `upload_overlay`. | Worker + surface/texture compartida o mecanismo de captura GPU directo. |
| P1-19 | El avatar overlay no está sincronizado por PTS con el frame final. | Se conserva `g_avatar_overlay_sequence`, pero el compositor usa simplemente el último bitmap disponible. | Selección por timestamp/sequence y política de edad máxima del overlay. |
| P1-20 | `StartOutput()` puede esperar hasta ~1 s con `Sleep(10)` para que la cámara tenga formato. | `main.cpp`. | Convertir a estado asíncrono/event-driven; no bloquear UI/control thread. |
| P1-21 | `BuildSourceStatus()` enumera cámaras periódicamente y llama MFStartup/MFShutdown repetidamente. | `main.cpp` + `camera_sources.cpp`. | Cachear enumeración y refrescar bajo demanda. |
| P1-22 | La cámara Media Foundation usa timestamps del Source Reader sin puente temporal demostrado hacia el dominio WGC/WASAPI. | `media_foundation_camera.cpp`. | Medir offset/drift y documentar el dominio. |
| P1-23 | La cámara hace `ReadSample()` síncrono en worker y `stop()` espera con join. | `media_foundation_camera.cpp`. | Cancelación/Shutdown no bloqueante y prueba de desconexión. |

### Riesgos que se revisaron y NO se elevan a P0

- **P0-03 de snapshots anteriores:** el código actual no demuestra una carrera concurrente del immediate context del mismo device. El callback principal y el compositor usan el contexto de ese device dentro de la misma ruta, y el compositor tiene mutex. Mantener el punto como **riesgo de ownership futuro**, no como bug concurrente confirmado. No borrar el análisis; simplemente no sobrerankearlo.
- `SoftwareCompositor` no es el cuello principal de producción porque el camino actual usa GPU compositor cuando puede; queda como referencia/diagnóstico. No invertir el siguiente ciclo en optimizarlo antes de eliminar readbacks.
- OpenCV no es necesario para reparar P0-02: WGC/D3D11 ya es el backend de captura Windows seleccionado. No crear un segundo backend.

### Problemas adicionales de corrección temporal

FFmpeg documenta `use_wallclock_as_timestamps` como una opción que fuerza timestamps de wallclock y advierte resultados indefinidos con B-frames. La configuración actual usa `libx264` y no desactiva explícitamente B-frames. Por tanto, el current raw boundary no debe promocionarse como timestamp-safe aunque el scheduler upstream funcione correctamente. urlFFmpeg Formats Documentationhttps://ffmpeg.org/ffmpeg-formats.html

### No repetir

- No volver a implementar WGC.
- No sustituir WGC por OpenCV.
- No crear otro compositor D3D11.
- No crear otro RawPipe.
- No crear otro MediaClock/RealtimePacer/MediaInterleaver.
- No crear otro tracker MediaPipe.
- No crear otro renderer Three.js.
- No convertir `capturePage()` en transporte multimedia.
- No optimizar primero el `SoftwareCompositor`.
- No marcar el callback como resuelto solo por mover una línea: debe quedar medido con latencia, FPS entregado, cola máxima, drops y duración sostenida.
- No eliminar el readback final sin reemplazarlo por una frontera de encoder válida.
- No tratar `use_wallclock_as_timestamps` como solución permanente de PTS.
- No marcar device-loss como cerrado hasta demostrar que el compositor se reinicializa con el nuevo D3D device.

### Próxima cola única recomendada

**P0-A — Worker de captura**
```
WGC FrameArrived
    ↓
AddRef / captura de metadata mínima
    ↓
bounded latest-frame queue
    ↓
GPU/CPU worker
    ↓
D3D11 compositor
    ↓
readback provisional
    ↓
MediaGraph
```

**P0-B — PTS**
```
FrameHeader {
    magic
    version
    stream_type
    sequence
    pts_100ns
    payload_size
}
+
raw payload
```

El header debe ser versionado, pequeño y con validación de tamaño antes de aceptar el payload. La frontera FFmpeg debe leer ese framing mediante un adaptador propio o sustituirse por una API de encoder/muxer que acepte timestamps explícitos.

**P0-C — Device identity**
- Asociar al compositor el `ID3D11Device` activo.
- Invalidar recursos cuando el device cambie.
- Recrear shaders/buffers/textures solo cuando corresponda.
- Ejecutar test de device-loss/recovery + composición posterior.

### Estado y continuidad

- **Avance global canónico:** **63%**.
- **Producto:** NO listo para producción.
- **P0-02:** abierto y confirmado.
- **P0-04:** abierto y confirmado.
- **P0-05:** nuevo y confirmado.
- **CI:** los runs recientes siguen terminando con `failure` sin `steps/logs` observables; la bitácora no atribuye esos fallos al código.
- **HEAD auditado:** 59952e8e68c9857aa9c4e528218503fc7ab7cddd.

Esta sección reemplaza cualquier descripción anterior de P0-02 que diga que existe una "segunda readback de composición software". Esa descripción está obsoleta y no debe reutilizarse.


## 26. P0-02 profundizado — callback WGC / GPU / CPU — 20/09/2026 15:04 ART

**HEAD auditado:** 59952e8e68c9857aa9c4e528218503fc7ab7cddd  
**Avance canónico:** **63%**  
**Estado:** P0 abierto; no agregar nuevas funciones que dependan de esta ruta hasta corregirla.

### Hallazgo confirmado

El callback principal de `g_capture.set_frame_callback(...)` no es un simple productor de frames. Cuando hay output activo, realiza dentro del worker de `FrameArrived`:

1. Obtención de `ID3D11Texture2D` desde la superficie WGC.
2. Inicialización/reutilización del `D3D11Compositor`.
3. `CopyResource(capture → output)`.
4. Para cada overlay, creación de textura `IMMUTABLE` + SRV mediante `upload_overlay()`.
5. Dibujo del overlay mediante shader.
6. `copy_output_to_cpu()`: creación de staging texture.
7. `CopyResource(output → staging)`.
8. `Map(D3D11_MAP_READ)` y copia completa a un `std::vector<uint8_t>`.
9. Envío del buffer a `MediaGraphController`.

Esto significa que el cuello no está solamente en el CPU readback del `FrameBridge`: el camino normal de output ya hace **GPU composition + GPU→CPU readback por frame**.

### Hallazgo confirmado adicional: overlay del avatar

La captura de la ventana del avatar ejecuta en su propio callback WGC:

```
WGC avatar
  ↓
FrameBridge::copy_to_cpu()
  ↓
staging + Map(READ)
  ↓
BGRA → RGBA CPU
  ↓
shared_ptr
```

y luego el callback principal sube ese bitmap a GPU nuevamente con `upload_overlay()`.

Por tanto existe un segundo circuito de cruces CPU/GPU que debe eliminarse o desacoplarse del callback.

### Corrección respecto de snapshots anteriores

No volver a describir el problema como:

```
WGC → CPU readback → software compositor → GPU readback
```

La implementación actual real es:

```
WGC
 ↓
D3D11 GPU compositor
 ↓
GPU → CPU readback
 ↓
MediaGraph
 ↓
raw pipe
 ↓
FFmpeg
```

con un fallback/diagnóstico alternativo:

```
WGC
 ↓
FrameBridge CPU readback
 ↓
MediaGraph
```

### P0-06 — device-loss / compositor stale device

Hay un bug adicional confirmado.

`CaptureEngine::recover_device_and_pool()` puede crear un nuevo `ID3D11Device` después de `DXGI_ERROR_DEVICE_REMOVED/RESET/HUNG`.

Sin embargo `g_gpu_compositor` conserva sus `device_`/`context_`/textures anteriores y en `main.cpp` la condición `needs_init` solo comprueba null o cambio de dimensiones. No comprueba que el dispositivo D3D11 haya cambiado.

Consecuencia esperable: después de una recuperación de dispositivo, el compositor puede intentar operar con una textura del device nuevo usando recursos/contexto del device anterior. Debe invalidarse y reconstruirse explícitamente.

### P1-24 — asignación de overlay por frame

`D3D11Compositor::upload_overlay()` crea y destruye recursos GPU por overlay y por frame. El bitmap del avatar puede no cambiar, pero el pipeline vuelve a crear la textura igualmente.

**Acción:** cachear textura/SRV y actualizar contenido solo cuando cambie el frame del overlay.

### P1-25 — staging por frame

`D3D11Compositor::copy_output_to_cpu()` crea un staging texture nuevo en cada frame. Esto impide un readback pipelined eficiente.

**Acción:** pool de 2–3 staging textures y lectura diferida; este gate queda provisional hasta disponer de encoder GPU/direct-surface.

### P1-26 — avatar sin sincronización temporal

`g_avatar_overlay_sequence` se almacena pero no participa en la selección del overlay. El frame principal puede combinar una captura de escritorio nueva con un avatar más antiguo.

**Acción:** añadir edad máxima del overlay y selección temporal por PTS/sequence.

### P1-27 — UI/control bloqueante al iniciar cámara

`StartOutput()` puede ejecutar hasta 100 iteraciones de `Sleep(10)` para esperar el formato de cámara. Es una espera de hasta ~1 s en el hilo de control/UI.

**Acción:** convertir el arranque de cámara en estado asíncrono/event-driven.

### P1-28 — enumeración de cámaras en refresh

`BuildSourceStatus()` enumera cámaras periódicamente. La enumeración invoca Media Foundation startup/shutdown, por lo que no debe mantenerse como tarea periódica de UI.

**Acción:** cachear endpoints y refrescar por evento o bajo demanda.

### P1-29 — timestamps de cámara

El Source Reader entrega el timestamp del media sample, pero la auditoría aún no demuestra equivalencia de reloj con WGC/WASAPI. No asumir sincronización solo porque ambas escalas sean 100 ns.

### P1-30 — Libav audio timeline

La ruta `LibavMediaOutput` convierte los paquetes de audio a una secuencia continua basada en `next_audio_pts`. Los gaps/overlaps del PTS de entrada no modifican esa continuidad después del primer paquete.

**Acción:** definir política explícita para paquetes perdidos, gaps y overlaps antes de usar Libav como ruta de producción.

### P1-31 — elección de sample-rate en Libav

La distancia inicial para seleccionar el sample-rate soportado se calcula contra 48 kHz antes de comparar con el sample-rate real de entrada. Ese inicializador puede conservar una frecuencia incorrecta cuando el primer sample-rate soportado no coincide con la entrada y las alternativas posteriores tienen mayor distancia que el error inicial.

**Acción:** inicializar la mejor distancia contra `input_audio_sample_rate` desde el principio y cubrir 22.05/32/44.1/48/96 kHz.

### P0/P1 oficial — FFmpeg wallclock

FFmpeg documenta que `use_wallclock_as_timestamps=1` fuerza PTS/DTS desde wallclock y advierte resultados indefinidos con B-frames. El perfil raw actual utiliza esa opción mientras el encoder de archivo permite B-frames.

**Acción:** no considerar esta configuración como solución temporal de sincronización. La ruta PTS explícita debe resolver el problema de raíz.

### CI actual

Los runs del HEAD reciente continúan muriendo antes de steps/logs observables:

- Native Windows Build: failure, jobs sin `steps`/logs.
- Actions Runner Diagnostic: failure, job sin `steps`/logs.
- CI: failure, jobs sin `steps`/logs.
- Character Runtime Tests: failure, jobs sin `steps`/logs.

Esto sigue siendo evidencia de **CI no verificable**, no de una regresión específica de C++.

### No repetir

- No rehacer WGC.
- No reimplementar el compositor D3D11 desde cero.
- No crear un segundo pipeline de readback.
- No crear otro renderer/avatar/tracker.
- No usar OpenCV para sustituir WGC.
- No volver a `capturePage()`.
- No optimizar primero el software compositor.
- No reintentar la misma prueba FFmpeg sintética sin cambios de contrato.
- No marcar el E2E Windows como VERIFIED hasta obtener steps/logs y métricas.
- No marcar device-loss como resuelto sin reconstrucción del compositor sobre el device nuevo.

### Cola única posterior al análisis

**P0-02:** callback WGC mínimo + cola latest-frame acotada + worker.

**P0-06:** invalidación del compositor al cambiar device.

**P0-04:** transporte PTS explícito, evitando `use_wallclock_as_timestamps` como sustituto.

**P1-24/P1-25:** cache de overlay + pool de readback provisional.

**P1-26:** sincronización temporal del avatar.

**P1-27/P1-28:** arranque/enumeración de cámara sin bloquear UI.

**P1-30/P1-31:** corregir timeline y selección de sample-rate Libav.

No avanzar a multistream ni a más funciones de plataforma hasta cerrar P0-02, P0-04 y P0-06.


## 27. Estado vivo posterior a la auditoría — 20/09/2026 15:04 ART

**HEAD vivo:** 54bd68e9928384cf88fed404dd114075054d3de4  
**PR:** #2 — abierto / draft / no mergeable  
**Avance global:** **63%**  
**Producto:** NO listo para producción.

### Estado de P0
- **P0-02:** CONFIRMADO — callback WGC sobrecargado con composición y readback.
- **P0-04:** CONFIRMADO — raw transport no conserva PTS y `use_wallclock_as_timestamps=1` no es solución de sincronización permanente.
- **P0-05:** CONFIRMADO — compositor D3D11 no invalida recursos al cambiar el `ID3D11Device` después de device-loss recovery.
- **P0-03:** mantener como riesgo de ownership/threading; no tratar como carrera concurrente confirmada sin evidencia adicional.

### CI
Se generaron nuevas ejecuciones para este HEAD:
- Native Windows Build: queued.
- CI: queued.
- Character Runtime Tests: queued.
- Actions Runner Diagnostic: queued.

No inferir resultados hasta que existan steps/logs observables.

### Próxima ejecución
Trabajar exclusivamente sobre P0-02/P0-05/P0-04. No agregar features de plataforma, multistream o nuevos backends mientras esos tres gates sigan abiertos.

## 28. Auditoría y correcciones — 20/09/2026 15:14 ART

HEAD observado al cierre: consultar HEAD actual del PR #2.
Avance canónico: 63%.
Readiness: experimental / NO listo para producción.

### Hallazgos confirmados
1. El callback FrameArrived de WGC hacía composición GPU, subida de overlays y readback GPU→CPU dentro del hilo de captura.
2. El compositor D3D11 podía conservar recursos de un ID3D11Device anterior después de DEVICE_REMOVED/RESET/HUNG.
3. StartOutput usa un cuarto parámetro explícito para distinguir arranque manual de retry automático.

### Correcciones realizadas
- Creado experimental/studio/core/latest_item_queue.h.
  - Mantiene solo el frame más reciente.
  - Cuenta pushed/replaced/popped.
  - Permite stop/reset seguro.
- Creado latest_item_queue_smoke.cpp.
- Registrado el smoke en CMake.
- main.cpp ahora encola CapturedFrame y delega el procesamiento pesado a StartPrimaryCaptureWorker().
- añadido guard de identidad de dispositivo en la inicialización del compositor para reconstruir recursos cuando cambia el device.
- corregidos los call sites manuales de StartOutput(..., true); false queda reservado para retry automático.
- la serialización del campo output ya estaba corregida y se conserva.

### Evidencia
- latest_item_queue_smoke: PASS con C++20, -Wall -Wextra -Werror.
- output_retry_smoke: PASS con C++20, -Wall -Wextra -Werror.
- output_diagnostics_smoke: PASS con C++20, -Wall -Wextra -Werror.
- D3D11 WARP smoke y E2E Windows named-pipe existen, pero siguen pendientes de ejecución observable en Windows.
- Actions continúa produciendo fallos sin steps/logs observables; no se usa ese resultado para atribuir una regresión.

### Qué NO repetir
- No volver a meter composición/readback pesado dentro de FrameArrived.
- No rehacer el compositor D3D11.
- No crear otra implementación de latest-frame queue.
- No sustituir WGC por OpenCV.
- No crear otro tracker MediaPipe ni otro renderer Three.js.
- No declarar P0-02/P0-05 VERIFIED hasta una ejecución Windows observable.

### Cola única siguiente
P0-02: validar worker sobre Windows y medir replaced/FPS/latencia.
P0-05: validar reconstrucción del compositor después de device-loss en Windows.
P0-04: transporte de PTS explícito; retirar use_wallclock_as_timestamps=1 como solución definitiva.
P1-24/P1-25: cache de overlay y staging pool.

### Decisión sobre pruebas
El proyecto ya está en el punto donde los tests en Windows son necesarios para cerrar los gates principales.
No hace falta acceso remoto a la PC. Ejecutar experimental/studio/native-windows/validate-windows.ps1 en Windows y conservar validation-evidence.

Regla: el porcentaje no aumenta por scaffolding. Solo cambia cuando un gate pasa a VERIFIED o VALIDADO EN HARDWARE.
## 29. Estado vivo — 20/09/2026 15:20 ART

HEAD: 9292beeaa0cf72dd9ff8f67e58a33a263f4b72a9
PR #2: abierto / draft / no mergeable.
Avance: 63%.

### Trabajo cerrado desde la última auditoría
- LatestItemQueue implementada y smoke portable PASS.
- Callback WGC principal desacoplado mediante latest-frame worker.
- Compositor D3D11 equipado con detección de cambio de ID3D11Device para reconstrucción después de device-loss.
- Call sites de StartOutput corregidos con modo manual/retry explícito.
- Retry/diagnostics y límites de stderr conservados.

### Verificación que ya no debe repetirse
- latest_item_queue_smoke: PASS C++20 + -Wall -Wextra -Werror.
- output_retry_smoke: PASS C++20 + -Wall -Wextra -Werror.
- output_diagnostics_smoke: PASS C++20 + -Wall -Wextra -Werror.
- FFmpeg sintético BGRA/PCM -> H.264/AAC/Matroska: PASS.

### Gate que ahora requiere PC Windows
- CMake + build Release.
- CTest completo.
- E2E named-pipe -> FFmpeg -> archivo -> decode.
- WGC sostenido.
- D3D11 compositor en hardware y device-loss.
- WASAPI real + drift.
- Media Foundation camera.
- FFmpeg real sostenido / RTMP / reconexión.

### Acción operativa
Usar experimental/studio/native-windows/validate-windows.ps1 desde un checkout Windows del repositorio.
Conservar validation-evidence/SUMMARY.txt y environment.txt.
No hace falta acceso remoto al PC ni instalar el producto final todavía; primero obtener un build/artefacto de validación.

### CI
Los runs más recientes del HEAD real siguen finalizando failure con steps=null y logs_url=null. No se consideran evidencia de fallo del código. No marcar CI como VERIFIED.

### Próximo orden de trabajo
P0-02 validar latest-frame worker; P0-05 validar device-loss; P0-04 transporte PTS explícito; después P1-24/P1-25 cache de overlay y staging pool.
NO REPETIR ningún componente marcado como IMPLEMENTADO/VERIFICADO salvo regresión reproducible.

## 30. Continuidad de raíz — 20/09/2026 15:45 ART

Esta copia en la raíz es la bitácora visible de continuidad. No crear otra bitácora fuera de la única zona experimental.

HEAD de referencia al comenzar este checkpoint: 4fb539d78e90897fbd10530c0d3961887d4a2035.

### Trabajo de esta continuidad
- Se revisó la bitácora existente antes de tocar módulos para evitar rehacer P0/P1 ya implementados.
- Se añadió OutputRetryPolicy con backoff exponencial acotado.
- Se añadió OutputFailureCategory y retry solo para RTMP con fallos de red.
- Se mantuvo stderr FFmpeg limitado a 256 KiB.
- Se expusieron estado, exit code, categoría de fallo, intentos y presupuesto de pacing.
- Se corrigió la serialización del estado output.
- Se mantuvo el backpressure de arranque y el límite de 8 eventos A/V por polling.
- Se reforzaron las invariantes de sesión para impedir cambios peligrosos durante una salida activa.
- Se ajustaron los workflows para la rama de desarrollo y workflow_dispatch.

### No repetir
- No rehacer WGC, WASAPI, AudioTimelineMixer, MediaClock, RealtimePacer, MediaInterleaver, RawPipe, FFmpeg supervisor, retry policy, diagnostics classifier, compositor D3D11, tracker MediaPipe ni renderer Three.js.
- No sustituir WGC por OpenCV.
- No usar capturePage como transporte multimedia.
- No repetir la prueba FFmpeg sintética sin cambios de contrato.
- No marcar E2E Windows como VERIFIED sin steps/logs/métricas observables.
- No fusionar a main antes de los gates de CI/hardware.

### Próximos gates
1. Windows E2E named-pipe -> FFmpeg -> archivo -> decode.
2. Validar worker WGC y recuperación de device en Windows.
3. Transporte de PTS explícitos extremo a extremo.
4. Eliminar readback CPU del camino final.
5. Integrar avatar real al compositor.
6. Validar cámara, drift, RTMP sostenido, Game Capture y distribución.

### Estado
Avance global de ingeniería: **63%**.
Readiness: **NO listo para producción**.
PR #2: abierto / draft / no mergeable.


## 31. Estado vivo — 20/09/2026 15:45 ART

**HEAD actual del PR #2:** ca0ff66a9b09ab8dc508cdaed098ac7f846fcd30
**PR:** abierto / draft / dirty / no mergeable
**Avance global:** **63%**
**Producto:** **NO listo para producción**

### Evidencia de CI del HEAD actual
- Native Windows Build: failure; jobs sin steps/logs observables.
- CI: failure; jobs sin steps/logs observables.
- Character Runtime Tests: failure; jobs sin steps/logs observables.
- No se atribuye la falla a una línea concreta del código porque el runner no proporciona ejecución de steps.

### Estructura
- La bitácora canónica visible está en `CARI_STUDIO_BITACORA.md` en la raíz.
- La copia antigua `experimental/studio/BITACORA.md` fue eliminada para evitar dos fuentes de verdad.
- No se crean nuevas zonas experimentales; los pendientes experimentales permanecen dentro de `experimental/`.

### Regla de promoción a main
No promover/fusionar los componentes experimentales a `main` por cantidad de código o por compilación parcial. La promoción exige los gates documentados: CI ejecutable con steps, E2E Windows named-pipe -> FFmpeg -> decode, estabilidad sostenida, compositor/PTS y hardware donde corresponda.

### Próximo bloque sin repetir trabajo anterior
- Ejecutar Windows `validate-windows.ps1` y conservar `validation-evidence`.
- Validar P0-02/P0-05 en Windows real.
- Resolver transporte PTS explícito y retirar `use_wallclock_as_timestamps=1` como solución definitiva.
- Optimizar readback/overlay y conectar avatar real al compositor.


## 32. Cierre de continuidad de esta ronda — 20/09/2026 15:45 ART

**HEAD final observado:** 8cfb6479616c557f018b93e69a0058aa0336f027
**Avance global:** **63%**
**Readiness:** NO listo para producción.

### Confirmado y no repetir
- Arquitectura Electron + Native Windows C++ existente.
- WGC ventana/pantalla y WASAPI mic/loopback existentes.
- LatestItemQueue/worker WGC y recuperación de device ya implementados en el historial canónico.
- D3D11 compositor existente; no crear otro compositor.
- MediaClock/RealtimePacer/MediaInterleaver existentes y verificados en smoke.
- RawPipe/FFmpeg supervisor existentes; no crear otro transporte.
- OutputRetryPolicy y OutputFailureCategory integrados; retry solo RTMP/network.
- Bitácora única trasladada a la raíz; la copia duplicada en `experimental/studio/BITACORA.md` fue eliminada.

### Pendiente operativo prioritario
- Obtener ejecución observable de Windows CI.
- Ejecutar `validate-windows.ps1` en Windows y conservar `validation-evidence`.
- Validar E2E named-pipe -> FFmpeg -> archivo -> decode.
- Validar device-loss/compositor y latest-frame worker en hardware Windows.
- Cerrar transporte PTS explícito y eliminar la dependencia de wallclock timestamps.
- Optimizar readback CPU/overlay y conectar avatar real al frame final.

### Regla de promoción
Todo lo anterior permanece experimental hasta que los gates de verificación correspondientes estén cerrados. No convertir implementación en validación por conteo de commits.

## 33. Twitch Control Plane — 21/09/2026

**Objetivo de esta ronda:** terminar el centro de control Twitch sin crear un segundo WebSocket, un segundo EventBus ni un segundo ActionRouter.

### Estado actual
- Avance canónico: **63%**. No se suman puntos por scaffolding; los gates de validación real siguen abiertos.
- Producto: experimental / NO listo para producción.
- PR #2: abierto / draft / no mergeable.

### Implementado
- `app/twitch/controller.py`: nuevo `TwitchController` provider-neutral. TwitchIO queda fuera del control de negocio y se limita al transporte.
- `TwitchLiveBot`: ahora delega chat, comandos, eventos, continuity y acciones al `TwitchController` único.
- `EventBus`: protegido con `RLock`, snapshot de listeners antes de ejecutar callbacks, journal acotado y métricas `published/delivered/listener_errors`.
- `StudioActionRouter`: ampliado para `chat`, `sound`, `scene`, `overlay`, `music`, `stream`, `recording`, `source`, `volume`, `mute`, `camera`, `avatar`, `expression`, `tracking` y `command`.
- `LocalCariActionHandler`: mantiene acciones locales de voz/avatar y reenvía controles de Studio por el único evento `studio_action`.
- `events.py`: conserva `event_id` cuando el payload expone metadata/message_id.
- `TwitchController`: deduplicación bounded de 1024 IDs para no ejecutar dos veces el mismo evento cuando el transporte entrega el mismo ID.
- `TwitchLiveBot`: pasa `message.id` de ChatMessage al controller para deduplicación de chat.
- `TwitchContinuityLedger`: queda conectado al controller y verifica los tipos de suscripción activos después de `session_welcome`.
- `experimental/twitch/twitchio_bridge.py`: convertido a compatibilidad; ya no contiene una segunda implementación de EventSub.
- Tests nuevos/actualizados para controller, deduplicación, continuity, IDs EventSub, EventBus y acciones de Studio.

### Cadena canónica

Twitch EventSub / Chat
    -> TwitchIO transport
    -> TwitchController
    -> EventBus
    -> AutomationEngine
    -> LocalCariActionHandler
    -> StudioActionRouter
    -> backend nativo u OBS opcional

El backend final de Native Engine/OBS todavía no se ejecuta directamente desde este bus; el router ya expone el contrato estable y provider-neutral para esa siguiente integración.

### Verificación
- Implementación integrada en GitHub: **sí**.
- Evidencia de tests CI del HEAD: **no verificable** porque los jobs recientes terminan antes de registrar `steps` y `logs_url`.
- Tests escritos: **sí**.
- Prueba de canal Twitch real: **pendiente**.
- Prueba real de reconexión/resuscripción: **pendiente**.

### Límite importante de deduplicación
Twitch documenta entrega al menos una vez y reutiliza el mismo `message_id` al reenviar una notificación. La ruta de ChatMessage ya pasa ese ID explícitamente. Para otros eventos EventSub, el controller solo deduplica cuando TwitchIO expone el `message_id` del transporte al payload; no se infiere el ID a partir de un ID de entidad del evento.

### NO REPETIR
- No crear otro WebSocket EventSub.
- No crear otro TwitchController.
- No crear otro EventBus.
- No crear otro StudioActionRouter.
- No crear otro continuity/reconnect manager: TwitchIO mantiene la responsabilidad del transporte.
- No volver a implementar el puente experimental antiguo; ahora es un alias de compatibilidad.
- No sustituir este control plane por OpenCV, OBS o un servicio cloud.

### Próximo bloque
Conectar las salidas `studio_*_requested` con un backend dual Native/OBS mediante `StudioRuntimeBindings`, y después validar en canal real. La implementación debe conservar la regla: Native Engine es backend principal; OBS es opcional.

## 34. Cierre Twitch Control Plane — 21/09/2026

**Estado:** IMPLEMENTADO; VALIDACIÓN REAL PENDIENTE.
**Avance global:** **63%** (sin incremento por scaffolding; ningún gate productivo se cerró en esta ronda).

### Cadena consolidada
- TwitchIO es únicamente transporte/EventSub.
- `TwitchController` concentra normalización, deduplicación, comandos, voz pública, automatización y acciones.
- `EventBus` es el único bus compartido del runtime y ahora es seguro para publicación concurrente.
- `LocalPipeline` conserva su único `StudioActionRouter`.
- `LocalCariActionHandler` conecta automatización Twitch con `studio_action`.
- `StudioActionRouter` traduce el contrato a eventos `studio_*_requested` para backends locales.
- OBS continúa siendo opcional; el Native Engine sigue siendo el backend objetivo principal.

### Controles cubiertos por el contrato
`chat`, `sound`, `scene`, `overlay`, `music`, `stream`, `recording`, `source`, `volume`, `mute`, `camera`, `avatar`, `expression`, `tracking`, `command` y `voice`.

### Idempotencia
- Cache bounded de 1024 IDs en `TwitchController`.
- Chat uses `ChatMessage.id` explícito.
- Otros eventos solo se deduplican cuando el transport adapter expone `message_id`; nunca se sustituye ese ID por un ID de entidad.
- Twitch documenta entrega al menos una vez y reutiliza `message_id` al reenviar la misma notificación.

### NO REPETIR
- No volver a crear `TwitchController`.
- No crear segundo EventSub WebSocket.
- No duplicar `TwitchLiveBot`.
- No crear segundo `EventBus` para Twitch.
- No crear segundo `StudioActionRouter` en el pipeline.
- No rehacer `TwitchContinuityLedger` ni mover la reconexión de TwitchIO al controller.
- No rehacer comandos/cooldowns/chat voice existentes; ampliar únicamente cuando exista un requisito o regresión reproducible.
- No volver a usar `experimental/twitch/twitchio_bridge.py` como implementación independiente: es alias de compatibilidad.

### Evidencia pendiente
- CI sigue terminando a nivel job con `steps=null` y `logs_url=null`; no existe build/test observable de GitHub Actions.
- Falta validación con Twitch real.
- Falta prueba real de reconnect/resubscribe.
- Falta conectar físicamente los eventos `studio_*_requested` con los backends Native/OBS.
- Falta validar concurrencia sostenida y carga del EventBus.

### Próximo foco obligatorio
Implementar el adaptador dual Native/OBS sobre `StudioRuntimeBindings`: Native Engine como backend primario, OBS WebSocket como backend opcional, con selección de backend, estado, errores y métricas. Después ejecutar validación de acciones en un flujo de stream real.
