# Cari Studio — Bitácora de ingeniería

> Propósito: evitar repetir auditorías, cambios o experimentos ya realizados.  
> Regla: antes de implementar una solución nueva, revisar esta bitácora y el estado del código.  
> Un elemento marcado **NO REPETIR** no se vuelve a investigar desde cero salvo que aparezca evidencia nueva.

## Estado actual

- Rama: `fix/native-windows-foundation`
- PR: #2 — `fix: harden native Windows foundation`
- Último HEAD registrado en esta entrada: `4293bd1063da2dd9f049fe79a30e095bdb0c6df3`.
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

**HEAD canónico:** `4293bd1063da2dd9f049fe79a30e095bdb0c6df3`  
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