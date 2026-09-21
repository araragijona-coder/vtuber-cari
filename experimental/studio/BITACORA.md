# CHECKPOINT CANÓNICO — 2026-09-21 — ACTIVIDAD MANUAL/AUTO + MICRÓFONO OPT-IN + CHIBIS

> Este bloque tiene precedencia sobre checkpoints históricos. Revisar antes de volver a modificar avatar, actividad, habla o UI.

- Rama: `fix/native-windows-foundation`
- PR: #2
- HEAD observado al cerrar esta revisión: `ea08fb0cddc525754f3e38314b03d39b06770e68`
- Estado: **EXPERIMENTAL / NO listo para producción**
- Ingeniería: **~71%**
- Producto usable/end-user: **~58%**
- Seguimiento global: **~65%**

## Requisitos del usuario incorporados

### Regla absoluta de IA
- **NO usar IA para operar Cari Studio.**
- Tracking facial significa MediaPipe/local deterministic processing, no IA generativa/cloud.
- Movimiento automático significa reglas deterministas, keyboard/gamepad/timers/estado, no toma de decisiones generativa.
- Lectura por cámara significa traducción de landmarks/blendshapes a estados definidos, no comprensión semántica.

### Micrófono
- El motor de audio inicia con **micrófono OFF**.
- El system loopback puede permanecer activo para audio del sistema.
- **Hablar** es la puerta explícita que habilita el micrófono.
- **Callar**/desactivar Hablar vuelve el micrófono a OFF.
- El polling de estado no puede abrir micrófono.
- VAD/lip-sync solo pueden analizar el micrófono después del gate explícito de Hablar.
- No implementar apertura automática del micrófono basada en volumen/VAD.

### Actividad de Cari
El contrato existente se amplió sin crear otro renderer:

- modo `manual`;
- modo `auto-motion`;
- modo `camera-actions`;
- movimiento `quiet / normal / restless`;
- brazos `relaxed / keyboard / controller / phone / hug / sleeping`;
- objeto `none / phone / joystick / keyboard / pillow`;
- pose `standing / sleeping`.

Modos completos:
- `gaming-angry-happy`: joystick + inquieta + brazos de mando + angry/happy.
- `keyboard-tired-focused`: teclado + quieta + brazos de teclado + exhausted/focused.
- `pillow-hug-sleeping`: almohada + quieta + abrazar + agotada/dormida.

## Chibis

Implementado en preview local:
- capibaras procedurales;
- mini-Cari procedural;
- movimiento determinista alrededor de Cari;
- máximo 8 unidades;
- canvas 2D independiente.

Decisión de rendimiento:
- no usar física compleja;
- no usar modelos 3D pesados para decoración;
- no aplicar sombras/postprocesado por unidad;
- mantener chibis separados del frame final hasta cerrar el compositor GPU.

El coste esperado de unos pocos chibis es bajo frente a la captura/composición/encoder. El cuello de botella futuro será draw calls, texturas, skinning, sombras y postprocesado, no el simple conteo de personajes.

## Integración y reutilización

NO CREAR:
- otro Action Store;
- otro Avatar Renderer;
- otro VAD;
- otro lip-sync;
- otro scheduler/interleaver;
- otro FFmpeg supervisor;
- otro OBS service;
- otro Twitch transport;
- otra bitácora.

Se reutilizan:
- `activity-motion.js`;
- `activity-presets.js`;
- `avatar-contract.js`;
- `acting-bridge.js`;
- `action-store.js`;
- `three-avatar.js`;
- `audio-lipsync.js`;
- `session-manager.js`.

## Verificación

Confirmado en código:
- estado de micrófono expuesto por el Native Engine;
- renderer no activa micrófono desde el polling;
- Auto movimiento fuerza micrófono OFF;
- actividad y objetos se propagan al contrato del avatar;
- el modo dormir modifica también postura del cuerpo procedural;
- mapa chibi está aislado del renderer de salida.

Evidencia previa conservada:
- smoke C++20 estricto de timing/interleaver/retry/diagnóstico;
- smoke JavaScript de sesión/avatar;
- FFmpeg sintético BGRA + PCM float32 → H.264/AAC → Matroska.

Pendiente:
- ejecutar los nuevos tests ESM de actividad/privacy en CI observable;
- validar Windows E2E real;
- validar cámara/overlay en hardware;
- integrar chibis al compositor final solo después de resolver el compositor GPU;
- validar el comportamiento del micrófono con dispositivo real.

## CI

Los workflows ya pueden dispararse sobre la rama de desarrollo y mediante `workflow_dispatch`, pero los runs recientes siguen muriendo antes de registrar steps/logs útiles.

Regla: no marcar CI verde hasta obtener Checkout/CMake/npm/CTest reales.

## Próximo trabajo válido

1. CI observable.
2. E2E Windows named-pipe → FFmpeg → archivo.
3. Compositor GPU sin CPU readback.
4. PTS explícitos extremo a extremo.
5. Drift correction WASAPI.
6. Validación cámara/Game Capture/hardware.
7. Backends reales de acciones Native/OBS.
8. Twitch/OBS/RTMP reales.
9. Distribución FFmpeg, instalador y release.

## CHECKPOINT CANÓNICO ACTUAL — 2026-09-21 — CARI V1 RUNTIME + CONTINUIDAD

> Este bloque tiene precedencia sobre todos los checkpoints históricos inferiores.

- Rama: `fix/native-windows-foundation`
- PR: #2
- HEAD auditado: `8b1a472fe57aa20e973a6d333acf1ddd0f63bc93`
- Estado: **EXPERIMENTAL / NO listo para producción**
- Ingeniería: **~71%**
- Producto usable/end-user: **~58%**
- Seguimiento global: **~65%**

### Bloque Cari V1 cerrado
- **IMPLEMENTADO:** avatar procedural de Cari sobre el `ThreeAvatarRenderer` existente.
- **IMPLEMENTADO:** expresiones canónicas `neutral`, `happy`, `angry`, `afraid`, `embarrassed`, `sad`, `exhausted`, `confused`.
- **IMPLEMENTADO:** acciones `talking` y `silent`.
- **IMPLEMENTADO:** botón **Hablar**: arranca audio/micrófono cuando corresponde, activa el gate nativo y selecciona `talking`.
- **IMPLEMENTADO:** botón **Callar**: desactiva el micrófono y fuerza boca cerrada cuando se usa la acción `silent`.
- **IMPLEMENTADO:** botón **Auto**: libera el override manual y devuelve boca/expresión a tracking + VAD.
- **IMPLEMENTADO:** botones manuales de reacción reutilizando el Action Store existente.
- **IMPLEMENTADO:** VAD local con RMS, HPF/LPF, histéresis y hold.
- **IMPLEMENTADO:** lip-sync local separado del Face Landmarker.
- **IMPLEMENTADO:** composición de boca: el modo `talking` deja una apertura mínima y el audio puede superarla; `silent` es hard mute.
- **IMPLEMENTADO:** tracking facial con pose de cabeza, blink, expresión y gaze.
- **IMPLEMENTADO:** smoothing de head/gaze.
- **IMPLEMENTADO:** movimiento libre/idle de baja amplitud.
- **IMPLEMENTADO:** actividad `keyboard`, `controller`, `phone`.
- **IMPLEMENTADO:** teclado y Gamepad pueden marcar actividad automáticamente; móvil queda como acción manual.
- **IMPLEMENTADO:** cámara usada como input de tracking, no como imagen de preview/output.
- **IMPLEMENTADO:** `#camera` y `#tracking-camera` ocultos en UI; la cara del usuario no debe aparecer en Preview/Tracking.
- **IMPLEMENTADO:** nuevo smoke de runtime para composición rostro+voz, actividad y VAD.

### Definición correcta de “analiza el habla”
- Cari puede detectar **actividad de habla probable** usando el micrófono local.
- El micrófono determina energía/actividad; el Face Landmarker determina movimiento facial.
- La cámara por sí sola no entiende audio ni contenido hablado.
- OBS WebSocket tampoco convierte automáticamente audio en texto o intención.
- No se añade STT/IA/cloud como dependencia obligatoria del runtime.

### Infraestructura reforzada y NO repetir
- `MediaClock`, `RealtimePacer`, `MediaInterleaver`: IMPLEMENTADOS + smoke.
- `OutputRetryPolicy`: IMPLEMENTADO.
- Clasificación de fallos output: IMPLEMENTADA.
- FFmpeg stderr acotado + exit code: IMPLEMENTADO.
- Backpressure de handshake: IMPLEMENTADO.
- Presupuesto de 8 eventos A/V por polling: IMPLEMENTADO.
- Invariantes para impedir cambiar captura/audio mientras hay output: IMPLEMENTADAS.
- No crear otro scheduler, otro FFmpeg supervisor, otro Action Store, otro renderer ni otro router de Twitch/OBS.

### Privacidad — regla de oro
**La cámara es una fuente de datos de tracking, no una fuente visual para emisión.**
Cualquier futura función que muestre webcam debe ser opt-in y estar fuera del canvas de salida de Cari.

### Evidencia de este ciclo
- JavaScript: smoke de `AvatarActingBridge`, `AvatarActivityController` y `SpeechActivityDetector`: PASS.
- `node --check` de módulos ESM relevantes: PASS en el flujo previo.
- C++20 portable de timing/retry/diagnóstico: PASS en el flujo previo.
- FFmpeg sintético BGRA + PCM float32 → H.264/AAC → Matroska: PASS en Linux.
- **No** equivale a validación Windows/hardware/RTMP sostenido.

### Bloqueadores actuales
1. CI sigue terminando con `steps=null`/`logs_url=null`; no marcar verde.
2. E2E Windows sostenido con named pipes + FFmpeg.
3. Compositor D3D11 sin CPU readback conectado de forma definitiva al encoder.
4. PTS explícitos extremo a extremo con Libav en Windows.
5. Drift correction basada en relojes físicos WASAPI.
6. Cámara Media Foundation y Game Capture en hardware real.
7. Validación real OBS/Twitch/RTMP.
8. Modelo artístico final / VRM / Live2D según licencias.
9. Instalador/release/firma y redistribución legal de FFmpeg.

### Próxima iteración obligatoria
Trabajar sobre los bloqueadores anteriores. No volver a crear:
- otro avatar;
- otro sistema de expresiones;
- otro botón Hablar;
- otro VAD;
- otro compositor;
- otro supervisor FFmpeg;
- otra bitácora.

---

## CHECKPOINT CANÓNICO ACTUAL — 2026-09-21 — HABLA + REACCIONES + CARI V0

- Este bloque supersede checkpoints históricos anteriores.
- Rama: `fix/native-windows-foundation`
- PR: #2
- HEAD auditado: `2ffeb2c8db89421e4151d3ef6ab94e0ca9fd0915`
- Estado: **EXPERIMENTAL / NO listo para producción**
- Ingeniería: **~71%**
- Producto usable/end-user: **~58%**
- Seguimiento global: **~65%**

### Trabajo cerrado en esta iteración

#### Cari V0
- Avatar procedural de cuerpo completo en el renderer Three.js existente.
- Action Store canónico reutilizado: `neutral`, `happy`, `sad`, `angry`, `afraid`, `embarrassed`, `exhausted`, `confused`, `talking`, `silent`.
- Tracking facial MediaPipe mantiene pose/mirada y estabiliza expresión para evitar parpadeos de estado.
- No se creó otro renderer, otro Action Store ni otro router.

#### Habla
- Nuevo `SpeechActivityDetector`: VAD local basado en nivel, histéresis y tiempo de retención.
- Nuevo `LocalSpeechController`: captura solo micrófono con Web Audio, aplica HPF/LPF y calcula RMS; no hace speech-to-text ni usa red.
- El VAD controla lip-sync del avatar, separado del tracking facial.
- El botón **Hablar** enciende el audio/micrófono nativo, activa el gate de micrófono y selecciona la acción `talking`.
- El botón **Auto** devuelve el control a tracking/VAD local.
- Los botones manuales de reacción usan el Action Store canónico.
- El renderer deja de inventar una apertura de boca sinusoidal cuando no hay habla detectada.

#### Micrófono nativo
- `AudioCoreBridge::microphone_enabled_` permite activar/desactivar solo el micrófono mientras el system loopback permanece disponible.
- Nuevo comando IPC `microphone.set`.
- `StudioSessionManager` conserva el estado `microphone` y lo sincroniza con el Native Engine.
- Durante output activo se mantiene la separación entre audio total y gate del micrófono.

### Cámara / compositor ya existentes — NO repetir
- `MediaFoundationCamera`: source nativa experimental; falta validación física/reconnect.
- `D3D11Compositor`: composición GPU capture + overlay; falta eliminar readback CPU para producción.
- `avatar_gpu_overlay`: placeholder/overlay capturable; no crear otra ruta de overlay.
- `ThreeAvatarRenderer`: ruta GLB/glTF y V0 procedural existentes.

### Verificación realizada
- `node --check` de `SpeechActivityDetector`: PASS.
- `node --check` de `LocalSpeechController`: PASS.
- Smoke del VAD con histéresis/hold: PASS.
- C++20 strict portable ya registrado para timing/interleaver/retry/diagnóstico.
- FFmpeg sintético 7.1.5 ya registrado: BGRA raw + PCM float32 → H.264/AAC → Matroska: PASS.
- CI: sigue sin ejecutar steps observables; no se marca verde.
- No se considera validado en hardware el micrófono, cámara, compositor, RTMP ni E2E named-pipe.

### NO REPETIR
| Componente | Estado | Próxima acción válida |
|---|---|---|
| WGC desktop capture | IMPLEMENTADO | solo regresión/hardware |
| WASAPI + mixer | IMPLEMENTADO | drift correction/hardware |
| MediaClock/Pacer/Interleaver | IMPLEMENTADO + smoke | PTS E2E |
| FFmpeg supervisor/boundary | IMPLEMENTADO | E2E Windows sostenido |
| RTMP retry/backoff | IMPLEMENTADO | red real; no crear otro |
| Media Foundation camera | IMPLEMENTADO EXPERIMENTAL | validar dispositivo/reconnect |
| D3D11 compositor | IMPLEMENTADO EXPERIMENTAL | quitar readback CPU/encoder |
| Three.js avatar | IMPLEMENTADO V0 | validar modelo/overlay/tracking |
| Action Store | IMPLEMENTADO | extender el existente |
| VAD/local speech | IMPLEMENTADO | calibrar/validar ruido real |
| Botón Hablar | IMPLEMENTADO | pruebas UI/integración |
| Reacción manual | IMPLEMENTADO | extender catálogo si hace falta |
| OBS WebSocket | IMPLEMENTADO | validar instancia OBS real |
| Twitch EventSub | IMPLEMENTADO | validar scopes/reconnect real |
| Game Capture | PENDIENTE | backend dedicado |

### Definición de “analiza el habla”
Cari Studio ahora puede determinar **si la persona está hablando** a partir del micrófono y usar ese estado para lip-sync/acción. La cámara no recibe audio y no puede detectar por sí sola el habla acústica. OBS puede capturar/mostrar niveles y fuentes de audio, pero no sustituye el VAD ni proporciona comprensión semántica de la voz por el solo hecho de estar conectado.

### Próximo orden obligatorio
1. Conseguir CI con steps/logs observables.
2. Ejecutar E2E Windows named-pipe → FFmpeg → archivo.
3. Conectar el compositor D3D11 sin CPU readback al encoder.
4. Verificar PTS explícitos con Libav en Windows.
5. Drift correction WASAPI.
6. Validar mic/cámara/overlay en hardware real.
7. Validar OBS/Twitch reales.
8. Game Capture, multistream, FFmpeg redistribution, instalador y release.

---


## ACTUALIZACIÓN CANÓNICA — cierre de avatar + auditoría — 2026-09-21

- HEAD verificado antes de este registro: `ed2ebd84b0a1a02bb3f126992befbc39ca36322e`.
- Ingeniería: **~69%**.
- Producto usable/end-user: **~55%**.
- Estado: **EXPERIMENTAL / NO listo para producción**.

### Evidencia nueva
- Sintaxis del `ThreeAvatarRenderer`, `avatar-contract`, `face-tracking-bridge`, `action-store` y renderer principal: PASS.
- `Action Store` ejecutado contra un storage de prueba: las 10 acciones canónicas coinciden con `CARI_ACTIONS.md`.
- Avatar V0: cuerpo completo procedural, tracking, expresiones y acciones integrado en el renderer existente.
- CI: `Native Windows Build`, `CI`, `Character Runtime Tests` y `Actions Runner Diagnostic` fallan con `steps=null`/`logs_url=null`; por tanto no hay ejecución observable de Checkout/CMake/npm/CTest.

### NO REPETIR
- No crear otro avatar renderer.
- No crear otro Action Store ni otro mapa de acciones.
- No rehacer WGC/WASAPI/MediaClock/Pacer/Interleaver/FFmpeg supervisor.
- No reintentar solucionar `steps=null` modificando el pipeline multimedia: el diagnóstico del runner tampoco ejecuta steps.
- No declarar Windows E2E, RTMP, cámara, Game Capture, drift, VRM/Live2D o hardware como validados sin evidencia.

### Siguiente trabajo permitido
1. Recuperar una ejecución de CI con steps/logs observables.
2. Ejecutar el smoke E2E named-pipe → FFmpeg → archivo en Windows.
3. Sustituir readback CPU del compositor por una ruta GPU que entregue directamente al encoder.
4. Validar PTS explícitos con Libav en Windows.
5. Implementar corrección de drift WASAPI basada en relojes físicos.
6. Validar cámara/Game Capture y después Twitch/OBS/hardware.

## CHECKPOINT CANÓNICO ACTUAL — 2026-09-21

- Rama: `fix/native-windows-foundation`.
- PR: `#2`.
- HEAD canónico al cerrar este checkpoint: `8b1a472fe57aa20e973a6d333acf1ddd0f63bc93`.
- Estado: **EXPERIMENTAL / NO listo para producción**.
- Ingeniería: **~69%**.
- Producto usable/end-user: **~55%**.
- Seguimiento global: **~63%**.

### Cambios nuevos de este checkpoint
- Avatar Cari V0 procedural funcional en Three.js: cuerpo completo, piel morena/tan, cabello marrón medio, inner hair marrón claro, cola de caballo, ahoge, ojos marrones con pupilas blancas, curita nasal y vestimenta deportiva con minishorts negros.
- Contrato de avatar ampliado con los estados canónicos `neutral`, `happy`, `angry`, `afraid`, `embarrassed`, `sad`, `exhausted` y `confused`.
- Action Store ampliado con `neutral`, `happy`, `sad`, `angry`, `afraid`, `embarrassed`, `exhausted`, `confused`, `talking` y `silent`.
- Tracking facial mapea blendshapes a estados emocionales compatibles con la Biblia de Cari.
- Los comandos de chat reutilizan el Action Store existente para las nuevas acciones; no se creó un segundo router.
- Se añadió `CARI_ACTIONS.md` como catálogo canónico de acciones runtime.
- Se añadió una prueba de regresión para impedir que el Action Store pierda el conjunto canónico.

### Estado de salida
- `OutputRetryPolicy` y clasificación inicial de fallos ya existen y se reutilizan; no crear otro supervisor.
- El retry RTMP solo debe aplicarse a fallos clasificados como red.
- No considerar retry, E2E named-pipe, compositor D3D11 o Libav como validados hasta disponer de evidencia Windows observable.

### Evidencia que sí existe
- Smoke C++20 estricto de timing/interleaver y política retry/diagnóstico: PASS en entorno portable.
- FFmpeg sintético 7.1.5 BGRA raw + PCM float32 → H.264/AAC → Matroska: PASS.
- PNG base de Cari `neutral/happy/angry`: presentes y con manifest.
- Three.js `GLTFLoader` sigue siendo la ruta de carga de GLB/glTF; el renderer procedural funciona sin depender de un modelo externo. citeturn412252search0

### Evidencia que sigue faltando
- Build CMake/CTest real en Windows y E2E named-pipe → FFmpeg → archivo.
- Compositor GPU sin CPU readback conectado definitivamente al encoder.
- PTS explícitos verificados extremo a extremo con la ruta Libav en Windows.
- Drift correction/resampling basado en relojes físicos WASAPI.
- Cámara Media Foundation en dispositivo real.
- Game Capture dedicada.
- Twitch/OBS reales y reconexión real.
- Validación sobre el PC objetivo.

### NO REPETIR
| Componente | Estado | Próxima acción válida |
|---|---|---|
| WGC desktop capture | IMPLEMENTADO | Solo regresión reproducible / validación hardware |
| WASAPI + AudioTimelineMixer | IMPLEMENTADO | Drift correction y validación |
| MediaClock/Pacer/Interleaver | IMPLEMENTADO + smoke | Validar PTS E2E |
| FFmpeg A/V boundary | IMPLEMENTADO | Ejecutar E2E Windows |
| RTMP retry | IMPLEMENTADO | Validar red real; no duplicar supervisor |
| D3D11 compositor | EXPERIMENTAL | Eliminar readback CPU y cerrar encoder path |
| Libav PTS | EXPERIMENTAL | Compilar/verificar con dev kit FFmpeg Windows |
| Media Foundation camera | EXPERIMENTAL | Cámara física + reconnect |
| Three.js avatar | IMPLEMENTADO V0 | Validar acciones/tracking/modelo; no crear otro renderer |
| Action Store | IMPLEMENTADO | Extender este Store; no crear otro |
| Twitch EventSub | IMPLEMENTADO | Validación de canal/reconnect |
| OBS WebSocket | IMPLEMENTADO | Validación real y diagnóstico |
| Game Capture | PENDIENTE | Backend independiente |
| CI | BLOQUEADO | Obtener jobs con steps/logs observables |

### Regla de continuidad
Antes de tocar cualquier componente, buscarlo en esta bitácora. Si ya figura IMPLEMENTADO o EXPERIMENTAL, trabajar solo en el gate restante o ante una regresión reproducible.

### Registro de este cierre
- Avatar Cari V0 funcional y acciones canónicas incorporadas al renderer existente.
- No se generó un segundo avatar runtime ni un segundo Action Store.
- La prueba de regresión del Action Store queda integrada al suite existente.
- Este checkpoint tiene prioridad sobre checkpoints históricos de esta misma bitácora.

---

# Cari Studio — Bitácora maestra

## CHECKPOINT CANÓNICO ACTUAL — 2026-09-21 — CONTINUIDAD VIVA

> Usar este bloque para iniciar cualquier nueva iteración. Los bloques históricos inferiores sirven como registro y no deben reinterpretarse como tareas nuevas.

- Rama: `fix/native-windows-foundation`
- PR: #2
- HEAD actual del PR: `8b1a472fe57aa20e973a6d333acf1ddd0f63bc93`
- Estado: **EXPERIMENTAL / NO listo para producción**
- Ingeniería: **~68%**
- Producto usable/end-user: **~54%**
- Seguimiento global: **~62%**

### Realizado antes de esta iteración y protegido contra repetición
- Windows Graphics Capture de ventana y pantalla primaria.
- Enumeración de ventanas capturables.
- WASAPI micrófono + system loopback.
- AudioTimelineMixer con resampling inicial y métricas.
- VoiceEffectProcessor local.
- MediaClock 100 ns.
- RealtimePacer.
- Interleaver A/V global por PTS.
- Bounded queues y máximo de eventos por polling.
- FFmpeg supervisor + A/V boundary de dos named pipes.
- EOF/flush y stderr limitado.
- Clasificación de errores y RTMP retry/backoff acotado.
- Cámara Media Foundation integrada como source experimental.
- D3D11 compositor experimental y avatar overlay capturable.
- Ruta Libav experimental para timestamps explícitos.
- Three.js/glTF/GLB + contrato de avatar + MediaPipe.
- Action Store/editor 2D.
- Twitch EventSub único + lifecycle/reconnect base.
- OBS WebSocket opcional + detección de proceso separada de conexión.
- StudioRuntimeBindings + NativeBackend/OBSBackend.
- NSIS/portable packaging y auditoría de licencias.
- Resource policy para evitar consumidores multimedia ficticios.

### Trabajo de continuidad de esta iteración
- Se revisó el estado real del repo/PR antes de modificar componentes.
- Se confirmó que retry/backoff, compositor GPU, cámara Media Foundation, Libav y E2E named-pipe ya existen; no se duplicaron.
- Se mantuvo la clasificación IMPLEMENTADO / VERIFICADO / VALIDADO EN HARDWARE / PENDIENTE.
- Se consolidó esta bitácora como entrada obligatoria antes de nuevas implementaciones.
- Se mantuvo el output de producción bloqueado por los gates externos restantes.
- Se verificaron nuevamente las invariantes de sesión, backpressure, orden A/V y diagnóstico.
- Se dejó documentado que los tests portables y el FFmpeg sintético no sustituyen la validación Windows/hardware.

### NO REPETIR — lista operativa
| Componente | Estado | Acción futura válida |
|---|---|---|
| WGC desktop capture | IMPLEMENTADO | Solo corregir regresión reproducible |
| WASAPI + mixer | IMPLEMENTADO | Solo drift correction/validación |
| MediaClock/Pacer/Interleaver | IMPLEMENTADO + smoke | Solo PTS E2E/regresión |
| FFmpeg A/V boundary | IMPLEMENTADO | Validar Windows sostenido |
| RTMP retry | IMPLEMENTADO | Validar red real; no crear otro supervisor |
| OBS service | IMPLEMENTADO | Añadir acciones faltantes en el servicio existente |
| Twitch transport | IMPLEMENTADO | Validar canal/scopes/reconnect real |
| Action Store | IMPLEMENTADO | Extender sin segundo almacenamiento |
| Three.js avatar | IMPLEMENTADO | Integrar/validar modelo, no reemplazar sin evidencia |
| D3D11 compositor | EXPERIMENTAL | Quitar readback CPU y conectar encoder |
| Libav PTS | EXPERIMENTAL | Compilar/validar con FFmpeg dev kit Windows |
| Media Foundation camera | EXPERIMENTAL | Probar cámara física/reconnect |
| Game Capture | PENDIENTE | Diseñar backend separado; no reciclar WGC como Game Capture |
| Multistream | EXPERIMENTAL | Validar outputs independientes; no duplicar FFmpeg supervisor |
| CI | BLOQUEADO | Conseguir jobs con Checkout/CMake/npm/CTest y logs observables |

### Orden de trabajo que sigue
1. CI observable.
2. E2E Windows named-pipe -> FFmpeg -> archivo.
3. Compositor GPU sin CPU readback y conexión real al encoder.
4. Verificación PTS explícitos con Libav.
5. Drift correction/resampling basado en relojes WASAPI.
6. Cámara Media Foundation + Game Capture en Windows real.
7. Backend real de acciones Native/OBS.
8. Validación real Twitch/OBS.
9. Hardware objetivo.
10. Multistream, redistribución FFmpeg, instalador y release.

### Regla anti-repetición
Antes de tocar código:
1. Buscar el componente en `BITACORA.md`.
2. Si figura IMPLEMENTADO/VERIFICADO, trabajar solamente en el gate restante o sobre una regresión reproducible.
3. Si figura PENDIENTE, implementar dentro del componente existente.
4. Registrar el resultado en esta bitácora con evidencia concreta.
5. Nunca usar el porcentaje como sustituto de una prueba.

---
# Cari Studio — Bitácora maestra

## CHECKPOINT CANÓNICO ACTUAL — 2026-09-21 — CONTINUIDAD Y ANTI-REPETICIÓN

> Este bloque es la referencia operativa actual. Los checkpoints históricos inferiores no deben sustituirlo.

- Rama: `fix/native-windows-foundation`
- PR: #2
- HEAD auditado al iniciar esta iteración: `ad0298da38c7c93e415fc5f41478095cf85d331e`
- Estado: **EXPERIMENTAL / NO listo para producción**
- Ingeniería: **~68%**
- Producto usable/end-user: **~54%**
- Seguimiento global: **~62%**

### Trabajo ya realizado y que NO debe repetirse

#### Captura
- Windows Graphics Capture de ventana: IMPLEMENTADO.
- Windows Graphics Capture de pantalla primaria: IMPLEMENTADO.
- Enumeración de ventanas: IMPLEMENTADO.
- Recuperación D3D11 por device removed/reset/hung: IMPLEMENTADO.
- Cámara Media Foundation: IMPLEMENTADA como source nativa + control plane; falta validación física.
- Game Capture dedicada: PENDIENTE.

#### Audio
- WASAPI micrófono: IMPLEMENTADO.
- WASAPI system loopback: IMPLEMENTADO.
- AudioTimelineMixer: IMPLEMENTADO + smoke.
- Normalización sample-rate/canales: IMPLEMENTADA.
- Voice DSP local anime-bright: IMPLEMENTADO; no es pitch/formant.
- Lip-sync por amplitud: IMPLEMENTADO como fallback local.
- Drift estimator: IMPLEMENTADO.
- Drift correction/resampling físico: PENDIENTE.

#### Media pipeline
- MediaClock 100 ns: IMPLEMENTADO + smoke.
- RealtimePacer: IMPLEMENTADO + smoke.
- Interleaver A/V global por PTS: IMPLEMENTADO + smoke.
- Colas acotadas + métricas: IMPLEMENTADAS.
- Máximo 8 eventos A/V por polling: IMPLEMENTADO.
- Backpressure de handshake: IMPLEMENTADO.
- Rechazo de cambios de formato de audio durante sesión: IMPLEMENTADO.
- FFmpeg A/V boundary con dos named pipes: IMPLEMENTADO.
- Cierre por EOF/flush antes de terminación forzada: IMPLEMENTADO.
- stderr acotado a 256 KiB: IMPLEMENTADO.
- Clasificación inicial de fallos: IMPLEMENTADA.
- Retry/backoff RTMP: IMPLEMENTADO, solo para categorías de red.
- Libav directo con PTS explícitos: IMPLEMENTADO como ruta experimental separada.
- E2E named-pipe + FFmpeg: IMPLEMENTADO y preparado para ejecución Windows.
- Verificación sostenida Windows: PENDIENTE por runner/hardware.

#### Composición / avatar
- Contrato de avatar: IMPLEMENTADO.
- Three.js + GLB/glTF: IMPLEMENTADO.
- MediaPipe Face Landmarker: IMPLEMENTADO + guard de timestamps.
- FaceTrackingBridge: IMPLEMENTADO.
- Action Store/editor de acciones: IMPLEMENTADO.
- Overlay transparente: IMPLEMENTADO.
- Compositor D3D11 GPU captura + avatar/overlay: IMPLEMENTADO experimental.
- Fallback CPU/readback: EXISTE SOLO COMO LIMITACIÓN DE VALIDACIÓN; NO PROMOVER A PRODUCCIÓN.
- Composición GPU sin readback / encoder consumiendo textura: PENDIENTE.
- Live2D runtime: PENDIENTE/adaptador opcional.
- VRM native de producción: PENDIENTE.

#### Control plane
- Electron NativeEngine: IMPLEMENTADO.
- OBS WebSocket opcional: IMPLEMENTADO.
- Detección OBS separada de conexión/control: IMPLEMENTADA.
- Twitch EventSub único: IMPLEMENTADO.
- Reconnect/keepalive/lifecycle Twitch: IMPLEMENTADO.
- StudioRuntimeBindings / NativeBackend / OBSBackend: IMPLEMENTADOS.
- No crear transportes, routers o services paralelos.

#### Distribución
- Runtime versions fijadas: IMPLEMENTADO.
- Auditoría de licencias: IMPLEMENTADA.
- NSIS x64: CONFIGURADO.
- ZIP portable: CONFIGURADO.
- Redistribución FFmpeg/codec: PENDIENTE decisión final.
- Firma/validación release: PENDIENTE.

### Cambios hechos en este ciclo de continuidad
- Se verificó el estado real del PR #2 y se tomó `BITACORA.md` como fuente canónica.
- Se comprobó que la política RTMP de retry/backoff ya existe; no se duplicó.
- Se comprobó que los diagnósticos de output ya están integrados; no se creó otro sistema.
- Se comprobó el compositor D3D11 experimental y la ruta Libav; ambos permanecen experimentales.
- Se corrigieron anteriormente y se conservan como cerradas las invariantes de sesión, backpressure, orden A/V y serialización de output.
- Los workflows de CI ya aceptan la rama de desarrollo y `workflow_dispatch`; las ejecuciones siguen fallando antes de registrar steps/logs útiles.
- Se añadirá/actualizará solo la bitácora y los checkpoints; no se rehacen módulos existentes.

### Evidencia conocida
- C++20 portable con `-Wall -Wextra -Werror`: PASS para timing/interleaver y retry/diagnóstico.
- FFmpeg sintético 7.1.5: BGRA raw + PCM float32 -> H.264/AAC -> Matroska: PASS.
- E2E Windows named-pipe -> FFmpeg: código IMPLEMENTADO; no considerado VERIFICADO mientras Actions no produzca steps/logs observables.
- D3D11 compositor smoke: IMPLEMENTADO; la validación completa sigue pendiente.
- Media Foundation camera smoke: IMPLEMENTADO; cámara física sigue pendiente.
- GitHub Actions: runs recientes continúan terminando con `steps=null`/sin logs observables.

### NO REPETIR

1. No rehacer Windows Graphics Capture.
2. No rehacer WASAPI/AudioTimelineMixer.
3. No rehacer MediaClock, RealtimePacer o Interleaver.
4. No crear otro FFmpeg supervisor/output bridge.
5. No crear otro OBS service.
6. No crear otro Twitch EventSub WebSocket.
7. No crear otro Action Store.
8. No sustituir Three.js sin una regresión medible.
9. No usar `capturePage()` como compositor final.
10. No declarar CI, RTMP, cámara, Game Capture, drift, Live2D, VRM o hardware como validados sin evidencia.
11. No perseguir `steps=null` mediante cambios del pipeline sin logs nuevos.
12. No copiar este trabajo a otra rama/repositorio sin una razón de release/merge explícita.

### PRÓXIMO ORDEN OBLIGATORIO

1. Obtener una ejecución CI observable con Checkout/CMake/npm/CTest.
2. Verificar E2E Windows named-pipe -> FFmpeg -> archivo.
3. Eliminar CPU readback del compositor y conectar la textura GPU a un encoder adecuado.
4. Verificar PTS explícitos mediante la ruta Libav experimental en Windows.
5. Aplicar drift correction/resampling basado en relojes WASAPI.
6. Validar cámara Media Foundation y Game Capture.
7. Validar OBS/Twitch reales y backends de acciones.
8. Hardware objetivo, multistream, FFmpeg redistribution e instalador release.

---
# Cari Studio — Bitácora maestra

Última actualización: 2026-09-21
Rama: fix/native-windows-foundation

## CHECKPOINT CANÓNICO ACTUAL — 2026-09-21 — ASSET BASE + CONTINUIDAD

> Esta sección tiene precedencia sobre cualquier entrada histórica inferior.

- Rama: `fix/native-windows-foundation`
- PR: #2
- HEAD auditado de esta entrega: `26da72bf098b6620cbed22c4eb9f4a60e4a0b874`
- Estado: experimental; **NO listo para producción**.
- Ingeniería: **~68%**.
- Producto usable/end-user: **~54%**.
- Seguimiento global: **~62%**.

### Hecho en esta entrega
- Se consolidó `BITACORA.md` como la bitácora maestra de continuidad y anti-repetición.
- Se confirmó el diseño visual base de Cari en `CARI_CHARACTER_BIBLE.md` como `CANON_CONFIRMED`.
- Se añadieron `assets/cari/expressions/cari_neutral.png`, `cari_happy.png` y `cari_angry.png`.
- Se añadió `assets/cari/expressions/manifest.json` y `DESIGN_SPEC.md`.
- El Action Store existente ahora admite frames `bundled` y los precarga al arrancar si la acción todavía no tiene frames personalizados.
- El empaquetado Electron incluye `assets/cari/expressions` mediante `extraResources`.
- Se añadió `avatar-assets.test.mjs` para comprobar manifest, archivos y firma PNG.
- No se creó un segundo editor, segundo Action Store ni segundo renderer.

### Diseño visual que NO debe reinterpretarse
- Piel morena/tan.
- Cabello marrón medio.
- Inner hair marrón claro.
- Cola de caballo mediana.
- Ahoge centrado.
- Ojos marrones.
- Pupilas blancas y redondas.
- Curita visible en la nariz.
- Estética de corredora: remera ajustada o atada a la cintura; minishorts o bike-shorts negros.
- Estilo intermedio entre chibi 2D y 3D estilizado; no realista y no anime extremo.
- Prohibidos diademas, hairpins, joyería, bolsos, armas, props, accesorios adicionales, prendas extra y objetos decorativos.

### Estado del asset
- `BASE_ART_V0`: implementado y empaquetable.
- No es todavía arte final profesional.
- No es todavía un rig Live2D.
- No es todavía un VRM final.
- Si la calidad artística debe evolucionar, reemplazar los assets sin cambiar el contrato de actuación ni crear nueva infraestructura.

### Próximo trabajo — NO REHACER
1. Conseguir logs/steps observables de CI.
2. Verificar E2E Windows named-pipe -> FFmpeg -> archivo.
3. Eliminar readback CPU del compositor para producción.
4. Validar PTS explícitos extremo a extremo con Libav/transport en Windows.
5. Drift correction/resampling WASAPI.
6. Validar cámara Media Foundation y Game Capture.
7. Conectar backends reales para `studio_*_requested`.
8. Validar OBS/Twitch y scopes reales.
9. Preparar VRM/3D o Inochi2D sin cambiar el contrato.
10. Hardware, redistribución FFmpeg, instalador y release.

### NO REPETIR
- No rehacer WGC desktop capture.
- No rehacer WASAPI mixer.
- No rehacer MediaClock/RealtimerPacer/Interleaver.
- No crear otro Action Store/editor.
- No crear otro Twitch EventSub WebSocket.
- No usar OBS como dependencia del Native Engine.
- No usar `capturePage()` como compositor de producción.
- No convertir una tarjeta/botón de UI en evidencia de backend.
- No perseguir `steps=null` sin logs nuevos.


## Estados

- IMPLEMENTADO: existe código/contrato.
- VERIFICADO: existe una prueba reproducible que pasa.
- VALIDADO EN HARDWARE/SERVICIO: comprobado en Windows o servicio objetivo.
- PENDIENTE: falta evidencia concreta.
- NO REPETIR: ya fue investigado o implementado; solo volver ante evidencia nueva de regresión.

## Núcleo multimedia

| Área | Estado | Ubicación/evidencia | No repetir |
|---|---|---|---|
| Arquitectura local-first | IMPLEMENTADO | experimental/studio/ARCHITECTURE.md | No introducir IA/cloud como requisito del core |
| Frame/Audio/Output contracts | IMPLEMENTADO | experimental/studio/core | No crear contratos paralelos |
| Windows Graphics Capture ventana | IMPLEMENTADO | native-windows/capture_engine.* | No rehacer backend de ventana |
| Windows Graphics Capture pantalla primaria | IMPLEMENTADO | native-windows/capture_engine.* | No duplicar capturador |
| Enumeración de ventanas | IMPLEMENTADO | native-windows/window_sources.* | Extender el existente |
| WASAPI mic + loopback | IMPLEMENTADO | native-windows/wasapi_capture.* + audio_core_bridge.* | No crear otro capturador WASAPI |
| AudioTimelineMixer | IMPLEMENTADO + smoke | native-windows/audio_timeline_mixer.* | Drift físico sigue pendiente |
| Voice anime-bright | IMPLEMENTADO | native-windows/voice_effects.* | No llamarlo pitch/formant |
| MediaClock 100 ns | IMPLEMENTADO + smoke | core/media_clock.h | Mantener un único dominio temporal |
| RealtimePacer | IMPLEMENTADO + smoke | core/media_scheduler.h | No sustituir por timers UI |
| A/V interleaver global | IMPLEMENTADO + smoke | core/media_scheduler.h | No volver a dos loops separados |
| Colas A/V | IMPLEMENTADO | MediaGraphController | Mantener métricas de drop |
| Límite de despacho por poll | IMPLEMENTADO | MediaGraphController | No quitar el límite sin medir ráfagas |
| RawPipe | IMPLEMENTADO + smoke histórico | native-windows/raw_pipe.* | PTS aún no viajan por pipe |
| FFmpeg A/V boundary | IMPLEMENTADO | native-windows/ffmpeg_av_output.* | Falta Windows sostenido |
| EOF/flush | IMPLEMENTADO | ffmpeg_av_output.cpp | No volver a kill inmediato |
| stderr acotado | IMPLEMENTADO | ffmpeg_av_output.* | Límite 256 KiB |
| Failure categories | IMPLEMENTADO | core/output_diagnostics.h | No reintentar encoder/mux ciegamente |
| RTMP retry/backoff | IMPLEMENTADO | core/output_retry.h + main.cpp | Solo errores clasificados de red |
| Backpressure de arranque | IMPLEMENTADO | main.cpp | No drenar audio antes de conectar ambos pipes |
| Invariantes de sesión | IMPLEMENTADO | main.cpp + session-manager.js | No cambiar captura/audio durante output activo |

## VTuber

| Área | Estado | No repetir |
|---|---|---|
| Contrato de avatar | IMPLEMENTADO | No crear otro contrato |
| Three.js GLB/glTF | IMPLEMENTADO | No añadir otro renderer 3D sin evidencia |
| MediaPipe Face Landmarker | IMPLEMENTADO | Mantener guard de timestamps |
| FaceTrackingBridge | IMPLEMENTADO | Extender el puente existente |
| AudioLipSync | IMPLEMENTADO | No crear segundo mouth pipeline |
| Action Store | IMPLEMENTADO | Usar action-store.js |
| Acciones PNG/JPG/WebP | IMPLEMENTADO | No crear otro editor de acciones |
| JSON presets | IMPLEMENTADO | Extender formato existente |
| Overlay transparente | IMPLEMENTADO | Compositor nativo sigue pendiente |
| Live2D | PENDIENTE | No declarar integrado |
| VRM native compositor | PENDIENTE | Falta GPU/D3D11 real |

## Twitch

Actualmente el menú representa las capacidades relevantes del canal: chat, follows, subscriptions, gifts, resubs, cheers, raids, Channel Points, polls, predictions, Hype Train, ads, schedule, moderation, VIP/moderators, shoutouts, suspicious users, shared chat, Guest Star, power-ups y stream lifecycle.

Estado:
- Chat + OAuth + EventSub WebSocket: IMPLEMENTADO.
- Reconexión base de EventSub: IMPLEMENTADO.
- Catálogo visual de capacidades: IMPLEMENTADO.
- Helix broadcaster management avanzado: PREPARADO / PENDIENTE de scopes, endpoints y pruebas.

NO REPETIR: no crear otro WebSocket Twitch; el transporte existente es la fuente única.

## OBS

Superficie de UI y backend preparada para:
- streaming y estado;
- recording y estado;
- scenes, program y preview;
- inputs/sources y kinds;
- profiles y scene collections;
- Studio Mode y transición;
- virtual camera;
- stats.

Estado:
- WebSocket base: IMPLEMENTADO.
- Control ampliado: IMPLEMENTADO en contrato/UI.
- Validación contra OBS real: PENDIENTE.

NO REPETIR: OBS sigue siendo opcional y no es dependencia del core nativo.

## UI / menú

- menu-config.js es la fuente central de navegación.
- Grupos: Studio, Producción, VTuber, Twitch, OBS, Automatización y Sistema.
- El menú tiene buscador.
- Existen vistas para live, dashboard, scenes, sources, audio, outputs, editor, tracking, avatar, expressions, assets, chat, Twitch center, events, OBS center, hotkeys y settings.
- UI_SYSTEM_CATALOG.md contiene el mapa de capacidades y estados.

NO REPETIR: no volver a la navegación estática de siete paneles.

## CI

- Los workflows fueron habilitados también para la rama de desarrollo.
- workflow_dispatch está disponible.
- Los runs recientes del entorno continúan terminando antes de registrar steps en varios jobs; mientras no existan logs/steps ejecutables, no marcar CI como verde.
- Un fallo previo a steps no debe atribuirse automáticamente a una línea de código.

## Pruebas ya realizadas

- C++20 portable con -Wall -Wextra -Werror: PASS para contratos de timing/interleaving.
- FFmpeg 7.1.5 sintético: BGRA raw + PCM float32 -> H.264/AAC -> Matroska: PASS en Linux.
- Tests Electron existentes de sesión/avatar: evidencia previa PASS.

Estas pruebas no sustituyen Windows real, named pipes sostenidos, cámara, Game Capture, RTMP real ni hardware objetivo.

## NO REPETIR — índice rápido

1. No rehacer captura de pantalla/ventana.
2. No rehacer WASAPI mixer.
3. No rehacer MediaClock/RealtimePacer/interleaver.
4. No crear otro parser de control.
5. No crear otro WebSocket Twitch.
6. No sustituir Three.js sin un motivo medible.
7. No rehacer Action Store/editor.
8. No declarar Live2D, RTMP, drift, camera, Game Capture o hardware como terminados sin evidencia.
9. No tratar el catálogo de UI como backend implementado.
10. No perseguir CI a ciegas sin steps/logs.

## Siguiente orden de trabajo

1. Transporte A/V con timestamps explícitos.
2. Compositor GPU D3D11 y entrada del avatar en el frame final.
3. FFmpeg + named pipes sostenidos en Windows.
4. Drift correction basada en relojes WASAPI.
5. Cámara Media Foundation.
6. Game Capture.
7. Twitch Helix avanzado y scopes.
8. OBS scene/source/filter control completo.
9. Multistream aislado por output.
10. Hardware objetivo + instalador.

## Regla de cierre

IMPLEMENTADO no implica VERIFICADO.
VERIFICADO no implica VALIDADO EN HARDWARE.
Una tarjeta del menú no convierte una capacidad en una función terminada.

## Actualización 2026-09-20 — UI y sistemas

- El menú fue centralizado en renderer/menu-config.js.
- La navegación ahora cubre Studio, Producción, VTuber, Twitch, OBS, Automatización y Sistema.
- Se agregó buscador de herramientas y hotkeys de navegación.
- Se agregó Centro Twitch con catálogo de capacidades y estados.
- Se agregó Centro OBS con escenas, inputs, stats, recording, virtual camera, Studio Mode, profiles y scene collections.
- Se agregó separación VTuber entre Editor, Tracking, Avatar, Expresiones y Assets.
- Se agregó catálogo documental UI_SYSTEM_CATALOG.md.
- Se agregó test de coherencia para que cada item del menú tenga una vista y que los IDs HTML sean únicos.
- Se extendió preload/Main/ObsService para la superficie OBS.
- Se añadieron indicadores visuales de estado de Engine/Twitch/OBS y parámetros de tracking/audio.
- No se marca como implementada una capacidad solo por estar visible en el menú.

### Estado de continuidad

- Ingeniería vigente: 66%.
- Producto usable vigente: 52%.
- Porcentaje global reportado: 60%.
- Esta iteración mejora superficie y control, pero no cierra validación Windows/hardware.
- Próximo trabajo debe comenzar en los gates listados en este archivo y no volver a diseñar la navegación.

### Evidencia CI de esta iteración

- Los workflows ahora se disparan sobre la rama de desarrollo y tienen workflow_dispatch.
- Los últimos jobs observados siguen terminando como failure sin evidencia útil de steps/logs; Native Windows, CI y Character Runtime siguen sin validación real del build.

### No repetir

- No reconstruir menú estático.
- No crear un segundo Centro Twitch.
- No crear un segundo Centro OBS.
- No duplicar el Action Store/editor.
- No convertir el catálogo de capacidades en backend ficticio.


## Actualización 2026-09-20 — botones, acciones y puente Twitch/OBS/VTuber

### Hecho

- Se auditó la relación entre los 57 botones con ID del renderer y sus handlers.
- Se corrigieron los dos huecos encontrados: se eliminó el handler fantasma de `header-stream` y se conectaron `overlay-show-side` / `overlay-hide-side`.
- Se auditó Electron Main contra `ObsService`: el handler `obs:status` estaba llamando a un método inexistente (`getStatus`) y quedó alineado con `status()`; el resto de handlers OBS fue contrastado contra el servicio.
- Se añadió `test/ui-obs-contract.test.mjs` para detectar botones sin handler y llamadas OBS desalineadas.
- El botón Twitch conecta mediante el único servicio `TwitchChatService`; no se creó un segundo WebSocket.
- El chat Twitch ya puede disparar acciones locales del avatar con `!happy`, `!sad`, `!talk`, `!silent`, `!angry` y `!neutral`.
- OBS mantiene control de stream, grabación, virtual camera, escenas, inputs, Studio Mode, perfiles, scene collections y estadísticas.
- El overlay del avatar se puede activar/desactivar desde el panel lateral y desde la vista Avatar.
- El control de salida nativa continúa desacoplado de OBS: Cari puede grabar/emitir directamente por FFmpeg.

### Evidencia

- Auditoría estática: 57 botones con ID; únicamente quedaron los dos casos laterales sin handler y el handler fantasma, todos corregidos.
- Comparación renderer/main/ObsService: no quedan llamadas directas a métodos inexistentes del servicio OBS.
- El test contractual queda incluido en `npm test`.
- CI todavía no ejecuta steps en los runs recientes, por lo que esta capa se considera implementada y preparada para verificación, no verificada por CI.

### No repetir

- No rehacer la navegación.
- No crear otro `ObsService`.
- No crear otro `TwitchChatService` ni otro WebSocket EventSub.
- No volver a usar nombres `getStatus/getSceneList/getInputList` en Electron Main cuando el servicio expone `status/getSceneList/getInputList`; mantener el contrato existente.
- No declarar las tarjetas de capacidades Twitch como backend implementado; siguen separadas de la superficie funcional real.
- No mover el compositor del avatar a producción hasta integrar el frame final.

### Siguiente foco

1. Transporte A/V con timestamps explícitos.
2. Compositor GPU D3D11: avatar + captura -> frame final.
3. FFmpeg/named pipes sostenidos en Windows.
4. Drift correction WASAPI.
5. Cámara Media Foundation y Game Capture.
6. Twitch EventSub avanzado con scopes/endpoints.
7. OBS scene/source/filter actions ampliadas.
8. Hardware, instalador y release.

## Actualización 2026-09-20 — cierre de auditoría de botones

- Centro Twitch: el botón Conectar alterna conexión/desconexión según el estado real.
- El estado de conexión se refleja en el Centro Twitch.
- Se mantiene un único TwitchChatService/EventSub WebSocket.
- El test UI↔OBS↔botones cubre botones con ID y botones declarativos.
- PROJECT_STATUS.md se sincronizó a un porcentaje global de **60%**.
- Referencia de seguimiento: ingeniería 66%, producto usable 52%, porcentaje global 60%.

## Actualización 2026-09-20 — verificación final de continuidad

HEAD auditado: d47c008e3384f84f0da923a60205428f6ca14228

Resultado de auditoría UI:
- 57 botones estáticos con ID.
- 0 handlers estáticos apuntando a IDs inexistentes.
- 0 llamadas desde Electron Main a métodos inexistentes de ObsService.
- 1 control estático deshabilitado sin acción: Pitch / Formant, marcado intencionalmente como futuro.
- `action-add-images` es un control dinámico creado por el inspector; no debe añadirse al HTML base solo para satisfacer el test.
- Overlay lateral quedó conectado.
- Centro Twitch quedó conectado con toggle y estado.
- Test contractual UI↔OBS fue ampliado para cubrir botones declarativos, controles deshabilitados y elementos dinámicos conocidos.

Regla de continuidad:
- Antes de implementar nuevas acciones, ejecutar la auditoría de botones y revisar esta bitácora.
- Las capacidades Twitch/OBS mostradas como catálogo no se consideran backend hasta tener endpoint/handler, prueba y servicio real.

Estado global:
- Porcentaje global de seguimiento: **60%**.
- Ingeniería: **66%**.
- Producto usable: **52%**.

Pendientes prioritarios que no deben reemplazarse por trabajo repetido:
1. timestamps A/V explícitos extremo a extremo;
2. compositor GPU D3D11 con avatar dentro del frame final;
3. FFmpeg + named pipes sostenidos en Windows;
4. drift correction WASAPI;
5. cámara Media Foundation / Game Capture;
6. Twitch EventSub avanzado y scopes;
7. OBS controls adicionales;
8. hardware, multistream e instalador.

## Actualización 2026-09-20 — ciclo actual: botones + Twitch + OBS + continuidad

### Hecho
- Se corrigió el renderer para usar el elemento real #engine-chip.
- Se agregó controls-contract.test.mjs y quedó incorporado al test de Electron.
- Auditoría automática: 57 botones con ID; 0 sin handler/navegación; 0 métodos OBS/Twitch consumidos desde renderer sin wrapper en preload.
- OBS quedó con espejo de runtime: Stream, Record, Virtual Camera, Program, Preview y Studio Mode, con eventos hacia renderer y limpieza de estado ante desconexión.
- Twitch mantiene un único EventSub websocket; lifecycle events, keepalive watchdog, reconnect transfer y deduplicación están centralizados en TwitchChatService.
- Los eventos Twitch de lifecycle pueden activar acciones locales del avatar.
- El ciclo nativo mantiene retry RTMP acotado a fallos de red, diagnóstico básico, stderr acotado, backpressure y presupuesto de 8 eventos por polling.

### Correcciones durante este ciclo
- Se detectó y reparó una mutilación de #scheduleReconnect() provocada por una edición del watchdog.
- Se detectó y reparó el formato del nuevo test contractual, que inicialmente contenía saltos de línea literales en lugar de saltos reales.
- Se corrigió el orden de serialización del campo output en el estado nativo.

### Evidencia
- Parseo sintáctico independiente: TwitchChatService, ObsService, Electron Main, preload y renderer: OK.
- Auditoría estática UI: OK.
- Pruebas C++20 strict y FFmpeg sintético: PASS según evidencias ya registradas.
- CI actual: BLOQUEADO por jobs que terminan con steps=null y sin logs observables.

### NO REPETIR
- No rehacer navegación.
- No crear otro ObsService, TwitchChatService, EventSub websocket o Action Store.
- No volver a usar #engine; el elemento correcto es #engine-chip.
- No declarar Twitch, OBS, RTMP o hardware como validados solo porque el botón existe.
- No rehacer MediaClock, RealtimePacer o MediaInterleaver.
- No sustituir Windows Graphics Capture por OpenCV para escritorio sin evidencia.
- No convertir capturePage en compositor de producción.

### Siguiente foco
1. Transporte A/V con timestamps explícitos.
2. Compositor GPU final: captura + avatar + overlays → frame codificado.
3. E2E Windows FFmpeg/named pipes.
4. Drift correction WASAPI.
5. Cámara Media Foundation y Game Capture.
6. Twitch scopes/endpoints adicionales y pruebas reales.
7. OBS scene items/filters/hotkeys.
8. Hardware, multistream e instalador.

### Porcentaje canónico actual
- Ingeniería: ~65%.
- Producto usable: ~50%.

## Actualización 2026-09-21 — StudioRuntimeBindings y selección de backend

### Hecho

- Se evolucionó app/studio/runtime_bindings.py desde un registro simple de callbacks a una frontera explícita de backends.
- NativeBackend quedó definido como backend principal, prioridad 100.
- OBSBackend quedó definido como backend opcional, prioridad 50.
- AUTO prueba NativeBackend primero y solo usa OBS cuando Native no está disponible o no soporta la acción.
- NATIVE no hace fallback a OBS.
- OBS solo se usa cuando se selecciona explícitamente o cuando AUTO necesita fallback.
- Un error durante la ejecución del backend no provoca un segundo intento en otro backend; esto evita efectos duplicados o parciales.
- Las acciones no atendidas siguen publicando el evento tipado studio_*_requested y además studio_action_unhandled; no se inventa una implementación.
- Se conservaron register/unregister para compatibilidad; register usa NativeBackend por defecto.
- snapshot conserva las métricas planas anteriores y agrega la vista detallada de backends.
- dispatch_payload valida que el payload sea un objeto antes de leer kind/value.
- LocalPipeline ahora acepta studio_bindings inyectado y usa StudioRuntimeBindings por defecto.
- Se valida que un StudioRuntimeBindings inyectado pertenezca al mismo EventBus del pipeline.
- tests/test_studio_runtime_bindings.py cubre backend native prioritario, fallback OBS, selección explícita, errores sin duplicación, acciones no atendidas y compatibilidad.
- tests/test_pipeline_events.py cubre la integración del nuevo boundary en LocalPipeline.
- experimental/studio/RUNTIME_BACKENDS.md documenta la arquitectura y la regla de no duplicar routers/backend bindings.

### Estado

- StudioRuntimeBindings: IMPLEMENTADO.
- NativeBackend: IMPLEMENTADO como adaptador inyectable; la conexión física al Native Engine debe ser provista por el integrador.
- OBSBackend: IMPLEMENTADO como adaptador inyectable; el transporte real sigue perteneciendo a ObsService/obs-websocket.
- Verificación CI: BLOQUEADA por el problema de Actions observado; los jobs recientes continúan terminando con steps=null.
- Validación en Windows/OBS real: PENDIENTE.

### NO REPETIR

1. No crear otro StudioRuntimeBindings.
2. No crear un segundo router de backend para OBS.
3. No convertir OBS en dependencia del Native Engine.
4. No hacer fallback automático después de una excepción de ejecución del backend.
5. No declarar una acción funcional solo porque está registrada en la UI.
6. No conectar credenciales ni SDKs de plataforma directamente al router de acciones.
7. Nuevas plataformas deben implementar el contrato de backend existente y cubrirlo con pruebas, no modificar la semántica de StudioAction.

### Siguiente foco

1. Transporte A/V con timestamps explícitos.
2. Compositor GPU D3D11 de producción dentro del frame que entra al encoder.
3. Verificación E2E Windows de named pipes + FFmpeg.
4. Drift correction de relojes WASAPI.
5. Cámara Media Foundation y Game Capture real.
6. OBS scene/source/filter actions adicionales con prueba real.
7. Twitch scopes/endpoints avanzados y prueba real.
8. Hardware, multistream y release.

### Porcentaje canónico

- Ingeniería: ~67%.
- Producto usable: ~53%.
- Global de seguimiento: ~61%.

HEAD registrado de esta actualización: f10bd6ef024c52c077f5c69a29b2ea497e6eb297.

## Actualización 2026-09-21 — presencia OBS/Twitch y ahorro de recursos

### Objetivo

Evitar que Cari Studio interprete una integración disponible como un consumidor de multimedia. OBS y Twitch quedan desacoplados del Native Engine: pueden estar abiertos/conectados sin provocar captura, composición o encode innecesarios.

### Implementado

| Área | Estado | Evidencia / código |
|---|---|---|
| Detección local de OBS | IMPLEMENTADO | electron-shell/runtime/obs-discovery.js; detecta obs64.exe/obs32.exe/obs.exe con cache de 2 s |
| OBS abierto vs controlable | IMPLEMENTADO | ObsService expone processDetected/processName/controlReady por separado de connected |
| Salud integrada | IMPLEMENTADO | IntegrationHealthMonitor publica snapshot OBS + Twitch cada 2 s; no abre conexiones por sí solo |
| Twitch estado | IMPLEMENTADO | TwitchChatService expone authorized/connected/streamOnline/lastEventAt/lastKeepaliveAt |
| Twitch como sink | NO | Resource policy lo clasifica como plano de control/eventos, no video sink |
| Política de recursos | IMPLEMENTADO | electron-shell/runtime/resource-policy.mjs |
| Voice config sin audio | IMPLEMENTADO | SessionManager no inicia Native Engine para guardar voice preference |
| Limpieza de recursos propios del output | IMPLEMENTADO | OutputStop detiene captura/audio que el output levantó; preserva recursos iniciados independientemente |
| Captura nativa sin sink | IMPLEMENTADO | main.cpp corta ProcessPrimaryCapturedFrame antes de readback/compositor cuando no hay output nativo |
| Estado visible | IMPLEMENTADO | preload + renderer reciben health OBS/Twitch y distinguen offline/open/connected/live |
| Regresión de ciclo de vida | IMPLEMENTADO | session-and-avatar.test.mjs cubre idle engine y cleanup ownership |
| Recurso sin consumidor | PROTEGIDO | No se generan frames CPU/GPU hacia un sink nativo inexistente |

### Matriz de comportamiento

- Ningún output + OBS cerrado + Twitch desconectado: Native Engine no se inicia automáticamente.
- OBS abierto pero no conectado por WebSocket: se informa OPEN; no se genera media por OBS.
- OBS conectado sin stream/record/virtual camera: solo control; no activa Native Engine.
- OBS con output activo: OBS es un consumidor externo; Cari no inicia su propia captura/encoder por ese hecho.
- Twitch conectado: solo chat/eventos; no activa captura, encoder ni avatar por sí mismo.
- Cari local record/RTMP: Native Engine sí activa captura/audio/output porque existe un sink real.
- Configurar voz antes de iniciar audio: solo se almacena la preferencia.
- Al detener un output que creó captura/audio: esos recursos se liberan y el engine queda apagado si no quedan otras demandas.

### Reglas de conversación entre aplicaciones

1. Cari → OBS: conexión WS solo para control/estado; no asumir que OBS consume media solo porque responde.
2. OBS → Cari: Stream/Record/VirtualCam activos cuentan como sink externo; OBS abierto sin outputs activos no.
3. Cari → Twitch: OAuth/EventSub/chat son control/eventos; no son una ruta de video.
4. Twitch → Cari: stream.online/offline actualiza estado informativo, no enciende el media graph.
5. Native Engine → FFmpeg: solo debe procesar frames cuando existe output nativo activo.
6. Native Engine → renderer: hoy no existe preview de captura nativa; por eso el heavy readback/compositor queda inhibido sin output.

### NO REPETIR

- No crear otro ObsService.
- No crear otro TwitchChatService ni otro EventSub WebSocket.
- No usar tasklist como sustituto de una conexión WS: proceso abierto y controlable son estados diferentes.
- No iniciar Native Engine al conectar OBS.
- No iniciar Native Engine al conectar Twitch.
- No usar Twitch conectado como motivo para capturar video.
- No hacer readback/composición de captura cuando no existe sink.
- No crear un segundo resource policy.
- No rehacer el session manager; extenderlo sobre ownership/demand existente.
- No declarar preview de captura nativa terminado: falta un consumidor de frame real en renderer.

### Evidencia y límites

- Los módulos de policy/SessionManager tienen tests de regresión añadidos, pero la ejecución completa del workflow sigue bloqueada por GitHub Actions que termina jobs con steps/logs nulos.
- La detección local de OBS solo establece presencia de proceso; la capacidad de control sigue dependiendo de obs-websocket y su configuración.
- La evidencia de Twitch real continúa pendiente de canal/credenciales.

### Trabajo descartado / no volver a hacer

- Intentos de implementar otro transporte Twitch: descartados porque TwitchChatService ya es el transporte único.
- Usar OBS como dependencia del Native Engine: descartado por arquitectura.
- Lanzar captura nativa para alimentar un preview inexistente: descartado; el worker ahora evita el trabajo pesado.

### Siguiente orden

1. Transporte A/V con timestamps explícitos extremo a extremo.
2. Compositor GPU D3D11 final sin readback CPU.
3. E2E Windows named pipes + FFmpeg.
4. Drift correction WASAPI.
5. Validación real OBS/Twitch.
6. Game Capture y cámara final.
7. Hardware, multistream y distribución.

### Porcentaje de seguimiento al cierre de esta entrada

- Ingeniería: ~68%.
- Producto usable: ~54%.
- Global: ~62%.

Esta entrada es la referencia para no repetir la auditoría de presencia/integraciones y para empezar directamente por los gates restantes.
## Actualización 2026-09-21 — regresión del atajo de audio corregida

### Objetivo
Mantener la política canónica: iniciar el motor de audio no debe abrir el micrófono automáticamente.

### Estado antes
- La política de micrófono ya estaba definida como OFF por defecto y con apertura explícita mediante el gate Hablar / `microphone.set`.
- El comando nativo `audio_start` respetaba esa política.
- El atajo físico `A` todavía llamaba `set_microphone_enabled(true)` al arrancar el motor de audio, creando una ruta alternativa que violaba el contrato.

### Trabajo realizado
- Se eliminó la activación automática del micrófono del atajo `A`.
- El atajo `A` ahora solo inicia/detiene el motor de audio.
- El micrófono continúa OFF hasta una acción explícita de micrófono/Hablar.

### Archivos modificados
- `experimental/studio/native-windows/main.cpp`

### Herramientas utilizadas
- GitHub connector
- auditoría de código del repositorio
- revisión de `BITACORA.md`

### Pruebas
- Revisión estática del camino `A` y del comando `microphone_set`.
- No se marca CI como evidencia: los runners siguen fallando antes de registrar steps.

### Resultado
**PASS — corrección integrada.**

### Problemas encontrados
- Había dos rutas conceptuales para iniciar audio: comando IPC y atajo local. Solo la ruta del atajo rompía la política de micrófono opt-in.

### Qué NO se debe repetir
- No volver a activar el micrófono desde `audio_start`, el atajo `A`, polling, VAD, auto-motion o status.
- No crear otro gate de micrófono.
- No duplicar la lógica de privacidad fuera del contrato existente.

### Pendientes
- Validación con dispositivo WASAPI real.
- CI observable.
- Prueba Windows de la política completa durante una sesión real.

### Próxima prioridad
**CI observable → E2E Windows named-pipe/FFmpeg**, manteniendo el compositor GPU y los timestamps explícitos como siguientes gates multimedia.

## Actualización 2026-09-21 — continuidad de ingeniería / bitácora maestra

### Objetivo
Consolidar la continuidad del proyecto y evitar repetir auditorías, implementaciones o estrategias descartadas.

### Estado antes
- La bitácora canónica existente es `experimental/studio/BITACORA.md`.
- `DEVELOPMENT_LOG.md` queda histórico y no debe usarse como fuente para nuevas tareas.
- La auditoría vigente ya contiene los principales gates multimedia, avatar, OBS/Twitch y distribución.
- El proyecto continúa EXPERIMENTAL / NO listo para producción.

### Trabajo realizado en esta iteración
- Confirmada la jerarquía de continuidad: repositorio/HEAD → `BITACORA.md` → `PROJECT_STATUS.md` → `AUDIT_MATRIX.md` → pruebas/CI.
- Confirmado que no debe crearse una segunda bitácora.
- Corregida una regresión concreta: el atajo de audio `A` podía activar el micrófono automáticamente; ahora iniciar el motor de audio no habilita el micrófono.
- Mantiene la política de micrófono OPT-IN mediante el gate explícito `microphone.set` / Hablar.
- Verificados los workflows: la rama de desarrollo ya dispara CI; los jobs recientes continúan terminando sin steps/logs observables.
- Sincronizado `PROJECT_STATUS.md` con el HEAD actual.

### Archivos modificados
- `experimental/studio/native-windows/main.cpp`
- `experimental/studio/PROJECT_STATUS.md`
- `experimental/studio/AUDIT_MATRIX.md`
- `experimental/studio/BITACORA.md`

### Herramientas utilizadas
- GitHub repository / branch / PR inspection
- GitHub Actions inspection
- auditoría estática
- revisión de bitácora y documentación del proyecto

### Pruebas realizadas
- Revisión estática del camino de micrófono.
- Revisión de jobs de Actions para Native Windows, CI, Character Runtime y diagnostic probe.
- Evidencia histórica conservada: C++20 strict smoke de timing/interleaver/retry/diagnóstico y FFmpeg sintético BGRA + PCM float32 → H.264/AAC → Matroska.

### Resultado
**PARCIAL / VERIFICADO EN CÓDIGO.**
La corrección de privacidad está integrada. La validación Windows completa sigue bloqueada por Actions.

### Problemas encontrados
- GitHub Actions sigue creando jobs con `steps=null` y sin `logs_url`, incluso para el workflow diagnóstico mínimo.
- Esto impide atribuir los fallos de CI a código de Cari y también impide convertir el E2E Windows en evidencia de validación.

### Qué NO se debe repetir
1. No crear otra bitácora; usar `experimental/studio/BITACORA.md`.
2. No rehacer Windows Graphics Capture.
3. No rehacer WASAPI mixer.
4. No rehacer MediaClock, RealtimePacer o MediaInterleaver.
5. No crear otro FFmpeg supervisor, OBS service, Twitch transport, Action Store o avatar renderer.
6. No hacer fallback de OBS por excepción de ejecución.
7. No activar automáticamente el micrófono desde audio start, polling, VAD o auto-motion.
8. No usar OpenCV para reemplazar Windows Graphics Capture sin una regresión reproducible.
9. No tratar el compositor D3D11 actual como producción: todavía existe readback CPU.
10. No tratar FFmpeg raw como transporte de PTS explícitos: esa limitación sigue abierta.

### Estado vigente
- HEAD: `82db3009aa8fe8b083cd1d0d2ed1d9e6c709d6ee`
- Ingeniería: **~71%**
- Producto usable/end-user: **~58%**
- Global de seguimiento: **~65%**
- Producción: **NO listo**

### Pendientes
- CI observable.
- E2E Windows named-pipe → FFmpeg → archivo.
- Compositor GPU sin CPU readback.
- PTS explícitos extremo a extremo.
- Drift correction WASAPI.
- Validación real de cámara / Game Capture.
- RTMP/Twitch/OBS reales.
- Hardware / distribución / release.

### SIGUIENTE PRIORIDAD
**CI observable; cuando exista ejecución real de steps, ejecutar y conservar la evidencia del E2E Windows named-pipe → FFmpeg → archivo.**
