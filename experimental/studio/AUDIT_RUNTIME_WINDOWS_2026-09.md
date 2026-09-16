# Cari Studio — Auditoría cruzada Windows / multimedia

Fecha: 2026-09-16

## Estado de esta iteración

La rama de trabajo es `fix/native-windows-foundation`. `main` fue restaurada a la SHA base declarada por el PR (`ac7147d2696fd6c06015f7e61ac6f957bc9498db`). La última ronda de CI totalmente verde corresponde al head de código `f48b00811c57e0e8fa86a9c43459490a3a3dca32`; desde entonces se añadió supervisión de procesos/stderr y esa nueva capa todavía debe pasar CI.

## Evidencia externa revisada

- Microsoft Learn — `Direct3D11CaptureFramePool`: `CreateFreeThreaded`, `TryGetNextFrame`, `Recreate` y ciclo de captura.
- Microsoft Learn — Screen capture: `Recreate` es el mecanismo recomendado cuando cambia el tamaño de buffers o se proporciona un nuevo dispositivo por pérdida/cambio del anterior; los frames existentes se descartan al recrear.
- Microsoft Learn — WASAPI loopback: `AUDCLNT_STREAMFLAGS_LOOPBACK` captura el audio que reproduce un endpoint de render y requiere shared mode.
- Microsoft Learn — `IAudioCaptureClient::GetBuffer` entrega posición del dispositivo y `QPCPosition` asociado al primer frame del paquete.
- Microsoft Learn — Application loopback sample (2026): Windows puede restringir la captura a un proceso concreto y sus hijos.
- OBS Studio documentation: separación conceptual entre Sources/Scenes y Outputs/Encoders/Services; el backend conserva audio temporalmente respecto del timestamp del hilo de audio y los outputs codificados esperan timestamps monotónicos.
- FFmpeg documentation: timestamps, modos de sincronización de vídeo (`passthrough/cfr/vfr`), pipes/raw inputs, `tee`, FIFO y reconexión.
- FFmpeg licensing documentation: la base es LGPL 2.1+; determinados componentes opcionales pueden activar GPL u otras condiciones, por lo que la redistribución de un binario concreto debe auditarse junto con su configuración de build. citeturn101164search0turn101164search1

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

### A/V temporal

`core/av_sync.h` está integrado en `StudioPipeline`:

```text
video queue ─┐
             ├→ AvSyncController → interleave temporal → IOutput
audio queue ─┘
```

El smoke cubre audio como reloj maestro lógico, tolerancias, PTS fuera de orden, late-drop y límites de cola.

Esto sigue siendo el primer nivel de sincronización temporal: faltan reloj monotónico de salida, medición de drift sostenido, resampling/time-stretch y validación en hardware real.

### Supervisión de procesos — nueva etapa

`ProcessRunner` ahora tiene dos modos:

1. ejecución normal;
2. ejecución con captura de `stderr` mediante pipe no bloqueante para sondeo.

La API conserva el ciclo local `start → wait/terminate`, y la lectura de stderr queda explícita para que una futura instancia de FFmpeg pueda reportar errores reales sin acoplar la UI a texto de consola.

El smoke nativo incluye un proceso `cmd.exe` que escribe en stderr y verifica que el texto se puede drenar tras su terminación. El EOF limpio de la tubería se trata como fin normal del stream.

Todavía pendiente:

- supervisión específica de FFmpeg;
- clasificación de líneas `info/warn/error`;
- política de reinicio/backoff;
- health state de output;
- reconexión RTMP.

### CI de referencia

El head de código `f48b00811c57e0e8fa86a9c43459490a3a3dca32` pasó:

- `CI` run 338 — success.
- `Character Runtime Tests` run 9 — success.
- `Native Windows Build` run 124 — success, incluyendo build, `cari-core-smoke`, exe y ZIP.

La nueva capa de `stderr` está en commits posteriores y por eso vuelve a requerir una ronda de CI propia.

## Gates siguientes

1. CI Windows de `ProcessRunner` + stderr capture.
2. supervisor FFmpeg con stderr/logs y estado de proceso.
3. pipe raw A/V real y timestamps de salida.
4. RTMP real + reconexión.
5. Scene runtime con múltiples fuentes reales.
6. evaluación de encoder hardware en el PC objetivo.
7. prueba Windows real con juego + micrófono + audio sistema.
8. corrección de drift/resampling cuando exista telemetría real.

## Reglas de cierre

`compila` != `funciona`.

`CI verde` != `hardware validado`.

`escena en smoke test` != `escena integrada al runtime`.

`timestamp WASAPI correcto` != `pipeline A/V sincronizado`.

`cola A/V funcional` != `drift correction de producción`.

`stderr capture` != `FFmpeg supervisor completo`.

`comando FFmpeg válido` != `stream RTMP funcional`.
