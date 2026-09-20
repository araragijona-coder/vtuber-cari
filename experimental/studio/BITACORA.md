# Cari Studio — Bitácora maestra de ingeniería y continuidad

> **Fuente canónica única de continuidad.**
> Antes de tocar un módulo, una prueba o un workflow, revisar este archivo. Los checkpoints históricos anteriores quedan archivados aquí como referencia y **no deben usarse para decidir el estado actual**.

**Última auditoría:** 20/09/2026 13:05 ART  
**HEAD canónico:** consultar siempre el HEAD actual del PR #2; no fijarlo aquí.
**PR:** #2 — `fix/native-windows-foundation`  
**PR:** abierto / draft / no mergeable  
**Avance global de ingeniería:** **62%**  
**Readiness:** experimental; **NO listo para producción**.

## 1. Estados de evidencia

- **IMPLEMENTADO:** existe código integrado.
- **VERIFICADO:** existe una prueba reproducible ejecutada y observada.
- **VALIDADO EN HARDWARE:** probado en Windows/PC objetivo.
- **PENDIENTE:** existe implementación o diseño, pero falta evidencia para cerrar el gate.
- **NO REPETIR:** no rehacer el componente; trabajar únicamente sobre su gate restante o una regresión reproducible.

## 2. Trabajo ya realizado — NO REPETIR

### Shell / arquitectura

| Componente | Estado | Evidencia | Regla |
|---|---|---|---|
| Electron + Native Windows C++ | IMPLEMENTADO | `ARCHITECTURE.md` | NO replantear arquitectura sin cambio de requisitos |
| contextIsolation + preload explícito + sandbox | IMPLEMENTADO | `electron-shell/main.js`, `preload.js` | NO rehacer |
| NativeEngine + correlación JSONL | IMPLEMENTADO | `runtime/native-engine.js` | Solo corregir regresiones |
| Session manager: serialización/rollback/stop-only | IMPLEMENTADO + VERIFICADO | tests JS/runtime | NO repetir pruebas básicas |

### Captura

| Componente | Estado | Evidencia | Regla |
|---|---|---|---|
| Windows Graphics Capture de ventana | IMPLEMENTADO | `capture_engine.*` | NO sustituir por OpenCV |
| WGC de pantalla primaria | IMPLEMENTADO | `CreateForMonitor` | NO rehacer |
| Enumeración/selección de ventanas | IMPLEMENTADO + VERIFICADO | `window_sources.*` + smoke | NO rehacer |
| Resize/frame-pool recreate | IMPLEMENTADO | `capture_engine.*` | Reabrir solo por regresión/hardware |
| Device removed/reset/hung | IMPLEMENTADO | `capture_engine.*` | Falta VALIDADO EN HARDWARE |
| Cámara Media Foundation | PENDIENTE | solo enumeración existe | Construir streaming real; NO repetir enumeración |
| Game Capture dedicado | PENDIENTE | no implementado | Backend específico; NO reutilizar WGC como sustituto |

### Audio / voz

| Componente | Estado | Evidencia | Regla |
|---|---|---|---|
| WASAPI mic + system loopback | IMPLEMENTADO | `wasapi_capture.*`, bridge | NO rehacer captura base |
| QPCPosition en 100 ns | IMPLEMENTADO | auditoría/documentación | NO aplicar doble conversión |
| AudioTimelineMixer | IMPLEMENTADO + VERIFICADO | smoke mixer | NO repetir mezcla básica |
| Normalización canales/sample-rate | IMPLEMENTADO + VERIFICADO | mixer smoke | NO rehacer |
| Voice `anime-bright` | IMPLEMENTADO | `voice_effects.*` | NO confundir con pitch/formant |
| Pitch/formant real | PENDIENTE | no implementado | Añadir etapa independiente |
| Drift correction físico | PENDIENTE | requiere relojes reales | Siguiente bloque de audio |

### Multimedia / FFmpeg / output

| Componente | Estado | Evidencia | Regla |
|---|---|---|---|
| Contrato BGRA + PCM float32 | IMPLEMENTADO + VERIFICADO | adapter + FFmpeg synthetic | NO repetir contrato |
| RawPipe OVERLAPPED + bounded queue | IMPLEMENTADO + smoke | `raw_pipe.*` | NO crear otro transporte |
| FFmpeg supervisor | IMPLEMENTADO + VERIFICADO | supervisor smoke | NO rehacer lifecycle |
| EOF/flush antes de force terminate | IMPLEMENTADO | `ffmpeg_av_output.cpp` | NO rehacer shutdown |
| stderr limitado a 256 KiB | IMPLEMENTADO | `ffmpeg_av_output.*` | NO volver a buffer ilimitado |
| MediaClock | IMPLEMENTADO + VERIFICADO | clock smoke | NO crear otro reloj |
| RealtimePacer | IMPLEMENTADO + VERIFICADO | scheduler smoke | NO crear otro scheduler |
| Global A/V interleaver por PTS | IMPLEMENTADO + VERIFICADO | scheduler smoke | NO volver al despacho por bloques |
| Dispatch budget máximo 8/tick | IMPLEMENTADO | MediaGraphController | NO quitar sin benchmark |
| Backpressure de arranque | IMPLEMENTADO | main/native graph | NO drenar mixer antes de conectar pipes |
| Invariante de formato de audio | IMPLEMENTADO | MediaGraphController | NO permitir cambio silencioso |
| Output state/exit code metrics | IMPLEMENTADO | native + renderer | NO rehacer |
| Error classification | IMPLEMENTADO + VERIFICADO | diagnostics smoke | Ampliar solo con errores reales nuevos |
| RTMP retry/backoff | IMPLEMENTADO + VERIFICADO (policy) | `output_retry.*` | NO crear otra policy |
| Retry solo network | IMPLEMENTADO | `main.cpp` | NO reintentar encoder/mux/input a ciegas |
| D3D11 compositor GPU experimental | IMPLEMENTADO + VERIFICADO en WARP | `d3d11_compositor.*` + smoke | NO rehacer compositor base |
| Overlay alpha GPU | IMPLEMENTADO + VERIFICADO en WARP | compositor smoke | Falta hardware |
| Readback CPU | IMPLEMENTADO como fallback/diagnóstico | compositor/frame bridge | NO usar como camino de producción |
| E2E named-pipe -> FFmpeg -> decode | IMPLEMENTADO EN CÓDIGO | `ffmpeg_named_pipe_e2e_smoke.cpp` | **NO marcar VERIFIED sin ejecución Windows observable** |
| PTS explícitos dentro del transporte | PENDIENTE | raw pipe no los conserva | Próximo bloque de tiempo |
| Encoder/mux sostenido | PENDIENTE | synthetic FFmpeg sí; Windows sostenido no | Validar, no rehacer supervisor |
| RTMP sostenido real | PENDIENTE | endpoint real/hardware requerido | Validar policy existente |

### Avatar / tracking

| Componente | Estado | Evidencia | Regla |
|---|---|---|---|
| Avatar contract | IMPLEMENTADO + VERIFICADO | `avatar-contract.js` + tests | NO repetir |
| Three.js WebGL | IMPLEMENTADO | `three-avatar.js` | NO rehacer renderer base |
| GLTF/GLB | IMPLEMENTADO | GLTFLoader | NO rehacer |
| Placeholder procedural | IMPLEMENTADO | renderer | NO generar assets propietarios |
| MediaPipe Face Landmarker | IMPLEMENTADO | `face-tracker.js` | NO crear otro tracker |
| Timestamp monotónico MediaPipe | IMPLEMENTADO | `face-tracker.js` | NO repetir |
| Blendshape -> avatar state | IMPLEMENTADO | `face-tracking-bridge.js` | NO rehacer mapping básico |
| D3D11 avatar placeholder overlay | IMPLEMENTADO EXPERIMENTAL | `avatar_gpu_overlay.*` | NO confundir con avatar final |
| Lip-sync por amplitud | IMPLEMENTADO | AudioCoreBridge + AvatarActingBridge | NO declararlo como viseme/phoneme |
| Avatar real -> frame final | PENDIENTE | falta asset/modelo/runtime neutral real | Próximo bloque |
| Native VRM renderer completo | PENDIENTE | integración final no cerrada | Próximo bloque |
| Live2D | PENDIENTE / adapter-only | runtime propietario no distribuido | Requiere decisión legal/distribución |
| Tracking rendimiento final | PENDIENTE | cámara/modelo/hardware | Validación hardware |

### Streaming / eventos / distribución

| Componente | Estado | Regla |
|---|---|---|
| OBS WebSocket v5 | IMPLEMENTADO, opcional | NO convertir OBS en dependencia |
| Twitch EventSub/chat | IMPLEMENTADO | NO rehacer transporte |
| Local action router/runtime bindings | IMPLEMENTADO | NO rehacer |
| Real Twitch/YouTube RTMP | PENDIENTE VALIDACIÓN | Usar output existente |
| EventSub reconnection integration test | PENDIENTE | Validar ciclo real |
| Multistream | PENDIENTE | NO construir antes de estabilizar single-output |
| Dependency license audit | IMPLEMENTADO | NO repetir salvo cambio de dependency |
| FFmpeg redistribution decision | PENDIENTE | Resolver antes de release |
| Installer/logging/asset packaging | PENDIENTE | Última fase |

## 3. Cambios realizados en la continuación actual

1. Auditada la rama/PR actual contra el estado real de GitHub.
2. Confirmado que el compositor D3D11 ya existe y dispone de smoke con WARP; se evitó reconstruirlo.
3. Confirmada la existencia del E2E Windows named-pipe -> FFmpeg -> decode en código.
4. Confirmado que retry/backoff ya está integrado y debe permanecer restringido a fallos de red.
5. Corregida la serialización del campo `output` en el estado nativo para no producir una clave vacía.
6. Añadidos/registrados smoke tests de retry y clasificación de errores.
7. El workflow CI fue preparado para la rama de desarrollo y `workflow_dispatch`.
8. El backpressure inicial, límite de 8 eventos/tick e invariantes de sesión quedaron documentados.
9. Se consolidaron los pendientes para impedir volver a abrir componentes terminados.
10. Esta bitácora fue normalizada para eliminar checkpoints históricos contradictorios y usar el PR como referencia viva del HEAD.

## 4. Intentos y pruebas que NO deben repetirse a ciegas

| Intento | Resultado | Acción futura |
|---|---|---|
| FFmpeg con archivos raw BGRA + PCM | PASS en Linux | Ya validado; solo repetir con cambios |
| Primer ensayo de dos FIFOs | expiró durante handshake | NO usarlo como diagnóstico de encoder |
| Reintentos de Actions antiguos | fallaron con `steps=null` | No inferir causa de código |
| Workflow sobre branch de desarrollo | se dispara | Falta que runner ejecute steps |
| Smoke D3D11 WARP | PASS | No repetir salvo cambio del compositor |
| Smoke retry/diagnostics portable | PASS | No repetir salvo cambio de policy |
| OpenCV como sustituto de WGC | descartado | NO reintroducir como backend principal |
| `capturePage()` como transporte de vídeo | descartado | NO reintroducir |

## 5. CI vigente

Runs asociados al HEAD actual `06bc51a98585f4d48c546ad4df3430698ba0e3c8`:

- Native Windows Build: run `35521317319` — failure; jobs sin `steps` y sin `logs_url`.
- Character Runtime Tests: run `35521317323` — failure; jobs sin `steps` y sin `logs_url`.
- CI: run `35521317333` — failure; jobs sin `steps` y sin `logs_url`.

Esto **no permite afirmar que el código de esos jobs haya comenzado a ejecutarse**. No marcar CI como verde ni atribuir la falla a una línea concreta.

## 6. Cola de trabajo — orden de entrada

### P0
1. Conseguir ejecución Windows observable de CI con steps/logs.
2. Ejecutar E2E named-pipe -> FFmpeg -> archivo -> decode.
3. Guardar evidencia reproducible: commit, versión FFmpeg, resolución, FPS, sample-rate, canales, duración, bytes, streams y errores.

### P1
1. Diseñar transporte explícito de PTS extremo a extremo.
2. Eliminar readback CPU del camino de producción.
3. Conectar avatar real/neutral al compositor D3D11.
4. Mantener estable el contrato Frame/PTS.

### P2
1. Media Foundation camera source.
2. Device clocks.
3. Drift correction/resampling.
4. Lip-sync avanzado.

### P3
1. RTMP/RTMPS real prolongado.
2. Prueba real de caída de red.
3. Validar retry existente.
4. Twitch/YouTube reales.
5. Multistream solo después del single-output gate.

### P4
1. Game Capture.
2. Installer.
3. Redistribución FFmpeg/codec.
4. Logs/rollback de usuario.
5. Asset packaging.
6. Hardware validation final.

## 7. Regla anti-repetición

Antes de programar:

1. Buscar el componente aquí.
2. Si está **IMPLEMENTADO**, trabajar sobre su gate pendiente.
3. Si está **VERIFICADO**, no repetir la misma prueba sin evidencia nueva.
4. Si está **VALIDADO EN HARDWARE**, no reabrir salvo regresión.
5. Si aparece un hallazgo nuevo, registrarlo aquí antes de crear otra implementación.
6. No crear un segundo parser, mixer, reloj, scheduler, transporte raw, supervisor FFmpeg, retry policy, tracker MediaPipe, renderer Three.js o compositor D3D11 para sustituir los existentes.

## 8. Estado canónico

**Avance global: 62% de ingeniería.**

El 62% no significa 62% de código ni disponibilidad para producción. La ruta principal está construida, pero quedan gates de validación Windows/hardware, transporte PTS explícito, composición de avatar final, cámara, drift, RTMP sostenido, Game Capture, multistream y distribución.

**Producto: NO listo para producción.**
