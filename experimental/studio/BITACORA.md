# Cari Studio — Bitácora maestra de ingeniería

> Propósito: evitar repetir auditorías, reconstrucciones o implementaciones ya realizadas. Esta bitácora es parte del proyecto y debe actualizarse junto con los cambios que modifiquen arquitectura, contratos, pruebas o gates.

## Estado actual

- Rama: `fix/native-windows-foundation`
- PR: #2
- Carpeta experimental: `experimental/studio/`
- Estado del PR: abierto, draft.
- Regla: ningún componente pasa a producción solo porque compile.
- Estimación actual de ingeniería: **60%**.
- Último head auditado: `faa522a9cf59f3e1e0561ea2d357954400daec0d`.

## Estados de trabajo

- **IMPLEMENTADO:** el código/contrato existe.
- **VERIFICADO:** existe una prueba reproducible que pasa.
- **VALIDADO EN HARDWARE:** probado en una máquina Windows objetivo.
- **PENDIENTE:** falta evidencia o implementación.
- **NO REPETIR:** el problema ya fue investigado/corregido; volver a hacerlo solo si aparece nueva evidencia.

---

## Historial consolidado

### 01 — Base de arquitectura

**Estado:** IMPLEMENTADO / parcialmente VERIFICADO

Se construyó la separación:
```
Electron Renderer
→ Electron Main
→ Native Windows Engine
→ media graph
→ output
```

Decisión permanente:
- Electron es control plane.
- C++ nativo es data/media plane.
- OBS WebSocket es integración opcional.
- El programa no necesita IA ni cloud para operar.

**NO REPETIR:** no volver a rediseñar todo el proyecto como un único proceso Electron/Python.

### 02 — Captura Windows

**Estado:** IMPLEMENTADO

Incluye:
- Windows Graphics Capture;
- captura de ventana;
- captura de pantalla primaria;
- enumeración de ventanas;
- frame callback;
- D3D11;
- recreate de frame pool;
- recuperación de device removed/reset/hung.

**PENDIENTE:** cámara Media Foundation, Game Capture y validación hardware.

**NO REPETIR:** la captura primaria ya usa `CreateForMonitor`; la selección de ventanas por índice ya existe.

### 03 — Audio

**Estado:** IMPLEMENTADO / parcialmente VERIFICADO

Incluye:
- WASAPI microphone;
- system loopback;
- AudioTimelineMixer;
- normalización inicial;
- bloques temporales;
- voice DSP local `anime-bright`;
- métricas de underrun/resampling.

Timestamp:
- canonical media timestamp = signed 100 ns ticks.

**PENDIENTE:** drift correction entre relojes físicos.

**NO REPETIR:** no volver a convertir QPCPosition de WASAPI como si fueran ticks QPC crudos; Windows ya entrega ese timestamp en unidades de 100 ns.

### 04 — FFmpeg

**Estado:** IMPLEMENTADO / VERIFICACIÓN SINTÉTICA

Incluye:
- ProcessRunner Windows;
- stderr capture;
- RawPipe;
- dos canales raw: video BGRA8 y audio PCM float32;
- mapping explícito;
- H.264/AAC;
- Matroska local;
- RTMP/RTMPS output boundary;
- cierre EOF/flush antes de terminación forzada.

**VERIFICADO:** prueba sintética FFmpeg BGRA + PCM -> H.264/AAC -> Matroska.

**PENDIENTE:** prueba Windows sostenida con named pipes, captura real, hardware y RTMP.

**NO REPETIR:** la prueba sintética de Linux no demuestra funcionamiento Windows.

### 05 — Reloj y pacing

**Estado:** IMPLEMENTADO / VERIFICADO PORTABLE

Incluye:
- `MediaClock`;
- `RealtimePacer`;
- `MediaInterleaver`;
- colas acotadas;
- late/drop/cadence metrics;
- máximo de 8 eventos A/V por polling.

**Decisión:** audio y vídeo se ordenan por PTS antes de escribir al transporte raw.

**PENDIENTE:** los PTS originales no viajan dentro del protocolo raw; el scheduler solo controla el instante de emisión.

**NO REPETIR:** no declarar "timestamp end-to-end" hasta cambiar el transporte o añadir metadata temporal explícita.

### 06 — Control de sesión

**Estado:** IMPLEMENTADO

Incluye:
- rollback;
- stop-only;
- source lock durante output;
- audio/capture lock durante output;
- rechazo de cambio de sample-rate/canales dentro de una sesión;
- backpressure de arranque;
- no drenar audio antes de conectar ambos pipes.

**NO REPETIR:** no reintroducir caminos independientes que puedan dejar output activo con capture/audio detenidos.

### 07 — Diagnóstico y resiliencia

**Estado:** IMPLEMENTADO / parcialmente VERIFICADO

Incluye:
- output state;
- exit code;
- stderr limitado a 256 KiB;
- categorías network/encoder/input/mux/permission/unknown;
- retry policy con backoff 1s -> 2s -> 4s -> ... hasta 30s;
- máximo de 5 intentos;
- retry solamente para fallos clasificados como network;
- indicador de retry en UI.

**NO REPETIR:** encoder/mux/permission/input no deben reintentarse como si fueran desconexiones de red.

### 08 — Tracking facial

**Estado:** IMPLEMENTADO / VERIFICADO PORTABLE

Incluye:
- MediaPipe Face Landmarker VIDEO;
- timestamp monotónico;
- blendshapes;
- head pose;
- gaze;
- detección de expresiones;
- smoothing;
- deadzone;
- calibración;
- sensibilidad;
- pérdida de rostro con gracia + fade;
- persistencia local del perfil.

**NUEVO:** `tracking-profile.js` centraliza estos parámetros.

**PENDIENTE:** validación de rendimiento en cámara/hardware real.

**NO REPETIR:** no reconstruir un tracker desde cero; extender `FaceTrackingBridge + TrackingProfileController`.

### 09 — Avatar renderer

**Estado:** IMPLEMENTADO / experimental

Incluye:
- Three.js;
- GLTFLoader;
- GLB/glTF;
- morph aliases;
- placeholder procedural;
- actividad idle/keyboard/controller/phone/pillow;
- expresiones del contrato;
- overlay.

**PENDIENTE:** compositor final avatar -> frame nativo.

**NO REPETIR:** no generar un modelo propietario dentro del repositorio como sustituto del backend.

### 10 — Live2D

**Estado:** ADAPTER ONLY

Live2D/Cubism Core no se incorpora al repositorio como runtime redistribuido.

La documentación oficial indica que Cubism Core se entrega dentro del SDK y no se publica en GitHub bajo la licencia propietaria.

**NO REPETIR:** no pegar el runtime Cubism/Core en el repositorio sin una decisión/licencia de distribución verificada.

### 11 — UI VTuber

**Estado:** IMPLEMENTADO

La vista Tracking ahora tiene:
- iniciar/detener cámara;
- calibración;
- reset;
- smoothing;
- sensitivity;
- estado de tracking;
- estado de calibración;
- métricas faciales.

El estado del avatar ya puede manejar:
- expresiones manuales;
- actividades;
- movimiento;
- objetos;
- talking/lip-sync;
- modos automáticos.

**PENDIENTE:** prueba de sesión larga y ajuste según hardware real.

### 12 — CI

**Estado:** INFRAESTRUCTURA BLOQUEADA

Los workflows fueron modificados para ejecutarse también en la rama de desarrollo y aceptar `workflow_dispatch`.

Los runs más recientes siguen terminando con:
```
failure
steps = null
logs_url = null
```

Por lo tanto:
- no se debe declarar CI verde;
- no se debe atribuir el fallo a una línea concreta del programa;
- la siguiente acción de CI debe ser obtener una ejecución con steps/logs reales.

**NO REPETIR:** no seguir modificando código para "arreglar CI" mientras GitHub no entregue evidencia del step que falla.

---

## Matriz de no repetición

| Tema | Hecho | No volver a hacer |
|---|---|---|
| Arquitectura | Electron control + C++ media | Rediseño total |
| Captura | WGC ventana/pantalla | Reimplementar desde cero |
| Audio | WASAPI + mixer | Rehacer timeline |
| FFmpeg | RawPipe + supervisor | Reescribir supervisor sin evidencia |
| Timing | MediaClock + Pacer + Interleaver | Volver a separar audio/video por loops |
| Sesión | rollback + locks | Crear nuevos caminos paralelos |
| Tracking | MediaPipe + bridge + profile | Crear otro tracker paralelo |
| Avatar | Three.js + GLTFLoader | Agregar otro renderer sin necesidad |
| Live2D | adapter boundary | Copiar Cubism Core |
| CI | trigger dev + manual | Cambios a ciegas sin logs |

---

## Próximos frentes prioritarios

### P0 — Avatar utilizable en transmisión

1. Validar tracking sostenido con cámara real.
2. Ajustar smoothing/deadzone por hardware.
3. Añadir perfiles exportables/importables.
4. Resolver composición avatar -> frame final.
5. Probar carga y render de GLB/GLTF durante sesión larga.

### P1 — Multimedia real

1. Transportar timestamps explícitos.
2. Drift correction.
3. FFmpeg sostenido en Windows.
4. grabación larga.
5. RTMP real.
6. reconnect/backoff con evidencia de red.

### P2 — Fuentes

1. Media Foundation camera.
2. Game Capture.
3. GPU compositor D3D11.

### P3 — Plataforma VTuber

1. lip-sync de producción;
2. Live2D adapter bajo licencia/runtime permitido;
3. multistream;
4. presets/asset manager;
5. installer.

---

## Regla para futuras iteraciones

Antes de implementar algo nuevo:

1. Buscar primero el componente en esta bitácora.
2. Buscar después en `PROJECT_STATUS.md`.
3. Buscar después en `AUDIT_MATRIX.md`.
4. Solo si aparece nueva evidencia o un requisito distinto, modificar una pieza ya marcada como IMPLEMENTADA.

La pregunta correcta para la siguiente iteración es:
**"¿Qué gate pendiente tiene mayor impacto y qué evidencia falta?"**
No:
**"¿Cómo volvemos a implementar el mismo componente?"**

### 13 — Usabilidad VTuber orientada a transmisión continua

**Estado:** IMPLEMENTADO / parcialmente VERIFICADO

Se añadió `TrackingProfileController` para:
- calibración de 30 muestras;
- centrado de head/gaze/mouth baseline;
- smoothing configurable;
- deadzone configurable;
- sensibilidad configurable;
- gracia y fade al perder rostro.

La UI Tracking ahora ofrece iniciar/detener, calibrar, reset, sensibilidad y smoothing. La configuración queda persistida en localStorage.

**Corrección importante:** los frames duplicados de webcam ya no se interpretan como pérdida de rostro. Solo un resultado explícito sin rostro activa el estado de pérdida.

**NO REPETIR:** no crear otro sistema paralelo de smoothing/calibración; extender `TrackingProfileController + FaceTrackingBridge`.

### 14 — Resiliencia RTMP

**Estado:** IMPLEMENTADO / pendiente de prueba real

Se añadió:
- clasificación de fallos;
- backoff exponencial acotado;
- máximo de 5 intentos;
- retry únicamente para errores clasificados como network;
- retry tanto para fallo de arranque como para caída posterior.

**NO REPETIR:** no reintentar encoder, muxer, permisos o input como si fueran fallos de red.

### 15 — Bitácora de no repetición

La referencia operacional pasa a ser este archivo junto con `PROJECT_STATUS.md`, `AUDIT_MATRIX.md` y `VTUBER_USABILITY_SPEC.md`.
Antes de modificar una pieza existente hay que comprobar primero si ya aparece como IMPLEMENTADA/VERIFICADA.


### 16 — Evidencia CI de la iteración actual

**Estado:** BLOQUEADO POR RUNNER

Los workflows de desarrollo y un workflow de diagnóstico de runners alcanzan el estado `completed/failure`, pero GitHub devuelve:
```
steps = null
logs_url = null
```

Esto también ocurre en el job `probe` del workflow de diagnóstico. La bitácora debe conservar esta evidencia para evitar intentar corregir líneas de código sin un step/log que las implique.

**NO REPETIR:** no asumir que un `failure` de Actions es una regresión del código mientras el job no tenga steps/logs ejecutados.
