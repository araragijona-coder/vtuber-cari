# Cari Studio — Auditoría cruzada Windows / multimedia

Fecha: 2026-09-16

## Evidencia externa revisada

- Microsoft Learn — `Direct3D11CaptureFramePool`: `CreateFreeThreaded`, `TryGetNextFrame`, `Recreate` y ciclo de captura.
- Microsoft Learn — Screen capture: `Recreate` es el mecanismo recomendado cuando cambia el tamaño de buffers o se proporciona un nuevo dispositivo por pérdida/cambio del anterior; los frames existentes se descartan al recrear.
- OBS Studio documentation: separación conceptual entre Sources/Scenes y Outputs/Encoders/Services.
- FFmpeg documentation: reconexión de protocolos, `tee` muxer para reutilizar una codificación en varios destinos y FIFO para aislar velocidad/latencia de outputs.

Referencias externas consultadas:

- https://learn.microsoft.com/en-us/uwp/audio-video-camera/screen-capture
- https://docs.obsproject.com/frontends
- https://docs.obsproject.com/reference-outputs
- https://docs.obsproject.com/reference-encoders
- https://ffmpeg.org/ffmpeg-protocols.html
- https://ffmpeg.org/ffmpeg-formats.html#tee
- https://www.ffmpeg.org/ffmpeg.html

## Estado verificado en el código

### Windows Graphics Capture

- `CreateFreeThreaded` está integrado.
- El callback de `FrameArrived` usa un `weak_ptr` para evitar depender de una instancia destruida durante el cierre.
- Se mide `frames`, `delivered`, `errors`, `fps`, resolución y número de `recreates`.
- Cuando `ContentSize()` cambia, el frame pool se recrea con el mismo dispositivo D3D11.
- La aplicación enumera ventanas visibles y permite seleccionar una de las primeras nueve mediante las teclas `1` a `9`.
- La captura tiene un puente `CapturedFrame → core::Frame` mediante `frame_bridge.cpp`.
- El puente obtiene el `ID3D11Texture2D`, crea una textura staging CPU-readable y copia el frame a un payload BGRA8 administrado por `shared_ptr`.
- El ejecutable de diagnóstico prueba ese bridge cada 30 frames y expone éxitos, fallos, bytes transferidos y última secuencia procesada.
- Esta copia es deliberadamente una ruta de validación de contrato; no se considera todavía el camino de producción de máximo rendimiento.

### Recuperación del dispositivo D3D11

Se añadió una ruta explícita de recuperación para errores `DXGI_ERROR_DEVICE_REMOVED`, `DXGI_ERROR_DEVICE_RESET` y `DXGI_ERROR_DEVICE_HUNG` detectados durante el procesamiento del frame:

- se liberan los objetos D3D11 afectados;
- se crea un nuevo `ID3D11Device` y su `IDirect3DDevice` WinRT;
- se recrea el `Direct3D11CaptureFramePool` con el nuevo dispositivo;
- se contabiliza cada recuperación por separado de los `recreates` de resize;
- la UI diagnóstica expone el contador de recuperaciones.

La documentación de Microsoft confirma que `Recreate` debe usarse para cambios de tamaño y para proporcionar un nuevo dispositivo tras pérdida/cambio del anterior. La implementación todavía requiere validación en hardware Windows real para confirmar la recuperación de extremo a extremo. citeturn994761search4turn994761search0

### Bridge hacia el compositor

Se añadió `compositor_bridge.cpp/.h` para cruzar el límite entre la captura nativa y el compositor del core:

```text
Windows.Graphics.Capture
        ↓
CapturedFrame / D3D11 surface
        ↓
FrameBridge
        ↓
core::Frame + BGRA8 CPU payload
        ↓
BGRA8 → RGBA8
        ↓
core::SoftwareCompositor
        ↓
core::RgbaImage
```

El ejecutable de diagnóstico ya ejecuta este camino sobre las muestras del bridge y contabiliza éxitos, fallos, bytes producidos y secuencia procesada.

Esto demuestra una **escena mínima de una capa**. Todavía no demuestra un compositor de producción ni una escena multi-capa completa con transformaciones y fuentes simultáneas.

### Fuentes / escenas

La separación conceptual de Cari Studio sigue el patrón documentado por OBS: Sources alimentan Scenes y la composición queda separada de Outputs/Encoders/Services. citeturn994761search10

La arquitectura de Cari Studio no copia OBS internamente; usa esos contratos como referencia de comportamiento.

### Salida / streaming

Existe un contrato de `OutputProfile` y construcción de comando FFmpeg RTMP. Todavía no es un pipeline de salida real.

FFmpeg documenta que el `tee` muxer puede enviar los mismos paquetes codificados a varios destinos sin repetir la codificación, y que `fifo` puede aislar diferencias de velocidad/latencia y permitir recuperación de outputs. También documenta opciones de reconexión para determinadas clases de protocolos. citeturn163529search2turn163529search0turn163529search1

Gates pendientes:

- descubrimiento controlado del binario FFmpeg;
- proceso supervisado con captura de stderr;
- alimentación real de vídeo y audio al proceso;
- detección de caída del proceso;
- política de reconexión propia de Cari Studio;
- prueba RTMP real en máquina Windows;
- decisión de redistribución/licencia de FFmpeg;
- evaluación de encoder por hardware frente a CPU.

### CI

El proyecto tiene:

- CI Python para producción/experimental;
- CI separado para el runtime de personajes;
- CI nativo Windows para CMake, smoke test y empaquetado x64.

Los commits recientes que añaden el bridge, el compositor y la recuperación todavía no presentan una ejecución de workflow visible mediante la API consultada. Por tanto, el estado correcto sigue siendo `pendiente de CI`; no se marca como verde por inferencia.

### Gates técnicos siguientes

1. Obtener ejecución CI Windows del bridge + compositor + recuperación.
2. Expandir el compositor desde una capa a una escena con varias capas reales.
3. Integrar posición, escala, visibilidad y opacidad desde `Scene` hacia el compositor.
4. Conectar WASAPI → `AudioPacket` → `AudioMixer` real.
5. Implementar encoder/FFmpeg supervisado con stderr y estado de proceso.
6. Implementar RTMP real con métricas y reconexión.
7. Validar en hardware: juego, micrófono, audio del sistema y recuperación ante pérdida de dispositivo.

## Regla de cierre

`compila` != `funciona`.

`CI verde` != `hardware validado`.

`API/documentación disponible` != `integración completa`.

`selección de ventana` != `game capture dedicado`.

`bridge CPU funcionando` != `compositor de producción`.

`una capa compuesta` != `escena multi-capa terminada`.

`recuperación implementada` != `recuperación validada en hardware`.

`comando FFmpeg válido` != `stream RTMP funcional`.
