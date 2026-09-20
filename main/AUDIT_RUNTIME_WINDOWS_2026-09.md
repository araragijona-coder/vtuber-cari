# Cari Studio — Auditoría cruzada Windows / multimedia

Fecha: 2026-09-16

## Estado de esta iteración

La rama de trabajo es `fix/native-windows-foundation`. `main` fue restaurada a la SHA base declarada por el PR (`ac7147d2696fd6c06015f7e61ac6f957bc9498db`).

La ronda CI anterior quedó verde. Esta iteración añadió transporte raw Windows y endureció el workflow para que el transporte tenga un smoke específico; el nuevo `Native Windows Build` run **147** está actualmente en ejecución sobre el commit de código `229f03ba0ac644b67f6aa730b365ea0fc8851846`.

## Evidencia externa revisada

- Microsoft Learn — `Direct3D11CaptureFramePool`: `CreateFreeThreaded`, `TryGetNextFrame`, `Recreate` y ciclo de captura.
- Microsoft Learn — Screen capture: `Recreate` es el mecanismo recomendado cuando cambia el tamaño de buffers o se proporciona un nuevo dispositivo por pérdida/cambio del anterior; los frames existentes se descartan al recrear.
- Microsoft Learn — WASAPI loopback: `AUDCLNT_STREAMFLAGS_LOOPBACK` captura el audio que reproduce un endpoint de render y requiere shared mode.
- Microsoft Learn — `IAudioCaptureClient::GetBuffer` entrega posición del dispositivo y `QPCPosition` asociado al primer frame del paquete.
- Microsoft Learn — Application loopback sample (2026): Windows puede restringir la captura a un proceso concreto y sus hijos.
- Microsoft Learn — named pipes / overlapped I/O: `CreateNamedPipe`, `ConnectNamedPipe`, `WriteFile`, `GetOverlappedResult` y `CancelIoEx` permiten construir un canal asíncrono sin bloquear el productor. citeturn929096search0turn929096search3turn929096search5turn929096search9
- OBS Studio documentation: separación conceptual entre Sources/Scenes y Outputs/Encoders/Services; los outputs pueden consumir datos raw o encoded. citeturn929096search12turn929096search13
- FFmpeg documentation: `ffmpeg` acepta múltiples inputs y `-map` permite seleccionar los streams que alimentan cada output; su documentación de protocolos distingue `pipe` y `file`, con tratamiento de recursos no seekable como named pipes. citeturn851326search2turn851326search0
- FFmpeg `tee`/`fifo`: siguen siendo referencias para la etapa posterior de fan-out y tolerancia a fallos de outputs.
- FFmpeg licensing documentation: la base es LGPL 2.1+; determinados componentes opcionales pueden activar GPL u otras condiciones, por lo que la redistribución de un binario concreto debe auditarse junto con su configuración de build.

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

El core dispone de transforms básicos por `SceneLayer`: posición, escala, visibilidad, opacidad y `z_order`.

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

### Supervisión de procesos / FFmpeg

`ProcessRunner` dispone de un modo de ejecución con captura de `stderr` mediante pipe local y sondeo sin bloqueo.

`FfmpegSupervisor` encapsula validación de `OutputProfile`, construcción de argumentos, arranque, polling, `stderr`, código de salida y parada controlada.

El workflow conserva un smoke dedicado para ese supervisor, sin acceso a servicios remotos.

**No se considera streaming real todavía.** El perfil FFmpeg sigue construyendo una entrada raw de vídeo por `stdin` y no tiene aún una segunda entrada de audio conectada.

### Transporte raw Windows — nueva etapa

`RawPipe` introduce un canal byte-to-process con:

- `CreateNamedPipeW(... PIPE_ACCESS_OUTBOUND | FILE_FLAG_OVERLAPPED ...)`;
- `ConnectNamedPipe` asíncrono;
- `WriteFile` asíncrono;
- estructuras `OVERLAPPED` persistentes mientras la operación está pendiente;
- cola acotada en memoria;
- métrica de bytes completados, escrituras pendientes, descartes y errores;
- `CancelIoEx` durante cierre.

El smoke `cari-raw-pipe-smoke` levanta un cliente Windows real, conecta al pipe, envía un payload y verifica los bytes recibidos y las métricas del escritor.

El transporte ya está integrado en el ejecutable nativo y en CMake. El workflow ahora lo ejecuta explícitamente; la conclusión de run 147 será la evidencia requerida para marcarlo como **verificado**.

## CI de referencia

Head anterior con la base nativa: `f48b00811c57e0e8fa86a9c43459490a3a3dca32`.

Nueva ronda:

- `Native Windows Build` run 147 — **in_progress** al redactar esta auditoría.
- `Character Runtime Tests` run 32 — **in_progress** al redactar esta auditoría.
- `CI` run 361 — **in_progress** al redactar esta auditoría.

No se marca ninguno como `success` hasta que GitHub devuelva una conclusión final.

## Gates siguientes

1. cerrar run 147 y verificar el nuevo smoke de transporte;
2. conectar vídeo BGRA al `RawPipe`;
3. conectar audio PCM a un segundo canal/entrada;
4. definir timestamps A/V y mapeo explícito en FFmpeg;
5. prueba local con FFmpeg real y archivo de salida;
6. encoder/muxer real;
7. RTMP real + reconexión/backoff;
8. Scene runtime con múltiples fuentes reales;
9. evaluación de encoder hardware en el PC objetivo;
10. prueba Windows real con juego + micrófono + audio sistema;
11. corrección de drift/resampling cuando exista telemetría real.

## Reglas de cierre

`compila` != `funciona`.

`CI verde` != `hardware validado`.

`escena en smoke test` != `escena integrada al runtime`.

`timestamp WASAPI correcto` != `pipeline A/V sincronizado`.

`cola A/V funcional` != `drift correction de producción`.

`RawPipe smoke` != `FFmpeg input conectado`.

`FFmpeg supervisor` != `stream RTMP funcional`.
