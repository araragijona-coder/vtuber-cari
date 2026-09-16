# Cari Studio — Auditoría cruzada Windows / multimedia

Fecha: 2026-09-16

## Estado de esta iteración

La rama de trabajo es `fix/native-windows-foundation`. Los cambios nuevos de esta iteración se mantienen en esa rama; `main` no debe recibir implementación experimental del Studio.

## Evidencia externa revisada

- Microsoft Learn — `Direct3D11CaptureFramePool`: `CreateFreeThreaded`, `TryGetNextFrame`, `Recreate` y ciclo de captura.
- Microsoft Learn — Screen capture: `Recreate` es el mecanismo recomendado cuando cambia el tamaño de buffers o se proporciona un nuevo dispositivo por pérdida/cambio del anterior; los frames existentes se descartan al recrear.
- Microsoft Learn — WASAPI loopback: `AUDCLNT_STREAMFLAGS_LOOPBACK` captura el audio que reproduce un endpoint de render y requiere shared mode.
- Microsoft Learn — `IAudioCaptureClient::GetBuffer` entrega posición del dispositivo y `QPCPosition` asociado al primer frame del paquete.
- Microsoft Learn — Application loopback sample (2026): Windows puede restringir la captura a un proceso concreto y sus hijos.
- OBS Studio documentation: separación conceptual entre Sources/Scenes y Outputs/Encoders/Services; Scene items con transforms.
- FFmpeg documentation: pipes/raw inputs, reconexión, `tee` y FIFO, además de rutas de aceleración D3D11/QSV.

## Estado verificado

### Captura de vídeo

- Windows Graphics Capture + D3D11.
- `CreateFreeThreaded`.
- selección de ventanas 1–9.
- bridge `CapturedFrame → core::Frame`.
- staging CPU BGRA8 como ruta de validación.
- recuperación explícita ante device removed/reset/hung.

### Compositor

La captura atraviesa:

```text
WGC → D3D11 → FrameBridge → core::Frame → BGRA8/RGBA8 → SoftwareCompositor
```

El core ahora dispone de transforms básicos por `SceneLayer`:

- posición `x/y`;
- escala `scale_x/scale_y`;
- visibilidad;
- opacidad;
- `z_order`.

`SoftwareCompositor::compose_scene()` resuelve los `source_id` de una `Scene` y aplica esos transforms. El smoke test cubre escena multicapa + escalado.

Esto es una referencia CPU funcional del contrato, no el compositor GPU final.

### Audio

```text
WASAPI microphone / system loopback
        ↓
AudioCapturePacket
        ↓
core::AudioPacket
        ↓
AudioMixer track
```

Además, los timestamps de audio se obtienen desde `QPCPosition` de `IAudioCaptureClient::GetBuffer` y se expresan en 100 ns; ante un timestamp marcado como inválido se hace fallback a QPC actual.

Esto mejora la base temporal común con el vídeo, pero no cierra todavía clock master, drift correction ni colas A/V.

### Salida

Continúa pendiente:

- supervisor FFmpeg;
- pipe de vídeo/audio real;
- timestamps y clock master de salida;
- reconexión;
- RTMP real;
- encoder hardware medido en PC objetivo.

### CI

La workflow Windows existe y compila CMake x64, ejecuta `cari-core-smoke`, verifica el `.exe` y empaqueta el ZIP. La última SHA todavía no tiene una ejecución visible en la API consultada; estado: `pendiente de CI`.

## Gates siguientes

1. CI Windows de escena/timestamps/recuperación.
2. Scene runtime con múltiples fuentes reales.
3. cola temporal A/V + clock master.
4. FFmpeg supervisado + stderr.
5. RTMP real + reconexión.
6. evaluación de encoder hardware.
7. prueba Windows real con juego + micrófono + audio sistema.

## Reglas de cierre

`compila` != `funciona`.

`CI verde` != `hardware validado`.

`escena en smoke test` != `escena integrada al runtime`.

`timestamp WASAPI correcto` != `pipeline A/V sincronizado`.

`recuperación implementada` != `recuperación validada en hardware`.

`comando FFmpeg válido` != `stream RTMP funcional`.
