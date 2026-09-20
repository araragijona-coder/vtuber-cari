# Cari Studio — Bitácora de ingeniería

> Propósito: evitar repetir auditorías, cambios o experimentos ya realizados.  
> Regla: antes de implementar una solución nueva, revisar esta bitácora y el estado del código.  
> Un elemento marcado **NO REPETIR** no se vuelve a investigar desde cero salvo que aparezca evidencia nueva.

## Estado actual

- Rama: `fix/native-windows-foundation`
- PR: #2 — `fix: harden native Windows foundation`
- Último HEAD conocido al cerrar esta entrada: se actualizará automáticamente con el último commit de esta continuación.
- Estado: experimental; todavía no se promueve a producción.
- Avance de ingeniería: **59%**.

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
