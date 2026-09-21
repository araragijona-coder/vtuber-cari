# Cari Studio — Bitácora maestra de ingeniería

> Propósito: evitar repetir auditorías, reconstrucciones o implementaciones ya realizadas. Esta bitácora es parte del proyecto y debe actualizarse junto con los cambios que modifiquen arquitectura, contratos, pruebas o gates.

## Estado actual

- Rama: `fix/native-windows-foundation`
- PR: #2
- Carpeta experimental: `experimental/studio/`
- Estado del PR: abierto, draft.
- Regla: ningún componente pasa a producción solo porque compile.
- Ingeniería canónica actual: **71%**.
- Producto usable/end-user: **58%**.
- Seguimiento global: **65%**.
- Último head auditado: **este commit**.

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


### 17 — Hotkeys VTuber globales

**Estado:** IMPLEMENTADO

Electron registra atajos globales y los publica por el mismo canal de eventos del renderer:
- Ctrl+Alt+1 -> happy;
- Ctrl+Alt+2 -> angry;
- Ctrl+Alt+3 -> sad;
- Ctrl+Alt+4 -> afraid;
- Ctrl+Alt+0 -> liberar override manual;
- Ctrl+Alt+C -> iniciar calibración;
- Ctrl+Alt+T -> activar/desactivar tracking.

**NO REPETIR:** no implementar un segundo sistema de hotkeys dentro de otra capa; los hotkeys globales viven en Electron Main y la reacción del avatar en Renderer.

### 18 — Borde de tracking corregido

**Estado:** IMPLEMENTADO

`FaceTracker` distingue:
- frame nuevo con cara;
- ausencia real de cara;
- frame duplicado;
- timestamp rechazado;
- modelo/no-ready.

Solo `no-face` entra al fade de pérdida. Los frames duplicados no degradan el avatar.

**NO REPETIR:** no convertir cualquier `null` de MediaPipe en pérdida de tracking.


## Checkpoint canónico — 2026-09-21 — VTuber usability

- Ingeniería: **~71%**.
- Producto usable/end-user: **~58%**.
- Seguimiento global: **~65%**.
- Producción: **NO listo**.
- Las mejoras VTuber verificadas/presentes en el head actual incluyen hotkeys globales y el puente de tracking con perfil/calibración.
- Próximo foco P0: validación real de cámara/tracking y composición final del avatar, no recrear el tracker ni el renderer.
---

## LOG-019 — Consolidación de continuidad + demo visual

**Fecha:** 2026-09-21  
**Área:** Continuidad / auditoría / VTuber UI  
**Estado:** IMPLEMENTADO / DOCUMENTADO

### Problema

Existían varios archivos de bitácora históricos y el estado operativo de la rama había avanzado más que algunos resúmenes antiguos. Eso podía provocar repetir auditorías ya cerradas o tomar un porcentaje histórico como si fuera el actual.

### Acción realizada

- Se confirma experimental/studio/BITACORA.md como bitácora canónica.
- Se registran como fuentes históricas/secundarias BITACORA_CONTINUIDAD.md, BITACORA_INGENIERIA.md y DEVELOPMENT_LOG.md.
- Se consolida el estado actual observado en el repositorio:
  - cámara Media Foundation implementada en el runtime;
  - compositor D3D11 experimental;
  - E2E Windows named-pipe → FFmpeg implementado y preparado para CI;
  - VAD/lip-sync local por amplitud;
  - supervisor multistream experimental;
  - retry/backoff RTMP acotado por categoría de red;
  - tracking MediaPipe con calibración/smoothing/deadzone;
  - overlay/avatar separado y conectado experimentalmente al compositor.
- Se mantiene la separación entre ingeniería, producto usable y validación física.

### Evidencia

- PROJECT_STATUS.md: ingeniería ~71%, producto usable ~58%, seguimiento global ~65%.
- PANEL_ACTUAL.md: documenta la superficie real de En vivo, Panel, Escenas, Fuentes, Audio, Salidas, VTuber, Tracking, Avatar, Chat y Twitch.
- assets/cari/expressions/cari_neutral.png: asset visual V0 presente en el repositorio.
- El runtime sigue marcado como experimental y no listo para producción.

### Riesgos restantes

- CI sigue sin entregar steps/logs útiles en los runs recientes.
- Falta validación Windows/hardware sostenida.
- El compositor D3D11 actual continúa usando readback CPU como puente experimental.
- La preservación de PTS extremo a extremo todavía requiere el camino Libav/metadata temporal.
- Falta validar cámara, RTMP, reconexión real, drift físico y modelo/avatar de producción.

### NO REPETIR

- No reconstruir el tracker MediaPipe.
- No reconstruir Windows Graphics Capture.
- No crear otro scheduler/pacer/interleaver.
- No crear otro FFmpeg supervisor.
- No convertir OBS en dependencia del engine.
- No copiar Live2D/Cubism Core al repositorio.
- No tratar el overlay Three.js como composición final de producción.
- No usar los porcentajes de archivos históricos como estado actual.

### Siguiente foco

Prioridad inmediata: obtener evidencia observable de CI/E2E Windows y, en paralelo, cerrar la ruta compositor GPU → frame final sin readback por frame.


---

## LOG-020 — Checkpoint actual + demo visual de Cari

**Fecha:** 2026-09-21
**Área:** Continuidad / UI / demo / CI
**Estado:** DOCUMENTADO

### Estado confirmado

- PR #2 sigue abierto y en draft.
- HEAD auditado: a6da0ed020b66ac10c2f319fb27d7b25e43af5b8.
- Ingeniería: ~71%.
- Producto usable/end-user: ~58%.
- Seguimiento global: ~65%.
- Producción: NO listo.

### Demo visual

Se generó una captura demostrativa local basada en la superficie real documentada de En vivo y en el asset V0 presente en assets/cari/expressions/cari_neutral.png.

Archivo de demo: /mnt/data/cari_studio_demo_actual.png

La imagen es una representación visual del estado actual de la UI y del asset Cari; no debe interpretarse como evidencia de una sesión Windows/FFmpeg ejecutándose en hardware real.

### CI actual

Los runs del HEAD auditado para Native Windows Build, CI, Character Runtime Tests y Actions Runner Diagnostic terminan con failure y jobs sin steps/logs observables. No se declara CI verde.

### NO REPETIR

- No tratar la captura demo como validación de runtime.
- No reconstruir la UI principal desde cero: usar PANEL_ACTUAL.md y el renderer existente.
- No cambiar el porcentaje por cantidad de commits/archivos; usar gates de evidencia.
- No rehacer MediaPipe, Three.js, WGC, WASAPI, FFmpeg supervisor ni MediaGraphController sin regresión demostrada.

### Siguiente foco

CI/E2E Windows observable y compositor GPU que conecte el avatar al frame final sin readback CPU por frame, seguido por PTS extremo a extremo y drift correction.


---

## LOG-021 — Dirección artística Cari V1

Fecha: 2026-09-21
Área: Continuidad / VTuber / arte
Estado: DOCUMENTADO

Problema:
El arte V0 cumple una función de prueba pero no representa la calidad visual objetivo del producto.

Acción realizada:
- Se mantiene el runtime actual y el contrato de actuación sin rediseñarlos por motivos artísticos.
- Se define una dirección Cari V1 independiente del engine.
- La referencia visual será original y no copiará diseños distintivos de otros VTubers.
- La especificación contempla silueta fuerte, rostro legible, outfit urbano/pop modular, piezas separables para rigging, expresiones y compatibilidad futura 2D/3D.

Evidencia:
- VTUBER_ASSET_STRATEGY.md identifica BASE_ART_V0 como funcional.
- VTUBER_CARI_ART_DIRECTION.md define el target V1.
- La demo visual generada en esta iteración es referencia artística, no prueba de runtime.

NO REPETIR:
- No reconstruir MediaPipe.
- No crear otro renderer para resolver el arte.
- No usar la demo como evidencia Windows/FFmpeg.
- No aumentar el porcentaje por una ilustración conceptual.

Siguiente acción:
Validar el asset V1 sobre el renderer/overlay existente y medir composición, tracking, lip-sync y rendimiento.

---

## LOG-022 — Reconciliación de estado + dirección artística V1 corregida

**Fecha:** 2026-09-21
**Área:** Continuidad / Auditoría / VTuber / Arte
**Estado:** IMPLEMENTADO / DOCUMENTADO

### Problema

El proyecto tenía checkpoints históricos con porcentajes y estados diferentes. Además, una propuesta artística V1 había introducido prendas/accesorios que no estaban permitidos por la Biblia canónica de Cari.

### Investigación

- Se tomó BITACORA.md como memoria canónica.
- Se revisaron PROJECT_STATUS.md y AUDIT_MATRIX.md antes de tocar componentes existentes.
- Se contrastó la superficie visual pública de VTubers maduras para extraer propiedades de diseño útiles: silueta reconocible, paleta consistente, rostro legible, detalles de firma y preparación para múltiples ángulos/expresiones.
- Se usó como referencia pública la hoja de personaje de Ironmouse y la ficha oficial de Usada Pekora; no se copian sus diseños, modelos, logos, texturas ni accesorios distintivos.

### Acción realizada

- Se reconcilió el checkpoint operativo con la bitácora canónica: Ingeniería ~71%, Producto usable ~58%, Seguimiento ~65%.
- Se corrigió VTUBER_CARI_ART_DIRECTION.md para que la dirección V1 respete las restricciones de CARI_CHARACTER_BIBLE.md.
- Se creó ART_QUALITY_GATE.md con estados de evidencia y criterios medibles.
- Se mejoró el fallback procedural Three.js sin crear otro renderer:
  - MeshToonMaterial;
  - lighting de key/fill/rim;
  - color management/tone mapping;
  - ojos con iris marrón y pupilas blancas;
  - highlights;
  - mechones frontales;
  - lectura atlética;
  - piezas nombradas para rigging;
  - eliminación de binding duplicado.
- Se mantienen separados arte, contrato de actuación y renderer.

### Evidencia

- three-avatar.js contiene la mejora estilística y conserva Three.js/GLTFLoader.
- ART_QUALITY_GATE.md define BASE_ART_V1 como un gate de calidad, no como una ilustración automática.
- La dirección V1 ya no contradice el canon visual confirmado.
- El asset V1 final aún no está producido ni validado en hardware.

### Resultado

**PARTIAL:** la calidad del fallback sube, pero no se declara equivalente a un modelo VTuber comercial terminado.

### Riesgos restantes

- Falta arte V1 final con calidad de producción.
- Falta revisión visual real de thumbnail, plano medio y cuerpo completo.
- Falta tracking, expresiones y lip-sync sobre el asset V1.
- Falta compositor final sin readback CPU y validación Windows/hardware.

### NO REPETIR

- No reconstruir MediaPipe, FaceTrackingBridge, Three.js renderer, WGC, WASAPI o FFmpeg supervisor sin regresión demostrada.
- No crear un segundo renderer para resolver el problema artístico.
- No agregar accesorios/prendas que contradigan CARI_CHARACTER_BIBLE.md.
- No tratar el fallback procedural como arte final.
- No usar referencias de VTubers existentes como assets del proyecto.

### Siguiente foco

Crear/evaluar un asset V1 real que cumpla ART_QUALITY_GATE.md y conectarlo al renderer/rigging existente; en paralelo, mantener como P0 el compositor GPU y la evidencia CI/E2E Windows.

---

## LOG-023 — Continuidad P0→P3 y saneamiento temporal

Fecha: 2026-09-21
Área: Continuidad / Multimedia / Output / VTuber
Estado: IMPLEMENTADO / DOCUMENTADO / PENDIENTES EXPLÍCITOS

Objetivo:
Fijar la prioridad ejecutiva para impedir repetir subsistemas ya resueltos y concentrar el trabajo en los gates pendientes.

Prioridad canónica:
- P0: asset Cari V1 real; revisión visual real; tracking sobre V1; compositor GPU → frame final; validación Windows/E2E.
- P1: PTS extremo a extremo; drift correction físico; FFmpeg sostenido; grabación prolongada; RTMP/reconexión real.
- P2: Game Capture; optimización GPU; hardware real.
- P3: Live2D adapter; multistream; installer; distribución.

Auditoría:
- Se consultó BITACORA.md antes de modificar componentes.
- WGC, WASAPI, AudioTimelineMixer, MediaClock, RealtimePacer, MediaInterleaver, FaceTrackingBridge, Three.js/glTF, FFmpeg supervisor, RawPipe y seguridad Electron no se reconstruyen.
- El arte V0 existente no se considera equivalente al asset Cari V1 final.
- El compositor D3D11 existente sigue siendo experimental porque todavía requiere readback CPU para entregar el frame al camino raw.
- Existe una ruta Libav experimental con PTS explícitos, pero aún no se promueve a producción.

Investigación externa:
- Microsoft documenta SystemRelativeTime como tiempo QPC del render capturado y lo presenta como utilizable para sincronizar otros medios. citeturn349667search0turn349667search11
- Media Foundation Source Reader puede trabajar con dispositivos de captura como webcams y requiere examinar/seleccionar el media type. citeturn501700search1turn501700search2
- FFmpeg documenta use_wallclock_as_timestamps y advierte en AVFormatContext sobre resultados indefinidos con B-frames. citeturn349667search4turn349667search10
- Live2D indica que Cubism Core se distribuye dentro del SDK y no se publica en GitHub bajo la licencia propietaria. citeturn501700search0turn501700search4
- Three.js mantiene GLTFLoader como loader de glTF 2.0 y WebGLRenderer como renderer WebGL2. citeturn349667search8turn349667search3

Cambios de esta iteración:
- Se eliminó use_wallclock_as_timestamps del perfil FFmpeg raw; el camino raw ya no depende de ese atajo para generar timestamps.
- Se mantuvo la ruta Libav como gate para PTS explícitos extremo a extremo.
- Se añadió/confirmó retry RTMP restringido a fallos clasificados como network y backoff acotado.
- Se añadió/confirmó diagnóstico de estado/código de salida y stderr limitado.
- La CI fue configurada para ejecutarse también en la rama de desarrollo y acepta workflow_dispatch.

Resultado:
PARTIAL. Se redujo riesgo de temporización y se formalizó la memoria de continuidad, pero PTS E2E, validación Windows y composición final siguen abiertos.

NO REPETIR:
- No reconstruir WGC, WASAPI/mixer, scheduler/pacer/interleaver, tracker MediaPipe, renderer Three.js ni supervisor FFmpeg sin regresión demostrada.
- No copiar Cubism Core.
- No tratar V0 procedural/PNG como Cari V1 final.
- No usar una demo visual como evidencia Windows/E2E.
- No reintroducir use_wallclock_as_timestamps como sustituto de timestamps explícitos.
- No declarar RTMP resiliente sin prueba real de caída y reconexión.
- No elevar el porcentaje por cantidad de commits, archivos o líneas.

Siguiente foco:
P0 — Asset Cari V1 real y validación visual/tracking sobre el renderer existente; en paralelo, compositor GPU → frame final sin readback y CI/E2E Windows.


---

## LOG-024 — Verificación de contratos de output y estado final del ciclo

Fecha: 2026-09-21
Área: Testing / Output / Continuidad
Estado: VERIFICADO PORTABLE / WINDOWS PENDIENTE

Pruebas ejecutadas en entorno disponible:
- OutputRetryPolicy: compilación C++20 con -Wall -Wextra -Werror y ejecución del smoke: PASS.
- output_profile raw A/V: compilación C++20 con -Wall -Wextra -Werror; contrato BGRA + PCM float32, mapping 0:v:0/1:a:0, matroska y ausencia de use_wallclock_as_timestamps: PASS.
- OutputFailureCategory: compilación C++20 con -Wall -Wextra -Werror y pruebas de network/encoder/mux/permission/unknown: PASS.

Evidencia web relevante:
- FFmpeg documenta que use_wallclock_as_timestamps fuerza timestamps de wallclock y advierte resultados indefinidos con B-frames; se mantiene eliminado de la ruta raw. citeturn349667search10turn349667search4
- Windows Graphics Capture expone SystemRelativeTime como tiempo QPC del compositor, útil como referencia para sincronización multimedia. citeturn349667search0turn349667search11
- Media Foundation Source Reader es la ruta documentada para trabajar con dispositivos de captura como webcams y seleccionar sus media types. citeturn501700search1turn501700search2

Estado de continuidad:
- Ingeniería: ~71%.
- Producto usable/end-user: ~58%.
- Seguimiento global: ~65%.
- Producción: NO listo.

NO REPETIR:
- Los tres contratos anteriores ya tienen evidencia portable y no deben recompilarse/reformularse como diseño nuevo salvo regresión.
- La ausencia de steps/logs en GitHub Actions no debe solucionarse cambiando el código a ciegas.
- El asset V0 no debe presentarse como Cari V1.

Siguiente foco ejecutivo:
P0: asset Cari V1 real → revisión visual → tracking sobre V1 → compositor GPU → frame final → E2E Windows.
P1 queda después de cerrar P0, empezando por PTS E2E y drift físico.


---

## LOG-025 — Checkpoint de continuidad y auditoría final del ciclo

Fecha: 2026-09-21
Área: Continuidad / CI / P0-P3
Estado: DOCUMENTADO

HEAD actual auditado: 241a88bc6f5c84c0f4adc8547e5cec92ca762c8b.
PR: #2, draft, abierto, mergeable=false.
Branch: fix/native-windows-foundation.

Progreso canónico:
- Ingeniería: ~71%.
- Producto usable/end-user: ~58%.
- Seguimiento global: ~65%.
- Producción: NO listo.

Backlog ejecutivo no repetible:
- P0 primero: asset Cari V1 real, revisión visual, tracking sobre V1, compositor GPU → frame final, Windows/E2E.
- P1 después: PTS E2E, drift físico, FFmpeg sostenido, grabación larga, RTMP/reconexión real.
- P2: Game Capture, optimización GPU, hardware real.
- P3: Live2D adapter, multistream, installer, distribución.

CI:
- Native Windows Build, CI y Character Runtime Tests siguen fallando sin steps ni logs observables.
- Actions Runner Diagnostic también falla con steps=null.
- No existe evidencia para atribuir estos fallos a una línea del código.
- No declarar CI verde hasta disponer de ejecución con steps/logs.

Git history:
- compare main...branch continúa divergente y la rama está detrás de main; no se fuerza reescritura mientras no exista una necesidad de integración que preserve el historial.

NO REPETIR:
- no reimplementar subsistemas cerrados por falta de logs de Actions;
- no convertir el V0/procedural en V1 final;
- no recrear compositor/tracker/renderer/scheduler/supervisor existentes;
- no usar cantidad de commits/archivos para subir progreso.

Siguiente foco único:
P0 — obtener/validar el asset Cari V1 real y probarlo sobre el renderer/actuación existentes; la ruta GPU→frame final debe continuar en paralelo sin crear un renderer nuevo.


---

## LOG-026 — PTS Libav endurecido + bitácora operativa

Fecha: 2026-09-21
Área: P1 Multimedia / PTS / Testing / Continuidad
Estado: IMPLEMENTADO / VERIFICADO PORTABLE / WINDOWS PENDIENTE

### Problema

La ruta LibavMediaOutput ya transportaba el PTS del primer audio y los PTS de vídeo hacia AVFrame, pero el smoke no verificaba los timestamps de los paquetes codificados. Además, si el FIFO de audio quedaba vacío, el reloj de muestras podía asumir continuidad aun cuando el siguiente paquete llegara con un PTS explícito diferente.

### Investigación

- FFmpeg define AVFrame::pts como timestamp de presentación en unidades del time_base del frame.
- FFmpeg define AVStream::time_base como unidad fundamental de tiempo para representar timestamps del stream.
- Se mantiene la arquitectura directa libavcodec + libavformat separada del camino CLI/raw.
- No se promueve esta ruta a producción hasta disponer de build y validación Windows con la versión de FFmpeg elegida.

### Acción realizada

- LibavMediaOutputStats ahora expone first_video_packet_pts y first_audio_packet_pts.
- write_packets_from_encoder() registra esos límites para los paquetes enviados al muxer.
- submit_audio_locked() reancla next_audio_pts cuando el FIFO estaba vacío antes de recibir un paquete, usando el PTS explícito del paquete.
- El smoke de Libav verifica existencia de paquetes de vídeo/audio, límites de PTS válidos y conservación de los PTS de entrada.
- Se conserva el time_base canónico de 100 ns como entrada y se hace rescale al time_base del encoder.

### Pruebas

- C++20 portable, warnings como errors: contratos de timing/retry/diagnóstico ya verificados.
- Smoke Libav ampliado; ejecución Windows pendiente del runner.
- FFmpeg sintético CLI ya validado previamente con BGRA + PCM -> H.264/AAC -> Matroska en Linux.

### Resultado

PARTIAL: el gate PTS es ahora más observable y robusto ante discontinuidades de audio en fronteras vacías del FIFO. Sigue sin existir validación Windows/hardware sostenida.

### Riesgos restantes

- Drift físico entre relojes de dispositivos.
- Encoder/mux real sostenido en Windows.
- Readback CPU del frame final en la ruta actual.
- Compositor GPU -> encoder sin readback.
- Reconnect RTMP real.
- Integración definitiva del asset Cari V1.

### NO REPETIR

- No volver a diseñar MediaClock, RealtimePacer o MediaInterleaver.
- No volver a reconstruir LibavMediaOutput desde cero.
- No tratar el smoke de Linux como validación Windows.
- No afirmar PTS extremo a extremo de producción hasta verificar los paquetes reales en Windows.
- No cambiar de librería de vídeo solamente por este pendiente; primero completar la evidencia de la ruta Libav actual.

### Siguiente acción

P0: compositor GPU -> frame final sin readback CPU por frame y E2E Windows observable.
P1: convertir la mejora de PTS Libav en prueba Windows cuando exista runner/log ejecutable.


---

## LOG-027 — Corrección de métricas para cámara activa

Fecha: 2026-09-21
Área: Native Windows / Status / Continuidad
Estado: IMPLEMENTADO / PENDIENTE DE VALIDACIÓN WINDOWS

Problema:
Cuando la fuente activa era Media Foundation camera, el status del control plane seguía leyendo frames, FPS y errores de CaptureEngine/WGC. Eso podía mostrar una telemetría falsa aun cuando la cámara fuera la fuente real.

Acción realizada:
- BuildControlStatusMessage() ahora selecciona frames, FPS y errores desde MediaFoundationCamera cuando capture_source=camera.
- WGC sigue siendo la fuente de métricas para window/screen.
- No se creó otro sistema de métricas; se corrigió el selector de la fuente existente.

Pruebas:
- Revisión estática del flujo de selección de fuente y estado.
- Smoke completo Windows sigue pendiente porque Actions no devuelve steps/logs ejecutados.

Resultado:
PASS de coherencia de código; WINDOWS_VERIFIED pendiente.

NO REPETIR:
- No duplicar métricas de cámara.
- No crear otro status channel; corregir BuildControlStatusMessage() si aparece una nueva discrepancia.

Siguiente acción:
P0 compositor GPU -> frame final y E2E Windows observable.


---

## LOG-028 — Validador automático de continuidad

Fecha: 2026-09-21
Área: Continuidad / Testing / CI
Estado: IMPLEMENTADO / TESTEABLE LOCALMENTE

Problema:
La cantidad de cambios del proyecto y los checkpoints históricos hacían posible volver a introducir porcentajes contradictorios, IDs de log duplicados o perder la lista NO REPETIR.

Acción realizada:
- Se creó experimental/studio/tools/verify_bitacora.py.
- Verifica existencia de BITACORA, PROJECT_STATUS, ENGINEERING_LOG y CHANGELOG.
- Verifica secciones obligatorias y LOG IDs únicos/monotónicos.
- Compara los porcentajes canónicos de Ingeniería, Producto usable y Seguimiento entre BITACORA y PROJECT_STATUS.
- Verifica que producción conserve un estado explícito NO listo.
- Verifica que ENGINEERING_LOG contenga el último LOG.
- Se añadió un test unitario para el validador.
- CI ejecutará el validador cuando los runners vuelvan a entregar steps/logs.

Resultado:
IMPLEMENTADO. El ledger pasa a tener una comprobación automática de continuidad.

NO REPETIR:
- No crear otra fuente de verdad para porcentajes.
- No mantener un segundo sistema de bitácora.
- No ignorar un fallo del validador; corregir la inconsistencia documental antes de continuar.

Siguiente acción:
P0 compositor GPU -> frame final y E2E Windows; el validador de continuidad permanece como gate de documentación.

---

## LOG-029 — Bitácora canónica + asset registry + investigación GPU/tracking

Fecha: 2026-09-21  
Área: Continuidad / Avatar / GPU / Tracking  
Estado: IMPLEMENTADO / VERIFICADO PORTABLE / WINDOWS PENDIENTE

### Problema

La bitácora ya existía, pero necesitaba registrar de forma inequívoca qué trabajo queda cerrado y qué no debe repetirse. Además, el renderer aceptaba un avatarModelPath directamente sin una frontera declarativa de asset.

### Investigación

- MediaPipe documenta VIDEO y LIVE_STREAM. LIVE_STREAM está destinado a datos de cámara, trabaja mediante callback y puede descartar imágenes para reducir latencia; VIDEO conserva la ruta síncrona actual y exige timestamps crecientes.
- FFmpeg expone AV_PIX_FMT_D3D11 en su hwcontext D3D11VA y el encoder NVENC actual declara soporte para frames D3D11.
- Microsoft recomienda IDXGIResource1::CreateSharedHandle con recursos D3D11_RESOURCE_MISC_SHARED_NTHANDLE para nuevos recursos compartidos.

### Acción realizada

- Se creó avatar/asset-registry.js.
- El registry acepta exclusivamente glb y gltf.
- Se impone un límite de 64 MiB cuando se conoce el tamaño.
- overlay-main.js valida el asset antes de pasarlo a ThreeAvatarRenderer.
- Se añadió avatar/asset-registry.test.mjs.
- Se añadió el registry al comprobador ESM.
- No se creó otro renderer ni otro sistema de actuación.

### Verificación

- Test Node del registry: PASS.
- GLB aceptado.
- GLTF forma parte del contrato.
- FBX rechazado.
- Límite exacto aceptado.
- Tamaño superior rechazado.
- Tamaño negativo rechazado.

### Decisión

Mantener el tracker actual en VIDEO hasta disponer de una medición real que justifique LIVE_STREAM. El cambio de modo debe extender FaceTracker sin reconstruir FaceTrackingBridge.

Mantener D3D11Compositor y ThreeAvatarRenderer existentes. El siguiente trabajo GPU debe conectar el texture output al encoder sin readback CPU por frame, preferentemente mediante la ruta Libav/D3D11 experimental.

### Riesgos restantes

- Asset Cari V1 real pendiente.
- Revisión visual y tracking sobre V1 pendiente.
- Readback CPU pendiente de eliminar del camino de producción.
- PTS E2E Windows pendiente.
- Soporte/driver NVENC o AMF pendiente de validar en hardware.
- LIVE_STREAM pendiente de medición.

### NO REPETIR

- No crear otro renderer Three.js.
- No crear otro tracker MediaPipe.
- No reemplazar FaceTrackingBridge para introducir LIVE_STREAM.
- No tratar compatibilidad D3D11 de NVENC como prueba de hardware.
- No copiar runtime Live2D/Cubism.
- No tratar el asset registry como el asset Cari V1.
- No aumentar el porcentaje por volumen de archivos.

### Siguiente foco único

P0: compositor GPU -> encoder sin readback CPU por frame y evidencia Windows/E2E. Usar el registry existente para introducir Cari V1 cuando el asset real esté disponible.