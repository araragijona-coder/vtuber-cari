# Cari Studio — Auditoría cruzada Windows / multimedia

Fecha: 2026-09-16

## Evidencia externa revisada

- Microsoft Learn — `Direct3D11CaptureFramePool`: `CreateFreeThreaded`, `TryGetNextFrame`, `Recreate` y ciclo de captura.
- Microsoft Learn — Screen capture: `Recreate` es el mecanismo recomendado cuando cambia el tamaño de buffers o se proporciona un nuevo dispositivo por pérdida/cambio del anterior; los frames existentes se descartan al recrear.
- OBS Studio documentation: separación conceptual entre Sources/Scenes y Outputs/Encoders/Services.
- FFmpeg documentation: reconexión de protocolos, `tee` muxer para reutilizar una codificación en varios destinos y FIFO para aislar velocidad/latencia de outputs.
- FFmpeg hardware acceleration: D3D11VA/QSV y codificación por Media Foundation como rutas candidatas que deben medirse en el hardware objetivo.

Referencias externas consultadas:

- https://learn.microsoft.com/en-us/uwp/audio-video-camera/screen-capture
- https://docs.obsproject.com/frontends
- https://docs.obsproject.com/reference-outputs
- https://docs.obsproject.com/reference-encoders
- https://ffmpeg.org/ffmpeg-protocols.html
- https://ffmpeg.org/ffmpeg-formats.html#tee
- https://www.ffmpeg.org/ffmpeg.html
- https://ffmpeg.org/ffmpeg-codecs.html

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

La documentación de Microsoft confirma que `Recreate` debe usarse para cambios de tamaño y para proporcionar un nuevo dispositivo tras pérdida/cambio del anterior. La implementación todavía requiere validación en hardware Windows real para confirmar la recuperación de extremo a extremo.

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

Esto demuestra una escena mínima de una capa. Todavía no demuestra un compositor de producción ni una escena multi-capa completa con transformaciones y fuentes simultáneas.

### Audio WASAPI → core

El runtime ya dispone de captura WASAPI separada para micrófono y loopback del sistema.

Se añadió `audio_core_bridge.cpp/.h` para completar el siguiente contrato:

```text
WASAPI microphone / system loopback
        ↓
AudioCapturePacket
        ↓
core::AudioPacket
        ↓
AudioMixer track
        ↓
mix / peak metrics
```

Características actuales:

- captura de micrófono y audio del sistema en paralelo;
- tolera que uno de los dos dispositivos no pueda arrancar sin impedir el otro;
- normaliza muestras PCM/float ya convertidas por WASAPI a `float`;
- conserva sample rate, canales, timestamp y secuencia en el `core::AudioPacket` puenteado;
- actualiza tracks independientes `microphone` y `system` del `AudioMixer`;
- contabiliza callbacks, paquetes, muestras, errores y pico observado;
- expone el pico del mix al diagnóstico nativo.

Esto cierra el **bridge de contrato** de audio, pero todavía no significa que el audio ya sea consumido por un encoder/salidas reales ni que la sincronización A/V esté terminada.

### Fuentes / escenas

La separación conceptual de Cari Studio sigue el patrón documentado por OBS: Sources alimentan Scenes y la composición queda separada de Outputs/Encoders/Services.

La arquitectura de Cari Studio no copia OBS internamente; usa esos contratos como referencia de comportamiento.

### Salida / streaming

Existe un contrato de `OutputProfile` y construcción de comando FFmpeg RTMP. Todavía no es un pipeline de salida real.

FFmpeg documenta que el `tee` muxer puede enviar los mismos paquetes codificados a varios destinos sin repetir la codificación, y que `fifo` puede aislar diferencias de velocidad/latencia y permitir recuperación de outputs. También documenta opciones de reconexión para determinadas clases de protocolos.

Gates pendientes:

- descubrimiento controlado del binario FFmpeg;
- proceso supervisado con captura de stderr;
- alimentación real de vídeo y audio al proceso;
- sincronización A/V basada en timestamps;
- detección de caída del proceso;
- política de reconexión propia de Cari Studio;
- prueba RTMP real en máquina Windows;
- decisión de redistribución/licencia de FFmpeg;
- evaluación medida de encoder por hardware frente a CPU.

### Encoder / hardware acceleration

La investigación actual mantiene abiertas varias rutas de implementación: FFmpeg con `d3d11va`/QSV, codificación Media Foundation y otros encoders disponibles en Windows. FFmpeg documenta uso de dispositivos D3D11 y QSV, mientras que Media Foundation expone encoders mediante MFT y Windows mantiene soporte nativo de H.264 y hardware multimedia.

No se selecciona todavía una ruta definitiva porque la decisión debe basarse en pruebas del PC objetivo: consumo de GPU/CPU, latencia, estabilidad, compatibilidad del encoder y coste de copiar frames entre GPU y RAM.

### CI

El proyecto tiene:

- CI Python para producción/experimental;
- CI separado para el runtime de personajes;
- CI nativo Windows para CMake, smoke test y empaquetado x64.

Los commits recientes que añaden el bridge de audio, el compositor y la recuperación todavía no presentan una ejecución de workflow visible mediante la API consultada. Por tanto, el estado correcto sigue siendo `pendiente de CI`; no se marca como verde por inferencia.

### Gates técnicos siguientes

1. Obtener ejecución CI Windows del bridge de audio + compositor + recuperación.
2. Expandir el compositor desde una capa a una escena con varias capas reales.
3. Integrar posición, escala, visibilidad y opacidad desde `Scene` hacia el compositor.
4. Conectar el mix de `AudioMixer` a una cola/pipeline de salida con timestamps.
5. Implementar encoder/FFmpeg supervisado con stderr y estado de proceso.
6. Implementar RTMP real con métricas, sincronización A/V y reconexión.
7. Evaluar encoder de hardware en el PC objetivo.
8. Validar en hardware: juego, micrófono, audio del sistema y recuperación ante pérdida de dispositivo.

## Regla de cierre

`compila` != `funciona`.

`CI verde` != `hardware validado`.

`API/documentación disponible` != `integración completa`.

`selección de ventana` != `game capture dedicado`.

`bridge CPU funcionando` != `compositor de producción`.

`una capa compuesta` != `escena multi-capa terminada`.

`bridge AudioMixer funcionando` != `pipeline A/V sincronizado`.

`recuperación implementada` != `recuperación validada en hardware`.

`comando FFmpeg válido` != `stream RTMP funcional`.
