# Cari Studio — Bitácora maestra de ingeniería

> Documento operativo para continuidad. Antes de implementar una tarea, buscar aquí y en `AUDIT_MATRIX.md`.
> No volver a implementar, investigar o probar un punto marcado como RESUELTO salvo que aparezca evidencia nueva de regresión.

## Estado general

- Rama: `fix/native-windows-foundation`
- PR: #2 — `fix: harden native Windows foundation`
- Plataforma objetivo: Windows x64
- Arquitectura: Electron control plane + Native Windows C++ media engine
- Principio: local-first; IA/API/cloud no son obligatorios para la operación principal.
- Assets propietarios: no se distribuyen.
- Avatar por defecto: Cari procedural/runtime, reemplazable por glTF/GLB local.

## Estados usados

- **IMPLEMENTADO** — existe código.
- **VERIFICADO** — tiene prueba automatizada/portable o evidencia reproducible.
- **VALIDADO EN HARDWARE** — comprobado en Windows/PC objetivo o servicio real.
- **PENDIENTE** — falta implementación o evidencia.
- **BLOQUEADO EXTERNO** — el código está preparado pero la evidencia depende de infraestructura/servicio externo.

## Registro por área

### 1. Arquitectura y control

| Tarea | Estado | Evidencia / decisión |
|---|---|---|
| Separar Electron de motor nativo | IMPLEMENTADO | Renderer/Main controlan; C++ captura/audio/output. |
| JSONL request/response | IMPLEMENTADO + VERIFICADO | IDs y smoke del protocolo. |
| Serialización de sesión | IMPLEMENTADO + VERIFICADO | StudioSessionManager. |
| Rollback de output | IMPLEMENTADO + VERIFICADO | Capture/audio iniciados por output se liberan si falla. |
| Stop-only seguro | IMPLEMENTADO + VERIFICADO | Stop no inicia engine offline. |
| No cambiar capture/audio durante output | IMPLEMENTADO | Invariantes nativas + session manager + hotkeys. |

### 2. Captura

| Tarea | Estado | Evidencia / decisión |
|---|---|---|
| Windows Graphics Capture — ventana | IMPLEMENTADO | CaptureEngine. |
| Windows Graphics Capture — pantalla primaria | IMPLEMENTADO | CreateForMonitor. |
| Enumeración de ventanas | IMPLEMENTADO | índice explícito. |
| Resize/frame-pool recreate | IMPLEMENTADO | CaptureEngine. |
| Device loss removed/reset/hung | IMPLEMENTADO | recuperación explícita. |
| Cámara Media Foundation | PENDIENTE | Solo enumeración actual; falta streaming nativo real. |
| Game Capture dedicada | PENDIENTE | Requiere backend específico. |
| Hardware real | PENDIENTE | Gate antes de producción. |

### 3. Privacidad de cámara

| Tarea | Estado | Evidencia / decisión |
|---|---|---|
| Cámara usada como input de tracking | IMPLEMENTADO | getUserMedia → video oculto. |
| Cara del usuario visible en Preview | RESUELTO / NO REPETIR | `#camera` y `#tracking-camera` no se renderizan; solo sirven como superficie de entrada. |
| Cara visible en panel Tracking | RESUELTO / NO REPETIR | panel sustituido visualmente por estado “CÁMARA OCULTA · SOLO TRACKING”. |
| Cámara incluida en output | RESUELTO / NO REPETIR | output nativo consume captura WGC/ventana/pantalla, no el elemento de cámara del renderer. |
| Mostrar video para depurar | NO HACER | usar métricas/landmarks/estado, nunca el frame bruto en producción. |

### 4. Tracking facial

| Tarea | Estado | Evidencia / decisión |
|---|---|---|
| MediaPipe Face Landmarker local | IMPLEMENTADO | VIDEO mode, blendshapes + transformation matrices. |
| Timestamp monotónico | IMPLEMENTADO + VERIFICADO previamente | guard en FaceTracker. |
| Expresión automática | IMPLEMENTADO | happy/angry/afraid/sad/embarrassed/neutral + estados existentes. |
| Head pose | IMPLEMENTADO | yaw/pitch/roll. |
| Gaze | IMPLEMENTADO | derivado de eye-look blendshapes + smoothing. |
| Jitter reduction | IMPLEMENTADO | smoothing de pose/gaze. |
| Manos | PENDIENTE | requiere Hand Landmarker o input alternativo. |
| Identificación de objeto físico | PENDIENTE | cámara facial no sabe por sí sola si se usa teclado/mando/móvil. |
| Validación de rendimiento del modelo | PENDIENTE | hardware real. |

**Regla de precisión:** Face Landmarker puede producir blendshapes y matrices de transformación para actuación facial; no es un detector acústico de habla. Para “hablar” se utiliza audio local separado. citeturn475432search0turn475432search4

### 5. Habla / micrófono

| Tarea | Estado | Evidencia / decisión |
|---|---|---|
| Native microphone capture | IMPLEMENTADO | WASAPI. |
| Mic enable/disable | IMPLEMENTADO | `microphone.set`. |
| Botón manual “Hablar” | IMPLEMENTADO | activa audio, micrófono y acción talking. |
| Botón “Auto” | IMPLEMENTADO | activa VAD local y libera expresión manual. |
| VAD local | IMPLEMENTADO | SpeechActivityDetector + Web Audio AnalyserNode. |
| Lip sync por amplitud | IMPLEMENTADO | AudioLipSync. |
| Separar audio de tracking facial | IMPLEMENTADO | actuación compuesta face + speech. |
| Speech-to-text semántico | NO IMPLEMENTADO | no necesario para “hablar”; no inventar detección semántica. |
| VAD de producción / hardware | PENDIENTE | ajustar umbrales con micrófono real. |

**Regla:** el VAD actual significa “hay energía de voz probable”, no “se ha entendido una frase”. Web Audio `AnalyserNode` permite leer waveform/frecuencia sin alterar el stream. citeturn619868search2turn619868search5

### 6. Avatar Cari

| Tarea | Estado | Evidencia / decisión |
|---|---|---|
| Avatar procedural local | IMPLEMENTADO | ThreeAvatarRenderer. |
| Expresiones faciales | IMPLEMENTADO | contrato neutral + morph/rig placeholder. |
| Boca | IMPLEMENTADO | face + speech input. |
| Parpadeo | IMPLEMENTADO | tracking. |
| Gaze | IMPLEMENTADO | tracking. |
| Head motion | IMPLEMENTADO | tracking + idle. |
| Idle / movimiento libre | IMPLEMENTADO | oscilación respiratoria, balance y micro-movimiento. |
| Actividad teclado | IMPLEMENTADO | pose de brazos + pulso. |
| Actividad mando | IMPLEMENTADO | pose de brazos + pulso. |
| Actividad móvil | IMPLEMENTADO | pose manual. |
| Cambio automático a teclado | IMPLEMENTADO | Keyboard events locales. |
| Cambio automático a mando | IMPLEMENTADO | Gamepad API local. |
| Botones manuales de actividad | IMPLEMENTADO | UI. |
| GLB/glTF | IMPLEMENTADO | GLTFLoader. |
| Live2D runtime | PENDIENTE | adapter boundary, no runtime propietario distribuido. |
| Avatar final artístico | PENDIENTE | falta asset definitivo del personaje si se desea reemplazar el procedural. |

**No repetir:** el avatar procedural ya sirve como runtime funcional de referencia. No reemplazarlo por imágenes arbitrarias hasta que exista un asset artístico definitivo.

### 7. Composición / output

| Tarea | Estado | Evidencia / decisión |
|---|---|---|
| MediaClock | IMPLEMENTADO + VERIFICADO | C++20 smoke. |
| RealtimePacer | IMPLEMENTADO + VERIFICADO | C++20 smoke. |
| Interleaver A/V por PTS | IMPLEMENTADO + VERIFICADO | audio primero en empate. |
| Colas acotadas | IMPLEMENTADO | drops medibles. |
| Presupuesto de despacho por tick | IMPLEMENTADO | máximo 8 eventos/poll. |
| Formato audio invariante durante output | IMPLEMENTADO | rate/canales rechazados si cambian. |
| Raw pipes A/V | IMPLEMENTADO | dos named pipes. |
| PTS dentro del raw pipe | PENDIENTE | todavía no viajan como metadata explícita. |
| FFmpeg supervisor | IMPLEMENTADO | lifecycle, stderr, exit code. |
| stderr acotado | IMPLEMENTADO | 256 KiB. |
| Output failure classification | IMPLEMENTADO | network/encoder/input/mux/permission/unknown. |
| RTMP retry/backoff | IMPLEMENTADO | solo categoría network; 5 intentos máximo; 1→30 s. |
| Reintentar encoder/mux automáticamente | NO HACER | ocultaría errores deterministas. |
| Compositor avatar → señal codificada | PENDIENTE | mayor gate multimedia restante. |
| GPU compositor D3D11 | PENDIENTE | reemplaza readback CPU de referencia. |
| Encoder/mux sostenido Windows | PENDIENTE | hardware/CI. |
| Drift correction | PENDIENTE | relojes físicos. |
| RTMP real sostenido | PENDIENTE | endpoint real. |

### 8. OBS

| Tarea | Estado | Evidencia / decisión |
|---|---|---|
| obs-websocket 5.x | IMPLEMENTADO | integración opcional en Electron Main. |
| OBS como requisito | NO | Cari puede emitir directamente. |
| Leer “habla” semántica desde OBS | NO | OBS no sustituye VAD/STT. |
| Usar OBS para sustituir compositor nativo | NO | integración opcional, no dependencia. |

### 9. CI

| Tarea | Estado | Evidencia / decisión |
|---|---|---|
| Native Windows workflow | IMPLEMENTADO | CMake + smoke + ZIP. |
| CI rama de desarrollo | IMPLEMENTADO | push branch + workflow_dispatch. |
| Runs recientes de branch | BLOQUEADO EXTERNO | jobs terminan antes de steps, `steps=null`. |
| Declarar CI verde | NO HACER | no existe evidencia de steps ejecutados. |

## “NO REPETIR”

1. No volver a implementar un botón de micrófono: `microphone.set` + “Hablar/Callar” ya existen.
2. No volver a implementar VAD básico por RMS desde cero: `LocalSpeechController` + `SpeechActivityDetector` ya existen.
3. No volver a exponer la cámara: los elementos de video son ocultos y solo sirven de input.
4. No volver a investigar cómo hacer expresiones básicas: FaceTrackingBridge + AvatarActingBridge + contrato ya lo resuelven.
5. No volver a crear otro avatar procedural paralelo: consolidar cambios en ThreeAvatarRenderer.
6. No volver a agregar otro scheduler simple: RealtimePacer + MediaInterleaver ya son la base.
7. No reintentar automáticamente fallos de encoder/mux/permiso/input.
8. No usar OpenCV solo por añadir una dependencia: actualmente WGC + MediaPipe cubren el núcleo; agregar OpenCV solo si una necesidad concreta queda demostrada.
9. No distribuir un runtime Live2D propietario sin revisar licencia/redistribución.
10. No declarar “funciona” por tener código o compilar: mantener los tres estados de evidencia.

## Intentos / problemas ya resueltos

- Orden A/V inicial incorrecto: audio se despachaba completamente antes de video → corregido con interleaver global.
- Cambios de audio durante output → rechazados explícitamente.
- Consumo de audio antes de conectar pipes → bloqueado por backpressure.
- Ráfagas de recuperación → límite de 8 eventos/poll.
- stderr FFmpeg ilimitado → buffer máximo 256 KiB.
- status `output` mal serializado → corregido.
- classifier de red demasiado amplio → reducido para evitar reintentos incorrectos.
- intentos de prueba con dos FIFOs que expiran durante handshake → no usar como evidencia de encoder/mux; la prueba sintética por archivos raw valida formato/mapping/mux.
- CI fallando con jobs sin steps → se reintentó; sigue siendo una evidencia de infraestructura/runner, no de compilación.
- rama divergente respecto de main por dos commits históricos → no reescribir historia automáticamente.

## Próximo foco recomendado

Prioridad técnica para evitar repetir trabajo:
1. compositor avatar → frame final;
2. transporte de timestamps explícitos;
3. GPU compositor D3D11;
4. cámara Media Foundation;
5. drift correction;
6. prueba Windows real de FFmpeg/named pipes;
7. RTMP real y validación de reconexión;
8. hardware target;
9. lip-sync/visemes más preciso;
10. Hand Landmarker / automatización de actividades físicas.

## Regla de auditoría

Antes de agregar una función:
- buscar primero el nombre del concepto en esta bitácora;
- buscar su archivo en el árbol;
- revisar `PROJECT_STATUS.md` y `AUDIT_MATRIX.md`;
- reutilizar el contrato existente;
- crear código nuevo solo si la evidencia demuestra una carencia.

### Última actualización

Esta bitácora se creó durante la implementación del runtime de avatar, privacidad de cámara, VAD/habla y actividades locales. El HEAD exacto debe consultarse en GitHub/PR al continuar.


## Registro de esta continuación — 2026-09-21

### Avatar / tracking
- **IMPLEMENTADO:** `AvatarActingBridge` separa inputs de rostro, audio y actividad antes de componer el estado final.
- **IMPLEMENTADO + VERIFICADO:** boca compuesta; rostro sigue aportando jawOpen, audio aporta VAD/lip-sync; el botón Hablar aplica solo una apertura mínima y el audio puede superarla.
- **IMPLEMENTADO:** Callar usa un mute de boca duro.
- **IMPLEMENTADO + VERIFICADO:** gaze derivado de blendshapes eye-look con smoothing.
- **IMPLEMENTADO:** `AvatarActivityController`.
- **IMPLEMENTADO:** idle/movimiento libre continuo.
- **IMPLEMENTADO:** detección local de interacción de teclado y Gamepad API.
- **IMPLEMENTADO:** actividad manual teclado/mando/móvil y modo automático.
- **IMPLEMENTADO:** animación procedural de brazos/cuerpo para esas actividades.
- **IMPLEMENTADO:** cámara visualmente oculta en Preview y Tracking; el vídeo solo sirve de superficie para MediaPipe.

### Habla
- **IMPLEMENTADO:** micrófono nativo con `microphone.set`.
- **IMPLEMENTADO:** botón Hablar → audio + micrófono + acción talking.
- **IMPLEMENTADO:** botón Auto → VAD local + lip-sync.
- **VERIFICADO:** VAD usa histéresis/hold para evitar parpadeo de estado.
- **NO REPETIR:** no usar Face Landmarker como detector acústico; la cámara detecta actuación facial, el audio detecta actividad de voz.

### Infraestructura
- **IMPLEMENTADO:** política de retry/backoff de output.
- **IMPLEMENTADO:** retry solo para fallos clasificados como network.
- **IMPLEMENTADO:** no reintentar ciegamente encoder/mux/input/permission.
- **IMPLEMENTADO:** smoke tests de retry y clasificación.
- **IMPLEMENTADO:** workflows con branch de desarrollo + workflow_dispatch.

### Verificación local
- `avatar-runtime.test.mjs`: PASS.
- `MediaClock + RealtimePacer + MediaInterleaver`: PASS en evidencia previa.
- FFmpeg sintético BGRA + PCM float32 → H.264/AAC → Matroska: PASS en evidencia previa.
- CI GitHub sigue fallando antes de registrar steps (`steps=null`); no convertir ese resultado en “build roto” sin logs/steps.

### Puntos pendientes que pasan al siguiente ciclo
- compositor real Avatar/Three.js → frame final del encoder;
- timestamps explícitos dentro del transporte raw;
- compositor D3D11/GPU de producción;
- drift correction de relojes físicos;
- cámara Media Foundation;
- Game Capture;
- prueba sostenida Windows + FFmpeg + named pipes;
- RTMP real con endpoint de prueba;
- lip-sync por visemes/phonemes más preciso;
- Hand Landmarker para automatizar manos/objetos;
- validación en PC objetivo;
- Live2D legal/redistributible y multistream.

### Regla de continuidad
No volver a implementar ninguna de las tareas de esta sección salvo que aparezca evidencia nueva de regresión.
