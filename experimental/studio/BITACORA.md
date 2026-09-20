# Cari Studio — BITÁCORA CANÓNICA DE CONTINUIDAD

> Última actualización: 2026-09-20
> Rama: `fix/native-windows-foundation`
> PR: #2
> HEAD registrado en este checkpoint: `c8b44f1107408897ad837ff5a343d3ba3cfd5820`

Esta es la fuente única de continuidad para Cari Studio. Su objetivo es impedir que el mismo componente se rediseñe o implemente repetidamente.

## Estados

- **PENDIENTE**: todavía no existe una implementación suficiente.
- **IMPLEMENTADO**: existe código integrado.
- **VERIFICADO**: existe una prueba reproducible que pasó.
- **VALIDADO EN HARDWARE**: funciona en Windows/hardware/servicio real cuando corresponde.
- **BLOQUEADO**: existe implementación, pero falta evidencia externa o infraestructura.
- **DESCARTADO**: enfoque abandonado; no volver a implementarlo salvo nueva evidencia.

## Alcance vigente

Cari Studio es una aplicación Windows-first de streaming y VTubing, operable sin IA ni API cloud. Electron es el control plane; C++ nativo es la fuente de verdad para captura, audio, media graph y output. OBS WebSocket es opcional.

## Ya realizado — NO REPETIR

### Plataforma / Electron
- VERIFICADO — Electron shell con `contextIsolation=true`, `nodeIntegration=false`, `sandbox=true`.
- IMPLEMENTADO — preload con superficie explícita.
- IMPLEMENTADO — navegación local restringida.
- IMPLEMENTADO — permiso de cámara limitado al renderer local.
- IMPLEMENTADO — NativeEngine con request IDs y correlación JSONL.
- IMPLEMENTADO — StudioSessionManager con serialización, rollback y stop-only.
- IMPLEMENTADO — OBS WebSocket 5.x opcional.

### Captura Windows
- VERIFICADO — Win32 host.
- VERIFICADO — D3D11 device creation.
- IMPLEMENTADO — Windows Graphics Capture de ventana.
- IMPLEMENTADO — captura de pantalla primaria.
- VERIFICADO — enumeración y selección de ventanas.
- IMPLEMENTADO — frame callback + DXGI surface.
- IMPLEMENTADO — recreate del frame pool.
- IMPLEMENTADO — recuperación DXGI device removed/reset/hung.
- PENDIENTE — validación exhaustiva en hardware.
- PENDIENTE — Game Capture dedicada.

### Cámara
- IMPLEMENTADO — enumeración Media Foundation.
- IMPLEMENTADO — source=camera en runtime/control plane.
- BLOQUEADO — captura/reconexión de cámara real pendiente de Windows hardware.

### Audio
- IMPLEMENTADO — WASAPI microphone.
- IMPLEMENTADO — WASAPI system loopback.
- IMPLEMENTADO — timestamp domain canónico de 100 ns.
- IMPLEMENTADO — VoiceEffectProcessor local.
- IMPLEMENTADO — cadena local HPF/presencia/compresión/saturación/limitador.
- IMPLEMENTADO — AudioTimelineMixer.
- IMPLEMENTADO — normalización sample-rate/canales.
- IMPLEMENTADO — gate contra cambio de formato durante output.
- VERIFICADO — smoke tests del mixer.
- PENDIENTE — drift correction con relojes físicos.
- PENDIENTE — validación prolongada en hardware.

### Media timing / A/V
- VERIFICADO — MediaClock.
- VERIFICADO — RealtimePacer.
- VERIFICADO — MediaInterleaver global por PTS.
- VERIFICADO — empate determinista a favor de audio.
- VERIFICADO — bounded queues.
- VERIFICADO — límite de despacho por polling.
- IMPLEMENTADO — política de late-drop de vídeo.
- IMPLEMENTADO — métrica de audio tardío sin hueco forzado.
- BLOQUEADO — PTS originales todavía no atraviesan el transporte raw.
- PENDIENTE — transporte temporal explícito o frontera equivalente.
- PENDIENTE — drift correction de producción.
- PENDIENTE — prueba sostenida A/V.

### Raw transport / FFmpeg
- VERIFICADO — named pipes Windows con overlapped I/O.
- VERIFICADO — cancelación y colas acotadas.
- VERIFICADO — contrato vídeo BGRA8.
- VERIFICADO — contrato audio PCM float32 LE.
- IMPLEMENTADO — dos canales independientes hacia FFmpeg.
- IMPLEMENTADO — supervisor de proceso.
- IMPLEMENTADO — quoting Windows/Unicode.
- IMPLEMENTADO — EOF/flush antes de forced termination.
- IMPLEMENTADO — reconciliación de salida inesperada.
- IMPLEMENTADO — stderr limitado a 256 KiB.
- VERIFICADO — prueba FFmpeg local BGRA + PCM → H.264/AAC → Matroska.
- PENDIENTE — FFmpeg + named pipes sostenidos en Windows.
- PENDIENTE — grabación prolongada real.
- PENDIENTE — RTMP real.
- PENDIENTE — política final de redistribución/codec.

### Resiliencia de output
- VERIFICADO — OutputRetryPolicy.
- VERIFICADO — backoff exponencial acotado.
- VERIFICADO — clasificación network/encoder/input/mux/permission/unknown.
- IMPLEMENTADO — retry solo para RTMP.
- IMPLEMENTADO — no reintentar automáticamente errores locales no recuperables.
- IMPLEMENTADO — métricas de retry.
- IMPLEMENTADO — stop manual cancela retry.
- PENDIENTE — validar reconexión contra RTMP real.

### Avatar / tracking
- IMPLEMENTADO — contrato neutral de avatar.
- IMPLEMENTADO — expression/mouth/blink/head/gaze normalizados.
- IMPLEMENTADO — FaceTrackingBridge.
- IMPLEMENTADO — MediaPipe Face Landmarker adapter.
- IMPLEMENTADO — guardia de timestamps crecientes.
- IMPLEMENTADO — Three.js + GLTFLoader.
- IMPLEMENTADO — morph target aliases.
- IMPLEMENTADO — appearance profile/presets.
- IMPLEMENTADO — anchors para accesorios.
- IMPLEMENTADO — randomización reproducible.
- IMPLEMENTADO — placeholder full-body técnico con cabeza, torso, brazos, manos, caderas, piernas, pies y anchors.
- BLOQUEADO — **asset visual definitivo de Cari**: la documentación canónica todavía no fija diseño visual definitivo.
- PENDIENTE — modelo VRM/GLB final aprobado.
- PENDIENTE — lip-sync de producción.
- PENDIENTE — composición avatar → frame final sin readback CPU.
- PENDIENTE — validación de tracking/render en hardware.
- ADAPTER-ONLY — Live2D hasta resolver runtime/licencia/distribución.

### Composición
- IMPLEMENTADO — compositor RGBA de referencia.
- IMPLEMENTADO — compositor D3D11 experimental.
- IMPLEMENTADO — alpha overlay experimental.
- IMPLEMENTADO — readback CPU lazy para diagnóstico/fallback.
- PENDIENTE — compositor GPU de producción sin readback.
- PENDIENTE — composición estable avatar + captura + overlays → encoder.

### Streaming / eventos
- IMPLEMENTADO — EventSub/chat.
- IMPLEMENTADO — eventos follow/sub/gift/resub/cheer/raid/channel points/polls/predictions.
- IMPLEMENTADO — comandos locales.
- IMPLEMENTADO — TTS local gate.
- IMPLEMENTADO — StudioActionRouter.
- IMPLEMENTADO — runtime bindings.
- PENDIENTE — ejecución completa de backends nativos.
- IMPLEMENTADO — supervisor multi-stream experimental hasta 4 destinos.
- PENDIENTE — multi-stream real.
- PENDIENTE — reconexión/re-suscripción EventSub validada en servicio real.

### CI / distribución
- IMPLEMENTADO — CMake Release x64.
- IMPLEMENTADO — smoke targets.
- IMPLEMENTADO — portable ZIP.
- IMPLEMENTADO — workflows para rama de desarrollo y workflow_dispatch.
- BLOQUEADO — GitHub Actions recientes terminan antes de steps/logs útiles.
- PENDIENTE — CI Windows verde.
- PENDIENTE — package-lock reproducible.
- PENDIENTE — bundle de FFmpeg/codec legalmente redistribuible.
- IMPLEMENTADO — instalador NSIS x64 configurado; falta validación release Windows.- PENDIENTE — logs/diagnóstico de usuario.
- PENDIENTE — hardware validation.

## Correcciones recientes

### 2026-09-20
- Se añadió `OutputRetryPolicy` con backoff limitado.
- Se añadió clasificación de fallos de output.
- Se integró retry condicionado a RTMP.
- Se añadió estado/código de salida de FFmpeg al control plane.
- Se limitó stderr a 256 KiB.
- Se añadió backpressure de arranque de pipes.
- Se añadió límite de 8 eventos multimedia por polling.
- Se reforzaron invariantes para impedir cambios de captura/audio durante output.
- Se creó fallback VTuber **de cuerpo completo** en Three.js para dejar de depender de la cabeza aislada como placeholder.
- El fallback está compuesto por head/face/hair/torso/hips, hombros, brazos, codos, manos, muslos, rodillas, tibias y pies, además de anchors para assets.
- El tracking de cabeza del fallback ahora rota solo la cara, no todo el cuerpo.
- Se corrigió la serialización del campo `output` en status.
- Se amplió la UI con métricas de pacing/retry/output.
- Se añadió/actualizó este ledger para evitar repetir estas implementaciones.

## Intentos descartados — NO REPETIR

1. **capturePage() como transporte principal de vídeo** — DESCARTADO. Produce snapshots y no sustituye una ruta nativa multimedia.
2. **Python como motor multimedia principal** — DESCARTADO. Python queda para tooling/tests; el runtime Windows sigue en C++.
3. **OpenCV como sustituto de Windows Graphics Capture** — DESCARTADO. Se puede usar para procesamiento/cámara, no como reemplazo obligatorio.
4. **Live2D propietario como dependencia embebida** — DESCARTADO hasta resolver licencia/runtime.
5. **IA como requisito del streamer** — DESCARTADO.
6. **Retry indiscriminado de cualquier error FFmpeg** — DESCARTADO.
7. **Declarar CI verde solo porque existe workflow** — DESCARTADO.
8. **Promover el placeholder geométrico a “modelo definitivo de Cari”** — DESCARTADO. El placeholder sirve para validar pipeline; el asset final necesita definición/asset aprobado.

## Punto importante sobre el VTuber de Cari

El renderer ya no debe interpretarse como “una cabeza de Cari”.

Hay dos conceptos distintos:

- **Fallback técnico:** cuerpo completo procedimental, usado para probar tracking, composición, anchors y pipeline.
- **Avatar final de Cari:** modelo artístico completo, con diseño, cabello, ropa, materiales, rig/morphs y expresiones definitivas.

El primero ya está implementado. El segundo sigue pendiente porque la documentación canónica de Cari marca su diseño visual definitivo como no establecido. No inventar ese diseño dentro del runtime.

## Cola priorizada actual

### P0 — output verificable
1. Resolver/diagnosticar GitHub Actions.
2. Build Windows.
3. Ejecutar named-pipe + FFmpeg E2E durante una sesión real.
4. Inspeccionar archivo con ffprobe.
5. Medir A/V sostenido.
6. Validar RTMP y reconnect.

### P1 — avatar real dentro del frame
1. Sustituir placeholder por modelo GLB/VRM aprobado.
2. Mantener contrato neutral de actuación.
3. Mapear morphs/bones.
4. Componer avatar + captura + overlays en D3D11.
5. Eliminar readback CPU del camino normal.
6. Validar rendimiento.

### P2 — calidad de tracking/audio
1. Cámara Media Foundation real.
2. Medición MediaPipe sostenida.
3. Lip-sync.
4. Drift correction.
5. Pitch/formant solo después de medir latencia.

### P3 — streaming
1. RTMP real.
2. reconnect/backoff real.
3. Twitch/YouTube.
4. EventSub reconnect.
5. multistream después de estabilidad single-output.

### P4 — producto
1. presets/UI final.
2. asset catalog.
3. instalador.
4. distribución FFmpeg/codec.
5. logs.
6. hardware validation.
7. release candidate.

## Regla anti-repetición

Antes de crear un módulo nuevo:
1. buscar este archivo;
2. buscar `PROJECT_STATUS.md`;
3. buscar `AUDIT_MATRIX.md`;
4. buscar el código existente;
5. si ya está IMPLEMENTADO o VERIFICADO, trabajar únicamente sobre el gate pendiente o una regresión reproducible.

**No crear una segunda implementación paralela de un componente ya existente.**

## Porcentaje

La estimación global actual es **~65% de ingeniería** y **~50% de producto usable/end-user**.

No se aumenta por cantidad de archivos. El porcentaje solo sube cuando una capacidad cruza un gate funcional o de validación.

## Producto / UX — corrección de continuidad

### Problema detectado por revisión de usuario
- La aplicación tenía capacidades internas pero no un camino claro para descubrirlas o activarlas.
- El panel no explicaba cómo autenticarse en Twitch.
- Chat estaba en código separado y no en la operación principal.
- El selector de modelo no existía como acción visible.
- El framing del avatar podía dejar solo la cabeza visible.
- No había instalador final accesible.

### Corrección implementada
- UI Twitch con Client ID + channel + Connect/Disconnect.
- OAuth de escritorio con callback local.
- EventSub channel.chat.message conectado a UI.
- Send Chat conectado.
- Read Chat local mediante speechSynthesis.
- Acciones locales de chat !happy / !angry / !neutral.
- Load GLB/glTF visible.
- Show/Hide Avatar Overlay visible.
- Full-body framing del avatar corregido.
- launcher .cmd e instalador NSIS x64 configurados.

### Medición correcta
- Ingeniería implementada: ~65%.
- Producto usable de extremo a extremo: ~50%.
- El segundo porcentaje es el indicador que debe mostrarse al usuario hasta que Windows/Twitch/RTMP/modelo/hardware estén validados.

### NO REPETIR
- No volver a contar módulos desconectados de UI como funciones terminadas.
- No rehacer la reconexión EventSub: `TwitchChatService` ya conserva la sesión vieja durante `session_reconnect`, espera el nuevo `session_welcome` y no recrea las suscripciones transferidas.
- No volver a usar el porcentaje de ingeniería como porcentaje de producto.
- No rehacer Twitch chat: el transporte principal de escritorio es TwitchChatService + TwitchAuth + twitch-api.
- No rehacer selector de avatar: avatar:choose-model ya existe.
- No rehacer instalador NSIS: solo ampliar/validar la ruta existente.
## Corrección 2026-09-20 — producto usable

La revisión del usuario reveló que la infraestructura avanzada no era suficiente para considerar el programa usable.

Se corrige la metodología:
- La ingeniería implementada cuenta módulos, contratos, infraestructura y automatización realmente integrados.
- El producto usable cuenta únicamente flujos que un usuario puede descubrir y ejecutar desde el desktop.
- Un módulo sin UI o sin integración en el flujo no se cuenta como función terminada.

Flujos ahora accesibles:
- Start Cari Engine.
- Window / Screen capture.
- Local MKV / Direct RTMP.
- Connect Twitch / Disconnect.
- Chat entrante / Send Chat / Read Chat.
- Load GLB/glTF.
- Show/Hide Avatar Overlay.
- Camera On/Off.
- Voice Off / Anime Bright.
- OBS opcional.

Pendientes críticos que impiden producción:
- validación real Windows;
- Twitch real;
- RTMP real sostenido;
- modelo artístico final;
- composición avatar → encoder;
- drift correction;
- Game Capture;
- cámara final;
- lip-sync;
- distribución legal de FFmpeg;
- hardware del usuario.
## CI diagnóstico 2026-09-20

- IMPLEMENTADO — workflow adicional de diagnóstico de runner.
- OBSERVADO — Native Windows Build, CI, Character Runtime Tests y Actions Runner Diagnostic siguen terminando antes de steps/logs útiles.
- NO REPETIR — mientras `steps=null` y `logs_url=null`, no atribuir la falla a una línea del código.

## 2026-09-20 — Checkpoint actual

HEAD verificado del PR #2: `c9e75775698814359aeb3ccab59c25efc2aa10e3`.

### Capacidades añadidas desde el ledger histórico

- IMPLEMENTADO — captura de cámara mediante Media Foundation y source `camera` en el runtime; VALIDACIÓN EN HARDWARE pendiente.
- IMPLEMENTADO — compositor D3D11 experimental para captura + overlays + placeholder de avatar con alpha; readback CPU queda como fallback/diagnóstico, no como ruta de producción.
- IMPLEMENTADO — worker `LatestItemQueue` para desacoplar procesamiento pesado del callback de Windows Graphics Capture y conservar el último frame.
- IMPLEMENTADO — estimador independiente de drift de reloj de audio; corrección/resampling continua sigue pendiente.
- IMPLEMENTADO — ruta experimental Libav con PTS explícitos; compilación/verificación con kit FFmpeg de Windows sigue pendiente.
- IMPLEMENTADO — smoke E2E de named pipes + FFmpeg que genera 5 s sintéticos, cierra por EOF y vuelve a validar el archivo; CI/hardware siguen pendientes porque los runners actuales no ejecutan steps observables.
- IMPLEMENTADO — supervisor multistream experimental con retry independiente por destino; validación con varios endpoints reales sigue pendiente.
- IMPLEMENTADO — editor visual de acciones del VTuber, ActionStore, persistencia/export/import y activación desde chat/UI.
- IMPLEMENTADO — UI Twitch OAuth/EventSub/chat, selector de GLB/glTF, overlay y lectura local.
- IMPLEMENTADO — configuración de instalador NSIS x64; validación release/firma/redistribución FFmpeg siguen pendientes.
- IMPLEMENTADO — workflows con ejecución en la rama de desarrollo, instalación temporal de FFmpeg y gates E2E.
- CORREGIDO — compositor D3D11: conversión correcta de mensajes de error de `D3DBlob` a `std::wstring`.

### Verificación que NO debe sobredeclararse

- BLOQUEADO — GitHub Actions actuales siguen terminando antes de steps/logs útiles; no usar su `failure` para atribuir un error de compilación sin logs.
- BLOQUEADO — el E2E named-pipe está implementado pero no pasa a estado VERIFICADO mientras no exista una ejecución Windows observable.
- BLOQUEADO — el compositor D3D11 está integrado experimentalmente pero no se considera producción por readback CPU y falta de validación sostenida.
- BLOQUEADO — Libav/PTS explícitos requiere kit de desarrollo FFmpeg y validación Windows.
- PENDIENTE — hardware real, cámara real, Game Capture, drift correction, RTMP real, EventSub reconnect real y modelo artístico definitivo.

### Estado cuantitativo vigente

- Ingeniería implementada: **~65%**.
- Producto usable/end-user: **~50%**.
- No usar checkpoints anteriores (58/60) para decidir trabajo nuevo.

### Próximo trabajo permitido

1. Resolver evidencia de CI/runner y ejecutar el harness Windows.
2. Cerrar E2E named-pipe + FFmpeg observable.
3. Validar compositor D3D11 sostenido y medir coste del readback.
4. Conectar modelo/avatar real sin crear un nuevo renderer paralelo.
5. Completar PTS extremo a extremo y drift correction.
6. Validar RTMP/reconnect y luego multistream real.
7. Cerrar hardware gate y distribución.

### Anti-repetición

No volver a crear:
- otro scheduler A/V;
- otro mixer temporal;
- otro supervisor FFmpeg;
- otro transporte raw;
- otro renderer Three.js base;
- otro ActionStore;
- otro puente Twitch;
- otro instalador paralelo.

Mejorar el componente existente solamente ante una regresión reproducible, evidencia nueva o un gate pendiente documentado.


### Corrección de continuidad — fuente viva

El SHA de HEAD puede cambiar inmediatamente después de esta entrada por nuevos commits. Para el estado vivo se debe leer siempre el HEAD del PR #2; el SHA anterior queda como checkpoint histórico.

La única fuente para decidir el siguiente trabajo es:
- `experimental/studio/BITACORA.md` para historial y NO REPETIR;
- `experimental/studio/PROJECT_STATUS.md` para estado agregado;
- `experimental/studio/AUDIT_MATRIX.md` para gates;
- HEAD/metadata del PR #2 para el estado vivo del branch.

### Snapshot de capacidades actuales

**IMPLEMENTADO**
- Studio desktop y editor visual de acciones.
- ActionStore/persistencia/import-export.
- Three.js/glTF/GLB + fallback full-body.
- MediaPipe Face Landmarker + bridge + monotonic timestamp guard.
- Media Foundation camera source.
- Windows Graphics Capture ventana/pantalla.
- WASAPI mic/loopback + AudioTimelineMixer + local voice DSP.
- MediaClock/RealtimePacer/MediaInterleaver + bounded queues.
- D3D11 compositor experimental + placeholder/overlay.
- LatestItemQueue fuera del callback de captura.
- FFmpeg supervisor + named pipes + local/RTMP profiles.
- E2E named-pipe smoke de 5 s.
- Libav experimental con PTS explícitos.
- Output diagnostics + RTMP retry/backoff limitado.
- Twitch OAuth/EventSub/chat UI.
- Multistream experimental hasta 4 destinos.
- NSIS x64 + harness `validate-windows.ps1`.
- Auditoría de licencias de dependencias.

**VERIFICADO**
- Smoke tests portables de core/timing/retry/diagnostics.
- Pruebas aisladas de ActionStore/renderer.
- Contrato FFmpeg sintético con H.264/AAC + Matroska.

**BLOQUEADO / PENDIENTE DE VALIDACIÓN**
- CI Windows observable.
- E2E Windows named-pipe real.
- Composición D3D11 sostenida y eliminación del readback CPU de la ruta normal.
- Modelo artístico final y licencia del avatar.
- Cámara real y reconexión.
- Game Capture.
- Drift correction de relojes físicos.
- PTS extremo a extremo en el transporte actual.
- RTMP real y reconexión real.
- EventSub reconnect real.
- Lip-sync final.
- Instalador firmado/distribución FFmpeg/codec.
- Hardware/PC objetivo.

**DESCARTADO — NO REPETIR**
- capturePage como transporte principal.
- Python como motor multimedia.
- OpenCV como sustituto obligatorio de Windows Graphics Capture.
- Live2D propietario embebido sin resolver runtime/licencia.
- IA como dependencia del streamer.
- Retry automático indiscriminado de cualquier error FFmpeg.


## CI / Runner checkpoint — 2026-09-20

Últimos runs observados sobre el HEAD del branch:
- Native Windows Build: run 369, `failure`, jobs con `steps=null`.
- CI: jobs con `failure`/cancelación y `steps=null`.
- Character Runtime Tests: jobs con `failure` y `steps=null`.
- Actions Runner Diagnostic: job `probe` con `failure`, `steps=null`, `logs_url=null`.

Conclusión de auditoría:
- BLOQUEADO por infraestructura/runner.
- No hay evidencia de que CMake, npm, CTest o el smoke E2E hayan comenzado a ejecutar.
- No atribuir estos estados a una regresión concreta del código hasta disponer de logs/steps observables.

No repetir:
- No reestructurar código para “arreglar” estos failures sin una línea de log que lo justifique.
- No marcar build/CI como VERIFICADO por la mera existencia del workflow.
