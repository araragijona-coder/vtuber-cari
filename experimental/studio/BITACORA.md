# Cari Studio — Bitácora de ingeniería

> Propósito: evitar repetir auditorías, cambios o experimentos ya realizados.  
> Regla: antes de implementar una solución nueva, revisar esta bitácora y el estado del código.  
> Un elemento marcado **NO REPETIR** no se vuelve a investigar desde cero salvo que aparezca evidencia nueva.

## Estado actual

- Rama: `fix/native-windows-foundation`
- PR: #2 — `fix: harden native Windows foundation`
- HEAD operativo: consultar siempre el ref actual de `fix/native-windows-foundation`; los SHA de las entradas son checkpoints históricos.
- Estado: experimental; todavía no se promueve a producción.
- Avance de ingeniería: **62%**.
- Estado de uso: **NO listo para producción; sí sirve como build experimental sujeto a validación Windows.**

## Leyenda de estados

| Estado | Significado |
|---|---|
| IMPLEMENTADO | El código/contrato existe en el repositorio. |
| VERIFICADO | Existe prueba reproducible o smoke/integration que pasa. |
| VALIDADO EN HARDWARE | Funciona comprobado en Windows/hardware objetivo. |
| PENDIENTE | Falta evidencia o implementación. |
| NO REPETIR | No volver a resolver desde cero sin evidencia nueva. |

## Historial consolidado

### 001 — Arquitectura base
**Estado:** IMPLEMENTADO / NO REPETIR

Se estableció separación:
`Electron Renderer → Electron Main → Native Windows C++ → capture/audio → media graph → FFmpeg → file/RTMP`.

OBS queda como integración opcional vía WebSocket, no como dependencia del motor.

**NO REPETIR:** no rediseñar desde cero esta topología mientras siga cubriendo los requisitos actuales.

### 002 — Captura Windows
**Estado:** IMPLEMENTADO

Existe Windows Graphics Capture para:
- ventana;
- pantalla primaria;
- frame callback;
- D3D11;
- recreate del frame pool;
- recuperación de device removed/reset/hung;
- enumeración de ventanas.

**PENDIENTE:** captura de cámara real con Media Foundation, Game Capture dedicada y validación en hardware.

**NO REPETIR:** no sustituir Windows Graphics Capture por OpenCV para la captura principal de pantalla/ventanas sin evidencia de que resuelva una limitación concreta. OpenCV puede quedar como herramienta opcional de procesamiento/cámara.

### 003 — Audio
**Estado:** IMPLEMENTADO / PARCIALMENTE VERIFICADO

WASAPI cubre micrófono y system loopback. Existe VoiceEffectProcessor y AudioTimelineMixer con normalización inicial, mezcla temporal y métricas.

**PENDIENTE:** drift correction/resampling continuo basado en relojes físicos y validación sostenida en hardware.

**NO REPETIR:** no volver a convertir QPCPosition de WASAPI como si fuera QPC crudo. El contrato actual trabaja en 100 ns.

### 004 — Transporte A/V raw
**Estado:** IMPLEMENTADO / PARCIALMENTE VERIFICADO

Existen RawPipe, dos canales independientes, colas acotadas, OVERLAPPED I/O y conexión a FFmpeg.

**LÍMITE CONOCIDO:** los PTS originales no viajan dentro del pipe raw.

**NO REPETIR:** no declarar sincronización A/V de producción únicamente porque el scheduler funcione.

### 005 — MediaClock / RealtimePacer
**Estado:** VERIFICADO

Existe reloj canónico de 100 ns, pacing contra reloj monotónico y detección de wait/emit/late.

### 006 — Interleave global A/V
**Estado:** VERIFICADO

`MediaInterleaver` selecciona el menor PTS entre audio/video; empates favorecen audio. El media graph despacha como máximo 8 eventos por polling.

**NO REPETIR:** no reintroducir dos loops separados de audio/video salvo que cambie el diseño con una razón medible.

### 007 — Formato y sesión
**Estado:** IMPLEMENTADO / VERIFICADO PARCIAL

La salida rechaza cambios silenciosos de sample rate/canales y bloquea cambios de captura/audio mientras el output está activo.

**NO REPETIR:** no añadir más guardas duplicadas en cada handler; las próximas validaciones deben centralizarse en el contrato de sesión/media graph.

### 008 — FFmpeg lifecycle
**Estado:** IMPLEMENTADO

FFmpeg es supervisado desde C++. El stop cierra primero pipes para permitir EOF/flush y solo escala a terminación forzada tras timeout.

stderr está limitado a 256 KiB y se exponen estado/código de salida.

### 009 — Diagnóstico y reconexión
**Estado:** IMPLEMENTADO / VERIFICACIÓN EN CI PENDIENTE

Se añadió:
- `OutputFailureCategory`;
- clasificación de network/encoder/input/mux/permission/unknown;
- `OutputRetryPolicy` con backoff exponencial acotado;
- máximo de 5 intentos;
- rango 1 s → 30 s;
- solo RTMP con error clasificado como network se reintenta;
- estado de retry expuesto en las métricas/UI.

**NO REPETIR:** no implementar un segundo sistema de reconexión independiente dentro de Electron mientras este policy quede en el runtime nativo.

**PENDIENTE:** comprobar reconexión contra un endpoint RTMP real y decidir política de sesión después de agotar todos los intentos.

### 010 — Electron / seguridad
**Estado:** IMPLEMENTADO

Context isolation, nodeIntegration desactivado, sandbox, preload con wrappers explícitos, renderer local `file://`, permission handler de cámara limitado al renderer local.

### 011 — MediaPipe / avatar
**Estado:** IMPLEMENTADO / PARCIAL

Face Landmarker en modo VIDEO, guard de timestamp monotónico, bridge a avatar state y renderer Three.js/glTF.

**PENDIENTE:** compositor nativo del avatar, modelo real, lip-sync, rendimiento final, Live2D adapter.

**NO REPETIR:** no generar assets propietarios ni asumir que Live2D runtime puede distribuirse sin revisar licencia.

### 012 — Compositor
**Estado:** EXPERIMENTAL

Existe SoftwareCompositor/CompositorBridge de referencia y diagnóstico.

**PENDIENTE:** compositor GPU D3D11 conectado al frame final codificado.

**NO REPETIR:** no convertir el compositor software de diagnóstico en supuesto camino de producción.

### 013 — CI
**Estado:** PENDIENTE / INFRAESTRUCTURA

Los workflows ahora se disparan también en la rama de desarrollo y tienen `workflow_dispatch`. Los últimos runs conocidos todavía fallan antes de registrar steps (`steps=null`), así que no existe evidencia de compilación ejecutada.

Se añadieron los smoke tests de output retry y diagnostics al workflow Windows para que, cuando el runner ejecute steps, esas nuevas piezas también queden cubiertas.

**NO REPETIR:** no declarar CI verde sin jobs/steps ejecutados.

### 014 — Prueba FFmpeg sintética
**Estado:** VERIFICADO

Prueba conocida:
BGRA raw + PCM float32 → H.264 + AAC → Matroska con FFmpeg 7.1.5.

**LÍMITE:** Linux, sintética; no sustituye Windows + named pipes + captura real + hardware + RTMP.

**NO REPETIR:** no volver a usar esta prueba como evidencia de streaming Windows sostenido.

## Registro de trabajo reciente

| Cambio | Estado | Evidencia | Próximo paso |
|---|---|---|---|
| Interleaver global A/V | VERIFICADO | smoke portable C++20 | no rehacer |
| Guard de formato audio | IMPLEMENTADO | contratos + métricas | hardware/sesión real |
| Backpressure de conexión | IMPLEMENTADO | lógica del graph | prueba Windows real |
| Presupuesto de 8 eventos/poll | IMPLEMENTADO | métrica `pacing_budget_exhausted` | observar en hardware |
| stderr FFmpeg 256 KiB | IMPLEMENTADO | código bounded | test prolongado |
| Clasificación de output | IMPLEMENTADO | smoke añadido | conectar a datos Windows reales |
| RTMP retry policy | IMPLEMENTADO | smoke añadido | endpoint RTMP real |
| Bloqueo de cambios durante output | IMPLEMENTADO | handlers + hotkeys | prueba manual en Windows |
| CI branch trigger | IMPLEMENTADO | workflows actualizados | runner debe ejecutar steps |
| Bitácora persistente | IMPLEMENTADO | este archivo | mantenerla actualizada |

## No repetir / decisiones cerradas

1. No reemplazar la arquitectura por Python/OpenCV para el núcleo Windows.
2. No usar IA/cloud como dependencia del streaming.
3. No hacer OBS obligatorio.
4. No declarar el compositor software como compositor de producción.
5. No declarar raw-pipe A/V como timestamp-preserving.
6. No declarar FFmpeg sintético Linux como validación Windows.
7. No añadir un segundo mecanismo de retry independiente.
8. No crear/distribuir assets propietarios de avatar.
9. No promover `experimental/` a producción antes de los gates.
10. No asumir CI verde mientras GitHub no registre los steps.
11. No reescribir la historia para resolver la divergencia de 2 commits sin una necesidad técnica clara.
12. No rehacer una investigación ya registrada aquí sin evidencia nueva.

## Próximos frentes, en orden

### A — Transporte con timestamps explícitos
Diseñar un framing de media metadata + payload o sustituir raw pipe por un transporte local que conserve PTS. Debe mantener backpressure, cancelación y compatibilidad Windows.

### B — Compositor GPU
Construir una ruta D3D11 que combine captura + avatar/overlays y entregue el frame final al encoder sin readback CPU por frame.

### C — Cámara real
Implementar Media Foundation capture para cámara y adaptarla al mismo contrato de Frame/PTS.

### D — Lip-sync
Derivar boca/phoneme/amplitude desde el audio local sin introducir cloud/IA obligatoria.

### E — RTMP real
Probar pérdida de red, recuperación, agotamiento de retry y estado visible en UI.

### F — Hardware gate
Validar CPU/GPU/audio/cámara, estabilidad prolongada, device-loss y sincronización real.

## 019 — Sincronización de continuidad y gates — 2026-09-20
**Estado:** ACTUALIZADO

**HEAD canónico de esta entrada:** `44765dd4c00d976cbcc39360b8743e540aeb51db`

### Trabajo consolidado
- La política de retry RTMP ya existe en `experimental/studio/core/output_retry.h`.
- La clasificación de fallos ya existe en `experimental/studio/core/output_diagnostics.h`.
- El runtime nativo integra retry solo para RTMP y solo para fallos clasificados como network.
- El estado de salida, código de salida, categoría y estado del retry están expuestos por el control plane.
- El despacho A/V mantiene interleave global por PTS y presupuesto máximo de 8 eventos por polling.
- El mixer no se drena antes de que ambos named pipes estén conectados.
- Los cambios de captura/audio están bloqueados mientras el output está activo.
- La prueba `ffmpeg_named_pipe_e2e_smoke.cpp` existe y está registrada en CMake, pero su ejecución Windows sigue pendiente de un runner que llegue a los steps.
- Los workflows CI de desarrollo ya tienen trigger por push a la rama y `workflow_dispatch`.

### Corrección de criterio de evidencia
El smoke Windows de named pipes queda clasificado como **IMPLEMENTADO**, no como **VERIFICADO**, porque los runs recientes de GitHub Actions terminan antes de registrar steps y no entregan logs.

### Estado de CI
Los runs del 20-09-2026 sobre la rama de desarrollo continúan fallando con jobs sin steps registrados. No se utiliza este estado como evidencia de fallo del código ni como evidencia de éxito.

### NO REPETIR
No:
- crear otro retry/backoff;
- crear otra clasificación de fallos;
- crear otro interleaver A/V;
- volver a diseñar WGC/D3D11 o WASAPI como núcleo;
- reemplazar WGC por OpenCV para captura principal sin evidencia nueva;
- declarar el smoke Linux de FFmpeg como validación Windows;
- declarar `ffmpeg_named_pipe_e2e_smoke` verificado hasta obtener ejecución real;
- promover `experimental/` a producción;
- rehacer la bitácora en otro archivo.

### Siguiente frente
**P0:** conseguir evidencia ejecutable del build/smoke Windows y ejecutar el named-pipe E2E.  
**P1:** transporte con timestamps explícitos si el E2E demuestra la limitación temporal actual.  
**P2:** compositor GPU D3D11 para captura + avatar + overlays.  
**P3:** cámara Media Foundation, lip-sync y drift correction.  
**P4:** RTMP real/reconexión y hardware objetivo.  
**P5:** empaquetado, instalador y distribución legal de FFmpeg/codec.

## Registro de intentos descartados

- Prueba con dos FIFOs Linux: quedó descartada como evidencia de producción porque el escenario de apertura/bloqueo de FIFOs no representa por sí mismo la implementación Windows OVERLAPPED.
- No se promovieron implementaciones inciertas fuera de `experimental/`.
- No se forzó reescritura de la historia Git para solucionar la divergencia de main.

## Regla para futuras sesiones

Antes de tocar captura, audio, FFmpeg, tracking o avatar:
1. leer esta bitácora;
2. revisar `PROJECT_STATUS.md`;
3. revisar `AUDIT_MATRIX.md`;
4. comprobar el último HEAD real;
5. modificar solo el siguiente gate que tenga evidencia insuficiente.

La bitácora debe registrar cualquier nueva prueba, bug, decisión o rechazo de enfoque antes de pasar al siguiente bloque.


## 015 — Continuación 2026-09-20: resiliencia de output
**Estado:** IMPLEMENTADO / PARCIALMENTE VERIFICADO

Se incorporaron cuatro piezas:
- `OutputFailureCategory` para clasificar fallos del output;
- `OutputRetryPolicy` con backoff 1 s → 30 s y hasta 5 intentos;
- reintento restringido a perfiles RTMP y errores clasificados como network;
- métricas/UI para retry pendiente, intentos y categoría.

También se añadió un límite de 8 eventos A/V por polling para impedir ráfagas largas de recuperación.

**Verificado localmente:**
- smoke de retry: PASS;
- smoke de diagnóstico: PASS.

**PENDIENTE:**
- prueba contra endpoint RTMP real;
- verificar semántica de agotamiento de intentos durante fallos consecutivos;
- verificar que reconectar no pierda el estado que corresponda del broadcaster.

**NO REPETIR:** la base de política/backoff ya existe; las siguientes sesiones deben probarla o corregirla con evidencia, no crear otra política paralela.

## 016 — CI de rama de desarrollo
**Estado:** IMPLEMENTADO / PENDIENTE INFRA

Los workflows `CI`, `Native Windows Build` y `Character Runtime Tests` ahora disparan en `fix/native-windows-foundation` y aceptan `workflow_dispatch`.

Los runs del 20-09-2026 siguen terminando antes de registrar steps (`steps=null`). No se marca CI como verde.

**NO REPETIR:** no volver a diagnosticar esto como “fallo del build” mientras GitHub no entregue steps/logs.

## 017 — Estado de avance consolidado
**Estado:** ACTUALIZADO

El repositorio mantiene **60%** como estimación global de ingeniería en `PROJECT_STATUS.md` y `AUDIT_MATRIX.md`.

La cifra subió por completar resiliencia/diagnóstico y la infraestructura de bitácora/CI, no porque se haya validado hardware real.

### Próxima frontera obligatoria

Prioridad 1: transporte con timestamps explícitos.  
Prioridad 2: compositor GPU D3D11 que una captura + avatar + overlays en el frame final.  
Prioridad 3: cámara Media Foundation real.  
Prioridad 4: lip-sync local.  
Prioridad 5: RTMP/hardware sostenidos y multistream.

Hasta que esas fronteras tengan evidencia, no mover el runtime fuera de `experimental/`.


## 018 — Sincronización canónica de continuidad — 2026-09-20
**Estado:** IMPLEMENTADO / ACTUALIZADO

**HEAD canónico:** `47d94620836bae7b640e488ca8ea5cc78e873ecf`  
**PR:** #2 — `fix: harden native Windows foundation`  
**Avance global vigente:** **60%**

Esta entrada corrige el puntero de continuidad. La bitácora canónica había quedado varios commits atrás; desde ahora este HEAD es el punto de partida para las siguientes iteraciones.

### Trabajo reciente registrado y no repetir
- consolidación del sistema de resiliencia de output;
- `OutputFailureCategory` + `OutputRetryPolicy` ya implementados;
- retry RTMP restringido a errores de red, con backoff y límite de intentos;
- métricas de retry y categoría visibles en el control plane;
- serialización del estado `output` corregida;
- clasificación de errores de red afinada;
- presupuesto de 8 eventos A/V por polling;
- backpressure de inicio hasta conectar ambos pipes;
- bloqueo de cambios de captura/audio durante output;
- workflows de CI preparados para rama de desarrollo y dispatch manual;
- bitácora canónica, matriz de auditoría y estado del proyecto sincronizados.

### Evidencia ya disponible
- smoke C++20 estricto de MediaClock/RealtimePacer/MediaInterleaver: PASS;
- smoke de retry/backoff: PASS;
- smoke de clasificación de errores: PASS;
- prueba FFmpeg sintética BGRA + PCM float32 -> H.264/AAC -> Matroska: PASS;
- CI sigue sin producir steps/logs útiles en los runs recientes; no se marca verde.

### Límites que siguen abiertos
1. PTS explícitos a través del transporte multimedia o equivalente temporal.
2. FFmpeg + named pipes sostenidos en Windows.
3. Grabación prolongada real.
4. RTMP real y reconexión contra servidor real.
5. Compositor GPU D3D11 con captura + avatar + overlays en el frame final.
6. Cámara Media Foundation y Game Capture.
7. Drift correction / resampling con relojes físicos.
8. Lip-sync y avatar final.
9. Multistream.
10. Instalador, redistribución de FFmpeg/codec y diagnóstico de usuario.
11. Validación completa en hardware objetivo.

### NO REPETIR
No volver a:
- diseñar otra arquitectura Electron/native;
- reemplazar WGC por OpenCV como captura principal sin evidencia nueva;
- crear un segundo retry/backoff;
- declarar timestamps preservados por raw pipes;
- declarar la prueba FFmpeg Linux como prueba Windows;
- declarar CI verde por un job con `failure + steps=null`;
- crear un segundo compositor software como sustituto del compositor GPU.

### Próxima prioridad
**P0:** construir y validar la prueba Windows real de `named pipes -> FFmpeg -> archivo`.  
**P1:** avanzar al compositor GPU D3D11 que entregue el frame final al encoder.  
**P2:** cámara Media Foundation + tracking real.  
**P3:** RTMP/reconnect real y audio drift correction.  
**P4:** empaquetado/release.

La regla de continuidad se mantiene: cualquier tarea que ya esté en IMPLEMENTADO/VERIFICADO se corrige sobre el componente existente; solo se reabre con evidencia nueva.

## 021 — Estado canónico actual — 2026-09-20
**Estado:** ACTUALIZADO / FUENTE DE CONTINUIDAD

**HEAD canónico:** `f834649b1a074acedccb9c3037b239482aa085c1`  
**Rama:** `fix/native-windows-foundation`  
**PR:** #2  
**Avance global:** **60%**

### Lo que ya está hecho
- Arquitectura Electron + Native Windows C++ + Core estabilizada.
- Windows Graphics Capture para ventana y pantalla primaria.
- D3D11 foundation y recuperación de device removed/reset/hung.
- WASAPI micrófono + loopback del sistema.
- AudioTimelineMixer + VoiceEffectProcessor local.
- MediaClock + RealtimePacer + interleave global A/V.
- Colas acotadas + backpressure + presupuesto máximo de 8 eventos por polling.
- FFmpeg supervisor + named pipes separados de vídeo/audio.
- Cierre por EOF/flush con fallback de terminación.
- Diagnóstico con stderr limitado a 256 KiB.
- OutputFailureCategory + OutputRetryPolicy.
- Retry solo para RTMP y errores de red, máximo 5 intentos y backoff acotado.
- Smoke Windows `named-pipe -> FFmpeg -> archivo` implementado y conectado al workflow.
- Workflow Windows instala FFmpeg y registra los smoke tests.
- MediaPipe Face Landmarker + guard de timestamp monotónico + bridge a avatar.
- Three.js + glTF/GLB + avatar placeholder.
- OBS WebSocket v5 permanece opcional.
- Bitácora canónica y matrices de auditoría persistentes.

### Evidencia vigente
- MediaClock/RealtimePacer/MediaInterleaver: VERIFICADO mediante smoke C++20 estricto.
- Retry/backoff: VERIFICADO mediante smoke.
- Failure classification: VERIFICADO mediante smoke.
- FFmpeg sintético BGRA + PCM float32 -> H.264/AAC -> Matroska: VERIFICADO en Linux.
- Named-pipe E2E Windows: IMPLEMENTADO, pero BLOQUEADO como evidencia porque los jobs recientes de Actions fallan antes de ejecutar steps.
- CI: BLOQUEADO por infraestructura/runner; no usar ese estado como prueba de éxito ni atribuirlo al código.

### Qué NO se debe volver a hacer
1. No crear otro retry/backoff.
2. No crear otro clasificador de errores.
3. No crear otro interleaver A/V.
4. No reemplazar WGC por OpenCV como captura principal sin evidencia nueva.
5. No rediseñar Electron/native desde cero.
6. No declarar raw pipes timestamp-preserving.
7. No declarar la prueba Linux de FFmpeg como validación Windows.
8. No declarar el named-pipe E2E verificado hasta obtener steps/logs reales.
9. No usar `capturePage()` como compositor de vídeo principal.
10. No distribuir Live2D propietario sin resolver licencia/runtime.
11. No usar IA/cloud como dependencia del streaming.
12. No duplicar la bitácora: este archivo es el ledger canónico.

### Pendientes P0
- Obtener ejecución Windows con steps/logs reales.
- Validar `cari-ffmpeg-named-pipe-e2e-smoke`.
- Medir grabación sostenida y sincronización A/V.
- Resolver timestamps explícitos extremo a extremo o una frontera temporal equivalente.
- Implementar compositor GPU D3D11: captura + avatar + overlays -> frame final.
- Validar cámara Media Foundation y Game Capture.
- Implementar drift correction y lip-sync local.
- Probar RTMP real y reconexión.
- Completar empaquetado, instalador y política de redistribución de FFmpeg/codecs.
- Validar en el hardware objetivo.

### Regla de la siguiente iteración
La siguiente sesión debe comenzar leyendo:
`BITACORA.md` -> `PROJECT_STATUS.md` -> `AUDIT_MATRIX.md`
y luego trabajar solo sobre el primer gate P0/P1 que siga sin evidencia.

El porcentaje no aumenta por agregar scaffolding o duplicar componentes; aumenta solo cuando un gate nuevo tiene implementación y evidencia proporcional.


## 022 — Punto de continuidad actual — 2026-09-20
**Estado:** CANÓNICO / NO REPETIR

**HEAD revisado:** `b38373dd1e2530f35aee2c15041bd239da8df3a8`  
**Avance global:** **60%**

### Comprobado en el repositorio
- `BITACORA.md` es la única fuente canónica de continuidad.
- `PROJECT_STATUS.md` y `AUDIT_MATRIX.md` remiten a ella.
- Existe un único pipeline nativo Windows basado en WGC/D3D11 + WASAPI + FFmpeg.
- Existe un único sistema de timing basado en MediaClock + RealtimePacer + MediaInterleaver.
- Existe un único sistema de resiliencia de output basado en OutputFailureCategory + OutputRetryPolicy.
- Existe el E2E Windows `named-pipe -> FFmpeg -> archivo`, instalado/registrado en el workflow.
- El avatar/tracking ya tiene contrato, MediaPipe y renderer Three.js/glTF; falta el compositor nativo final.

### Estado CI más reciente
Para el HEAD revisado se generaron ejecuciones de:
- Native Windows Build;
- Character Runtime Tests;
- CI.

Las ejecuciones anteriores siguen terminando sin steps/logs útiles. Las nuevas ejecuciones quedan como evidencia pendiente hasta que completen o produzcan logs.

### NO REPETIR
- No crear otro sistema de retry.
- No crear otro sistema de timestamps/pacing.
- No crear otro transporte raw paralelo.
- No volver a diseñar la captura principal.
- No sustituir el compositor pendiente por `capturePage()`.
- No declarar producción por compilación sintética.
- No declarar CI verde sin steps/logs.
- No subir el porcentaje mientras los siguientes gates no tengan evidencia nueva.

### Siguiente trabajo
**P0:** CI Windows + E2E named-pipe.  
**P1:** compositor GPU D3D11 + avatar/overlays.  
**P2:** timestamps explícitos/transporte temporal.  
**P3:** cámara Media Foundation + drift correction + lip-sync.  
**P4:** RTMP/reconnect real + hardware.  
**P5:** packaging/release.

### Regla anti-repetición
Toda nueva tarea debe citar aquí el componente que reutiliza y el gate que pretende cerrar. Si no existe un gate nuevo o evidencia nueva, no se implementa otra versión del mismo componente.


## 023 — Regla de HEAD dinámico — 2026-09-20
**Estado:** CANÓNICO

La bitácora ya no intenta almacenar el HEAD vivo del branch, porque cualquier actualización de documentación crea un nuevo commit y vuelve obsoleto el puntero.

### Regla
- El branch `fix/native-windows-foundation` es la fuente del HEAD operativo.
- Los SHA dentro de esta bitácora representan checkpoints históricos, no el HEAD actual.
- Antes de tocar código se debe leer el branch actual y luego revisar esta bitácora.
- Después de tocar código se actualiza el historial de esta bitácora solo cuando existe una decisión, prueba, bug o cambio de gate relevante.
- No crear commits solo para refrescar un SHA sin información nueva.

### Estado de trabajo
**Avance global:** 60%.

### NO REPETIR
Todo lo listado como IMPLEMENTADO/VERIFICADO en las entradas anteriores permanece vigente y debe corregirse in-place ante bugs. No se crean segundas implementaciones para timing, retry, clasificación de output, captura principal, compositor de referencia ni seguridad Electron.

### Siguiente gate
P0 continúa siendo obtener ejecución real de Windows CI con steps/logs y validar `cari-ffmpeg-named-pipe-e2e-smoke`. Después:
P1 compositor GPU D3D11;
P2 transporte temporal explícito;
P3 cámara/Audio drift/lip-sync;
P4 RTMP real + hardware;
P5 packaging/release.


## 024 — Checkpoint de continuidad — 2026-09-20 10:00 ART
**Estado:** CANÓNICO / NO REPETIR

**HEAD observado del branch:** `4bdbca78be521e09b13917f1aa36c59f0ed7c763`  
**PR:** #2 — `fix: harden native Windows foundation`  
**Avance global:** **60%**

### Trabajo ya registrado y reutilizable
- Núcleo Windows: Windows Graphics Capture + D3D11 para ventana/pantalla.
- Audio: WASAPI micrófono + loopback + AudioTimelineMixer.
- Voz: VoiceEffectProcessor local; `anime-bright` no se considera motor pitch/formant.
- Timing: MediaClock + RealtimePacer + MediaInterleaver global.
- Backpressure: el audio no se drena antes de conectar los dos pipes.
- Presupuesto: máximo 8 eventos A/V por polling.
- Output: FFmpeg supervisado, EOF/flush antes de terminación forzada.
- Diagnóstico: stderr acotado a 256 KiB + estado/código de salida.
- Resiliencia: OutputFailureCategory + OutputRetryPolicy, RTMP/network solamente, máximo 5 intentos.
- Captura/UX: invariantes que bloquean cambios de captura/audio mientras output está activo.
- Avatar: MediaPipe Face Landmarker + bridge de actuación + Three.js/glTF.
- OBS: integración opcional vía obs-websocket.
- CI: workflows de desarrollo y `workflow_dispatch`.
- E2E Windows: `ffmpeg_named_pipe_e2e_smoke.cpp` registrado en CMake/workflow.

### Verificación disponible
- Smoke C++20 portable de timing/interleave: PASS.
- Smoke de retry/backoff: PASS.
- Smoke de clasificación de errores: PASS.
- FFmpeg sintético BGRA + PCM float32 -> H.264/AAC -> Matroska: PASS en Linux.
- El smoke E2E Windows de named pipes está implementado, pero no puede marcarse VERIFICADO todavía.

### CI actual
Los runs asociados al HEAD observado terminan con `failure` y los jobs no exponen `steps` ni `logs_url`. Esto impide distinguir una ejecución de build/test real desde la evidencia entregada por el conector. Por esta razón:
- CI = **PENDIENTE/BLOQUEADA como evidencia**;
- no atribuir el fallo a una línea de código;
- no declarar el build Windows como correcto hasta obtener steps/logs reales.

### NO REPETIR
- No crear otro retry/backoff.
- No crear otro clasificador de fallos.
- No crear otro interleaver/pacer.
- No diseñar otra arquitectura de captura Windows.
- No reemplazar WGC por OpenCV para captura principal sin evidencia nueva.
- No usar `capturePage()` como compositor de vídeo.
- No declarar raw pipes timestamp-preserving.
- No declarar FFmpeg Linux como validación Windows.
- No duplicar la bitácora.
- No incrementar el porcentaje por scaffolding: solo por gates cerrados con evidencia proporcional.

### Próximos gates
**P0:** obtener una ejecución Windows CI con steps/logs y ejecutar `cari-ffmpeg-named-pipe-e2e-smoke`.  
**P1:** compositor GPU D3D11: captura + avatar + overlays -> frame final.  
**P2:** estrategia de timestamps explícitos/extremo a extremo.  
**P3:** cámara Media Foundation + drift correction + lip-sync.  
**P4:** RTMP real/reconnect + validación en hardware.  
**P5:** packaging/installer + política de redistribución FFmpeg/codecs.

### Regla de la siguiente iteración
Comenzar desde este ledger y tocar solamente el primer gate sin evidencia. Las soluciones ya implementadas deben modificarse **in-place** ante bugs; no crear implementaciones paralelas.


## 025 — P0 E2E Windows preparado + límite de retry corregido — 2026-09-20
**Estado:** IMPLEMENTADO / VERIFICACIÓN WINDOWS PENDIENTE

### Trabajo realizado
- Se creó `experimental/studio/native-windows/ffmpeg_named_pipe_e2e_smoke.cpp`.
- El smoke usa `FfmpegAvOutput` real: crea dos named pipes, inicia FFmpeg, espera conexión de ambos canales, escribe video BGRA y audio PCM float32, espera completar todos los writes y cierra por EOF/flush.
- El resultado Matroska se valida con un segundo proceso FFmpeg que lee y mapea video+audio.
- El smoke no usa `assert`, por lo que las comprobaciones siguen activas en Release.
- El target quedó registrado en CMake/CTest.
- El workflow Windows instala FFmpeg solo para CI y ejecuta el E2E, además de retry/diagnostics smoke.

### Corrección adicional
- Se detectó que reiniciar el contador de retry al arrancar FFmpeg podía hacer ilimitados los fallos que arrancaban y caían inmediatamente.
- Ahora el retry automático conserva el contador durante el episodio de fallo.
- Una orden manual `output_start` reinicia el historial.
- Una sesión estable de 30 s reinicia el historial.
- Se mantienen máximo 5 intentos y backoff máximo de 30 s.

### Evidencia
- Retry policy smoke: VERIFICADO.
- Failure classification smoke: VERIFICADO.
- MediaClock/RealtimePacer/Interleaver smoke: VERIFICADO.
- FFmpeg sintético Linux: VERIFICADO.
- Named-pipe E2E Windows: IMPLEMENTADO; falta un runner que ejecute realmente los steps/logs.

### CI
- Los workflows ya están configurados para push en `fix/native-windows-foundation` y `workflow_dispatch`.
- Los runs recientes siguen terminando sin `steps`/`logs_url`, por lo que CI continúa como evidencia PENDIENTE/BLOQUEADA.

### NO REPETIR
- No crear otro `ffmpeg_named_pipe_e2e_smoke` equivalente.
- No crear otro retry/backoff.
- No usar FFmpeg Linux como sustituto del E2E Windows.
- No marcar P0 como VERIFICADO hasta disponer de steps/logs reales del runner Windows.
- No elevar el porcentaje solo por scaffolding: el 60% se mantiene hasta cerrar un gate con evidencia proporcional.

### Siguiente gate
Tras P0: **P1 compositor GPU D3D11 + captura/avatar/overlays → frame final**.
## 026 — Evidencia P0 consolidada — 2026-09-20 10:09 ART
**Estado:** CANÓNICO / P0 IMPLEMENTADO, VERIFICACIÓN WINDOWS BLOQUEADA

### Evidencia nueva
- `ffmpeg_named_pipe_e2e_smoke.cpp` existe en el branch y está registrado como target CMake/CTest.
- El smoke usa `FfmpegAvOutput`, dos named pipes independientes, FFmpeg real, 30 frames BGRA, 50 paquetes PCM float32, espera de writes completados, cierre por EOF y validación posterior del archivo con un segundo FFmpeg.
- El smoke utiliza checks explícitos y por tanto mantiene sus verificaciones en Release.
- El workflow Windows instala FFmpeg para el entorno de CI solamente; la redistribución al usuario sigue siendo P5.
- Retry/diagnostics smoke también están incluidos en el workflow Windows.

### Verificación local disponible
- `OutputRetryPolicy` compila y pasa smoke portable con C++20, `-Wall -Wextra -Werror`.
- `OutputFailureCategory` compila y pasa smoke portable con C++20, `-Wall -Wextra -Werror`.

### CI actual
Los runs más recientes sobre el HEAD operativo terminan con:
- Native Windows Build: failure, jobs sin `steps` ni `logs_url`.
- CI: failure/cancelled, jobs sin `steps` ni `logs_url`.
- Character Runtime Tests: failure/cancelled, jobs sin `steps` ni `logs_url`.

Esto ocurre antes de una ejecución observable del build/test. No se atribuye a `ffmpeg_named_pipe_e2e_smoke` ni a otro archivo del proyecto.

### NO REPETIR
- No crear otra prueba E2E equivalente.
- No volver a intentar el mismo diagnóstico de runner sin nueva evidencia.
- No sustituir el E2E Windows por una prueba Linux.
- No subir el porcentaje por tener el E2E implementado; P0 exige ejecución real.
- No crear otra bitácora; `BITACORA.md` es la única canónica.

### Próximo paso oficial
**P0:** obtener un runner Windows que ejecute steps/logs reales y ejecutar `cari-ffmpeg-named-pipe-e2e-smoke`.
Después de P0:
**P1:** compositor GPU D3D11 + captura/avatar/overlays -> frame final.


## 027 — Limpieza P0/CI y continuidad — 2026-09-20
**Estado:** CANÓNICO / NO REPETIR

### Cambios realizados
- Se confirmó que experimental/studio/BITACORA.md ya existía; desde este punto no se crea otra bitácora.
- El workflow native-windows.yml se simplificó: FFmpeg se instala una sola vez con Chocolatey.
- Se eliminó la ejecución duplicada de cari-ffmpeg-named-pipe-e2e-smoke.
- El job nativo Windows se fija a windows-2022 para reducir la variabilidad del alias windows-latest y mantener una imagen oficialmente soportada.
- Se mantienen push sobre fix/native-windows-foundation y workflow_dispatch.

### Evidencia
- GitHub documenta windows-2022 como runner estándar soportado para repositorios privados y públicos. citeturn216621search0turn216621search1
- El E2E ffmpeg_named_pipe_e2e_smoke.cpp sigue IMPLEMENTADO pero no VERIFICADO: los runs anteriores terminan antes de registrar steps/logs.

### NO REPETIR
- No instalar FFmpeg dos veces en el workflow.
- No ejecutar el mismo CTest E2E dos veces en el mismo job.
- No crear otra bitácora.
- No declarar P0 cerrado hasta que el runner ejecute realmente el E2E y produzca evidencia.

### Próximo gate
P0: ejecución observable del runner Windows y PASS del named-pipe E2E. Si P0 continúa bloqueado por infraestructura, seguir con P1 sin duplicar el trabajo de P0.

### Avance global
**60%**. La limpieza de CI/continuidad no se contabiliza como cierre de un gate funcional.


## 028 — P1: compositor D3D11 experimental — 2026-09-20
**Estado:** IMPLEMENTADO / VERIFICACIÓN WINDOWS PENDIENTE

### Trabajo realizado
- Se añadió `d3d11_compositor.h/.cpp` como backend GPU reutilizable.
- El compositor recibe la textura D3D11 de captura directamente y produce otra textura GPU BGRA8.
- La composición de overlays usa vertex/pixel shaders HLSL, input layout persistente, sampler linear y alpha blending.
- Se añadió `avatar_gpu_overlay.h/.cpp` con un avatar-placeholder procedural RGBA; no contiene assets propietarios.
- El callback nativo ejerce el compositor sobre muestras de captura y registra métricas.
- Se añadió `d3d11_compositor_smoke.cpp` usando `D3D_DRIVER_TYPE_WARP` para validar el pipeline sin depender de una GPU física.
- CMake/CTest y el workflow Windows incluyen este smoke.

### Límite explícito
- Esta ruta GPU todavía es experimental y paralela al camino CPU/FrameBridge que alimenta el encoder actual.
- Por tanto P1 no está cerrado: falta sustituir el readback/camino CPU del encoder por la textura GPU final y conectar avatar real/overlays reales.
- El avatar procedural solo demuestra la frontera de composición; no representa el modelo final de Three.js/VRM.

### Evidencia
- Implementación integrada en la rama.
- Smoke D3D11/WARP integrado, pero pendiente de ejecución observable en Windows CI.
- No se eleva el estado a VERIFICADO hasta obtener steps/logs y PASS del runner.

### NO REPETIR
- No crear otro compositor D3D11 paralelo.
- No crear un segundo shader pipeline para el mismo contrato.
- No sustituir este backend por `capturePage()` como compositor de vídeo.
- No declarar que Three.js ya está dentro del frame nativo solo porque existe el placeholder GPU.
- No conectar el encoder a un readback CPU y llamarlo compositor GPU de producción.

### Siguiente trabajo
P0: ejecutar el E2E named-pipe cuando el runner Windows produzca steps/logs reales.
P1: conectar la textura GPU final al encoder y definir la frontera de avatar real/overlay sin readback por frame.
P2: diseñar timestamps explícitos extremo a extremo sobre el transporte local.

### Avance global
**60%**. Se mantiene la cifra porque P0 sigue sin evidencia Windows y P1 todavía no es el camino de encoding final.

## 029 — P1 compositor GPU conectado al frame final + CI E2E preparada — 2026-09-20
**Estado:** IMPLEMENTADO / VERIFICACIÓN WINDOWS PENDIENTE

### Trabajo realizado
- `D3D11Compositor` ya compone la captura D3D11 con overlays RGBA usando shaders y alpha blending.
- `PlaceholderAvatarGpuSource` aporta un avatar procedural sin assets propietarios.
- Se añadió `copy_output_to_cpu()` para convertir la textura GPU final a BGRA CPU cuando la frontera FFmpeg actual lo requiere.
- El callback de captura ahora intenta usar el frame compuesto GPU como frame enviado a `MediaGraphController`.
- Si el compositor GPU no está disponible, permanece el fallback CPU de captura.
- CMake incluye `avatar_gpu_overlay.cpp` en el ejecutable nativo y registra el smoke WARP.
- El workflow Windows instala FFmpeg temporalmente y ejecuta el E2E named-pipe, compositor y nuevos smokes de retry/diagnóstico.
- Se corrigieron invocaciones duplicadas de smoke en el workflow.

### Límites
- El readback GPU→CPU ocurre por frame para alimentar el raw pipe actual; esto todavía no es la ruta de producción de máximo rendimiento.
- El overlay actual es procedural; aún no representa el modelo real Three.js/VRM/Live2D.
- La señal del renderer todavía no entrega una textura/avatar real al compositor nativo.

### Evidencia
- Smoke de retry/diagnóstico portable: PASS con C++20, `-Wall -Wextra -Werror`.
- Smoke de timing/interleave portable: PASS.
- FFmpeg sintético BGRA + PCM float32 → H.264/AAC → Matroska: PASS en Linux.
- P0 named-pipe Windows: IMPLEMENTADO y registrado; VERIFICACIÓN REAL PENDIENTE porque los runners recientes siguen sin producir steps/logs.
- P1 D3D11/WARP: IMPLEMENTADO y registrado; VERIFICACIÓN REAL PENDIENTE.

### NO REPETIR
- No crear otro compositor D3D11 paralelo.
- No crear otro named-pipe E2E equivalente.
- No crear otro retry/backoff.
- No usar `capturePage()` como compositor de vídeo.
- No declarar P1 producción mientras exista readback por frame y avatar procedural.

### Próximos gates
- P0: obtener ejecución Windows observable y PASS del `cari-ffmpeg-named-pipe-e2e-smoke`.
- P1: eliminar readback CPU por frame y conectar avatar/overlays reales.
- P2: resolver transporte/timestamps explícitos extremo a extremo.
- P3: cámara Media Foundation + drift correction + lip-sync.
- P4: RTMP real + reconexión + hardware.
- P5: packaging/installer/redistribución.

### Avance
**62%**. El incremento corresponde a que el frame GPU compuesto ya entra en la ruta de output; no equivale a validación de producción.
## 030 — Consolidación P0/P1 y limpieza de CI — 2026-09-20
**Estado:** IMPLEMENTADO / VERIFICACIÓN WINDOWS PENDIENTE

### Trabajo realizado
- Se confirmó que `BITACORA.md` ya es la única bitácora canónica; no se creó una segunda bitácora.
- El P0 `ffmpeg_named_pipe_e2e_smoke.cpp` ya existe y está registrado en CMake/CTest.
- El workflow Windows instala FFmpeg temporalmente y ejecuta el E2E de named pipes.
- Se eliminó la duplicación de invocaciones del media scheduler en el workflow.
- El P1 D3D11 compositor ya no es solo diagnóstico: su frame compuesto puede pasar a la salida mediante readback BGRA CPU.
- `avatar_gpu_overlay.cpp` ya forma parte del ejecutable nativo.
- Los smokes de retry y diagnostics continúan como tests únicos del workflow.

### Estado de evidencia
- Timing/interleave portable: VERIFICADO.
- Retry/diagnostics portable: VERIFICADO.
- FFmpeg BGRA+PCM sintético en Linux: VERIFICADO.
- D3D11 compositor WARP: IMPLEMENTADO/registrado; falta ejecución Windows observable.
- Named-pipe FFmpeg E2E: IMPLEMENTADO/registrado; falta ejecución Windows observable.
- CI: el runner todavía produce fallos sin steps/logs útiles en ejecuciones recientes; no se marca verde.

### NO REPETIR
- No crear otra bitácora.
- No crear otro named-pipe E2E.
- No crear otro compositor D3D11.
- No crear otro retry/backoff o clasificador de output.
- No usar FFmpeg Linux como sustituto del E2E Windows.
- No llamar producción al compositor mientras exista readback CPU por frame.

### Próxima cola
- P0: obtener evidencia Windows real del E2E y build completo.
- P1: eliminar readback CPU por frame y conectar textura/avatar real.
- P2: resolver timestamps explícitos extremo a extremo.
- P3: cámara Media Foundation + drift correction + lip-sync.
- P4: RTMP/reconnect/hardware.
- P5: packaging/installer/redistribución.

### Avance
**62%**. El porcentaje no se incrementa por scaffolding ni por repetir componentes; subirá cuando un nuevo gate cruce una evidencia proporcional.

## 031 — Continuación autónoma: P0 E2E + resiliencia de output — 2026-09-20
**Estado:** IMPLEMENTADO / VERIFICACIÓN WINDOWS PENDIENTE

### Trabajo realizado
- Se confirmó que `ffmpeg_named_pipe_e2e_smoke.cpp` ya es el único smoke E2E canónico para P0.
- El smoke crea un output real mediante `FfmpegAvOutput`, espera la conexión de ambos named pipes, transmite BGRA y PCM float32, espera la finalización de las escrituras, cierra por EOF/flush y vuelve a abrir/decodificar el archivo mediante FFmpeg.
- Se confirmó que FFmpeg se instala temporalmente en el workflow Windows mediante Chocolatey; no forma parte todavía del paquete distribuible del producto.
- Se añadió/ajustó `OutputRetryPolicy` con backoff 1 s → 30 s y máximo 5 intentos.
- Se mantiene una regla estricta: solo errores clasificados como `network` pueden disparar retry de RTMP; encoder/mux/input/permission no se reintentan ciegamente.
- Se añadió `OutputFailureCategory` para diagnóstico inicial.
- Se corrigió la serialización del campo `output` en el status del proceso.
- Se añadió el presupuesto de 8 eventos A/V por polling y la métrica `pacing_budget_exhausted`.
- Se preservó la única bitácora canónica: `experimental/studio/BITACORA.md`.
- Se eliminó una duplicación real de invocaciones de los smokes de retry/diagnóstico en `.github/workflows/native-windows.yml`.

### Evidencia
- El workflow Windows ya incluye instalación de FFmpeg y el smoke P0.
- Los runs recientes siguen terminando sin steps/logs útiles; por eso P0 continúa como IMPLEMENTADO y no VERIFICADO.
- Los smokes portables de timing, interleave, retry y diagnostics ya cuentan con evidencia previa PASS.
- La prueba sintética FFmpeg en Linux sigue siendo evidencia de contrato, no de named pipes Windows.

### NO REPETIR
- No crear otro smoke E2E de FFmpeg named pipes.
- No crear otro clasificador de output.
- No crear otro retry/backoff.
- No crear otra bitácora.
- No volver a usar FFmpeg Linux como sustituto del E2E Windows.
- No llamar P0 cerrado hasta observar steps/logs y PASS del runner Windows.

### Próxima cola
1. P0: obtener ejecución Windows observable y PASS del E2E.
2. P1: eliminar readback GPU→CPU por frame y entregar una frontera de textura GPU final al encoder.
3. P2: introducir PTS explícitos en el transporte local.
4. P3: cámara Media Foundation + drift correction + lip-sync.
5. P4: RTMP/reconnect/hardware real.
6. P5: packaging/installer/redistribución.

### Avance
**62%**. No se incrementa por scaffolding o duplicación de pruebas; el siguiente aumento requiere cerrar un gate de validación real.


## 032 — Estado final de esta iteración y evidencia de CI — 2026-09-20
**Estado:** DOCUMENTADO / P0 PENDIENTE POR INFRAESTRUCTURA

### Evidencia nueva
- HEAD actual de la rama: `2a657bc179ef8cd54ba9a8923bf2fcbae8f6a79d`.
- El workflow `native-windows.yml` queda configurado para `windows-2022`, instala FFmpeg temporalmente con Chocolatey, compila y registra el smoke E2E named-pipe.
- Las ejecuciones más recientes del mismo HEAD terminan como `failure` y todos sus jobs muestran `steps=null` y `logs_url=null`.
- Por esa evidencia no es posible afirmar si el build nativo, el named-pipe E2E o los tests posteriores llegaron a ejecutarse.

### NO REPETIR
- No seguir modificando el smoke P0 sin evidencia nueva del runner.
- No crear otro workflow paralelo para reemplazar `native-windows.yml`.
- No llamar P0 “verificado” mientras no exista un job con steps/logs y PASS del E2E.

### Decisión de continuidad
Con P0 bloqueado externamente, el siguiente trabajo técnico debe continuar en P1/P2, usando esta bitácora para no duplicar captura, compositor, retry, diagnostics ni E2E.

### Avance
**62%**. La cifra no sube por cambios de infraestructura no verificables.


## 033 — Continuación autónoma: continuidad + lip-sync local — 2026-09-20
**Estado:** IMPLEMENTADO / VERIFICACIÓN WINDOWS PENDIENTE

### Trabajo realizado
- Se auditó el estado real del repositorio antes de modificar componentes, respetando el ledger existente.
- Se confirmó que P0/P1 y sus implementaciones canónicas ya existen: `ffmpeg_named_pipe_e2e_smoke.cpp`, compositor D3D11 experimental, retry/backoff, classifier de output, MediaClock, interleaver y bridge MediaPipe→avatar.
- Se corrigió un bug de compilación del audio: `AudioCoreBridge.cpp` utilizaba `microphone_effect_` sin declararlo en `audio_core_bridge.h`. El miembro ahora pertenece al componente existente.
- Se añadió medición del nivel instantáneo del bloque de audio mezclado sin cambiar el contrato del mixer.
- Se añadió `audio-lipsync.js`, que transforma amplitud local en `mouthOpen` con floor/gain y ataque/liberación suavizados.
- El renderer actualiza el lip-sync cada 250 ms solo cuando MediaPipe no está conduciendo la boca; cuando MediaPipe está activo se conserva el `jawOpen` facial.
- Se añadieron tests del contrato de lip-sync al test existente de sesión/avatar.
- No se creó ningún segundo bridge de avatar ni un segundo sistema de audio.

### Evidencia
- La cobertura portable existente de MediaClock/RealtimePacer/Interleaver, retry y diagnostics permanece PASS.
- La integración de lip-sync queda con test JavaScript dentro del archivo de contratos existente.
- CI Windows continúa sin producir evidencia de steps/logs útiles; por eso no se marca la integración Windows como VERIFICADA.

### NO REPETIR — lista canónica solicitada
- No crear otro named-pipe E2E.
- No crear otro compositor D3D11.
- No crear otro retry/backoff.
- No crear otro clasificador de output.
- No crear otra bitácora.
- No crear otra arquitectura de captura.
- No crear otro MediaClock.
- No crear otro interleaver A/V.
- No crear otro bridge MediaPipe→avatar.
- No reemplazar WGC por OpenCV como captura principal sin evidencia nueva.
- No usar FFmpeg Linux como sustituto de la validación Windows.
- No promover `experimental/` a producción sin gates.
- No inflar el porcentaje por scaffolding o documentación.

### Siguiente cola
1. P0: ejecución observable del E2E Windows y build completo.
2. P1: eliminar readback GPU→CPU por frame y definir frontera de textura/encoder compatible con el hardware objetivo.
3. P2: resolver transporte de timestamps explícitos extremo a extremo sin romper backpressure.
4. P3: cámara Media Foundation real, drift correction y unión de lip-sync/tracking para el avatar final.
5. P4: RTMP real, pérdida de red, agotamiento de retry y validación de hardware.
6. P5: multistream, installer y redistribución legal de FFmpeg/codecs.

### HEAD de esta entrada
`c15e1189dd91c6bda55e1c025744585b01685705`

### Regla de continuidad
Las tareas anteriores se consideran cerradas como **arquitectura**. Las próximas sesiones deben modificar los componentes existentes in-place cuando aparezca evidencia nueva, no comenzar implementaciones paralelas.


## 034 — Snapshot de continuidad — 2026-09-20
**Estado:** CANÓNICO / PUNTO DE PARTIDA

- HEAD real de la rama al cierre de esta sesión: `4df7445f6d5384df64b8215c4f64c6c529d9f68c`
- PR #2: `fix: harden native Windows foundation`
- Avance global vigente en `PROJECT_STATUS.md` y `AUDIT_MATRIX.md`: **62%**
- La única bitácora canónica sigue siendo `experimental/studio/BITACORA.md`.

### NO REPETIR
- otro named-pipe E2E;
- otro compositor D3D11;
- otro retry/backoff;
- otro clasificador de output;
- otra bitácora;
- otra arquitectura de captura;
- otro MediaClock;
- otro interleaver A/V;
- otro bridge MediaPipe→avatar.

### Estado funcional de continuidad
- P0 Windows E2E: implementado, pero la evidencia CI sigue bloqueada por jobs sin steps/logs.
- P1 compositor D3D11: implementado experimentalmente; queda eliminar readback CPU por frame y conectar una ruta GPU de producción/encoder compatible.
- Lip-sync local por amplitud: integrado como fallback cuando MediaPipe no controla la boca.
- Bug de `AudioCoreBridge`: miembro `microphone_effect_` declarado correctamente; no reabrir salvo evidencia nueva.

### Regla
Antes de tocar un componente, buscar su entrada aquí. Si está IMPLEMENTADO/VERIFICADO, corregir in-place. Solo crear algo nuevo cuando el ledger indique PENDIENTE y exista una razón técnica/evidencia que lo justifique.

## 035 — P1 lazy readback + continuidad de retry — 2026-09-20
**Estado:** IMPLEMENTADO / VERIFICACIÓN WINDOWS PENDIENTE

### Trabajo realizado
- Se revisó la bitácora canónica antes de tocar el código y se mantuvieron los componentes existentes; no se creó una segunda arquitectura de captura, compositor, E2E, MediaClock o retry.
- El callback de CaptureEngine dejó de ejecutar FrameBridge::copy_to_cpu() obligatoriamente en cada frame. El readback de captura ahora es lazy: ocurre solo en muestras de diagnóstico o como fallback cuando la ruta GPU no produce el frame requerido por la frontera FFmpeg actual.
- El compositor D3D11 sigue siendo el único compositor GPU experimental. Su readback final GPU->CPU permanece porque el output FFmpeg vigente recibe bytes BGRA; eliminar ese último readback requiere una frontera de encoder/salida compatible con textura GPU.
- Se corrigió el ciclo de vida de OutputRetryPolicy: una nueva sesión RTMP manual puede reiniciar su contador de retry, mientras una reconexión automática conserva los intentos acumulados hasta alcanzar estabilidad.
- output_retry_smoke.cpp verifica que después de resetear una sesión se pueda programar una nueva secuencia de retry.
- Se eliminó el estado local gpu_output_ready sin uso del callback.

### Evidencia
- El smoke de retry cubre backoff y reset entre sesiones.
- El lazy readback está integrado en el único callback nativo existente.
- GitHub Actions sigue sin producir steps/logs útiles en los últimos runs; por tanto no se marca Windows como VERIFICADO.

### NO REPETIR
- No crear otro FrameBridge.
- No crear otro compositor D3D11.
- No crear otro retry/backoff.
- No crear otro named-pipe E2E.
- No crear otra bitácora.
- No volver a convertir el readback CPU de captura en parte obligatoria del camino GPU.
- No declarar P1 cerrado mientras el frame GPU final siga cruzando a CPU para el output FFmpeg actual.
- No usar FFmpeg Linux como sustituto de la validación Windows.

### Próxima cola
1. P0: obtener ejecución Windows observable y PASS del E2E ya existente.
2. P1: eliminar el readback GPU->CPU final mediante una frontera de encoder compatible con textura D3D11 o una salida equivalente.
3. P2: transporte temporal explícito y PTS extremo a extremo sin crear un segundo named-pipe E2E.
4. P3: cámara Media Foundation + drift correction + lip-sync/tracking.
5. P4: RTMP real/reconnect/hardware.
6. P5: packaging/installer/redistribución legal.

### Avance
**62%**. No sube porque el readback final y la validación Windows siguen abiertos.
## 035 — Estado canónico y optimización P1 — 2026-09-20
**Estado:** ACTUALIZADO / FUENTE DE CONTINUIDAD

**HEAD al registrar esta entrada:** 50b3219d5f56d76ad2ee2ace00fdf4aa4779a3f6
**PR:** #2 — fix: harden native Windows foundation
**Avance global:** 62%

### Lo que realmente está hecho
- P0 `ffmpeg_named_pipe_e2e_smoke.cpp`: IMPLEMENTADO y conectado a CMake/CTest/workflow; genera BGRA + PCM, ejerce los dos named pipes, espera escrituras, cierra por EOF/flush y verifica el archivo con FFmpeg.
- P0 sigue sin VERIFICACIÓN Windows porque GitHub Actions termina los jobs con steps/logs nulos.
- P1 D3D11Compositor: IMPLEMENTADO como único compositor GPU experimental; captura + overlay procedural + output texture.
- P1 lazy readback: el callback ya no hace FrameBridge CPU antes de cada composición. CPU readback queda para muestras de diagnóstico o fallback.
- El último readback GPU->CPU necesario para el output FFmpeg actual sigue pendiente de eliminar mediante una frontera de encoder/salida compatible con textura D3D11.
- OutputRetryPolicy y OutputFailureCategory ya existen; no se debe crear otro sistema.
- Una sesión RTMP manual nueva resetea el contador de retry; una reconexión automática conserva intentos hasta estabilidad.
- Lip-sync local por amplitud ya existe como fallback del tracking facial.

### Evidencia disponible
- MediaClock / RealtimePacer / MediaInterleaver: smoke C++20 estricto PASS.
- Retry/diagnostics: smoke C++20 PASS.
- FFmpeg sintético BGRA + PCM float32 -> H.264/AAC -> Matroska: PASS en Linux.
- P0/P1 Windows reales: PENDIENTES por falta de ejecución observable del runner.

### NO REPETIR — lista maestra
- ❌ otro named-pipe E2E
- ❌ otro compositor D3D11
- ❌ otro retry/backoff
- ❌ otro clasificador de output
- ❌ otra bitácora
- ❌ otra arquitectura de captura
- ❌ otro MediaClock
- ❌ otro interleaver A/V
- ❌ otro bridge MediaPipe→avatar
- ❌ reemplazar Windows Graphics Capture por OpenCV como captura principal sin evidencia nueva
- ❌ usar FFmpeg Linux como sustituto de validación Windows
- ❌ usar capturePage() como compositor de vídeo
- ❌ declarar raw-pipe timestamp-preserving
- ❌ declarar CI verde sin steps/logs reales
- ❌ promover experimental/ por simple compilación
- ❌ inflar porcentaje por scaffolding/documentación

### Próximo orden obligatorio
P0 -> ejecución Windows observable del E2E existente.
P1 -> eliminar el readback GPU->CPU final del output FFmpeg; preferir encoder/sink Windows capaz de aceptar textura D3D11.
P2 -> timestamps explícitos extremo a extremo.
P3 -> cámara Media Foundation + drift correction + tracking/lip-sync final.
P4 -> RTMP real + pérdida de red + recuperación + hardware.
P5 -> Game Capture + multistream + installer/redistribución.

### Regla de continuidad
Antes de modificar un componente: revisar BITACORA.md, PROJECT_STATUS.md y AUDIT_MATRIX.md. Si la pieza ya está IMPLEMENTADA, corregirla in-place; no crear una segunda implementación paralela.

## 036 — Continuidad canónica y corte de trabajo — 2026-09-20
**Estado:** CANÓNICO / ACTUALIZADO

**HEAD de referencia al iniciar esta revisión:** `f8f05f1d30f0f39913db5f88cd98f2bc1956e3d6`  
**PR:** #2 — `fix: harden native Windows foundation`  
**Avance global vigente:** **62%**

### Trabajo ya existente que NO se debe rehacer
- Windows Graphics Capture para ventana + pantalla primaria.
- D3D11 device/frame path y recuperación de device loss.
- WASAPI micrófono + loopback.
- AudioTimelineMixer + VoiceEffectProcessor.
- MediaClock + RealtimePacer + MediaInterleaver global.
- Bounded queues + backpressure + presupuesto máximo de eventos por polling.
- RawPipe OVERLAPPED con dos canales: BGRA8 y PCM float32 LE.
- FFmpeg supervisor + EOF/flush + stderr limitado.
- OutputFailureCategory + OutputRetryPolicy; retry únicamente RTMP/network.
- D3D11Compositor experimental + AvatarGpuOverlay.
- Lazy CPU readback de captura; el readback GPU→CPU final para FFmpeg sigue siendo una limitación conocida.
- `ffmpeg_named_pipe_e2e_smoke.cpp` ya existe y está registrado.
- Lip-sync local por amplitud ya existe como fallback.
- MediaPipe Face Landmarker + guard de timestamps monótonos + bridge de tracking.
- Three.js + glTF/GLB + placeholder avatar y contrato neutral.
- Electron security foundation y OBS WebSocket opcional.
- Workflows CI preparados para rama de desarrollo y dispatch manual.

### Evidencia disponible
**VERIFICADO**
- contratos MediaClock/RealtimePacer/MediaInterleaver;
- retry/backoff;
- clasificación de errores;
- smoke de contratos de avatar/sesión previamente existente;
- prueba FFmpeg sintética BGRA + PCM float32 → H.264/AAC → Matroska.

**IMPLEMENTADO, PERO NO VALIDADO EN WINDOWS**
- named-pipe E2E;
- compositor D3D11 en hardware real;
- captura sostenida;
- FFmpeg sostenido con named pipes;
- grabación prolongada;
- RTMP/reconnect real;
- rendimiento de tracking/render;
- device-loss real en hardware.

**BLOQUEADO POR INFRAESTRUCTURA**
- GitHub Actions recientes siguen creando jobs que terminan antes de registrar steps/logs (`steps=null`). No se usa ese fallo como evidencia contra el código ni como evidencia de éxito.

### Registro de intentos descartados
- Las pruebas con dos FIFOs Linux no se utilizan como sustituto de la validación Windows OVERLAPPED.
- No se creará un segundo named-pipe E2E.
- No se creará un segundo compositor GPU.
- No se creará un segundo retry/backoff.
- No se sustituirá Windows Graphics Capture por OpenCV para la captura principal sin evidencia nueva.
- No se usará `capturePage()` como transporte de vídeo.
- No se distribuirá Live2D runtime propietario sin resolver licencia.
- No se aumentará el porcentaje por scaffolding, documentación o líneas de código.

### Próxima cola obligatoria
**P0 — evidencia Windows**
1. Conseguir una ejecución Windows observable.
2. Ejecutar el E2E existente.
3. Decodificar/inspeccionar el archivo generado.
4. Medir pérdidas, duración y sincronización.

**P1 — GPU**
1. eliminar el readback GPU→CPU final;
2. mantener una frontera de encoder/sink que acepte textura D3D11 o equivalente;
3. medir CPU/GPU/latencia.

**P2 — tiempo**
- decidir e implementar transporte temporal explícito sin duplicar el transporte existente;
- conservar timestamps de audio/video hasta la frontera de encoder.

**P3 — fuentes reales**
- cámara Media Foundation;
- Game Capture;
- drift correction;
- lip-sync/tracking final.

**P4 — streaming**
- endpoint RTMP real;
- pérdida/reconexión;
- agotamiento de retry;
- estado visible.

**P5 — producto**
- FFmpeg/codec redistribution;
- instalador;
- logs de usuario;
- presets/assets;
- hardware gate;
- release candidate.

### Regla permanente
Antes de tocar cualquier componente:
1. revisar `BITACORA.md`;
2. revisar `PROJECT_STATUS.md`;
3. revisar `AUDIT_MATRIX.md`;
4. comprobar el HEAD real;
5. trabajar únicamente sobre el siguiente gate pendiente.

Una tarea ya marcada IMPLEMENTADA o VERIFICADA solo se reabre con evidencia nueva, regresión o requisito nuevo documentado.

## 037 — Snapshot canónico actual + criterio de uso — 2026-09-20
**Estado:** CANÓNICO / CONTINUIDAD

**HEAD al comenzar esta actualización:**  baafa97a3d7a066e3698ccadf3cbc906ddcb542d
**Avance global vigente:** **62%**

### Estado real
**IMPLEMENTADO**
- Windows Graphics Capture para ventana y pantalla primaria.
- D3D11 capture/device path y recuperación de device-loss.
- WASAPI micrófono + system loopback.
- AudioTimelineMixer + VoiceEffectProcessor.
- MediaClock + RealtimePacer + interleaver global A/V.
- RawPipe OVERLAPPED para BGRA8 + PCM float32.
- FFmpeg supervisor, EOF/flush, stderr limitado y diagnostics.
- OutputFailureCategory + retry RTMP/network con backoff y límites.
- D3D11 compositor experimental + overlay procedural.
- Lazy readback de captura; el readback final hacia el output FFmpeg sigue presente.
- Smoke E2E Windows named-pipe -> FFmpeg -> archivo ya implementado y registrado.
- MediaPipe Face Landmarker + guard de timestamp + bridge de tracking.
- Lip-sync local por amplitud como fallback.
- Three.js/glTF/GLB + avatar placeholder + contrato neutral.
- Electron security foundation y OBS WebSocket opcional.
- Workflows CI con branch trigger y dispatch manual.
- Bitácora/matriz de auditoría persistentes.

**VERIFICADO**
- MediaClock / RealtimePacer / MediaInterleaver mediante smoke C++20 estricto.
- Retry/backoff.
- Clasificación de errores.
- Contratos avatar/sesión existentes.
- FFmpeg sintético BGRA + PCM float32 -> H.264/AAC -> Matroska en Linux.

**IMPLEMENTADO PERO NO VALIDADO EN WINDOWS**
- Build nativo completo.
- E2E named pipes con FFmpeg.
- Captura sostenida.
- Audio sostenido.
- Compositor D3D11 sobre hardware real.
- Grabación prolongada.
- RTMP real/reconexión.
- Tracking/render sostenido.
- Device-loss real.
- Cámara Media Foundation.
- Game Capture.
- Drift correction.
- Hardware objetivo.

**BLOQUEADO**
- GitHub Actions: los jobs recientes terminan con failure, steps=null y logs_url=null; por tanto no hay evidencia de ejecución de compilación/test.
- El porcentaje no se incrementa por documentación ni por más scaffolding.

### Criterio de uso
**NO está listo como programa de streaming/VTuber de producción.**

Puede considerarse un **build experimental de desarrollo** porque ya existen captura, audio, compositor, avatar/tracking, output FFmpeg y UI de control. No debe usarse todavía como herramienta de streaming prolongado del día a día hasta superar los gates de Windows/hardware.

### NO REPETIR
- No crear otro named-pipe E2E.
- No crear otro compositor D3D11.
- No crear otro retry/backoff.
- No crear otro clasificador de errores.
- No crear otra arquitectura de captura.
- No crear otro MediaClock/interleaver.
- No crear otro bridge MediaPipe->avatar.
- No reemplazar WGC por OpenCV como captura principal sin evidencia nueva.
- No usar FFmpeg Linux como sustituto de validación Windows.
- No usar capturePage() como compositor de vídeo.
- No declarar CI verde sin steps/logs.
- No promover experimental/ a producción por compilación o scaffolding.

### Siguiente trabajo obligatorio
**P0:** recuperar evidencia ejecutable de Windows y pasar el E2E existente.
**P1:** eliminar el readback GPU->CPU final o introducir un sink/encoder D3D11 compatible.
**P2:** preservar PTS explícitos hasta la frontera de encoder.
**P3:** cámara Media Foundation + drift correction + tracking/lip-sync final.
**P4:** RTMP/reconnect/hardware real.
**P5:** Game Capture, multistream, installer y redistribución legal de FFmpeg/codecs.

### Regla
Esta entrada es un snapshot de continuidad, no un cierre de producción. Todo trabajo futuro debe partir del HEAD real de la rama y de esta bitácora.
