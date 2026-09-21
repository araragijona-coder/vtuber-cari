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
- Último head auditado: `6c89e566c3da56aac5d45d5bd02f985f1f2fb246`.

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
---

## LOG-030 — Evidencia CI actual y bloqueo del runner

Fecha: 2026-09-21  
Área: CI / Continuidad / Auditoría  
Estado: BLOQUEADO POR INFRAESTRUCTURA

### Problema

Se necesitaba distinguir entre un fallo de código y un fallo del entorno de GitHub Actions. Los workflows ya fueron corregidos para ejecutarse en la rama de desarrollo y existe un workflow de diagnóstico de runner.

### Evidencia

Sobre el HEAD 21f89448a04ed5eda26c68eb9506d4cb96c07694:
- Native Windows Build termina failure con jobs build y electron-shell-check sin steps ni logs.
- Actions Runner Diagnostic termina failure en job probe sin steps ni logs.
- CI termina failure en ambos jobs de Python sin steps ni logs.
- Character Runtime Tests termina failure sin steps ni logs.

El mismo patrón se ha observado en varios HEAD consecutivos, por lo que actualmente no existe evidencia para atribuir el fallo a una línea concreta del repositorio.

### Decisión

No modificar código funcional para intentar arreglar estos failures mientras GitHub no entregue al menos un step/log ejecutado.

### NO REPETIR

- No reintentar indefinidamente los mismos runs esperando que cambie el diagnóstico.
- No alterar MediaGraph, FFmpeg, tracking, renderer o compositor por este fallo de runner.
- No declarar CI verde.
- No utilizar un failure sin steps como prueba de regresión funcional.

### Siguiente acción

Continuar con el siguiente gate técnico P0 sin tocar los subsistemas ya cerrados; volver al CI únicamente cuando aparezca una ejecución con steps/logs observables.

---

## LOG-031 — Reconciliación canónica y continuidad viva

Fecha: 2026-09-21
Área: Continuidad / Auditoría / GPU / CI
Estado: DOCUMENTADO / BLOQUEADO EN CI / P0 ACTIVO

### Punto de partida

HEAD auditado al comenzar esta entrada: `070c3481de17384bba353affb17a0f33abc38213`.
PR: #2.
Branch: `fix/native-windows-foundation`.

### Estado canónico

- Ingeniería: **~71%**
- Producto usable/end-user: **~58%**
- Seguimiento global: **~65%**
- Producción: **NO listo**

No se incrementa el porcentaje porque esta iteración no cerró un gate de validación Windows/hardware/producción.

### Auditoría de continuidad

Se revisaron antes de modificar cualquier componente:
- `PROJECT_STATUS.md`
- `ENGINEERING_LOG.md`
- `CHANGELOG_ENGINEERING.md`
- `AUDIT_MATRIX.md`
- este archivo `BITACORA.md)

Los siguientes sistemas se consideran cerrados o con implementación consolidada y no deben rehacerse sin regresión demostrable:
- Windows Graphics Capture;
- WASAPI + AudioTimelineMixer;
- MediaClock + RealtimePacer + MediaInterleaver;
- FaceTracker/FaceTrackingBridge;
- ThreeAvatarRenderer;
- D3D11Compositor experimental;
- FFmpeg supervisor;
- RawPipe;
- OutputRetryPolicy;
- OutputFailureCategory;
- Electron security foundation;
- OBS optional bridge;
- Twitch EventSub/EventBus/ActionStore;
- asset registry GLB/GLTF;
- validador de continuidad.

### Investigación relevante

La documentación actual de FFmpeg confirma que:
- `AVCodecContext::hw_frames_ctx` es la vía para proporcionar frames hardware a un encoder;
- `AVHWFramesContext` describe el pool de superficies hardware;
- el backend D3D11VA expone `AV_PIX_FMT_D3D11`;
- NVENC reconoce `AV_PIX_FMT_D3D11` en su configuración de frames hardware. citeturn420566search0turn420566search4turn420566search2

Microsoft documenta que D3D11.1 permite compartir Texture2D y que `IDXGIKeyedMutex` permite sincronizar acceso exclusivo cuando se usan recursos compartidos apropiadamente. citeturn293684search0turn293684search6

FFmpeg documenta que `av_interleaved_write_frame()` requiere PTS/DTS correctos en el timebase del stream y realiza el interleaving del muxer. Esto respalda mantener la ruta Libav como gate para PTS explícitos, en lugar de depender del transporte raw para conservar timestamps. citeturn293684search5turn293684search9

### Estado GPU

Existe:
- compositor D3D11;
- overlay GPU;
- frame final BGRA;
- smoke WARP;
- integración experimental del overlay al runtime.

Pero:
- el camino de producción todavía hace readback CPU del frame final;
- aún no existe validación Windows sostenida del camino D3D11 → encoder hardware;
- no se considera cerrado el gate GPU.

### Estado CI

Los workflows ya se ejecutan sobre la rama de desarrollo, pero los runs asociados al HEAD auditado siguen terminando:
- Native Windows Build: failure;
- CI: failure;
- Character Runtime Tests: failure;
- Actions Runner Diagnostic: failure.

Los jobs aparecen sin `steps` ni `logs_url` observables. No existe evidencia suficiente para atribuir el fallo al código. No se vuelve a modificar el media engine para ese motivo.

### NO REPETIR

- No reconstruir el compositor D3D11.
- No crear un segundo renderer Three.js.
- No crear otro tracker MediaPipe.
- No sustituir la ruta Libav por otra librería sin evidencia de que la actual sea inviable.
- No volver a diseñar MediaClock/RealtimePacer/Interleaver.
- No reintentar indefinidamente CI sin steps/logs.
- No considerar NVENC/D3D11 compatible en documentación como validación de hardware.
- No considerar el smoke Linux de FFmpeg como validación Windows.
- No considerar el fallback procedural como Cari V1 final.
- No subir el porcentaje por commits, archivos o líneas.

### Siguiente foco ejecutivo

P0 único:
1. cerrar el camino GPU → encoder sin readback CPU por frame;
2. preparar una prueba E2E Windows observable que mida composición, encoder, timestamps y estabilidad;
3. después promover/validar PTS Libav sobre Windows;
4. luego drift físico, FFmpeg sostenido y RTMP/reconexión;
5. finalmente Game Capture/hardware/distribución.

### Regla de continuidad

El siguiente arquitecto debe leer LOG-031 y continuar desde ese backlog. No debe volver a auditar desde cero los componentes listados en NO REPETIR salvo que exista una regresión reproducible.

---

## LOG-032 — Puente D3D11 -> FFmpeg hardware y gate de encoder

Fecha: 2026-09-21
Área: P0 GPU / Encoder / Auditoría / Continuidad
Estado: CODE_EXISTS / TEST PREPARADO / WINDOWS PENDIENTE

### Problema

El compositor D3D11 ya produce una textura BGRA final, pero el camino actual hacia FFmpeg todavía realiza readback CPU. Esto limita rendimiento y puede introducir stalls de GPU/CPU.

### Investigación

FFmpeg documenta que AVCodecContext::hw_frames_ctx describe las frames hardware suministradas al encoder y que el contexto debe corresponder al formato y dispositivo usado. 
FFmpeg documenta AVD3D11FrameDescriptor con la textura en AVFrame.data[0] y el índice de subrecurso en AVFrame.data[1]; la referencia de la textura es gestionada por AVBufferRef. 
FFmpeg expone AVCodecHWConfig y avcodec_get_hw_config() para consultar si un encoder admite un dispositivo/formato hardware concreto. 
El código actual de NVENC declara soporte para AV_PIX_FMT_D3D11 mediante HW_FRAMES_CTX; AMF también expone D3D11 en sus formatos compatibles. 

### Acción realizada

- Se creó d3d11_av_frame_bridge.h/.cpp.
- El bridge inicializa un contexto D3D11VA de FFmpeg sobre el ID3D11Device de Cari.
- Envuelve una textura D3D11 en un AVFrame con AV_PIX_FMT_D3D11.
- Conserva PTS explícito.
- Mantiene una referencia COM de la textura mediante AVBufferRef.
- No realiza readback CPU.
- Se añadió smoke de bridge D3D11.
- Se añadió smoke de encoder hardware que busca h264_nvenc o h264_amf, comprueba AVCodecHWConfig, abre el encoder con hw_frames_ctx, envía frames D3D11 y exige al menos un paquete con PTS.
- Los smoke están bajo CARI_ENABLE_LIBAV_OUTPUT=ON porque requieren headers/librerías de desarrollo FFmpeg.

### Evidencia

- CODE_EXISTS: PASS.
- Diseño respaldado por API oficial de FFmpeg: PASS.
- Smoke compilable en un entorno Windows con FFmpeg dev kit: PENDIENTE.
- Encoder hardware real: PENDIENTE.
- Windows/hardware objetivo: PENDIENTE.

### Riesgos

- El adapter D3D11 debe coincidir con el GPU que use el encoder; el smoke puede saltar si el dispositivo/driver/build no es compatible.
- La vida de la textura debe cubrir cualquier uso diferido del encoder.
- Device-loss/recreate requiere reconstruir el D3D11VA device/frame context.
- No se debe interpretar AV_PIX_FMT_D3D11 como garantía de disponibilidad de NVENC/AMF.
- Aún no se reemplaza el camino FFmpeg raw de producción.

### NO REPETIR

- No crear un segundo D3D11 compositor.
- No crear un segundo bridge D3D11/AVFrame.
- No sustituir Libav por otra librería hasta obtener evidencia de fallo de esta ruta.
- No declarar zero-copy de producción: la implementación elimina CPU readback, pero puede requerir sincronización/copy GPU según el diseño final.
- No declarar encoder hardware funcionando sin un smoke Windows que produzca paquetes.

### Siguiente acción

Integrar este bridge en LibavMediaOutput para el camino de video hardware y validar primero la apertura/compatibilidad del encoder, después la producción real de paquetes y finalmente el muxer/RTMP con PTS.


---

## LOG-033 — Output retry/diagnóstico y CI observable

Fecha: 2026-09-21
Área: Output / Resiliencia / CI / Continuidad
Estado: IMPLEMENTADO / TESTEADO PORTABLE / WINDOWS PENDIENTE

### Problema

La salida RTMP necesitaba distinguir fallos de red de fallos de encoder/mux/input/permiso para evitar reintentos ciegos. La CI además estaba disparándose en la rama de desarrollo pero terminaba antes de ejecutar steps.

### Acción realizada

- Se creó `core/output_retry.h` con backoff exponencial acotado: 1 s inicial, 30 s máximo y 5 intentos.
- Se creó `core/output_diagnostics.h` con clasificación de fallos.
- La clasificación se endureció para no tratar un `Broken pipe` genérico como fallo de red.
- `main.cpp` integra el retry únicamente para RTMP y solamente ante categoría `network`.
- El estado de retry y la categoría de fallo se exponen en el status nativo/UI.
- Se añadió límite de 8 eventos multimedia por polling y métrica `pacing_budget_exhausted`.
- Los workflows se configuraron para la rama de desarrollo y `workflow_dispatch`.
- La corrección del serializado `output` evita un campo vacío en el status.

### Pruebas

- Smoke de retry policy: PASS portable.
- Smoke de clasificación de errores: PASS portable, incluyendo rechazo de `Broken pipe` como networking genérico.
- CI sigue sin producir steps/logs observables.

### Resultado

PARTIAL: resiliencia y diagnóstico están implementados, pero la reconexión RTMP real continúa sin validación Windows/servicio externo.

### NO REPETIR

- No crear otro sistema de retry.
- No clasificar `Broken pipe` como red sin evidencia contextual.
- No modificar MediaGraph para arreglar un run de Actions que no alcanza steps.
- No duplicar métricas de output.

### Siguiente acción

Mantener el retry detrás del gate de RTMP real; avanzar en el camino GPU → encoder y en E2E Windows observable.


---

## LOG-034 — D3D11 texture → Libav hardware output

Fecha: 2026-09-21
Área: P0 GPU / Encoder / PTS
Estado: CODE_EXISTS / SMOKE PREPARADO / WINDOWS-HARDWARE PENDIENTE

### Problema

El compositor D3D11 ya podía generar una textura final, pero la ruta Libav usaba conversión/readback CPU para vídeo. Eso dejaba abierto el principal cuello de botella de GPU→CPU→encoder.

### Investigación

La documentación oficial actual de FFmpeg define `AVCodecContext::hw_frames_ctx` como la referencia al `AVHWFramesContext` que describe las frames hardware suministradas al encoder, y exige establecerla antes de `avcodec_open2()`. FFmpeg también documenta el soporte D3D11/NVENC mediante `AV_PIX_FMT_D3D11` y `AV_CODEC_HW_CONFIG_METHOD_HW_FRAMES_CTX`. 

### Acción realizada

- `LibavMediaOutput` ahora tiene `start_d3d11()`, `submit_video_d3d11()` y `hardware_video_enabled()`.
- La configuración hardware exige que el encoder seleccionado anuncie D3D11 + HW_FRAMES_CTX.
- El `D3D11AvFrameBridge` existente se reutiliza; no se crea un segundo bridge.
- Las texturas D3D11 se envuelven en AVFrame con `AV_PIX_FMT_D3D11` y PTS explícito.
- El camino hardware evita la conversión BGRA→CPU dentro de `submit_video_d3d11_locked()`.
- Se creó `libav_d3d11_output_smoke.cpp` para generar un archivo A/V con encoder hardware cuando el entorno lo soporte.
- CMake registra el smoke únicamente bajo `CARI_ENABLE_LIBAV_OUTPUT=ON`.

### Resultado

PARTIAL: la integración existe y el smoke está preparado, pero la build FFmpeg-dev + GPU/driver Windows es condición necesaria para verificarla.

### Riesgos restantes

- Compatibilidad real del encoder con BGRA/D3D11 según build/driver.
- Sincronización de uso de texturas cuando la GPU productora y encoder trabajen concurrentemente.
- Device-loss/recreate.
- Integración con la captura WGC real y el compositor final.
- Mux/RTMP con timestamps hardware en Windows.

### NO REPETIR

- No crear otro D3D11 compositor.
- No crear otro D3D11→AVFrame bridge.
- No declarar zero-copy de producción por la sola presencia de `AV_PIX_FMT_D3D11`.
- No sustituir Libav hasta que el smoke Windows demuestre inviabilidad.

### Siguiente acción

Validar primero `CARI_ENABLE_LIBAV_OUTPUT=ON` con FFmpeg development kit en Windows; después integrar la superficie real del compositor/captura y medir CPU/GPU/readback.


---

## LOG-035 — Checkpoint de continuidad y estado CI/Git

Fecha: 2026-09-21
Área: Continuidad / CI / Integración
Estado: DOCUMENTADO / CI BLOQUEADA / INTEGRACIÓN DE HISTORIAL PENDIENTE

### Punto de control

- PR: #2.
- Rama: `fix/native-windows-foundation`.
- El último head debe consultarse en PR #2 para evitar referencias obsoletas entre commits documentales.
- Ingeniería canónica: **71%**.
- Producto usable/end-user: **58%**.
- Seguimiento global: **65%**.
- Producción: **NO listo**.

### Evidencia de CI

En los runs más recientes asociados al head auditado:
- Native Windows Build: failure; `build` y `electron-shell-check` sin steps/logs observables.
- Actions Runner Diagnostic: failure; `probe` sin steps/logs observables.
- CI: failure; matriz Python sin steps/logs observables.
- Character Runtime Tests: failure; matriz sin steps/logs observables.

El patrón se repite sobre heads consecutivos. No existe evidencia suficiente para atribuir un fallo a una línea concreta del repositorio.

### Git history

El compare de `main...fix/native-windows-foundation` muestra divergencia creciente mientras `main` recibe cambios por otra ruta. El estado actual observado es aproximadamente **1301 commits ahead / 67 behind**.

Decisión:
- no hacer rebase/force-push ni reescritura automática;
- conservar la historia hasta disponer de una operación de integración que preserve correctamente los cambios;
- no tratar esta divergencia administrativa como regresión del motor multimedia.

### NO REPETIR

- No volver a implementar WGC, WASAPI mixer, MediaClock/RealtimePacer/Interleaver, FaceTrackingBridge, renderer Three.js, RawPipe, FFmpeg supervisor, asset registry o D3D11 bridge sin regresión.
- No repetir los mismos reintentos de Actions sin steps/logs observables.
- No subir el porcentaje por cantidad de commits o archivos.
- No sustituir Libav/D3D11 por otra librería sin evidencia de inviabilidad.

### Siguiente foco único

P0:
1. validar en Windows la ruta Libav + D3D11 hardware;
2. conectar la superficie final real del compositor al encoder;
3. medir CPU/GPU/readback;
4. después cerrar PTS E2E y drift físico;
5. recién entonces avanzar a RTMP real, Game Capture, hardware final y distribución.

---

## LOG-036 — Auditoría de uso con OBS como streamer principal

Fecha: 2026-09-21
Área: OBS / Control Plane / Continuidad
Estado: IMPLEMENTADO / TEST CONTRATO / VALIDACIÓN OBS PENDIENTE

### Problema
Se necesitaba determinar si Cari Studio requiere reproducir las funciones internas de OBS para el uso previsto: OBS como streamer/encoder principal.

### Investigación
- OBS mantiene scenes/sources, Studio Mode, audio mixer, Game Capture, Virtual Camera, estadísticas y reconexión como funciones propias del streamer.
- obs-websocket 5.x ofrece RPC, eventos, subscriptions y batches.
- obs-websocket-js 5.0.8 es la versión de cliente actualmente fijada en el shell y su documentación incluye InputVolumeMeters y callBatch.
- El protocolo actual incluye mute/volume de inputs, Scene Items, Replay Buffer, outputs y requests de transición.

### Decisión
Cari funciona mejor en este escenario como control-plane VTuber especializado alrededor de OBS, no como un segundo frontend/encoder completo de OBS.

OBS queda como fuente de verdad para:
- encoder;
- muxing;
- RTMP/RTMPS;
- reconexión del stream;
- canvas/output;
- Game Capture;
- composición principal.

Cari aporta:
- avatar;
- tracking;
- acciones/reacciones;
- chat/EventSub;
- automatización;
- hotkeys;
- control de escenas;
- control operativo de audio;
- observabilidad.

### Acción realizada
- OBS_USAGE_AUDIT.md creado como matriz de readiness para el escenario companion.
- ObsService ampliado con InputVolumeMeters, mute/volume, Scene Items enable/disable, Replay Buffer, transición de escena mediante callBatch, guard durante cambios de Scene Collection, reconexión WebSocket con backoff acotado y versión OBS WebSocket/RPC negociado en status.
- IPC y preload ampliados con esos comandos.
- UI añadida con Replay Buffer y controles operativos de inputs.
- Corregido el envelope de eventos OBS entre Electron Main y Renderer mediante eventType.
- Test de contrato actualizado para proteger el envelope y los nuevos comandos.

### Resultado
PARTIAL: el alcance funcional del companion ya cubre el mínimo necesario para un streamer OBS, pero faltan pruebas sobre OBS real, caída/reinicio del proceso y sesiones prolongadas.

### Riesgos restantes
- La voz procesada por Cari aún necesita una ruta validada hacia OBS si se desea que el audio DSP sea la fuente emitida.
- El overlay transparente de Cari es un puente de integración, no todavía una textura nativa compartida con el compositor de OBS.
- OBS stream reconnect y Cari WebSocket reconnect son mecanismos diferentes y deben mantenerse separados.
- InputVolumeMeters es un evento de alta frecuencia y debe mantenerse limitado al uso operativo necesario.

### NO REPETIR
- No implementar un segundo encoder para el modo companion.
- No reemplazar el sistema de escenas de OBS por otro paralelo.
- No crear otro cliente WebSocket.
- No crear otro mixer de streaming para OBS.
- No reimplementar la reconexión del stream de Twitch/YouTube que ya gestiona OBS.
- No reauditar WGC/WASAPI/MediaClock/MediaPipe/Three.js/FFmpeg supervisor salvo regresión o nueva evidencia.

### Siguiente acción
1. Ejecutar prueba real contra OBS con contraseña y RPC 1.
2. Validar Start/Stop Stream + Scene + Studio Mode + Record.
3. Validar mute/volume y Replay Buffer.
4. Reiniciar OBS y verificar reconexión de Cari.
5. Cambiar Scene Collection y verificar que el guard evita requests durante el cambio.
6. Hacer sesión larga avatar + tracking + OBS y medir CPU/GPU/memoria.
7. Mantener en paralelo el gate P0 GPU compositor → encoder para el modo standalone.
---

## LOG-037 — OBS companion control surface

Fecha: 2026-09-21
Área: OBS / Electron / UI / Continuidad
Estado: IMPLEMENTADO / CONTRATO TESTEADO / VALIDACIÓN OBS REAL PENDIENTE

### Problema
El uso previsto puede ser OBS como streamer principal. La base debía permitir que Cari controle el flujo diario sin intentar reemplazar el encoder/mux/reconnect nativos de OBS.

### Acción
- Se auditó OBS oficialmente y se creó OBS_USAGE_AUDIT.md.
- Se amplió ObsService con EventSubscription.InputVolumeMeters, mute/volume de inputs, Scene Items, Replay Buffer, transición por callBatch, guard durante Scene Collection changes y reconexión WebSocket acotada.
- Se añadió preservación del password solamente en memoria durante la sesión para que el reconnect no pierda autenticación.
- IPC/preload se ampliaron de forma explícita; no se expuso un call genérico al renderer.
- UI incorporó controles Replay Buffer y controles operativos de audio.
- Se corrigió el envelope OBS Main → Renderer: event.type permanece obs.event y el nombre real viaja en eventType.
- ui-obs-contract.test.mjs se amplió para detectar regresiones del envelope y los comandos nuevos.

### Investigación externa
- OBS WebSocket está integrado en OBS Studio moderno.
- obs-websocket-js 5.0.8 es la versión fijada del cliente y su documentación actual soporta connect con event subscriptions y callBatch.
- InputVolumeMeters es high-volume y debe suscribirse deliberadamente.

### Resultado
PARTIAL: la superficie de control es suficiente para el flujo diario básico, pero aún no existe validación Windows/OBS real ni sesión prolongada.

### NO REPETIR
- No duplicar encoder/mux/RTMP de OBS en modo companion.
- No crear otro scene manager paralelo.
- No crear otro audio mixer de streaming para OBS.
- No crear otro cliente WebSocket.
- No implementar el reconnect de Twitch/YouTube dentro de Cari cuando OBS es el streamer principal.
- No reabrir WGC/WASAPI/timing/tracker/renderer/FFmpeg supervisor sin regresión.

### Siguiente foco
1. Validar OBS real + contraseña + RPC 1.
2. Validar escenas, Studio Mode, record, replay, mute/volume.
3. Validar caída/reinicio de OBS y reconexión de Cari.
4. Validar Scene Collection change guard.
5. Validar sesión prolongada.
6. Retomar P0 GPU compositor → encoder y PTS E2E del modo standalone.

---

## LOG-038 — OBS Scene Items

Fecha: 2026-09-21
Área: OBS / UI / Control Plane
Estado: IMPLEMENTADO / CONTRATO TESTEADO / VALIDACIÓN OBS REAL PENDIENTE

### Problema

El control diario con OBS todavía tenía un hueco MUST: activar/desactivar elementos concretos dentro de una escena.

### Acción

- Se agregó un panel Scene Items al centro OBS.
- El panel reutiliza ObsService.getSceneItems() y setSceneItemEnabled(); no se crea otro Scene Manager.
- Al seleccionar una escena se consulta su lista de items y cada item puede mostrarse/ocultarse.
- El flujo sigue protegido por el guard de cambio de Scene Collection.

### Resultado

PARTIAL: control operativo cubierto a nivel de código/UI; falta validación con una instancia OBS real y una sesión prolongada.

### NO REPETIR

- No crear otro Scene Manager.
- No duplicar el estado de escenas dentro de Cari cuando OBS sea la fuente de verdad.
    - No implementar nuevamente Scene Item visibility salvo nueva regresión.

### Siguiente acción

Validar en OBS real junto con Replay Buffer, mute/volume, Studio Mode, reconexión y sesión larga.


---

## LOG-039 — Bitácora maestra + resiliencia de output + continuidad CI

Fecha: 2026-09-21
Área: Continuidad / Output / CI / Auditoría
Estado: IMPLEMENTADO / TEST PREPARED / WINDOWS PENDIENTE

### Problema

La memoria de ingeniería tenía que absorber los cambios recientes sin crear otra bitácora paralela y sin volver a abrir subsistemas ya cerrados.

### Acción realizada

- Se confirma `experimental/studio/BITACORA.md` como memoria canónica.
- Se mantienen `ENGINEERING_LOG.md`, `CHANGELOG_ENGINEERING.md`, `PROJECT_STATUS.md` y `AUDIT_MATRIX.md` como documentos especializados que deben quedar sincronizados.
- Output resiliente:
  - `OutputRetryPolicy` con backoff acotado 1s → 2s → 4s… hasta 30s.
  - máximo de 5 intentos;
  - retry solamente para fallos clasificados como `network`;
  - encoder/mux/input/permission no se reintentan automáticamente.
- Diagnóstico:
  - `OutputFailureCategory`;
  - estado y código de salida de FFmpeg;
  - stderr retenido con límite de 256 KiB;
  - métricas de retries/failure category expuestas al runtime/UI.
- Sesión/media:
  - orden global A/V por PTS;
  - máximo de 8 eventos por polling;
  - backpressure de arranque;
  - rechazo de cambios de formato de audio durante una salida.
- CI:
  - workflows preparados para push en la rama de desarrollo y `workflow_dispatch`;
  - Native Windows Build ejecuta explícitamente los smoke tests de retry y diagnóstico.

### Investigación vigente

La arquitectura mantiene el patrón modular de OBS: sources → composición → encoder → output. OBS documenta que los outputs pueden recibir datos raw o encoded y que el sistema mantiene una cola/interleave temporal para los paquetes A/V. citeturn852340search0turn852340search5

Para GPU/FFmpeg, `AVCodecContext::hw_frames_ctx` representa el contexto de frames hardware usado por el encoder, y `AVHWFramesContext` exige formato hardware y formato de almacenamiento subyacente. citeturn852340search6turn852340search10

Para recursos D3D11 compartidos, Microsoft recomienda recursos con NT handles y documenta `IDXGIKeyedMutex` para sincronización cuando se comparte una textura entre dispositivos. citeturn852340search1turn852340search3

### Evidencia

- Smoke portable de retry/diagnóstico: PASS.
- Smoke portable de MediaClock/RealtimePacer/MediaInterleaver: PASS.
- FFmpeg sintético BGRA + PCM → H.264/AAC → Matroska: PASS en entorno Linux.
- Validación Windows/hardware: pendiente.
- CI disponible en la rama de desarrollo sigue terminando antes de registrar steps/logs observables; no se marca CI verde.

### Estado canónico

- Ingeniería: **~71%**
- Producto usable/end-user: **~58%**
- Seguimiento global: **~65%**
- Producción: **NO listo**

### Riesgos restantes

- PTS explícito extremo a extremo dentro del transporte;
- GPU compositor → frame final → encoder sin readback CPU por frame;
- D3D11/encoder hardware real en Windows;
- cámara/Game Capture;
- drift físico;
- OBS real y sesión prolongada;
- RTMP/red real;
- hardware objetivo.

### NO REPETIR

- No crear otra bitácora de continuidad.
- No rediseñar WGC/WASAPI/MediaClock/MediaPipe/Three.js/FFmpeg supervisor sin regresión.
- No duplicar el cliente OBS ni el scene manager.
- No reimplementar retry sin nueva evidencia.
- No declarar CI verde mientras los jobs no entreguen steps/logs ejecutados.

### Siguiente foco

P0: conseguir evidencia Windows observable para la ruta D3D11 → Libav/encoder y, en paralelo, cerrar la validación real de avatar/tracking/OBS sin reabrir los componentes ya establecidos.

---

## LOG-040 — Evidencia CI actual y cierre de continuidad

Fecha: 2026-09-21
Área: CI / Continuidad
Estado: INFRASTRUCTURE BLOCKED

### Problema

Las ejecuciones de validación debían demostrar que las modificaciones recientes podían atravesar checkout, configuración, build y tests. GitHub Actions sigue finalizando los jobs antes de exponer pasos o logs.

### Evidencia actual

HEAD auditado: `eab7897a5c971a64acc9c31cdf5c4557ffaf4b8f`.

Runs asociados al HEAD:
- Native Windows Build: `failure`.
- CI: `failure`.
- Character Runtime Tests: `failure`.
- Actions Runner Diagnostic: `failure`.

Jobs:
- Native Windows `build`: `failure`, `steps=null`, `logs_url=null`.
- Native Windows `electron-shell-check`: `failure`, `steps=null`, `logs_url=null`.
- CI Python 3.11/3.12: `failure`, `steps=null`, `logs_url=null`.
- Character Runtime Python 3.11/3.12: `failure`, `steps=null`, `logs_url=null`.
- Runner diagnostic `probe`: `failure`, `steps=null`, `logs_url=null`.

### Decisión

No se modifica código funcional para perseguir estos failures mientras no exista un step/log que identifique un fallo de compilación, dependencia, test o runner.

### NO REPETIR

- No rehacer WGC.
- No rehacer WASAPI/mixer.
- No rehacer MediaClock/Pacer/Interleaver.
- No rehacer MediaPipe tracker.
- No rehacer Three.js renderer.
- No rehacer FFmpeg supervisor.
- No seguir cambiando código solo porque Actions devuelve `failure` sin steps/logs.

### Siguiente foco

Continuar con el backlog P0 real: validación Windows del camino D3D11 → Libav/encoder, compositor final del avatar y validación OBS real/sesión larga. La corrección de CI se retoma únicamente cuando aparezca evidencia observable del runner.

---

## LOG-041 — Continuidad ejecutable y auditoría de CI

Fecha: 2026-09-21
Área: Continuidad / Testing / CI
Estado: IMPLEMENTADO / TEST DEFINIDO / CI INFRASTRUCTURE BLOCKED

### Problema

La memoria canónica ya contenía reglas de anti-repetición y porcentajes, pero esas reglas necesitaban una comprobación ejecutable para evitar divergencias entre BITACORA, PROJECT_STATUS, ENGINEERING_LOG y CHANGELOG.

Durante la auditoría también apareció una inconsistencia histórica: algunos registros apuntaban al validador dentro de experimental/studio/tools, mientras que una modificación reciente había intentado crear otro validator en la raíz.

### Investigación

- La ruta canónica existente es experimental/studio/tools/verify_bitacora.py.
- GitHub Actions admite múltiples eventos de workflow mediante el bloque on y documenta workflow_dispatch como disparador manual. La ejecución manual requiere que el workflow exista en la rama por defecto; por eso el push sobre la rama de desarrollo continúa siendo la evidencia automática principal. citeturn107109search0
- La observabilidad de Actions sigue siendo insuficiente para validar compilación porque los jobs recientes terminan con steps/logs no observables.

### Decisión

Mantener un único validador real en experimental/studio/tools/verify_bitacora.py.

tools/verify_bitacora.py queda solamente como API/entrada de compatibilidad para conservar referencias existentes, sin duplicar la lógica.

### Implementación

- El validator canónico comprueba:
  - existencia de la memoria requerida;
  - sección # NO REPETIR;
  - existencia de entradas LOG-*;
  - IDs sin duplicados y en orden monotónico;
  - porcentajes canónicos iguales entre BITACORA y PROJECT_STATUS;
  - secciones mínimas de cada LOG;
  - declaración de continuidad en ENGINEERING_LOG;
  - presencia del último LOG en ENGINEERING_LOG;
  - regla de no usar cantidad de commits como métrica de progreso;
  - comparación opcional del HEAD documentado cuando se proporciona --head.
- Se añadió cobertura unittest para casos válidos, IDs duplicados, deriva de porcentajes y deriva de HEAD.
- CI ejecuta el validator canónico y la suite unittest de continuidad.
- Se eliminó el test duplicado de raíz.
- No se añade un segundo sistema de memoria.

### Resultado

PARTIAL.

La gobernanza de continuidad ya es código ejecutable y tiene tests definidos. Falta la ejecución observable de esos tests en GitHub Actions porque los runners continúan fallando antes de registrar steps/logs.

### Evidencia actual

- HEAD auditado antes de esta actualización documental: 313baa3be82ece0e6cbe2d2699bfad8bf9fe170b.
- Native Windows Build, CI, Character Runtime Tests y Actions Runner Diagnostic del mismo ciclo siguen terminando failure con steps=null/logs no disponibles.
- No se aumenta el porcentaje por la existencia del validator: Ingeniería 71%, Producto usable 58%, Seguimiento 65%.

### Riesgos

- Si alguien ejecuta el root wrapper desde una distribución parcial sin la carpeta experimental completa, la compatibilidad fallará; eso es preferible a mantener dos implementaciones.
- El validator detecta deriva documental, no puede demostrar por sí mismo que el código multimedia funciona en Windows.
- El HEAD documentado representa el último estado auditado y no debe confundirse con la identidad del commit que modifica la propia bitácora.

### NO REPETIR

- No crear otro validador de continuidad.
- No volver a crear otra BITACORA paralela.
- No convertir el validator en sustituto de tests funcionales.
- No modificar WGC, WASAPI, timing, tracker, renderer, FFmpeg o D3D11 por un failure de Actions sin steps/logs.
- No usar cantidad de commits para aumentar el porcentaje.

### Siguiente acción

P0 continúa sin cambiar: conseguir evidencia Windows observable para D3D11 → Libav/encoder y el E2E final; en paralelo, validar OBS real y sesión prolongada. La continuidad ya tiene un mecanismo ejecutable, por lo que no debe volver a tratarse como tarea de diseño.

## LOG-042 — Retry RTMP: presupuesto persistente y checkpoint de CI

Fecha: 2026-09-21
Área: Output / Resiliencia / Continuidad / CI
Estado: IMPLEMENTADO / SMOKE DEFINIDO / CI BLOQUEADA

### Problema
La política OutputRetryPolicy ya existía y distinguía fallos de red de encoder/mux/input/permission, pero la revisión encontró que el camino de reconexión automática podía reiniciar el contador de intentos al volver a ejecutar StartOutput(). Eso podía invalidar el límite de intentos.

### Acción realizada
- StartOutput() distingue sesión manual de reconexión automática mediante reset_retry_on_success.
- Una nueva sesión manual limpia el presupuesto de retry.
- Una reconexión automática exitosa conserva los intentos realizados.
- El contador se limpia después de una sesión estable durante el período configurado.
- Se mantienen los smoke tests de OutputRetryPolicy y OutputFailureCategory.

### Archivos
- experimental/studio/native-windows/main.cpp
- experimental/studio/core/output_retry.h
- experimental/studio/core/output_retry_smoke.cpp
- experimental/studio/core/output_diagnostics.h
- experimental/studio/core/output_diagnostics_smoke.cpp
- experimental/studio/native-windows/CMakeLists.txt
- workflows de GitHub Actions relacionados

### Resultado
PASS — corrección lógica integrada.

### Evidencia CI del HEAD
HEAD auditado de esta iteración: f49c882a2982e7eed38ec4f6a8d72a8da7c90931.
- Native Windows Build: failure
- CI: failure
- Character Runtime Tests: failure
- Actions Runner Diagnostic: failure
- Installer workflow: failure
Los jobs consultados devuelven steps=null y no ofrecen logs observables. CI continúa bloqueada por observabilidad del runner y no se atribuyen estos failures al código.

### Riesgos restantes
- La reconexión RTMP no está validada contra una caída de red real.
- El transport raw sigue sin transportar PTS explícitos.
- El compositor GPU → encoder continúa siendo experimental.
- Falta validación Windows/hardware de la cadena completa.

### NO REPETIR
- No volver a diseñar OutputRetryPolicy.
- No reiniciar el contador de retry durante reconexión automática.
- No reintentar encoder/mux/input/permission como si fueran fallos de red.
- No tocar WGC/WASAPI/MediaClock/MediaPipe/Three.js/FFmpeg supervisor sin regresión demostrada.
- No modificar código por un failure de Actions mientras el job no muestre steps/logs reproducibles.

### Siguiente acción
P0: obtener evidencia Windows observable del camino D3D11 → Libav/encoder y del E2E final; después validar sesión prolongada, PTS E2E y drift físico.

## LOG-043 — D3D11 compositor -> Libav runtime sin readback CPU por frame

Fecha: 2026-09-21
Área: GPU compositor / encoder / PTS / output
Estado: CODE_EXISTS / TEST_PREPARED / WINDOWS_PENDING

### Problema

El compositor D3D11 ya generaba una textura GPU final, pero el runtime principal seguía entregándola a la frontera raw FFmpeg mediante readback CPU. Entregar directamente la textura reusable al encoder también podía permitir aliasing mientras el compositor reutilizaba ese recurso.

### Investigación

Se revisó la API oficial de FFmpeg para AVHWFramesContext, av_hwframe_get_buffer(), AV_PIX_FMT_D3D11 y el contexto D3D11VA. La ruta elegida obtiene superficies desde el pool hardware de FFmpeg y copia el resultado compuesto GPU->GPU.

### Decisión

Usar:

    D3D11Compositor output_texture
        -> av_hwframe_get_buffer
        -> textura propiedad del pool FFmpeg
        -> ID3D11DeviceContext::CopyResource
        -> AVFrame AV_PIX_FMT_D3D11 con PTS explícito
        -> encoder H.264 D3D11
        -> libavformat

El backend raw FFmpeg CLI continúa como default.

### Implementación

- Añadido LibavRuntimeBackend como frontera separada.
- CARI_ENABLE_LIBAV_OUTPUT=ON habilita el backend en el ejecutable.
- CARI_OUTPUT_BACKEND=libav-d3d11 lo selecciona en runtime.
- Selección de encoder restringida a h264_nvenc/h264_amf con D3D11 + HW_FRAMES_CTX.
- Arranque diferido hasta disponer del dispositivo D3D11 del frame real.
- D3D11AvFrameBridge::copy_texture_to_hwframe() obtiene una superficie del pool y hace copia GPU->GPU.
- LibavMediaOutput::submit_video_d3d11() usa el frame del pool.
- El camino libav-d3d11 evita copy_output_to_cpu() para el frame final.
- Añadidos estado, encoder y contadores Libav a status.
- Añadida LIBAV_D3D11_RUNTIME.md.

### Pruebas

- Timing/interleaver y retry/diagnóstico: PASS en evidencia previa.
- FFmpeg sintético BGRA + PCM -> H.264/AAC -> Matroska: PASS en Linux.
- Smokes D3D11/Libav: registrados cuando CARI_ENABLE_LIBAV_OUTPUT=ON.
- Windows/hardware: PENDIENTE.

### Resultado

PARTIAL.

El riesgo de aliasing de la textura reusable queda tratado en código mediante frames propios del pool y CopyResource. Todavía no existe evidencia WINDOWS_VERIFIED ni HARDWARE_VALIDATED.

### Riesgos restantes

- encoder D3D11 real disponible en el FFmpeg de Windows;
- driver/GPU y creación del hardware-frame pool;
- PTS y paquetes codificados sostenidos;
- shutdown/flush del encoder hardware;
- A/V sync y drift físico;
- overlay avatar todavía capturado por CPU;
- RTMP real no validado.

### Siguiente acción

P0: ejecutar libav-d3d11 en Windows observable, comprobar frames/PTS/paquetes, archivo final, ausencia de readback CPU del frame final y estabilidad sostenida.

### NO REPETIR

- No volver a entregar directamente la textura reusable del compositor a Libav.
- No crear otro bridge D3D11->AVFrame.
- No crear otro compositor GPU.
- No rediseñar WGC, WASAPI, MediaClock/RealtimePacer/Interleaver, MediaPipe, Three.js o FFmpeg supervisor sin regresión.
- Mantener raw FFmpeg CLI como fallback separado.

### HEAD auditado antes de este registro

`a29b3d13b36dceb667e06127ce50362e2f1b732e`


## LOG-044 — Inventario de archivos Cari Studio / Cari VTuber

Fecha: 2026-09-21
Área: Continuidad / Inventario / Arquitectura
Estado: INVENTARIADO

### Propósito
Registrar la estructura real existente para que futuras iteraciones no vuelvan a descubrir o reconstruir módulos ya implementados.

### Cari Studio — módulos actualmente presentes
- Native Windows: Windows Graphics Capture, D3D11, WASAPI, Media Foundation camera, media graph, RawPipe, FFmpeg CLI y backend Libav/D3D11 experimental.
- GPU media path: d3d11_compositor.*, d3d11_av_frame_bridge.*, avatar_gpu_overlay.*.
- Output: ffmpeg_av_output.*, libav_media_output.*, libav_runtime_backend.*, multi_stream_output.*, ffmpeg_named_pipe_e2e_smoke.cpp.
- Timing/audio: media_clock.*, media_scheduler.*, audio_clock_drift.*, audio_timeline_mixer.*.
- Electron shell: native-engine.js, session-manager.js, studio-controller.js, obs-service.js, renderer/main.js.

### Cari VTuber — módulos actualmente presentes
- Canon/personaje: CARI_CHARACTER_BIBLE.md.
- Dirección artística: VTUBER_CARI_ART_DIRECTION.md.
- Gate de calidad: ART_QUALITY_GATE.md.
- Estrategia de assets: VTUBER_ASSET_STRATEGY.md.
- Tracking: face-tracker.js, face-tracking-bridge.js, tracking-profile.js.
- Acting/avatar: acting-bridge.js, avatar-contract.js, activity-motion.js, activity-presets.js, action-store.js.
- Render: three-avatar.js, overlay-main.js, overlay.html, asset-registry.js.
- Voz/lip-sync: audio-lipsync.js, local-speech-controller.js, speech-activity.js.
- Backend adicional: experimental/avatar/vrm-web/ y adaptador Live2D sin runtime propietario distribuido.
- Catálogo de personajes runtime: app/characters/profile_catalog.py.

### Regla de continuidad
Antes de crear un módulo nuevo, revisar este inventario y las entradas anteriores. Si ya existe, extenderlo o corregirlo solo con evidencia nueva.

### HEAD del repositorio al actualizar esta entrada
b468e77d5b88802daf66aec63b96c2bb029a3aa4

### Porcentaje
Los porcentajes documentados en la cabecera de esta bitácora siguen siendo el último corte auditado. No se modifican solo por contar archivos; una nueva cifra requiere una auditoría de gates.

### NO REPETIR
- No crear un segundo compositor D3D11.
- No crear otro bridge D3D11 -> AVFrame.
- No crear otro tracker MediaPipe paralelo.
- No crear otro overlay Three.js paralelo.
- No crear otro sistema de calibración/smoothing.
- No copiar un runtime Live2D propietario al repositorio.

## LOG-045 — Cari V1 asset package / continuidad anti-repetición

Fecha: 2026-09-21
Área: VTuber / Arte / Rigging / Continuidad
Estado: IMPLEMENTADO (SPEC) / VALIDACIÓN DE ARTE PENDIENTE

### Problema

El repositorio tenía dirección artística y un fallback V0 funcional, pero faltaba convertir la intención visual de Cari en un paquete de producción inequívoco para artista/rigger. Sin ese contrato, el arte podía llegar con capas fusionadas, huecos ocultos, nombres inestables o controles acoplados a un backend concreto.

### Investigación

Se revisaron:
- CARI_CHARACTER_BIBLE.md;
- VTUBER_CARI_ART_DIRECTION.md;
- VTUBER_ASSET_STRATEGY.md;
- ART_QUALITY_GATE.md;
- renderer Three.js existente y asset registry;
- documentación oficial de Live2D sobre ArtMesh, deformers y parámetros. citeturn110457search0turn110457search10turn110457search12
- documentación oficial de Inochi2D sobre modelos, licencias y rigging. citeturn347179search1turn347179search9

### Decisión

No crear otro renderer ni otro sistema de avatar.
El asset V1 debe ser backend-neutral:

arte
→ capas 2D
→ Inochi2D/Live2D adapter

o

arte
→ authoring 3D
→ GLB/glTF/VRM
→ ThreeAvatarRenderer

El contrato de actuación permanece fuera del asset.

### Implementación

Se añadió:
- assets/cari/2d/CARI_2D_ASSET_MASTER_SPEC.md;
- assets/cari/2d/layer-manifest.json;
- assets/cari/2d/parameter-manifest.json;
- assets/cari/2d/EXPRESSION_SHEET_SPEC.md;
- assets/cari/2d/ARTIST_RIGGER_DELIVERY_CHECKLIST.md;
- assets/cari/2d/README.md;
- assets/cari/3d/CARI_3D_ASSET_MASTER_SPEC.md;
- assets/cari/3d/README.md;
- assets/cari/ASSET_LICENSE.md;
- experimental/studio/tools/validate_cari_asset.py;
- experimental/studio/tests/test_validate_cari_asset.py;
- CI con validación explícita del manifest.

El manifest canónico contiene las piezas solicitadas:
head, hair_back, hair_side_L, hair_side_R, hair_front, ahoge, eye_L, eye_R, iris_L, iris_R, pupil_L, pupil_R, brow_L, brow_R, mouth, nose_bandage, torso, shirt, arm_L, arm_R, hand_L, hand_R, leg_L, leg_R, shorts, shoe_L, shoe_R, ponytail; neck queda como soporte.

El validator comprueba schema, IDs únicos, grupos, cobertura de piezas, especificaciones de capas y parámetros únicos.

### Resultado

PASS en contrato estructural.
PARTIAL en asset: el arte V1 real todavía no existe; el V0 continúa como fallback.

### Evidencia

- Inochi2D mantiene software/runtime bajo BSD-2-Clause; la licencia del modelo producido la decide el creador/usuario. citeturn347179search0turn347179search1
- Live2D documenta ArtMeshes y deformers como base del rigging 2D. citeturn110457search0turn110457search10
- Three.js GLTFLoader mantiene glTF 2.0 como ruta de carga del renderer. citeturn110457search1
- No se modificó el porcentaje global por cantidad de archivos: Ingeniería ~71%, Producto usable ~58%, Seguimiento ~65%.

### Riesgos restantes

- arte V1 final;
- revisión visual;
- turnaround;
- rigging real;
- tracking sobre V1;
- lip-sync;
- validación Windows/hardware;
- licencia final del arte y terceros.

### NO REPETIR

- No crear otro manifest de capas.
- No crear otro sistema de parámetros de avatar.
- No volver a diseñar la lista de partes base sin una nueva decisión de canon.
- No reemplazar el contrato neutral de actuación por IDs de Live2D/Inochi2D.
- No generar un modelo propietario dentro del repositorio como sustituto del asset final.
- No rehacer ThreeAvatarRenderer, FaceTrackingBridge o asset-registry por problemas de arte; extender sus contratos existentes.

### Siguiente acción

P0 exclusivo de VTuber: producir/revisar el arte V1 real conforme al manifest y luego probar rigging, expresiones, tracking y composición con el runtime existente.


## LOG-046 — Cari V1 asset package: cierre del contrato y bloqueo de repetición

Fecha: 2026-09-21
Área: VTuber / Arte / Rigging / Continuidad
Estado: IMPLEMENTADO (contrato) / ART V1 PENDIENTE

### Qué quedó cerrado

- Un único manifest canónico de capas en assets/cari/2d/layer-manifest.json.
- 28 piezas obligatorias + neck como soporte.
- Grupos de capas con orden explícito.
- Especificaciones por pieza para hidden fill, lineart y physics.
- Namespace de parámetros backend-neutral en parameter-manifest.json.
- Expression sheet de 8 estados mínimos.
- Checklist de artista/rigger.
- Package 2D y 3D con estructura de source/layers/exports.
- Registro de licencia.
- Validator automático y test integrados al CI.

### Evidencia

- Manifest estructural validado: IDs únicos, órdenes de grupo sin colisiones y cobertura total de piezas.
- Live2D: la documentación oficial confirma ArtMesh por capa, parámetros y deformers jerárquicos. citeturn110457search0turn110457search10
- Inochi2D: el proyecto mantiene BSD-2-Clause y declara que la licencia del modelo producido la determina el creador/usuario. citeturn347179search0turn347179search1
- Three.js: GLTFLoader soporta glTF 2.0 para la ruta 3D existente. citeturn110457search1

### No se modifica

Ingeniería ~71%, Producto usable ~58%, Seguimiento ~65%. El contrato del asset no sube el porcentaje porque todavía falta el arte real y su validación.

### NO REPETIR

- No crear otro manifest de capas.
- No crear otra convención de nombres.
- No crear otro sistema de parámetros.
- No crear otro renderer/tracker para resolver problemas artísticos.
- No rehacer la lista de piezas salvo cambio de canon.
- No interpretar el manifest como arte final.
- No declarar ART_READY por tener una especificación.

### Siguiente acción

Arte V1 real -> revisión visual -> rigging -> tracking -> composición -> validación.


## LOG-047 — Pipeline Blender FBX → VRM 1.0

Fecha: 2026-09-21
Área: VTuber / Blender / VRM / Rigging / Continuidad
Estado: IMPLEMENTADO / TEST DEFINIDO / BLENDER PENDIENTE

### Problema

El proyecto ya tenía contrato 3D, renderer Three.js, tracking MediaPipe, manifest de parámetros y gate artístico, pero no tenía una ruta automatizada para convertir un FBX real en un VRM 1.0 auditable. Sin este pipeline, cada importación/rigging podía repetirse manualmente y perder el contrato de Cari.

### Investigación

Se verificó la API actual del VRM Add-on for Blender:
- bpy.ops.import_scene.vrm
- bpy.ops.export_scene.vrm
- armature.data.vrm_addon_extension
- VRM 1.0 metadata
- VRM 1.0 human bones
- MToon 1

También se verificó la API actual de Blender para bpy.ops.import_scene.fbx.

VRM 1.0 mantiene glTF 2.0 como base y define un conjunto humanoide obligatorio; el pipeline adopta esa estructura sin inventar bones faltantes.

### Implementación

Se creó un único pipeline de autoría:

experimental/studio/avatar-blender/

Archivos:
- cari_vrm_pipeline.py
- cari_v1_vrm_pipeline.json
- cari_vrm_binding.json
- CARI_VRM_PIPELINE_SPEC.md
- README.md
- run-cari-vrm-pipeline.ps1

Funciones:
- importación FBX;
- auditoría de meshes, polígonos, UV, armature y enlaces;
- reparación determinista de vértices sin influencia;
- normalización y límite de 4 influencias deformantes;
- aplicación opcional de rotación/scale de meshes;
- shape keys con namespace cari_*;
- placeholders explícitos para mouth/blink/expresiones;
- mapping Humanoid VRM 1.0;
- metadata VRM configurable;
- MToon 1 configurable;
- export VRM;
- reimport audit;
- reporte JSON;
- staging .blend.

Se añadió además:
- test contractual fuera de Blender;
- gate CI de py_compile;
- validación JSON del pipeline;
- documentación específica de arquitectura y estados de evidencia.

### Regla de seguridad artística

Los shape keys creados automáticamente son PLACEHOLDER. No se declaran como deformaciones faciales reales.

El pipeline no genera un modelo propietario, no copia runtimes Live2D/Cubism y no cambia el contrato de actuación backend-neutral.

### Evidencia

- La especificación y scripts fueron integrados al branch.
- El entorno de ejecución utilizado para esta auditoría no contiene Blender instalado; por eso la ejecución FBX→VRM y la reimportación todavía requieren Windows + Blender + VRM Add-on.
- El pipeline queda diseñado para continuar automáticamente en el entorno del usuario sin bloquear el proyecto por la ausencia local de Blender.
- El test de contrato y el py_compile quedan preparados para CI; la observabilidad de GitHub Actions sigue siendo el gate externo pendiente.

### Resultado

IMPLEMENTADO: pipeline de authoring.
PENDIENTE: ejecutar con FBX real, revisar arte/weights, completar shape keys, validar Humanoid/MToon, exportar y reimportar en Blender.

### NO REPETIR

- No crear otro pipeline Blender.
- No crear otro manifest de bones.
- No crear otro namespace de shape keys.
- No crear otro renderer Three.js.
- No crear otro tracker MediaPipe.
- No convertir placeholders en evidencia de rig facial real.
- No modificar porcentajes solo por cantidad de archivos.
- No copiar VRM Add-on ni Cubism Core al repositorio.

### Siguiente acción

P0 del avatar:
FBX real aprobado → ejecutar pipeline → corregir warnings/errors → completar rig facial → export VRM 1.0 → reimport audit → cargar en ThreeAvatarRenderer → tracking → lip-sync → compositor.



## LOG-048 — Endurecimiento del pipeline Blender/VRM y continuidad

Fecha: 2026-09-21
Área: VTuber / Blender / VRM 1.0 / Continuidad
Estado: IMPLEMENTADO / CONTRATO VERIFICADO / FBX REAL PENDIENTE

### Objetivo
Avanzar el P0 del avatar sin crear un segundo pipeline y sin bloquear el proyecto por la ausencia del FBX o Blender en el entorno de desarrollo.

### Investigación verificada
- La documentación oficial actual del VRM Add-on for Blender declara soporte de Blender 2.93–5.2 y API de automatización Python. citeturn791871search0turn791871search6
- Para Blender actual, la API documentada de importación FBX usa `bpy.ops.wm.fbx_import`; el pipeline conserva `bpy.ops.import_scene.fbx` como fallback compatible. citeturn791871search7turn791871search4
- El VRM 1.0 requiere exactamente los 15 human bones obligatorios definidos por la especificación: hips, spine, head, upper/lower arm + hand, upper/lower leg + foot en ambos lados. citeturn556625search0turn556625search1turn556625search3
- El Add-on expone expresiones VRM 1.0 con `morph_target_binds`, incluyendo presets `aa`, `happy`, `angry`, `sad`, `surprised`, `blink`, etc., y expresiones custom. citeturn666759search1

### Cambios implementados
- `cari_vrm_pipeline.py` selecciona automáticamente el importador FBX disponible.
- Las opciones de importación se filtran contra las propiedades RNA del operador, evitando enviar parámetros obsoletos a Blender 5.x.
- Auditoría adicional de UV y vertex groups.
- Auditoría de unicidad de assignments Humanoid.
- Validación de cadenas padre/hijo del Humanoid para los bones requeridos, permitiendo bones intermedios no humanoides.
- Nuevo `configure_expressions()`:
  - `aa` <- `cari_mouth_open`
  - `blink_left` <- `cari_blink_l`
  - `blink_right` <- `cari_blink_r`
  - `happy` <- `cari_happy`
  - `angry` <- `cari_angry`
  - `sad` <- `cari_sad`
  - `surprised` <- `cari_surprised`
  - `relaxed` <- `cari_sleepy`
  - custom `cari_embarrassed`
  - custom `cari_talking`
- Shape keys automáticos siguen marcados como PLACEHOLDER; el binding no se presenta como deformación facial real.
- Nuevo modo `--preflight` para revisar Blender/FBX/VRM APIs sin importar un FBX.
- Wrapper PowerShell admite `-Preflight`.
- Test contractual Python con AST/JSON asegura que no exista un segundo pipeline Blender y que config/binding mantengan el contrato.
- README y especificación VRM documentan el flujo real y la compatibilidad.

### Estado de evidencia
- CODE_EXISTS: confirmado.
- CONTRACT_VERIFIED: test contractual incorporado.
- WINDOWS_VERIFIED: pendiente.
- HARDWARE_VALIDATED: pendiente.
- PRODUCTION_VALIDATED: pendiente.
- FBX Cari V1 real: pendiente de disponibilidad del asset real.

### NO REPETIR
- No crear otro pipeline FBX→VRM.
- No crear otra convención de Humanoid.
- No crear otro sistema de expression bindings.
- No volver a revisar desde cero la API de importación FBX hasta que cambie la versión objetivo de Blender.
- No tratar placeholders como rig facial terminado.
- No declarar VRM listo sin export + reimport audit.
- No generar un avatar propietario como sustituto del FBX real.
- No crear un segundo renderer/tracker.

### Siguiente P0
FBX Cari V1 real → preflight → import → audit → reparación de warnings/errors → rig facial real → VRM export → reimport audit → ThreeAvatarRenderer → MediaPipe → lip-sync → compositor nativo.

### Porcentaje
No se incrementa el porcentaje global por cantidad de código. El checkpoint canónico permanece:
- Ingeniería ~71%
- Producto usable/end-user ~58%
- Seguimiento global ~65%


## LOG-049 — Corrección del preflight sin asset y cierre de continuidad P0

Fecha: 2026-09-21
Área: VTuber / Blender / CI / Continuidad
Estado: IMPLEMENTADO / CONTRATO VERIFICADO / FBX REAL PENDIENTE

### Hallazgo
El nuevo modo `--preflight` permitía omitir el FBX, pero la primera implementación evaluaba `Path(args.input)` antes de entrar al branch de preflight. El flujo se corrigió para que un preflight sin `--input` ni `--output` sea realmente ejecutable.

### Corrección
- `source` y `output` ahora se construyen condicionalmente.
- El preflight usa una salida lógica determinista solo para generar el nombre del reporte.
- La ejecución normal exige `--input` y `--output`.
- El wrapper PowerShell mantiene `-Preflight` sin exigir FBX.
- El test contractual ya bloquea regresiones del modo preflight y del operador FBX compatible.

### Estado P0 del avatar
IMPLEMENTADO:
- un único pipeline Blender;
- importador FBX compatible con Blender actual + fallback;
- auditoría geométrica/UV/skinning;
- reparación de weights;
- shape-key namespace;
- VRM 1.0 Humanoid;
- bindings de expressions;
- MToon/metadata;
- export/reimport audit;
- preflight sin asset.

PENDIENTE:
- FBX Cari V1 real;
- ejecución real del pipeline;
- revisión visual de pesos;
- autoría de deformaciones faciales reales;
- export + reimport sobre Windows;
- carga en ThreeAvatarRenderer;
- tracking;
- lip-sync;
- compositor final.

### NO REPETIR
- No crear otro `cari_vrm_pipeline.py`.
- No crear otro wrapper Blender.
- No volver a investigar el operador `bpy.ops.wm.fbx_import` salvo cambio de Blender objetivo.
- No convertir shape-key placeholders en rig facial terminado.
- No declarar VRM listo antes de export + reimport audit.
- No subir el porcentaje por contar archivos.

### Porcentaje canónico
El checkpoint global permanece:
- Ingeniería: ~71%
- Producto usable/end-user: ~58%
- Seguimiento global: ~65%
- Producción: NO listo

## LOG-050 — Integración 2D/PNGTuber + Twitch EventSub + VAD

Fecha: 2026-09-21
Área: Avatar 2D / Electron / Twitch / VAD / Continuidad
Estado: IMPLEMENTADO / VERIFICADO LOCAL / WINDOWS-RUNTIME PENDIENTE

### Objetivo

Conectar el Editor de Acciones 2D existente con un único runtime determinista de frames, de manera que comandos de chat, eventos EventSub, estado de voz local y selección manual usen la misma prioridad y el mismo reproductor de PNGs.

### Hallazgo previo

El Editor ya tenía AvatarActionStore, persistencia localStorage, subida/orden/borrado de frames, animación, SpeechActivityDetector, LocalSpeechController y Twitch EventSub en Electron.
El problema era que cada camino podía cambiar la expresión por separado. No existía un árbitro común para prioridad, duración y retorno al estado base.

### Implementación

Se creó experimental/studio/electron-shell/avatar/action-runtime.js con Avatar2DFramePlayer y StudioActionRouter.
Prioridades: manual=100, chat=80, evento=70, voz=30.
El runtime resuelve overrides por prioridad, aplica expiración determinista, reproduce loops usando durationMs, retorna al estado base y sincroniza AvatarActingBridge.
Los comandos soportados incluyen !happy, !angry, !talk, !silent, !neutral y aliases en español.
Los eventos soportados incluyen follow, subscribe, subscription gift/message, cheer, channel points, raid, stream online/offline y shared chat.

renderer/main.js ahora utiliza el nuevo reproductor y router; chat entra por handleChatMessage(), EventSub por handleTwitchEvent() y VAD por setVoiceActivity(). Se eliminó el timer paralelo del Editor.

### Persistencia

AvatarActionStore mantiene localStorage como fallback y añade hidratación desde disco, cola de persistencia y flush().
Electron Main persiste en app.getPath(userData)/avatar-actions/ con actions.json y frames por acción.
Se aplican límites de 24 frames por acción, 8 MiB por frame y PNG/JPEG/WebP, con escritura atómica del JSON.

### Twitch

Se ampliaron scopes y suscripciones EventSub para channel.follow v2, channel.subscribe v1, channel.subscription.gift v1, channel.subscription.message v1, channel.cheer v1 y channel.channel_points_custom_reward_redemption.add v1.
Los requisitos de autorización corresponden a la documentación actual de Twitch. citeturn568761search0

### Pruebas creadas

avatar/action-runtime.test.mjs verifica loops, prioridad chat > voz, expiración, retorno al base y comandos/eventos Twitch.
avatar/action-store.test.mjs verifica hydration, flush y fallback a localStorage.
package.json incluye las suites avatar/*.test.mjs y scripts/check-esm.cjs incluye action-runtime.js.

### Estado de evidencia

- CODE_EXISTS: confirmado.
- STATIC_REVIEW: confirmado.
- NODE_SYNTAX_CHECK: PASS para action-runtime.js, action-store.js y main.js auditado.
- TEST_PREPARED: confirmado.
- TEST_EXECUTED: PASS local — 4 tests de routing/frame player + 3 tests de persistence.
- WINDOWS_VERIFIED: pendiente.
- TWITCH_LIVE_VALIDATED: pendiente.
- HARDWARE_VALIDATED: pendiente.
- PRODUCTION_VALIDATED: pendiente.

### NO REPETIR

- No crear otro reproductor PNG/2D.
- No crear otro scheduler de frames para el Editor.
- No volver a conectar chat directamente a setAction(); debe pasar por StudioActionRouter.
- No duplicar VAD logic en el renderer.
- No volver a crear persistencia paralela de acciones fuera de AvatarActionStore + avatar-actions:*.
- No añadir EventSub nuevo al renderer sin pasar por el router.
- No considerar Twitch validado hasta una sesión real con OAuth y eventos recibidos.
- No considerar la integración 2D terminada para producción hasta comprobar render sostenido en Windows.

### Siguiente P0

1. Ejecutar Electron tests/checks y corregir errores de sintaxis o contrato.
2. Ejecutar una sesión Twitch real con follow/sub/gift/cheer/points.
3. Validar VAD real y continuidad talking/silent.
4. Integrar la capa 2D final con el compositor que alimenta el encoder.
5. Medir latencia/fps/memoria durante sesión prolongada.

### Porcentaje canónico

Se mantiene sin incremento artificial por volumen de código:
- Ingeniería: ~71%
- Producto usable/end-user: ~58%
- Seguimiento global: ~65%
- Producción: NO listo
## LOG-051 — Corrección del harness ESM del Action Store

Fecha: 2026-09-21
Área: Avatar 2D / Tests / Continuidad
Estado: CORREGIDO / VERIFICACIÓN LOCAL ACTUALIZADA

### Hallazgo

El test de persistencia copiaba avatar-contract.js con extensión .js dentro de un entorno de prueba CommonJS, aunque el contrato real es ESM. El comportamiento de producción no era el problema; el harness podía producir un fallo artificial por el sistema de módulos.

### Corrección

- action-store.test.mjs ahora convierte la dependencia a avatar-contract.mjs en el directorio temporal.
- El source de action-store se ajusta solo dentro del harness para apuntar a ese módulo ESM.
- No se modifica el módulo de producción por una limitación artificial del test.

### NO REPETIR

- No cambiar action-store.js a CommonJS solo para acomodar tests.
- No crear una segunda copia del avatar contract.
- No atribuir fallos de módulo del harness al runtime del avatar sin reproducirlos con la estructura real.

### Evidencia

- action-runtime: 4/4 tests locales PASS.
- action-store: 3/3 pruebas de comportamiento PASS sobre una réplica de ejecución ESM compatible.
- main.js auditado: node --check PASS.
- La ejecución completa npm test/check en el checkout GitHub sigue pendiente porque los runners disponibles terminan antes de registrar steps.

### Porcentaje canónico

- Ingeniería: ~71%
- Producto usable/end-user: ~58%
- Seguimiento global: ~65%
- Producción: NO listo
## LOG-052 — VAD estable sin reinicios por frame

Fecha: 2026-09-21
Área: Avatar 2D / VAD / Frame Player
Estado: CORREGIDO / VERIFICADO LOCAL

### Hallazgo

El loop de tracking consulta VAD en cada frame. Un router que vuelva a disparar talking/silent con el mismo estado reinicia el frameIndex y el timer continuamente, degradando la animación.

### Corrección

- Se separan voiceActive y voiceSpeaking.
- La activación inicial con speaking=false produce silent una sola vez.
- Mientras speaking no cambia, no se dispara otra acción ni se reinicia la secuencia.
- speaking=true produce talking y speaking=false produce silent.
- active=false libera completamente la capa de voz.

### Evidencia

- action-runtime: 5/5 tests locales PASS.
- node --check del runtime PASS.
- La optimización evita trabajo de render/timer redundante durante el polling por frame.

### NO REPETIR

- No llamar trigger('talking') o trigger('silent') en cada frame cuando el estado no cambió.
- No usar voiceSpeaking como sustituto de voiceActive.
- No crear un segundo VAD scheduler dentro del renderer.

### Porcentaje canónico

- Ingeniería: ~71%
- Producto usable/end-user: ~58%
- Seguimiento global: ~65%
- Producción: NO listo
## LOG-053 — Integración final del Editor 2D

Fecha: 2026-09-21
Área: Avatar 2D / Electron / Twitch / VAD / Persistencia / Overlay
Estado: CORREGIDO / IMPLEMENTADO / TEST PREPARADO / WINDOWS PENDIENTE

### Hallazgos nuevos

1. AvatarActionStore buscaba el bridge de persistencia en window.cari.avatarActions, pero el preload expone el servicio en window.cari.native.avatarActions. La consecuencia era fallback silencioso a localStorage y pérdida del objetivo de persistencia en userData.
2. El overlay transparente separado mostraba el renderer Three.js pero no recibía los frames del Editor 2D.
3. La ruta de eventos Twitch y chat estaba acoplada en el renderer a dos llamadas distintas del router.
4. El bloque twitch.event podía intentar evaluar una variable inexistente al activar TTS.
5. El test de prioridad voz/chat contenía una expectativa invertida respecto de la prioridad declarada.

### Correcciones

- action-store.js usa ahora window.cari.native.avatarActions.
- StudioActionRouter añade handleEvent(event) para centralizar chat y Twitch EventSub.
- renderer/main.js envía al overlay solo la reproducción live; una selección de frame desde el editor se mantiene como preview.
- Electron Main valida y retransmite avatar:set-action-frame.
- preload.js expone setActionFrame.
- avatar-overlay-preload.js expone onActionFrame.
- overlay.html incorpora una capa img#action-frame sobre el canvas.
- overlay-main.js reproduce URL/data URL, escala, opacidad y offsets del frame 2D.
- El TTS de eventos Twitch usa la acción realmente enrutada y no una variable inexistente.
- Se corrigió la expectativa del test para mantener chat=80 > voice=30.
- Se añadieron pruebas de integración chat/EventSub/VAD y de resolución del bridge nativo de persistencia.

### Contrato final de la cadena

```
Twitch chat/EventSub ─┐
                      ├─> StudioActionRouter
VAD / Audio Stream ───┤        │
manual/editor ────────┘        ↓
                         Avatar2DFramePlayer
                                │
                  ┌─────────────┴─────────────┐
                  ↓                           ↓
          editor/live renderer          detached overlay
             IMG action frame             IMG action frame
                  │                           │
                  └────── AvatarActingBridge ┘
```

Las prioridades permanecen:

```
manual 100
chat    80
event   70
voice   30
```

### Persistencia

El Editor sigue usando una única fuente de verdad:

```
AvatarActionStore
      ↓
window.cari.native.avatarActions
      ↓
Electron Main
      ↓
userData/avatar-actions/
├── actions.json
└── frames/<action>/*
```

localStorage continúa como fallback local cuando el bridge de disco no está disponible.

### Evidencia

- Los archivos afectados pasan una revisión estática sin TODO, FIXME, XXX ni stubs de implementación.
- Los tests nuevos quedaron incluidos bajo experimental/studio/electron-shell/test/ y la suite npm ya contempla test/*.test.mjs + avatar/*.test.mjs.
- La evidencia de ejecución Windows/CI continúa bloqueada por jobs que terminan sin steps ni logs_url.
- La validación de producción sigue requiriendo cámara/streaming/encoder Windows real.

### NO REPETIR

- No crear otro AvatarActionStore.
- No crear otro Avatar2DFramePlayer.
- No conectar Twitch directamente al renderer 2D sin pasar por StudioActionRouter.
- No duplicar el transporte de frames entre renderer y overlay; usar avatar:set-action-frame.
- No usar el frame seleccionado en el editor como si fuera necesariamente una acción live; los previews usan meta.preview.
- No volver a cambiar la ruta de persistencia a window.cari.avatarActions.
- No considerar la capa 2D validada en producción hasta medir captura sostenida y encoder Windows.

### Próximo frente recomendado

P0: ejecutar los tests Electron con un runner observable, probar el overlay 2D en Windows, medir FPS/memoria durante una animación prolongada y comprobar que el mismo frame que se ve en el overlay es el que entra al compositor/encoder.

Porcentaje canónico sin aumento artificial:

- Ingeniería: ~71%
- Producto usable/end-user: ~58%
- Seguimiento global: ~65%
- Producción: NO listo

## LOG-054 — Correcciones de integración y overlay 2D

Fecha: 2026-09-21
Área: Avatar 2D / Persistencia / Twitch / VAD / Electron Overlay
Estado: IMPLEMENTADO / STATIC REVIEW / TEST PREPARADO / WINDOWS PENDIENTE

### Correcciones nuevas

- Se corrigió la ruta del bridge de persistencia: AvatarActionStore consume window.cari.native.avatarActions.
- Se añadió StudioActionRouter.handleEvent(event) para que chat y Twitch EventSub usen un único punto de entrada.
- Se añadió la propagación de frames 2D al overlay transparente mediante avatar:set-action-frame.
- El overlay separado ahora mantiene una capa PNG encima del canvas Three.js y recibe escala, opacidad y offsets.
- Las previsualizaciones de frame del editor se marcan como preview y no alteran el overlay live.
- La clave de sincronización del frame live incluye estilo/transformación para que cambios de escala/opacidad/offset se propaguen aunque el PNG no cambie.
- Se corrigió el TTS de eventos Twitch para usar la acción enrutada.
- Se añadió prueba específica del bridge de persistencia nativa y prueba integrada chat + EventSub + VAD.
- El harness de persistencia adapta avatar-contract.js a avatar-contract.mjs solamente dentro del entorno de test.

### Contrato operativo

```
Editor 2D / manual ──────┐
Twitch chat/EventSub ────┼─> StudioActionRouter
VAD / Audio Stream ──────┘          │
                                    v
                           Avatar2DFramePlayer
                                    │
                    ┌───────────────┴──────────────┐
                    v                              v
             preview/live DOM              detached overlay
                    │                              │
                    └────────> PNG frame <─────────┘
```

Prioridad canónica: manual 100 > chat 80 > event 70 > voice 30.

### Estado de validación

- Static review de archivos afectados: sin TODO/FIXME/XXX/stubs.
- Tests de integración preparados.
- npm test ya incluye test/*.test.mjs y avatar/*.test.mjs.
- CI sigue bloqueada: Native Windows Build, CI, Character Runtime Tests y Actions Runner Diagnostic terminan con failure, steps=null y logs_url=null.
- No marcar estos runs como evidencia de fallo del código.

### NO REPETIR

- No reconstruir Action Store, Frame Player, VAD ni Twitch EventSub.
- No crear un segundo canal de eventos para el overlay.
- No convertir previews del editor en acciones live.
- No cambiar la ruta de persistencia fuera de window.cari.native.avatarActions.
- No intentar arreglar los fallos actuales de Actions modificando lógica de negocio sin logs/steps.

### Siguiente gate real

1. Ejecutar tests Electron en un runner observable.
2. Abrir overlay transparente en Windows y comprobar animación PNG sostenida.
3. Comprobar que la misma secuencia visible en overlay llega al compositor/encoder.
4. Medir FPS, CPU/GPU y memoria durante una sesión larga.

Porcentaje canónico:
- Ingeniería: ~71%
- Producto usable/end-user: ~58%
- Seguimiento global: ~65%
- Producción: NO listo

## LOG-055 — Cierre funcional del runtime 2D / PNGTuber — 21/09/2026

Área: Editor de Acciones 2D · Twitch/EventSub · VAD · persistencia · Electron Overlay
Estado: IMPLEMENTADO / STATIC REVIEW / TEST PREPARADO / WINDOWS PENDIENTE

### Hallazgo y corrección

- El Avatar2DFramePlayer ya implementaba loops, prioridades y expiración de overrides, pero una acción loop=false con múltiples frames no avanzaba: quedaba permanentemente en frameIndex=0.
- Se corrigió el scheduler de frames para:
  - avanzar frame por frame según durationMs;
  - reproducir una secuencia finita exactamente una vez cuando loop=false;
  - conservar el último frame de una secuencia finita hasta que expire su override;
  - reiniciar en frame 0 solo cuando loop=true;
  - abortar la transición si otra fuente gana la prioridad o el override expira.

### Unificación de eventos

El único StudioActionRouter de Electron ahora acepta:

- twitch.chat;
- twitch.command;
- twitch.event, incluyendo eventType, typeName, subscription.type y payload.subscription.type;
- voice.activity.

La cadena canónica queda:

```text
Twitch Chat / EventSub
          │
          ├── comandos !happy / !angry / !action <nombre>
          │
          v
   StudioActionRouter
          ^
          │
     voice.activity
          ^
          │
   SpeechActivityDetector
          ^
          │
 LocalSpeechController
          │
       micrófono
```

Las prioridades permanecen:

```text
manual 100
chat    80
event   70
voice   30
```

### Corrección adicional de chat

- Los mensajes salientes enviados por Cari ya no pasan por el trigger de acciones 2D.
- Evita que un mensaje generado por el propio bot, por ejemplo !happy, reactive de forma accidental el avatar como si fuera un mensaje entrante.

### VAD / Audio Stream

- LocalSpeechController sigue siendo la única fuente local de actividad de voz.
- SpeechActivityDetector conserva ataque/liberación, histéresis y hold-time.
- El renderer ahora entrega el resultado al router mediante voice.activity, en lugar de tener un camino separado para cambiar frames.
- Cambios silent -> talking y talking -> silent se registran en el event log del Studio.
- El estado estable no reinicia la secuencia de frames.

### Persistencia

No se creó ningún almacenamiento nuevo.

```text
AvatarActionStore
      ↓
window.cari.native.avatarActions
      ↓
Electron Main
      ↓
userData/avatar-actions/
├── actions.json
└── frames/<action>/*
```

AvatarActionStore continúa siendo la única fuente de verdad del Editor 2D.
La persistencia de disco ya estaba implementada y cubierta por sus tests; esta ronda no la duplicó.

### Tests añadidos/actualizados

- action-runtime.test.mjs:
  - secuencias finitas loop=false;
  - handleCommand();
  - envelope twitch.command;
  - envelope EventSub con payload.subscription.type;
  - envelope voice.activity;
  - VAD estable sin reiniciar la secuencia.
- speech-activity.test.mjs:
  - histéresis;
  - hold-time;
  - reset completo.

### Revisión estática

Los archivos afectados fueron revisados sin:

- TODO;
- FIXME;
- XXX;
- stubs de implementación;
- segundo Action Store;
- segundo Frame Player;
- segundo router;
- segundo EventSub WebSocket.

### Bitácora / continuidad

- CARI_STUDIO_BITACORA.md fue eliminado como copia duplicada para que experimental/studio/BITACORA.md sea la única fuente de verdad.
- No se reabren WGC, WASAPI, MediaClock, RealtimePacer, MediaInterleaver, RawPipe, FFmpeg supervisor, compositor D3D11, MediaPipe tracker, Three.js renderer ni Twitch transport sin regresión reproducible.

### Estado de validación

- Código integrado en GitHub: SÍ.
- Tests escritos/preparados: SÍ.
- Ejecución local de Node/npm en este entorno: NO OBSERVADA.
- CI observable: BLOQUEADA; los jobs recientes siguen terminando sin steps ni logs_url.
- Windows overlay real: PENDIENTE.
- Captura del overlay dentro del frame final/encoder: PENDIENTE.
- Assets V0 disponibles: neutral, happy, angry.
- Arte final, talking/silent artwork dedicado y validación de rendimiento: PENDIENTES.

### NO REPETIR

- No rehacer el Editor 2D.
- No crear otro AvatarActionStore.
- No crear otro Avatar2DFramePlayer.
- No crear otro StudioActionRouter.
- No crear otro VAD.
- No crear otro WebSocket de Twitch.
- No volver a implementar persistencia de frames.
- No volver a convertir previews del editor en acciones live.
- No considerar la integración 2D como PRODUCCIÓN hasta probar overlay + captura + encoder sostenidos en Windows.

### Próximo gate

1. Ejecutar npm test en un runner observable.
2. Abrir overlay transparente en Windows y comprobar una secuencia de 3+ frames.
3. Simular !happy, !action angry, channel.subscribe y voice.activity.
4. Medir FPS/memoria durante animación prolongada.
5. Comprobar que el mismo frame visible llegue al compositor/encoder final.

### Porcentaje canónico

- Ingeniería: ~71%
- Producto usable/end-user: ~58%
- Seguimiento global: ~65%
- Producción: NO listo