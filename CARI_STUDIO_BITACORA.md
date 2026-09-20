# Cari Studio — Bitácora maestra de ingeniería

**Documento canónico:** este archivo registra qué se hizo, qué está comprobado, qué sigue pendiente y qué análisis NO debe repetirse sin nueva evidencia.

**Regla de organización**
- `main`: producción/estado aceptado.
- `experimental/`: única zona permitida para código todavía no validado en el entorno objetivo.
- No se considera una tarea terminada solo porque compile o tenga una interfaz.

## 2026-09-20 — Estado de esta iteración

### Estado global
**Avance estimado: 58% de ingeniería.**

El porcentaje es una medida de avance de ingeniería, no una afirmación de que el programa ya sea un producto de producción.

### Rama de trabajo
- `fix/native-windows-foundation`
- PR #2
- Último HEAD verificado durante esta iteración: `0e73d2f963e2fc03adde37b83473997998cfc90d` en el flujo de CI y posteriormente la rama continuó evolucionando.
- El PR permanece draft y no fusionado.
- `main` y la rama de trabajo siguen divergentes por 2 commits históricos. No se hizo reescritura forzada de historia.

## Arquitectura ya construida

### Electron
- Renderer local.
- Context isolation.
- Node integration desactivada.
- Sandbox.
- Preload con wrappers explícitos.
- NativeEngine en Electron Main.
- Correlación request/response mediante IDs.
- Gestor de sesión con serialización/rollback/stop-only.
- Integración OBS WebSocket 5.x opcional.
- OBS no es dependencia del pipeline nativo.

### Windows nativo
- Win32 host.
- D3D11.
- Windows Graphics Capture.
- Captura de ventana.
- Captura del monitor primario.
- Enumeración de ventanas.
- Recuperación de device removed/reset/hung.
- WASAPI micrófono.
- WASAPI system loopback.
- Enumeración de cámaras mediante Media Foundation.
- VoiceEffectProcessor local.
- AudioTimelineMixer.
- FrameBridge.
- RawPipe con overlapped I/O.
- ProcessRunner con CreateProcessW.
- Supervisor de FFmpeg.
- FFmpeg A/V con canales independientes audio/video.
- Grabación local.
- RTMP/RTMPS directo.

### VTuber
- Contrato neutral de avatar.
- Estado de actuación separado de apariencia.
- Three.js + GLTF/GLB.
- MediaPipe Face Landmarker.
- FaceTrackingBridge.
- Renderizador geométrico de prueba.
- Live2D queda como adapter futuro; no se distribuye runtime propietario.

## Trabajo ya realizado y NO REPETIR

### Captura
**CERRADO PARA REVISIÓN NORMAL**
- La captura de ventana ya existe.
- La captura de pantalla primaria ya existe.
- La selección de ventana por índice ya existe.
- El callback de captura ya entrega superficie DXGI.
- El frame pool ya contempla resize/recreate.
- Device-loss handling ya fue implementado.

**NO REPETIR**
- No volver a diseñar desde cero la captura de pantalla/ventana.
- No volver a añadir un segundo enumerador de ventanas.
- No reemplazar Windows Graphics Capture por OpenCV para resolver la captura principal sin nueva evidencia de necesidad.

### Audio
**IMPLEMENTADO**
- Micrófono + loopback.
- Mixer temporal.
- Normalización inicial de sample rate/canales.
- DSP local anime-bright.

**REFORZADO**
- Un output no acepta silenciosamente un cambio de sample rate/canales durante la sesión.
- Audio no se drena del mixer hasta que los dos pipes del output están conectados.
- Audio atrasado se contabiliza como `audio_late`; no se descarta automáticamente para evitar huecos audibles.

**NO REPETIR**
- No implementar otro mixer paralelo.
- No añadir otra capa de captura de micrófono sin justificar una mejora medible.
- No tratar `anime-bright` como pitch/formant shifting: actualmente es DSP tonal/dinámico.

### A/V timing
**IMPLEMENTADO**
- `MediaClock` en ticks de 100 ns.
- `RealtimePacer` contra reloj monotónico.
- Interleaver global por PTS.
- Desempate audio antes que vídeo.
- Colas acotadas.
- Máximo de 8 eventos despachados por polling.
- Métricas de late/cadence/overflow.

**LÍMITE CONOCIDO**
- El transporte raw no conserva los PTS originales dentro de los bytes enviados a FFmpeg.
- El scheduler pacea la emisión, pero todavía no constituye preservación temporal extremo a extremo.

**NO REPETIR**
- No declarar A/V “perfectamente sincronizado”.
- No volver a implementar otro scheduler paralelo.
- No eliminar los límites de cola/dispatch para “ganar velocidad”.

### FFmpeg
**IMPLEMENTADO**
- Proceso nativo administrado.
- CreateProcessW.
- Quote correcto de argumentos Windows.
- Captura y drenaje de stderr.
- Cierre por EOF/flush antes de terminación forzada.
- Estado de proceso.
- Código de salida.
- Diagnóstico con stderr limitado a 256 KiB.
- A/V raw por dos named pipes.
- Mapeo explícito 0:v:0 y 1:a:0.

**PRUEBA REAL DISPONIBLE**
- FFmpeg 7.1.5.
- BGRA raw + PCM float32.
- H.264 + AAC.
- Mux Matroska.
- ffprobe detectó vídeo H.264 y audio AAC.

**NO REPETIR**
- No volver a concluir que esta prueba Linux demuestra Windows named pipes.
- No declarar grabación sostenida Windows.
- No declarar RTMP real verificado.
- No añadir otro supervisor FFmpeg separado.

### Resiliencia del output
**IMPLEMENTADO**
- Clasificación básica de errores: network/encoder/input/mux/permission/unknown.
- Política de backoff exponencial:
  - inicio 1 s;
  - máximo 30 s;
  - máximo 5 intentos.
- Solo se pretende reintentar RTMP y únicamente ante errores clasificados como de red.
- Errores de encoder/mux/permiso/input no se reintentan ciegamente.
- Métricas de retry visibles.

**NO REPETIR**
- No crear reconexión infinita.
- No reintentar errores de encoder/mux como si fueran problemas de red.
- No aumentar el número máximo de intentos sin evidencia operacional.

## CI — investigación cerrada por ahora

Se corrigió la configuración para que los workflows puedan ejecutarse también en la rama de desarrollo y mediante `workflow_dispatch`.

Los runs recientes continúan terminando en `failure` con:
- `steps = null`
- sin URL de logs utilizable desde la integración disponible.

Los reintentos también terminaron sin steps ejecutados.

**Conclusión actual:** no hay evidencia suficiente para atribuir estos fallos a una línea concreta del código del proyecto.

**NO REPETIR**
- No declarar CI verde basándose en el simple hecho de que existe un run.
- No “arreglar” código a ciegas por estos fallos mientras GitHub no exponga un step/log que identifique el error.
- No borrar tests solo para hacer pasar el workflow.

## Intentos fallidos / descartados

### Prueba con FIFOs
Se probó el flujo con dos FIFO/streams raw y la prueba expiró por el comportamiento de apertura/bloqueo de los pipes. Se aisló correctamente el problema usando archivos raw deterministas para validar encoder/mapping/mux.

**No reutilizar esta prueba como evidencia de Windows named pipes.**

### Integración inicial de retry
Hubo dos intentos parciales de insertar la política en `main.cpp` que se abortaron por anclas de texto que no coincidían. No dejaron escrituras incompletas en ese intento. La integración válida se realizó después sobre el archivo actual.

**No volver a buscar esos parches fallidos; usar la versión actual del archivo.**

## Pendientes prioritarios

1. **Transporte temporal explícito**
   - Introducir un protocolo/encapsulado que transporte PTS o una referencia temporal equivalente hasta el consumidor.
   - Mantener compatibilidad con backpressure.

2. **Compositor final**
   - Pasar de compositor de referencia a composición GPU real.
   - Integrar avatar/escena dentro del frame que finalmente entra al encoder.

3. **Avatar**
   - Conectar tracking → renderer → compositor.
   - Lip-sync real.
   - Modelo final configurable.

4. **Windows**
   - Cámara Media Foundation de captura real.
   - Game Capture dedicado.
   - Device/reconnect sobre hardware real.

5. **Audio**
   - Drift correction basada en relojes de dispositivos.
   - Resampling continuo controlado.

6. **Output**
   - Validación sostenida FFmpeg + named pipes en Windows.
   - Grabación larga.
   - RTMP real.
   - Reconnect/backoff validado.
   - Diagnóstico estructurado de stderr.

7. **Distribución**
   - Política de descubrimiento de FFmpeg.
   - Decisión de redistribución/licencias.
   - Instalador.
   - Logs y rollback de usuario.

8. **Multistream**
   - Añadirlo solo después de estabilizar un único output.

## Gates que NO pueden marcarse como cerrados

- CI Windows verde.
- FFmpeg sostenido en Windows.
- Grabación sostenida.
- RTMP real.
- A/V sincronizado extremo a extremo.
- Drift correction.
- Cámara real.
- Game Capture.
- Compositor avatar → frame final.
- Lip-sync real.
- Validación de hardware objetivo.
- Instalador de producción.
- Multistream.

## Regla para futuras iteraciones

Antes de implementar una pieza:
1. Buscar en esta bitácora si ya existe.
2. Si existe como IMPLEMENTADO, no recrearla.
3. Si existe como PENDIENTE, continuar desde el punto exacto documentado.
4. Si existe como DESCARTADO, no repetirlo sin nueva evidencia.
5. Solo mover algo desde `experimental/` a `main` cuando tenga evidencia suficiente de compilación/pruebas y, cuando corresponda, validación en Windows real.

## Registro de cambios de esta continuación

- Endurecimiento del interleaver A/V.
- Invariantes de sesión para impedir cambios de captura/audio durante output.
- Backpressure de arranque.
- Límite de 8 eventos multimedia por polling.
- Diagnóstico de estado/código de salida FFmpeg.
- Límite de stderr a 256 KiB.
- Clasificación de errores de output.
- Política de retry RTMP con backoff.
- Tests smoke de retry y diagnóstico.
- Workflows habilitados para la rama de desarrollo y dispatch manual.
- UI ampliada con métricas de output/retry/pacing.
- Esta bitácora maestra.

## Fuente de verdad actual

Para código: repositorio GitHub `araragijona-coder/vtuber-cari`.

Para estado de Cari Studio: este archivo + `experimental/studio/PROJECT_STATUS.md` + `experimental/studio/AUDIT_MATRIX.md` mientras la implementación continúe en validación.

**Última actualización de esta bitácora: 2026-09-20.**
