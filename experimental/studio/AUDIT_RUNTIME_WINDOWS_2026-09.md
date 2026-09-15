# Cari Studio — Auditoría cruzada Windows / multimedia

Fecha: 2026-09-15

## Evidencia externa revisada

- Microsoft Learn — `Direct3D11CaptureFramePool`: `CreateFreeThreaded`, `TryGetNextFrame`, `Recreate` y ciclo de captura.
- Microsoft Learn — Screen capture: recomienda `Recreate` cuando cambia el tamaño de buffers o se pierde/cambia el dispositivo; los frames pendientes se descartan al recrear.
- OBS Studio documentation: separación conceptual entre Sources/Scenes y Outputs/Encoders/Services.
- FFmpeg documentation: opciones de reconexión de protocolos y `tee` muxer para reutilizar una codificación en varios destinos.

## Estado verificado en el código

### Windows Graphics Capture

- `CreateFreeThreaded` está integrado.
- El callback de `FrameArrived` usa un `weak_ptr` para evitar depender de una instancia destruida durante el cierre.
- Se mide `frames`, `delivered`, `errors`, `fps`, resolución y número de `recreates`.
- Cuando `ContentSize()` cambia, el frame pool se recrea con el mismo dispositivo D3D11.
- La aplicación ya permite enumerar ventanas visibles y seleccionar una fuente entre las primeras nueve mediante las teclas `1` a `9`.

### Riesgo pendiente de dispositivo

La ruta actual todavía no reconstruye explícitamente el dispositivo D3D11 cuando el propio device es removido o queda inválido. Microsoft contempla `Recreate` también para cambios o pérdida de dispositivo. El código debe pasar una validación de hardware real antes de marcar esta parte como cerrada.

Gate pendiente:

- detectar `DXGI_ERROR_DEVICE_REMOVED`, `DXGI_ERROR_DEVICE_RESET` y equivalentes relevantes;
- reconstruir `ID3D11Device`/`IDirect3DDevice`;
- recrear el frame pool con el nuevo dispositivo;
- medir recuperaciones y errores;
- comprobar que la captura continúa sin reiniciar toda la aplicación.

### Fuentes / escenas

La arquitectura mantiene separadas las fuentes, escenas y la salida. Esto coincide conceptualmente con el modelo documentado por OBS y permite que la aplicación de Cari tenga su propia implementación nativa sin copiar OBS.

Todavía falta convertir la selección de fuente en un compositor visual real. La interfaz actual sigue siendo una superficie de diagnóstico y control, no el frontend final del estudio.

### Salida / streaming

Existe un contrato de `OutputProfile` y construcción de comando FFmpeg RTMP. Todavía no es un pipeline de salida real.

Gates pendientes:

- descubrimiento controlado del binario FFmpeg;
- proceso supervisado con captura de stderr;
- alimentación real de vídeo y audio al proceso;
- detección de caída del proceso;
- política de reconexión;
- prueba RTMP real en máquina Windows;
- decisión de redistribución/licencia de FFmpeg.

FFmpeg documenta opciones de reconexión y el muxer `tee`, pero su existencia no equivale a una integración completada en Cari Studio.

## CI

El proyecto tiene:

- CI Python para producción/experimental;
- CI separado para el runtime de personajes;
- CI nativo Windows para CMake, smoke test y empaquetado x64.

El último SHA trabajado en esta rama todavía no presenta una ejecución de workflow visible a través de la API consultada. Por tanto, no se marca como verde hasta obtener evidencia.

## Regla de cierre

`compila` != `funciona`.

`CI verde` != `hardware validado`.

`API/documentación disponible` != `integración completa`.

`selección de ventana` != `game capture dedicado`.

`comando FFmpeg válido` != `stream RTMP funcional`.
