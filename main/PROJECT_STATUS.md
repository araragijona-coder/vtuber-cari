# Cari Studio — estado de implementación

**Avance global:** 63% de ingeniería  
**Readiness:** NO listo para producción  
**Distribución principal:** `main/`  
**Rama de ingeniería:** `fix/native-windows-foundation` / PR #2

## Implementado
- Electron control plane con context isolation, preload explícito y sandbox.
- NativeEngine con correlación JSONL.
- Session manager con serialización/rollback/stop-only.
- Windows Graphics Capture para ventana y pantalla primaria.
- Enumeración y selección de ventanas.
- Recuperación de frame pool y device-loss handling.
- WASAPI microphone + system loopback.
- AudioTimelineMixer y normalización inicial.
- Voice DSP local `anime-bright`.
- MediaClock, RealtimePacer e interleaver A/V por PTS.
- LatestItemQueue + worker de captura.
- D3D11 compositor y avatar GPU placeholder.
- RawPipe OVERLAPPED y FFmpeg supervisor.
- Grabación local y RTMP/RTMPS directo.
- OutputRetryPolicy y clasificación de errores.
- MediaPipe Face Landmarker + mapping de blendshapes.
- Three.js + GLTF/GLB.
- OBS WebSocket opcional.

## Verificado en pruebas reproducibles
- contratos core/scheduler/retry/diagnostics;
- latest-frame queue;
- FFmpeg sintético BGRA + PCM float32 -> H.264/AAC -> Matroska;
- compositor D3D11 en WARP.

## Pendientes para cerrar producción
### P0
- CI Windows con steps/logs observables.
- E2E named-pipe -> FFmpeg -> archivo -> decode en Windows.
- Validación WGC worker + device-loss sobre Windows/hardware real.

### P1
- transporte PTS explícito extremo a extremo;
- eliminar readback CPU del camino final;
- integrar avatar real/neutral dentro del frame codificado;
- sincronización temporal del overlay.

### P2
- cámara Media Foundation sostenida;
- device clocks y drift correction;
- lip-sync avanzado.

### P3
- RTMP/RTMPS prolongado;
- caída real de red y validación del retry;
- Twitch/YouTube end-to-end.

### P4
- Game Capture;
- multistream;
- instalador firmado;
- empaquetado de assets;
- validación final del PC objetivo.

## Regla
Mover código a `main/` no equivale a validarlo. La promoción de un componente requiere evidencia apropiada. La única zona de cuarentena es `experimental/`.
