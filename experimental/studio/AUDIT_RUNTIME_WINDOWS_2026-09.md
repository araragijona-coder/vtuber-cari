# Cari Studio — Auditoría cruzada Windows / multimedia

Fecha: 2026-09-16

## Estado de esta iteración

La rama de trabajo es `fix/native-windows-foundation`. `main` fue restaurada a la SHA base declarada por el PR (`ac7147d2696fd6c06015f7e61ac6f957bc9498db`) y la comparación vuelve a ser lineal: la rama de trabajo está por delante y 0 por detrás.

## Evidencia externa revisada

- Microsoft Learn — `Direct3D11CaptureFramePool`: `CreateFreeThreaded`, `TryGetNextFrame`, `Recreate` y ciclo de captura.
- Microsoft Learn — Screen capture: `Recreate` es el mecanismo recomendado cuando cambia el tamaño de buffers o se proporciona un nuevo dispositivo por pérdida/cambio del anterior; los frames existentes se descartan al recrear.
- Microsoft Learn — WASAPI loopback: `AUDCLNT_STREAMFLAGS_LOOPBACK` captura el audio que reproduce un endpoint de render y requiere shared mode.
- Microsoft Learn — `IAudioCaptureClient::GetBuffer` entrega posición del dispositivo y `QPCPosition` asociado al primer frame del paquete.
- Microsoft Learn — Application loopback sample (2026): Windows puede restringir la captura a un proceso concreto y sus hijos.
- OBS Studio documentation: separación conceptual entre Sources/Scenes y Outputs/Encoders/Services; el backend conserva audio temporalmente respecto del timestamp del hilo de audio y los outputs codificados esperan timestamps monotónicos.
- FFmpeg documentation: timestamps, modos de sincronización de vídeo (`passthrough/cfr/vfr`), pipes/raw inputs, reconexión, `tee` y FIFO, además de rutas de aceleración D3D11/QSV.

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

El core dispone de transforms básicos por `SceneLayer`:

- posición `x/y`;
- escala `scale_x/scale_y`;
- visibilidad;
- opacidad;
- `z_order`.

`SoftwareCompositor::compose_scene()` resuelve los `source_id` de una `Scene` y aplica esos transforms. El smoke test cubre escena multicapa + escalado.

Esto sigue siendo una referencia CPU funcional del contrato, no el compositor GPU final.

### Audio

```text
WASAPI microphone / system loopback
        ↓
AudioCapturePacket
        ↓ QPCPosition → 100 ns
core::AudioPacket
        ↓
AudioMixer track
```

Los timestamps de audio se obtienen desde `QPCPosition` de `IAudioCaptureClient::GetBuffer`; ante un timestamp marcado como inválido se hace fallback a QPC actual.

### A/V temporal — nuevo en esta iteración

Se añadió `core/av_sync.h` y el `StudioPipeline` ya no entrega inmediatamente cada cola por separado:

```text
video queue ─┐
             ├→ AvSyncController → interleave temporal → IOutput
audio queue ─┘
```

Características verificadas por smoke:

- audio como reloj maestro lógico;
- tolerancia de vídeo adelantado/atrasado configurable;
- ordenación por PTS para entradas fuera de orden;
- descarte explícito de vídeo demasiado atrasado;
- límites de cola y métricas de overflow;
- emisión intercalada de audio/vídeo.

Esto cierra el primer nivel de cola temporal A/V, pero **no** equivale todavía a sincronización final de producción: faltan reloj monotónico de salida, medición de drift sostenido, resampling/time-stretch cuando corresponda y validación con hardware real.

### CI del head actual

El commit `f48b00811c57e0e8fa86a9c43459490a3a3dca32` pasó los tres workflows relevantes:

- `CI` run **338** — `success`.
- `Character Runtime Tests` run **9** — `success`.
- `Native Windows Build` run **124** — `success`.

El workflow nativo verificó además que:

- CMake x64 configura correctamente;
- compilan `cari-studio-native` y `cari-core-smoke`;
- `cari-core-smoke` pasa;
- existe `cari-studio-native.exe`;
- se genera y sube `CariStudio-Windows-x64.zip`.

Esto valida el árbol y los contratos cubiertos por CI, **no** el hardware físico del PC objetivo.

### Salida

Continúa pendiente:

- supervisor FFmpeg;
- pipes de vídeo/audio reales;
- timestamps y reloj de salida de producción;
- reconexión RTMP real;
- encoder hardware/software real conectado al pipeline;
- elección de distribución legal de FFmpeg/codecs.

## Gates siguientes

1. Scene runtime con múltiples fuentes reales.
2. supervisor FFmpeg + captura de stderr + monitor de proceso.
3. pipe raw A/V real y timestamps de salida.
4. RTMP real + reconexión.
5. evaluación de encoder hardware en el PC objetivo.
6. prueba Windows real con juego + micrófono + audio sistema.
7. corrección de drift/resampling de producción cuando exista telemetría real.

## Reglas de cierre

`compila` != `funciona`.

`CI verde` != `hardware validado`.

`escena en smoke test` != `escena integrada al runtime`.

`timestamp WASAPI correcto` != `pipeline A/V sincronizado`.

`cola A/V funcional` != `drift correction de producción`.

`recuperación implementada` != `recuperación validada en hardware`.

`comando FFmpeg válido` != `stream RTMP funcional`.
