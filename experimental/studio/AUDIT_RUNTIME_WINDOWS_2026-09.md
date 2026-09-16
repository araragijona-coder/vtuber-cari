# Cari Studio — Auditoría cruzada Windows / multimedia

Fecha: 2026-09-16

## Evidencia externa revisada

- Microsoft Learn — `Direct3D11CaptureFramePool`: `CreateFreeThreaded`, `TryGetNextFrame`, `Recreate` y ciclo de captura.
- Microsoft Learn — Screen capture: `Recreate` es el mecanismo recomendado cuando cambia el tamaño de buffers o se proporciona un nuevo dispositivo por pérdida/cambio del anterior; los frames existentes se descartan al recrear.
- Microsoft Learn — WASAPI loopback: `AUDCLNT_STREAMFLAGS_LOOPBACK` captura el audio que reproduce un endpoint de render y requiere shared mode; Windows 10 1703+ soporta loopback con event-driven buffering.
- Microsoft Learn — `IAudioCaptureClient::GetBuffer` entrega la posición del dispositivo y un `QPCPosition` asociado al primer frame del paquete; ese timestamp puede usarse para sincronización temporal de la captura.
- Microsoft Learn — Application loopback sample (2026): Windows también puede restringir la captura de audio a un proceso concreto y sus hijos, lo que queda como candidato para separar audio del juego de otras aplicaciones.
- OBS Studio documentation: separación conceptual entre Sources/Scenes y Outputs/Encoders/Services; las scene items poseen posición, escala, visibilidad y otras transformaciones.
- FFmpeg documentation: entradas por pipes, `rawvideo`, reconexión de protocolos, `tee` muxer para reutilizar una codificación en varios destinos y FIFO para aislar velocidad/latencia de outputs.
- FFmpeg hardware acceleration: D3D11VA/QSV y codificación por Media Foundation como rutas candidatas que deben medirse en el hardware objetivo.

Referencias externas consultadas:

- https://learn.microsoft.com/en-us/uwp/audio-video-camera/screen-capture
- https://learn.microsoft.com/en-us/windows/win32/coreaudio/loopback-recording
- https://learn.microsoft.com/en-us/windows/win32/api/audioclient/nf-audioclient-iaudiocaptureclient-getbuffer
- https://learn.microsoft.com/en-us/windows/win32/api/audioclient/nf-audioclient-iaudioclock-getposition
- https://learn.microsoft.com/en-us/samples/microsoft/windows-classic-samples/applicationloopbackaudio-sample/
- https://docs.obsproject.com/frontends
- https://docs.obsproject.com/reference-scenes
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

### Bridge y compositor

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

El core ahora también modela transforms básicos de escena por layer:

- `x`, `y`;
- `scale_x`, `scale_y`;
- `visible`;
- `opacity`;
- `z_order`.

`SoftwareCompositor::compose_scene()` toma una `Scene`, resuelve sus `source_id` contra las capas disponibles y aplica esos transforms antes de componer. El smoke test cubre la ruta de escena multicapa y escalado.

Esto ya demuestra una **escena multicapa de referencia**, pero no demuestra todavía un compositor de producción ni una ruta GPU/directa sin readback a CPU.

### Audio WASAPI → core

El runtime dispone de captura WASAPI separada para micrófono y loopback del sistema. El loopback usado por esta implementación corresponde al mecanismo documentado por Microsoft: endpoint de render, `AUDCLNT_STREAMFLAGS_LOOPBACK` y shared mode. Windows 10 1703+ admite este flujo en modo event-driven.

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
- actualiza tracks independientes `microphone` y `system` del `AudioMixer`;
- contabiliza callbacks, paquetes, muestras, errores y pico observado;
- expone el pico del mix al diagnóstico nativo;
- la tecla `A` permite iniciar/detener la captura de audio en el ejecutable diagnóstico.

### Timestamps de audio y base temporal A/V

Se corrigió la fuente de timestamps del bridge WASAPI. En lugar de usar el reloj del hilo de captura como timestamp primario, `IAudioCaptureClient::GetBuffer` solicita `pu64QPCPosition` para el primer frame del paquete. WASAPI entrega ese contador convertido a unidades de 100 ns; si el timestamp está marcado como inválido mediante `AUDCLNT_BUFFERFLAGS_TIMESTAMP_ERROR`, se usa como fallback una lectura actual de `QueryPerformanceCounter` convertida a la misma unidad.

Esto pone los paquetes de audio en una base temporal compatible con una futura sincronización A/V centralizada. No significa que la sincronización A/V final esté terminada: todavía falta una política de clock master, colas temporales y adaptación ante drift/dropped frames.

### Candidato futuro: audio por proceso

La muestra oficial de Microsoft publicada en febrero de 2026 demuestra que Windows puede restringir el loopback a un proceso concreto y sus hijos, o excluirlos del capture. Esto es especialmente relevante para Cari Studio porque permitiría, en una fase posterior, separar el audio del juego de otras aplicaciones del sistema sin depender únicamente de mezclar todo el endpoint. No se considera implementado todavía.

### Fuentes / escenas

La separación conceptual de Cari Studio sigue el patrón documentado por OBS: Sources alimentan Scenes y la composición queda separada de Outputs/Encoders/Services. Las scene items de OBS exponen transformaciones como posición y escala; Cari Studio implementa sólo el subconjunto necesario para su compositor de referencia, sin copiar libobs.

### Salida / streaming

Existe un contrato de `OutputProfile` y construcción de comando FFmpeg RTMP. Todavía no es un pipeline de salida real.

FFmpeg documenta entradas mediante pipes y formatos raw, de modo que el diseño `core → proceso FFmpeg` es técnicamente viable sin exigir una API externa. También documenta el `tee` muxer para enviar los mismos paquetes codificados a varios destinos sin repetir la codificación y `fifo` para aislar diferencias de velocidad/latencia entre outputs.

Gates pendientes:

- descubrimiento controlado del binario FFmpeg;
- proceso supervisado con captura de stderr;
- alimentación real de vídeo y audio;
- clock master y sincronización A/V basada en timestamps;
- detección de caída del proceso;
- política de reconexión propia de Cari Studio;
- prueba RTMP real en máquina Windows;
- decisión de redistribución/licencia de FFmpeg;
- evaluación medida de encoder por hardware frente a CPU.

### Encoder / hardware acceleration

La investigación actual mantiene abiertas varias rutas de implementación: FFmpeg con D3D11/QSV, codificación Media Foundation y otros encoders disponibles en Windows. La elección definitiva debe basarse en pruebas del PC objetivo: consumo de GPU/CPU, latencia, estabilidad, compatibilidad del encoder y coste de copiar frames entre GPU y RAM.

### CI

El proyecto tiene:

- CI Python para producción/experimental;
- CI separado para el runtime de personajes;
- CI nativo Windows para CMake, smoke test y empaquetado x64.

Los últimos cambios de escena, compositor y timestamps de audio requieren una nueva ejecución del workflow Windows. Mediante la API consultada todavía no hay evidencia suficiente para marcar el nuevo estado como verde.

### Gates técnicos siguientes

1. Obtener ejecución CI Windows del compositor + timestamps WASAPI + recuperación.
2. Conectar `Scene` real con múltiples fuentes del runtime, no sólo con el smoke test.
3. Sustituir progresivamente el readback CPU por una ruta GPU/directa cuando el compositor real lo necesite.
4. Conectar el mix de `AudioMixer` a una cola/pipeline de salida con timestamps y clock master.
5. Implementar encoder/FFmpeg supervisado con stderr y estado de proceso.
6. Implementar RTMP real con métricas, sincronización A/V y reconexión.
7. Evaluar encoder de hardware en el PC objetivo.
8. Evaluar captura de audio por proceso para juegos/aplicaciones concretas.
9. Validar en hardware: juego, micrófono, audio del sistema y recuperación ante pérdida de dispositivo.

## Regla de cierre

`compila` != `funciona`.

`CI verde` != `hardware validado`.

`API/documentación disponible` != `integración completa`.

`selección de ventana` != `game capture dedicado`.

`bridge CPU funcionando` != `compositor de producción`.

`escena multicapa en smoke test` != `escena multicapa integrada al runtime`.

`timestamp WASAPI correcto` != `pipeline A/V sincronizado`.

`recuperación implementada` != `recuperación validada en hardware`.

`comando FFmpeg válido` != `stream RTMP funcional`.
