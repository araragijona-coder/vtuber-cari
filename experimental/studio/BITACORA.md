# Cari Studio — Bitácora de ingeniería

> Propósito: evitar repetir auditorías, cambios o experimentos ya realizados.  
> Regla: antes de implementar una solución nueva, revisar esta bitácora y el estado del código.  
> Un elemento marcado **NO REPETIR** no se vuelve a investigar desde cero salvo que aparezca evidencia nueva.

## Estado actual

- Rama: `fix/native-windows-foundation`
- PR: #2 — `fix: harden native Windows foundation`
- Último HEAD registrado en esta entrada: `f834649b1a074acedccb9c3037b239482aa085c1`.
- Estado: experimental; todavía no se promueve a producción.
- Avance de ingeniería: **60%**.

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
