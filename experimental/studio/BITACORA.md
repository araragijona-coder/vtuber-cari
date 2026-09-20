# Cari Studio — Bitácora canónica de ingeniería

> **Fuente única de continuidad.** Esta bitácora existe para impedir que el trabajo ya realizado vuelva a implementarse, auditarse o discutirse desde cero.
>
> Regla de estados:
> - **IMPLEMENTADO** = el código/contrato existe en GitHub.
> - **VERIFICADO** = existe una prueba reproducible que pasó.
> - **VALIDADO EN HARDWARE** = probado en Windows/PC objetivo o servicio externo real.
> - **PENDIENTE** = requiere implementación o evidencia.
> - **NO REPETIR** = solo reabrir ante regresión, nueva evidencia, cambio de requisito, dependencia o restricción legal.

## Snapshot actual

- Fecha de corte: 2026-09-20
- Repositorio: `araragijona-coder/vtuber-cari`
- Rama: `fix/native-windows-foundation`
- PR: #2 — `fix: harden native Windows foundation`
- Estado PR: abierto, draft.
- Avance global: **60% de ingeniería**.
- Último HEAD comprobado: `547c0a41996be00d0b738fcd6cfd17d6f545d2ecee8`.
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
- HEAD comprobado: `547c0a41996be00d0b738fcd6cfd17d6f545d2ecee8`.
- Avance global: **60% de ingeniería**.
- PR #2: abierto, draft, `mergeable=false`.
- P0: evidencia Windows ejecutable, named-pipe e2e, grabación sostenida, A/V sync sostenido y RTMP real.
- P1: PTS explícitos/equivalente, compositor GPU D3D11, avatar + captura + overlays en frame final.
- P2: cámara Media Foundation, Game Capture, lip-sync y backends de acciones.
- P3: multistream, EventSub reconnect, FFmpeg redistribution, installer, logs y release validation.

### Regla de continuidad
Antes de implementar, buscar primero aquí, en `AUDIT_MATRIX.md` y `PROJECT_STATUS.md`. Si el componente existe, ampliarlo o corregirlo; no generar una segunda implementación paralela.