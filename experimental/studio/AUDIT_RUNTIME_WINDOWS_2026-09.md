# Cari Studio — Auditoría cruzada Windows / multimedia

Fecha: 2026-09-15

## Evidencia externa revisada

- Microsoft Learn — `Direct3D11CaptureFramePool`: `CreateFreeThreaded`, `TryGetNextFrame`, `Recreate` y ciclo de captura.
- Microsoft Learn — Screen capture: recomienda `Recreate` cuando cambia el tamaño de buffers o se pierde/cambia el dispositivo; los frames pendientes se descartan al recrear.
- OBS Studio documentation: separación conceptual entre Sources/Scenes y Outputs/Encoders/Services.
- FFmpeg documentation: opciones de reconexión de protocolos, `tee` muxer para reutilizar una codificación en varios destinos y dispositivos D3D11 para aceleración.

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
- La captura sigue siendo una prueba de fuente real, no todavía un compositor final.

### Riesgo pendiente de dispositivo

La ruta actual todavía no reconstruye explícitamente el dispositivo D3D11 cuando el propio device es removido o queda inválido. Microsoft contempla `Recreate` también para cambios o pérdida de dispositivo. El código debe pasar una validación de hardware real antes de marcar esta parte como cerrada.

Gate pendiente:

- detectar `DXGI_ERROR_DEVICE_REMOVED`, `DXGI_ERROR_DEVICE_RESET` y equivalentes relevantes;
- reconstruir `ID3D11Device`/`IDirect3DDevice`;
- recrear el frame pool con el nuevo dispositivo;
- medir recuperaciones y errores;
- comprobar que la captura continúa sin reiniciar toda la aplicación.

### Fuentes / escenas

La arquitectura mantiene separadas las fuentes, escenas y la salida. Esto coincide conceptualmente con el modelo documentado por OBS, que trata Sources/Scenes como la composición del contenido y separa Outputs/Encoders/Services del escenario.

Todavía falta convertir la selección de fuente en un compositor visual real.

### Salida / streaming

Existe un contrato de `OutputProfile` y construcción de comando FFmpeg RTMP. Todavía no es un pipeline de salida real.

Gates pendientes:

- descubrimiento controlado del binario FFmpeg;
- proceso supervisado con captura de stderr;
- alimentación real de vídeo y audio al proceso;
- detección de caída del proceso;
- política de reconexión;
- prueba RTMP real en máquina Windows;
- decisión de redistribución/licencia de FFmpeg;
- evaluación de ruta de encoder por hardware (por ejemplo D3D11/QSV/MF) frente a CPU.

FFmpeg documenta reconexión y dispositivos `d3d11va`, y su muxer `tee` permite enviar una misma codificación a varios destinos. Eso sirve como referencia de diseño, pero no equivale a una integración completada en Cari Studio.

### Comparación de arquitectura

La arquitectura objetivo de Cari Studio conserva una separación equivalente, pero más pequeña y controlada:

```text
Sources
  ↓
Scenes / Composer
  ↓
Audio + Video program
  ↓
Encoder
  ↓
Outputs
```

No se copiará OBS internamente. OBS se usa como referencia de contratos y comportamiento observable; la implementación nativa sigue siendo propia.

## CI

El proyecto tiene:

- CI Python para producción/experimental;
- CI separado para el runtime de personajes;
- CI nativo Windows para CMake, smoke test y empaquetado x64.

El último SHA trabajado en esta rama todavía no presenta una ejecución de workflow visible a través de la API consultada. Por tanto, no se marca como verde hasta obtener evidencia.

## Próximos gates técnicos

1. Compositor real que consuma la fuente seleccionada y permita al menos una escena con varias capas.
2. Puente de la captura nativa hacia `Frame` del core sin copiar innecesariamente más de lo requerido.
3. Audio WASAPI → `AudioPacket` → `AudioMixer` real.
4. Encoder real → proceso FFmpeg supervisado.
5. Output RTMP real con métricas, stderr y reconexión.
6. Prueba de hardware Windows con juego, micrófono, audio del sistema y caída/reanudación de captura.

## Regla de cierre

`compila` != `funciona`.

`CI verde` != `hardware validado`.

`API/documentación disponible` != `integración completa`.

`selección de ventana` != `game capture dedicado`.

`comando FFmpeg válido` != `stream RTMP funcional`.
