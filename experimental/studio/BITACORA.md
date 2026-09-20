# Cari Studio — Bitácora canónica de ingeniería

> **Este archivo es la única bitácora operativa del proyecto.**
> Antes de implementar, corregir o auditar un componente, buscar aquí y en
> `AUDIT_MATRIX.md` / `PROJECT_STATUS.md`. No crear una segunda implementación
> ni una segunda bitácora sin registrar primero una regresión o un cambio de requisito.

Estados:
- **IMPLEMENTADO**: código/contrato integrado.
- **VERIFICADO**: prueba reproducible pasada.
- **BLOQUEADO**: implementación existe, pero falta evidencia externa/infraestructura.
- **VALIDADO EN HARDWARE**: probado en Windows/hardware/servicio real.
- **PENDIENTE**: trabajo o evidencia todavía necesaria.
- **NO REPETIR**: solo reabrir por regresión, nueva evidencia, cambio de requisito/dependencia o restricción legal.

## Fuente canónica — regla de continuidad 2026-09-20

Las antiguas `WORKLOG.md` y `DEVELOPMENT_LOG.md` quedan como documentos históricos/auxiliares.
Las nuevas entradas de continuidad deben escribirse **solo aquí**.

---
> **Fuente única de continuidad.** Esta bitácora existe para impedir que el trabajo ya realizado vuelva a implementarse, auditarse o discutirse desde cero.
>
> Regla de estados:
> - **IMPLEMENTADO** = el código/contrato existe en GitHub.
> - **VERIFICADO** = existe una prueba reproducible que pasó.
> - **VALIDADO EN HARDWARE** = probado en Windows/PC objetivo o servicio externo real.
> - **PENDIENTE** = requiere implementación o evidencia.
> - **NO REPETIR** = solo reabrir ante regresión, nueva evidencia, cambio de requisito, dependencia o restricción legal.

## Entrada 2026-09-20 — resiliencia de output y continuidad

### Hecho en esta iteración
- Se auditó el estado real del PR antes de modificar código; se conservó la arquitectura existente.
- Se confirmó OutputRetryPolicy para backoff exponencial acotado.
- Se confirmó OutputFailureCategory para distinguir red, encoder, input, mux, permisos y desconocido.
- El retry automático quedó restringido a RTMP + fallos clasificados como red.
- Se incorporaron output_retry_pending, output_retry_attempts y output_failure_category al estado nativo/UI.
- stderr de FFmpeg permanece limitado a 256 KiB.
- El media graph mantiene un presupuesto de 8 eventos A/V por polling.
- Se corrigió el serializado del campo output para no generar un campo vacío.
- Se afinó la clasificación de fallos para no tratar cualquier I/O error como fallo de red.
- Se añadieron smoke targets CMake para retry y diagnostics.
- El workflow Windows incluye FFmpeg instalado explícitamente solo para CI y registra smoke de named-pipe E2E, retry y diagnostics.
- Esta BITACORA.md queda como fuente canónica de continuidad y no-repetición.

### Errores detectados y resueltos
- Un intento de creación de BITACORA.md devolvió HTTP 422 porque el archivo ya existía; se recuperó y se actualizó en lugar de duplicarlo.
- Algunos intentos de parchear main.cpp mediante anchors no coincidieron; no se escribió código incompleto.
- Un intento de generar CMake mediante template JavaScript provocó una interpolación accidental de ${CMAKE_CURRENT_SOURCE_DIR}; la edición se descartó y se rehizo correctamente.
- Una primera forma de workflow_dispatch era estructuralmente incorrecta; quedó corregida.
- Una prueba inicial con dos FIFOs expiró por el handshake/bloqueo; no se tomó como fallo del encoder.
- La prueba FFmpeg sintética con archivos raw pasó y queda como evidencia separada de la prueba Windows named-pipe.
- Los runs de GitHub Actions continúan terminando antes de registrar steps; no se atribuye ese fallo a una línea de código sin logs.

### Evidencia
- Smoke C++20 estricto: MediaClock, RealtimePacer, MediaInterleaver, retry y diagnostics.
- FFmpeg sintético 7.1.5: BGRA raw + PCM float32 -> H.264/AAC -> Matroska.
- Workflow Windows configurado para ejecutar CMake/CTest y probar named pipes con FFmpeg instalado por CI.
- Validación Windows real todavía pendiente.

### NO REPETIR
- No crear un segundo retry/backoff.
- No crear una segunda clasificación de errores.
- No reabrir el scheduler/interleaver sin evidencia nueva.
- No volver a repetir la prueba FFmpeg de archivos raw como si validara named pipes Windows.
- No cambiar el workflow por especulación sobre el runner; primero obtener una ejecución con steps/logs.
- No declarar reconexión RTMP completa hasta probar desconexión/reconexión real.

## Snapshot actual

- Fecha de corte: 2026-09-20
- Repositorio: `araragijona-coder/vtuber-cari`
- Rama: `fix/native-windows-foundation`
- PR: #2 — `fix: harden native Windows foundation`
- Estado PR: abierto, draft.
- Avance global: **60% de ingeniería**.
- Última comprobación de esta iteración: contratos retry/diagnostics portables pasan con C++20 `-Wall -Wextra -Werror`.
- Último HEAD comprobado: `f32cdd0430ac4a22dd6f2e58216f2d96403bb04e`.
- Interpretación del porcentaje: avance frente al producto completo; **no** equivale a validación de hardware ni a CI verde.
- Regla de promoción: mantener la implementación en `experimental/` hasta cerrar los gates.

## Arquitectura congelada

```
Electron Renderer
  UI / escenas / controles / cámara / MediaPipe / avatar / métricas
        │
        ▼
Electron Main
  NativeEngine / lifecycle / IPC / OBS WebSocket opcional
        │ JSONL
        ▼
Native Windows C++
  Windows Graphics Capture
    ├─ ventana
    └─ pantalla primaria
  WASAPI
    ├─ micrófono
    └─ system loopback
  VoiceEffectProcessor
  AudioTimelineMixer
  FrameBridge
  MediaClock
  RealtimePacer
  MediaInterleaver
  MediaGraphController
  RawPipe
  FfmpegAvOutput / supervisor
        ├─ grabación local
        └─ RTMP/RTMPS
```

## IMPLEMENTADO — NO REHACER

### Captura Windows
- Win32 host.
- D3D11 device.
- Windows Graphics Capture de ventana.
- Windows Graphics Capture de pantalla primaria.
- `CreateForMonitor`.
- Enumeración de ventanas capturables.
- Selección explícita por índice.
- Frame callback con superficie DXGI.
- Recreate del frame pool ante resize.
- Recuperación de device removed/reset/hung.
- FrameBridge BGRA → pipeline.

### Audio
- WASAPI microphone.
- WASAPI system loopback.
- VoiceEffectProcessor local.
- Perfil `anime-bright`.
- AudioTimelineMixer.
- Normalización inicial de sample rate/canales.
- Timeline/PTS común y bloques de mezcla.
- Métricas de mezcla/underrun/rechazo.
- Rechazo de cambios de sample-rate/canales durante una salida.

### Timing A/V
- `MediaClock` en ticks de 100 ns.
- `RealtimePacer`.
- `MediaInterleaver` global por PTS.
- Empates a favor de audio.
- Colas acotadas.
- Late-drop/cadence-drop de vídeo.
- Presupuesto de 8 eventos por polling.
- Métricas `audio_late` y `pacing_budget_exhausted`.
- Backpressure: el mixer no drena audio hasta conectar ambos pipes.

### FFmpeg / Output
- `ProcessRunner` con `CreateProcessW`.
- Quoting de argumentos.
- Captura/drain de stderr.
- `FfmpegSupervisor`.
- `FfmpegAvOutput`.
- `NativeMediaOutputBridge`.
- Named pipes independientes vídeo BGRA8 / audio PCM float32.
- Mapping `0:v:0` / `1:a:0`.
- Matroska y RTMP/RTMPS directo.
- EOF/flush antes de terminación forzada.
- Estado y exit code visibles.
- stderr limitado a 256 KiB.
- `OutputFailureCategory`.
- `OutputRetryPolicy`: backoff 1→2→4… con tope 30 s y máximo 5 intentos.
- Retry automático restringido a RTMP + fallos clasificados como red.

### Sesión / seguridad
- `StudioSessionManager`.
- Serialización.
- Rollback.
- Stop-only.
- Fuente no modificable durante output.
- Captura/audio no se detienen durante output.
- Electron `contextIsolation=true`.
- `nodeIntegration=false`.
- `sandbox=true`.
- Renderer local `file://`.
- Permiso de cámara restringido al renderer local.
- `pathToFileURL`.
- Renderer no lanza procesos.

### Avatar / tracking
- Contrato neutral de avatar.
- ActingBridge independiente de apariencia.
- MediaPipe Face Landmarker.
- Guard contra timestamps no crecientes en VIDEO.
- FaceTrackingBridge.
- Three.js + GLTFLoader.
- GLTF/GLB.
- Placeholder geométrico.
- Morph aliases básicos.
- Appearance/presets/accessories.
- Live2D: solo adaptador futuro; no se distribuye runtime propietario.

### UI / OBS / eventos
- UI local de capture/output/voice/camera/tracking/avatar/metrics.
- Request IDs + JSONL.
- OBS WebSocket opcional; no es dependencia del streaming.
- Infraestructura existente de chat/EventSub/AutomationEngine.
- Acciones locales desacopladas de IA.

## VERIFICADO

- Smoke C++20 estricto para MediaClock/RealtimePacer/MediaInterleaver.
- Smoke de AudioTimelineMixer: mezcla, PTS monotónico, resampling y rechazos.
- Tests portables de sesión/avatar.
- Selección de ventana por índice.
- Prueba FFmpeg sintética: BGRA raw + PCM float32 → H.264/AAC → Matroska.
- Smoke de `OutputRetryPolicy`.
- Smoke de `OutputFailureCategory`.
- Workflow registra scheduler/retry/diagnostics smoke.
- Smoke e2e `ffmpeg_named_pipe_e2e_smoke.cpp` implementado para Windows: genera A/V sintético, abre ambos named pipes, fuerza EOF/flush y vuelve a decodificar el Matroska.
- CI intenta instalar FFmpeg explícitamente para ese gate.

## VALIDACIÓN EXTERNA PENDIENTE

### P0
- Conseguir runs de GitHub Actions con steps/logs ejecutados.
- Ejecutar smoke e2e named-pipe + FFmpeg en Windows.
- Grabación prolongada real.
- A/V sync sostenido.
- RTMP real.

### P1
- Transporte con PTS explícitos extremo a extremo, o sustituir la frontera raw por un mecanismo equivalente.
- Compositor GPU D3D11.
- Avatar + captura + overlays dentro del frame final.
- Evitar CPU readback por frame en la ruta final.
- Drift correction y resampling adaptativo.
- Cámara Media Foundation.
- Game Capture.

### P2
- Lip-sync real.
- Ejecución real de `studio_chat_requested`, `studio_sound_requested`, `studio_scene_requested` y equivalentes.
- Reconexión EventSub verificada.
- Multistream.

### P3
- Política final de descubrimiento/distribución de FFmpeg.
- Auditoría legal final de codecs/assets/modelos.
- Installer.
- Logs de usuario/rollback.
- Release smoke test.

## CI — estado real

Los workflows ahora tienen:
- push sobre `fix/native-windows-foundation`;
- `workflow_dispatch`;
- workflow Windows con FFmpeg instalado explícitamente;
- smoke tests adicionales.

Los runs del head actual continúan terminando con:
- `failure`;
- `steps=null`;
- `logs_url=null`.

Conclusión: **no existe evidencia suficiente para afirmar que CMake/CTest se ejecutaron en esos runs**. No atribuir estos fallos a una línea concreta del código.

## NO REPETIR

1. No crear otro scheduler PTS paralelo.
2. No crear otro `RawPipe`.
3. No crear otro supervisor/boundary FFmpeg.
4. No convertir OBS en dependencia del camino nativo.
5. No usar `capturePage()` como compositor de producción.
6. No añadir OpenCV al núcleo solo por costumbre; usar WGC/WASAPI para el core y OpenCV solo si resuelve una función concreta de cámara/preprocesamiento.
7. No declarar A/V sincronizado en producción mientras los PTS originales no estén preservados extremo a extremo.
8. No promover `experimental/` por compilación aislada.
9. No reinterpretar `steps=null` como un error del código sin logs/steps.
10. No marcar RTMP completo sin conexión sostenida y prueba de reconexión.
11. No instalar FFmpeg del sistema como dependencia de runtime del producto; la instalación actual es **solo CI**.
12. No crear otra bitácora paralela: esta `BITACORA.md` es la canónica.
13. No repetir el smoke e2e básico: ampliarlo con nuevos casos.
14. No reescribir la historia de la rama para resolver la divergencia con `main`; conservarla salvo una razón de integración real.

## Intentos / decisiones descartadas registrados

### FIFO inicial que expiró
Una prueba con dos FIFOs se atascó durante el handshake. Se reemplazó la validación inicial por prueba con archivos raw para aislar encoder/mapping/mux y luego se implementó un smoke Windows dedicado para named pipes.

### Primer YAML de workflow_dispatch
El primer intento colocó `paths` debajo de `workflow_dispatch` de forma inválida. Se corrigió; ahora `workflow_dispatch` es un evento independiente.

### Integraciones por anchors que no coincidieron
Algunos intentos automáticos de parchear `main.cpp` fueron abortados antes de escribir cuando los anchors no coincidieron. No deben repetirse como si fueran cambios pendientes.

## Decisiones congeladas

- Windows native C++ para captura/audio/media.
- Electron como control plane.
- Three.js/glTF para backend abierto de avatar.
- MediaPipe local para tracking.
- Live2D únicamente detrás de auditoría de runtime/licencia.
- Sin IA/cloud obligatorio para el funcionamiento principal.
- FFmpeg como proceso local supervisado.
- Código incierto permanece en `experimental/`.

## Regla de reapertura

Un punto de **NO REPETIR** solo vuelve a abrirse si existe:
- regresión;
- nueva evidencia de prueba;
- cambio de requisito;
- cambio de dependencia;
- nueva restricción legal.

Al reabrirlo, registrar primero **motivo + evidencia nueva**.

## Snapshot de continuidad

**Avance global: 60% de ingeniería.**

**Última actualización:** 2026-09-20, corte de esta iteración.

**Último HEAD verificado en PR #2:** `2fec7c39fb1870ff2707f6975dff691806e95d52`.

El siguiente trabajo debe cerrar gates de producción, no duplicar infraestructura existente.

## Próximo bloque de trabajo

### P0 — ejecutar, no rediseñar
1. Recuperar evidencia real de GitHub Actions con steps/logs.
2. Ejecutar y estabilizar `ffmpeg_named_pipe_e2e_smoke.cpp` en Windows.
3. Medir grabación sostenida y A/V drift.
4. Probar RTMP contra endpoint controlado y validar el retry/backoff.

### P1 — después de P0
1. Diseñar el transporte PTS explícito.
2. Implementar compositor GPU D3D11.
3. Integrar avatar/tracking/captura/overlays en el frame final.
4. Implementar cámara Media Foundation y Game Capture.

### P2/P3
- lip-sync;
- acciones `studio_*` con backends reales;
- EventSub reconnect;
- multistream;
- packaging, licencias, FFmpeg redistribution, installer y release validation.

**Regla:** no abrir una implementación paralela de ningún componente listado en IMPLEMENTADO/NO REPETIR. Ampliar el componente existente o registrar primero por qué una nueva arquitectura es necesaria.


## Registro de iteración — 2026-09-20 09:08 ART

**HEAD al cierre:** fcba7d14dbffe0fa2cfc4372c21a1909da10afd2

### Cambios realizados en esta iteración

- Se integró OutputRetryPolicy en experimental/studio/core/ con backoff 1s → 2s → 4s → …, tope de 30s y máximo de 5 intentos.
- Se integró OutputFailureCategory para clasificar fallos de output en red, encoder, input, mux, permisos y desconocidos.
- El retry automático quedó restringido a RTMP + categoría network; no se reintentan ciegamente encoder/mux/input/permission.
- Se añadieron métricas de estado, exit code, reintentos y categoría de fallo al plano de control.
- La UI Electron ya muestra estado/código del output y presupuesto de pacing.
- Se corrigió la serialización del campo output en el status JSONL para que no quede vacío antes de output_state.
- Se corrigieron los workflows para ejecutar también sobre la rama de desarrollo y se agregó workflow_dispatch como evento independiente.
- El workflow Windows instala FFmpeg solo para CI y registra el smoke end-to-end de named pipes.
- Se mantuvo la regla de backpressure: no consumir audio del mixer antes de conectar ambos pipes.
- Se reforzaron las invariantes para impedir cambios de captura/audio durante una salida activa.
- Se actualizó la documentación de estado y auditoría; la bitácora canónica sigue siendo este archivo.

### Evidencia comprobada

- MediaClock / RealtimePacer / MediaInterleaver: smoke C++20 estricto documentado como PASS.
- OutputRetryPolicy: smoke PASS documentado.
- OutputFailureCategory: smoke PASS documentado.
- FFmpeg sintético BGRA + PCM float32 → H.264/AAC → Matroska: PASS documentado.
- Workflow Windows contiene explícitamente build, CTest, instalación de FFmpeg y smoke de named pipes.

### Estado que NO debe marcarse como cerrado

- CI sigue sin aportar steps/logs útiles en los runs observados; algunos jobs continúan con steps=null.
- Named-pipe + FFmpeg todavía necesita evidencia real de ejecución Windows.
- Grabación sostenida, sincronización A/V sostenida y RTMP real continúan sin validación de hardware/servicio.
- El transporte raw todavía no preserva PTS originales extremo a extremo.
- El avatar todavía no está compuesto dentro del frame final nativo.
- La captura actual usa CPU readback como ruta de referencia; falta compositor GPU/zero-copy.

### NO REPETIR — actualización

15. No crear otro sistema de retry: reutilizar OutputRetryPolicy.
16. No crear otro clasificador de errores de output: reutilizar OutputFailureCategory.
17. No declarar reconnect RTMP terminado hasta probar pérdida/restauración de conexión contra un servidor real.
18. No confundir la instalación de FFmpeg en CI con una dependencia de runtime del producto.
19. No volver a crear una bitácora: experimental/studio/BITACORA.md es la fuente canónica.
20. No repetir los smoke básicos; ampliar escenarios únicamente cuando aparezca un nuevo riesgo.

### Próximo frente real

P0: conseguir ejecución Windows observable (steps/logs), estabilizar named-pipe e2e y medir grabación/AV/RTMP sostenidos.

P1: transporte temporal explícito o equivalente, compositor GPU D3D11 y composición de avatar/captura/overlays.

P2: cámara Media Foundation, Game Capture, lip-sync y backends reales de acciones del runtime.

P3: multistream, EventSub reconnect verificado, FFmpeg redistribution/licencias, installer y release validation.

Regla de continuidad: antes de implementar, buscar el componente en BITACORA.md, AUDIT_MATRIX.md y WORKLOG.md; si existe, extenderlo. Solo abrir arquitectura nueva con motivo y evidencia registrados.
## Registro de iteración — 2026-09-20 09:11 ART

### Cambios registrados
- OutputRetryPolicy: backoff 1s → 2s → 4s → …, máximo 30s y 5 intentos.
- OutputFailureCategory: network/encoder/input/mux/permission/unknown.
- Retry automático limitado a RTMP y únicamente a fallos clasificados como red.
- Estado, exit code, retry y categoría de fallo expuestos al control plane/UI.
- stderr de FFmpeg limitado a 256 KiB.
- Backpressure de arranque: el mixer no drena audio antes de conectar ambos pipes.
- Invariantes de sesión contra cambios/detenciones de captura/audio durante output.
- Media interleaver global por PTS y presupuesto de 8 eventos por polling.
- Smoke Windows `ffmpeg_named_pipe_e2e_smoke.cpp` integrado en CMake/CI.
- CI habilitado para la rama de desarrollo y `workflow_dispatch`; FFmpeg se instala solo para CI.
- Auditoría de licencias registrada; FFmpeg/codecs/assets continúan pendientes de decisión de distribución.

### Errores encontrados y resolución
- Handshake FIFO inicial: la prueba se atascó; se sustituyó por validación separada y luego por smoke Windows dedicado.
- YAML inicial de `workflow_dispatch`: configuración inválida; corregida como evento independiente.
- Parche por anchors en `main.cpp`: hubo coincidencias fallidas; los intentos fueron abortados antes de escribir.
- Campo `output` del status podía quedar vacío: serialización corregida.
- Clasificación de red demasiado amplia: retirados indicadores ambiguos para evitar retries incorrectos.
- stderr acumulativo: limitado a 256 KiB.
- Audio consumido antes de handshake: bloqueado hasta `connected()`.
- Despacho A/V separado por tipo: reemplazado por selección global por PTS.
- Recuperación atrasada podía generar ráfagas: limitado a 8 eventos por polling.

### Evidencia
- VERIFICADO: MediaClock + RealtimePacer + MediaInterleaver con C++20 y `-Wall -Wextra -Werror`.
- VERIFICADO: OutputRetryPolicy smoke.
- VERIFICADO: OutputFailureCategory smoke.
- VERIFICADO: AudioTimelineMixer smoke.
- VERIFICADO: prueba FFmpeg 7.1.5 BGRA raw + PCM float32 → H.264/AAC → Matroska en entorno local.
- IMPLEMENTADO / NO VERIFICADO: smoke Windows named-pipe + FFmpeg.
- BLOQUEADO: los últimos runs de Actions continúan con `steps=null` y `logs_url=null`, así que no prueban CMake/CTest.

### NO REPETIR
- No crear otro scheduler PTS.
- No crear otro interleaver A/V.
- No crear otro RawPipe.
- No crear otro supervisor FFmpeg.
- No crear otra política de retry.
- No crear otro clasificador de errores.
- No usar `capturePage()` como compositor de producción.
- No añadir OpenCV al core sin una necesidad concreta.
- No convertir OBS en dependencia.
- No declarar A/V sincronizado en producción sin transporte temporal verificable.
- No considerar CI verde cuando no hay steps/logs.
- No crear otra bitácora; este archivo es el canónico.

## Snapshot de continuidad — 2026-09-20 09:11 ART
- HEAD comprobado: `20ef3cf319daa0e4a3bd0ecea2f82cd09956e293`.
- Avance global: **60% de ingeniería**.
- PR #2: abierto, draft, `mergeable=false`.
- P0: evidencia Windows ejecutable, named-pipe e2e, grabación sostenida, A/V sync sostenido y RTMP real.
- P1: PTS explícitos/equivalente, compositor GPU D3D11, avatar + captura + overlays en frame final.
- P2: cámara Media Foundation, Game Capture, lip-sync y backends de acciones.
- P3: multistream, EventSub reconnect, FFmpeg redistribution, installer, logs y release validation.

### Regla de continuidad
Antes de implementar, buscar primero aquí, en `AUDIT_MATRIX.md` y `PROJECT_STATUS.md`. Si el componente existe, ampliarlo o corregirlo; no generar una segunda implementación paralela.

---

## Registro maestro — 2026-09-20

### Cambios confirmados en el repositorio
- Se consolidó una única arquitectura Windows-first: WGC/D3D11 + WASAPI + mixer temporal + FFmpeg local, controlada por Electron.
- Se consolidó el timing con `MediaClock`, `RealtimePacer` y `MediaInterleaver`; no abrir otra implementación equivalente.
- Se añadió protección de formato de audio durante una sesión.
- Se añadió backpressure de arranque para no consumir audio antes del handshake de ambos pipes.
- Se limitó el despacho multimedia a 8 eventos por polling.
- Se añadió clasificación de fallos de output y retry/backoff limitado.
- El retry automático solo aplica al perfil RTMP y a fallos clasificados como red.
- Se limitó stderr retenido de FFmpeg a 256 KiB.
- Se expone estado, exit code, categoría de fallo, reintentos y métricas de pacing.
- Se reforzaron invariantes de sesión para impedir detener/cambiar captura o audio mientras hay output.
- Los workflows de CI ahora incluyen la rama de desarrollo y `workflow_dispatch`; el workflow Windows contempla FFmpeg + smoke named-pipe e2e.
- Se mantiene auditoría de dependencias/licencias y no se distribuyen assets propietarios por defecto.

### Pruebas / evidencia
| Elemento | Estado | Evidencia |
|---|---|---|
| MediaClock + RealtimePacer + Interleaver | VERIFICADO | Smoke C++20 estricto |
| AudioTimelineMixer | VERIFICADO | Smoke de mezcla/resampling/rechazos |
| OutputRetryPolicy | VERIFICADO | Smoke de backoff y límite de intentos |
| OutputFailureCategory | VERIFICADO | Smoke de clasificación |
| FFmpeg sintético | VERIFICADO | BGRA raw + PCM float32 → H.264/AAC → Matroska |
| Electron session/avatar | VERIFICADO | Tests existentes del shell |
| Named pipes + FFmpeg en Windows | IMPLEMENTADO / PENDIENTE DE EVIDENCIA | Smoke e2e presente en CMake/workflow; runner no está produciendo steps/logs útiles |
| CI completa | PENDIENTE | Runs observados terminan con failure y `steps=null` |
| Captura/audio en PC objetivo | PENDIENTE | Requiere hardware Windows real |
| RTMP real/reconexión | PENDIENTE | Requiere endpoint real/controlado |

### Errores históricos importantes
1. La prueba FIFO inicial se bloqueó durante handshake. No volver a usar ese escenario como prueba principal; usar el smoke Windows dedicado.
2. El primer YAML de `workflow_dispatch` tenía una estructura inválida. Ya fue corregido.
3. Algunos parches automáticos por anchor no coincidieron; cuando ocurre, no asumir que el cambio fue aplicado.
4. La serialización de `output` en status llegó a quedar vacía; fue corregida y debe permanecer cubierta.
5. La clasificación de red era demasiado amplia; se eliminó la clasificación ambigua para evitar retries incorrectos.
6. El stderr acumulativo podía crecer indefinidamente; ahora tiene límite de 256 KiB.
7. El mixer podía drenar audio antes de conectar los pipes; ahora espera `connected()`.
8. El despacho audio/video estaba separado por tipo; ahora usa interleaving global por PTS.
9. La recuperación atrasada podía producir una ráfaga en un solo tick; ahora existe presupuesto de 8 eventos.
10. CI puede dispararse sobre la rama, pero el runner actualmente falla antes de steps; no convertir esto en diagnóstico del código.

### Estado de producto
**60% de ingeniería.**

El 60% significa que las capas principales y una parte importante de las protecciones de producción ya existen. No significa 60% de código terminado ni 60% de validación real.

### Regla para siguientes iteraciones
Antes de tocar una función:
1. buscar su nombre en `BITACORA.md`;
2. revisar `AUDIT_MATRIX.md`;
3. revisar `PROJECT_STATUS.md`;
4. si aparece como IMPLEMENTADO/VERIFICADO/NO REPETIR, extender o corregir; no crear otra versión;
5. si aparece como PENDIENTE, trabajar directamente sobre esa implementación;
6. registrar pruebas y errores inmediatamente después del cambio.

### Próxima cola, por prioridad
- P0: obtener ejecución observable de Windows CI y cerrar named-pipe e2e.
- P0: prueba sostenida de grabación/A-V.
- P0: RTMP real + reconexión con el retry existente.
- P1: transporte temporal explícito o equivalente.
- P1: compositor GPU D3D11 y composición avatar/captura/overlays en frame final.
- P1: cámara Media Foundation + Game Capture.
- P2: drift correction, lip-sync y backends reales de acciones.
- P3: multistream, EventSub reconnect, distribución FFmpeg/codec, installer y release validation.


---

## Registro de iteración — 2026-09-20 (corte actual)

**HEAD:** `2fec7c39fb1870ff2707f6975dff691806e95d52`  
**Avance:** **60% de ingeniería**.

### Cambios hechos
- Se agregó `OutputRetryPolicy` reutilizable para backoff exponencial acotado.
- Se agregó `OutputFailureCategory` para separar fallos de red, encoder, input, mux, permisos y desconocidos.
- El output nativo integra retry solo para RTMP + categoría network.
- Se añadió límite de stderr de FFmpeg a 256 KiB.
- Se añadieron `output_state`, `output_exit_code`, `output_retry_pending`, `output_retry_attempts`, `output_failure_category`.
- Se agregó límite de 8 eventos A/V por polling.
- Se reforzó backpressure de inicio de audio.
- Se reforzaron invariantes contra cambios de captura/audio durante output.
- CI ahora se dispara en la rama de desarrollo y admite ejecución manual.
- La UI ya muestra estado de output y métricas de pacing.

### Pruebas ejecutadas en este corte
- `output_retry_smoke.cpp`: **PASS** con C++20 + `-Wall -Wextra -Werror`.
- `output_diagnostics_smoke.cpp`: **PASS** con C++20 + `-Wall -Wextra -Werror`.
- MediaClock/RealtimePacer/MediaInterleaver: evidencia previa **PASS**.
- AudioTimelineMixer: evidencia previa **PASS**.
- FFmpeg sintético BGRA + PCM float32 → H.264/AAC → Matroska: evidencia previa **PASS**.
- Electron session/avatar: evidencia previa **PASS**.

### Pruebas que NO están cerradas
- Build CMake/Windows del head actual.
- CTest Windows.
- named pipes + FFmpeg sostenido en Windows.
- grabación prolongada.
- sincronización A/V sostenida.
- RTMP real/reconexión.
- cámara Media Foundation.
- Game Capture.
- avatar integrado al frame final nativo.
- drift correction y hardware target.

### Errores que ya fueron resueltos
- FIFO/handshake de prueba inicial bloqueado.
- YAML `workflow_dispatch` inicial mal estructurado.
- Anchors de parche que no coincidieron; los intentos fallidos no escribieron cambios.
- `output` vacío en status.
- clasificación de red demasiado amplia.
- stderr de FFmpeg sin límite.
- audio consumido antes de handshake.
- despacho A/V separado por tipo.
- ráfagas de recuperación en un solo tick.
- divergencia administrativa 59%/60% en documentación.

### NO REPETIR
- Scheduler PTS paralelo.
- Segundo interleaver A/V.
- Segundo RawPipe.
- Segundo supervisor FFmpeg.
- Segunda política retry.
- Segundo clasificador de output.
- Segunda bitácora.
- `capturePage()` como compositor de producción.
- OpenCV dentro del core sin necesidad concreta.
- OBS como dependencia.
- Declarar A/V sincronizado sin evidencia temporal extremo a extremo.
- Declarar CI verde con `steps=null`.

### Próximo trabajo autorizado
P0: conseguir ejecución real de Windows Actions con steps/logs, cerrar el smoke named-pipe e2e y realizar medición sostenida de A/V.  
P1: compositor GPU D3D11 + transporte temporal explícito/equivalente + composición de avatar/overlays.  
P2: cámara/Game Capture/lip-sync/backends de acciones.  
P3: multistream/EventSub reconnect/distribución FFmpeg/installer/release validation.


---

## Registro operativo — corte 2026-09-20 09:24 ART

### Snapshot real
- Repositorio: `araragijona-coder/vtuber-cari`
- Rama: `fix/native-windows-foundation`
- PR: #2 — `fix: harden native Windows foundation`
- HEAD observado: `e4c1040e5cc88fc76a985bbcfd21d462ecc93de2`
- PR: abierto, draft, `mergeable=false`.
- Compare contra `main`: rama divergente; 621 commits ahead en la comparación actual y 2 commits behind. No reescribir historia por este motivo sin necesidad de integración real.
- Avance vigente: **60% de ingeniería**.
- Interpretación: capas principales implementadas + hardening considerable; todavía no equivale a producto validado ni a CI verde.

### Hecho / confirmado en este corte
- `OutputRetryPolicy`: backoff acotado, máximo 5 intentos, tope de 30 s.
- `OutputFailureCategory`: clasifica red/encoder/input/mux/permission/unknown.
- Retry automático: solo RTMP + fallos de red.
- Diagnóstico: estado, exit code, categoría de fallo, intentos y pacing visibles en control plane/UI.
- stderr FFmpeg: retención máxima de 256 KiB.
- Media graph: interleaver global por PTS + límite de 8 eventos por polling.
- Backpressure: el mixer no consume audio antes de conectar ambos pipes.
- Invariantes de sesión: no cambiar/detener captura o audio durante output activo.
- Smoke C++20 estricto para timing/retry/diagnostics: registrado como PASS.
- Smoke FFmpeg sintético BGRA + PCM float32 → H.264/AAC → Matroska: registrado como PASS.
- Smoke Windows named-pipe + FFmpeg: implementado y registrado; falta evidencia observable de su ejecución real.

### CI observado
Los runs del HEAD actual `e4c1040e5cc88fc76a985bbcfd21d462ecc93de2`:
- Native Windows Build: run `35510469256` — failure.
- Character Runtime Tests: run `35510469243` — failure.
- CI: run `35510469265` — failure.
- Los jobs consultados vuelven a mostrar `steps=null` y `logs_url=null`.
- Conclusión: no afirmar que CMake/CTest/Node/Python se ejecutaron. El bloqueo es de evidencia de runner.

### NO REPETIR
- Segundo scheduler/interleaver.
- Segundo RawPipe.
- Segundo supervisor/boundary FFmpeg.
- Segunda política de retry.
- Segundo clasificador de errores.
- Segundo sistema de métricas equivalente.
- Segunda bitácora.
- `capturePage()` como compositor de producción.
- OpenCV dentro del core sin una necesidad concreta.
- OBS como dependencia del streaming directo.
- Declarar A/V sincronizado en producción sin evidencia temporal extremo a extremo.
- Declarar CI verde con `steps=null`.
- Confundir la instalación de FFmpeg en CI con dependencia de runtime del producto.

### Próximo trabajo — ejecutar, no rediseñar
**P0**
1. Conseguir una ejecución Windows de Actions con steps/logs reales.
2. Ejecutar `ffmpeg_named_pipe_e2e_smoke` en Windows y conservar el artefacto/ffprobe.
3. Medir grabación prolongada y A/V sync.
4. Probar RTMP real + pérdida/restauración de red usando el retry existente.

**P1**
1. Transporte temporal explícito o equivalente para PTS.
2. Compositor D3D11/GPU: captura + avatar + overlays → frame final.
3. Eliminar CPU readback por frame de la ruta final.
4. Cámara Media Foundation y Game Capture.

**P2**
1. Drift correction y resampling adaptativo.
2. Lip-sync.
3. Backends reales de `studio_*`.
4. Reconexión EventSub verificada.

**P3**
1. Multistream.
2. Redistribución FFmpeg/codecs con auditoría legal.
3. Instalador.
4. Logs/diagnóstico de usuario.
5. Release validation.

### Regla de cierre
`IMPLEMENTADO → VERIFICADO → WINDOWS CI → HARDWARE REAL → SESIÓN PROLONGADA → STREAM/RECORD REAL → AUDITORÍA FINAL → RELEASE`.

No subir el porcentaje por cantidad de archivos. Solo subirlo cuando se cierre una etapa funcional o de validación claramente identificable.


---

## Reconciliación de continuidad — HEAD f0a4665

- HEAD real observado al cerrar esta revisión: `f0a466510fd02e92a7ba1454f6196b87195b2bc3`.
- Avance global mantenido en **60%**: no se incrementa por documentación ni por scaffolding; los grandes gates P0 siguen abiertos.
- PR #2 sigue abierto y draft; `mergeable=false`.
- La bitácora canónica no reemplaza `AUDIT_MATRIX.md` ni `PROJECT_STATUS.md`; los tres documentos deben permanecer coherentes.
- Los workflows recientes sobre el HEAD consultado siguen terminando sin steps/logs útiles, por lo que CI continúa bloqueado como evidencia.
- La cola activa no cambia: Windows CI observable → named-pipe E2E → grabación/A-V sostenidos → RTMP real/reconexión → compositor GPU/avatar.
