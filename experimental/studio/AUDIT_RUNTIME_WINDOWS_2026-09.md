# Cari Studio — Auditoría cruzada Windows / multimedia

Fecha: 2026-09-16

## Estado de esta iteración

La rama de trabajo es `fix/native-windows-foundation`. `main` fue restaurada a la SHA base declarada por el PR (`ac7147d2696fd6c06015f7e61ac6f957bc9498db`).

La ronda CI anterior sobre `f48b00811c57e0e8fa86a9c43459490a3a3dca32` quedó completamente verde. Después se añadió una frontera supervisada específica para FFmpeg y esta nueva iteración requiere su propia ronda de CI.

## Evidencia externa revisada

- Microsoft Learn — `Direct3D11CaptureFramePool`: `CreateFreeThreaded`, `TryGetNextFrame`, `Recreate` y ciclo de captura.
- Microsoft Learn — Screen capture: `Recreate` es el mecanismo recomendado cuando cambia el tamaño de buffers o se proporciona un nuevo dispositivo por pérdida/cambio del anterior; los frames existentes se descartan al recrear.
- Microsoft Learn — WASAPI loopback: `AUDCLNT_STREAMFLAGS_LOOPBACK` captura el audio que reproduce un endpoint de render y requiere shared mode.
- Microsoft Learn — `IAudioCaptureClient::GetBuffer` entrega posición del dispositivo y `QPCPosition` asociado al primer frame del paquete.
- Microsoft Learn — Application loopback sample (2026): Windows puede restringir la captura a un proceso concreto y sus hijos.
- Microsoft Learn — anonymous/named pipes: `CreatePipe`, `PeekNamedPipe`, `ReadFile` y modos overlapped establecen los límites de un canal de proceso que no bloquee el hilo principal. citeturn539768search0turn539768search2turn539768search3
- OBS Studio documentation: separación conceptual entre Sources/Scenes y Outputs/Encoders/Services; los outputs pueden consumir datos raw o encoded y los paquetes llevan PTS/DTS explícitos. citeturn539768search9turn539768search10turn539768search13
- FFmpeg documentation: `tee` permite codificar una vez para varias salidas y `fifo` separa encoding/muxing y permite recuperación configurable cuando una salida falla. citeturn539768search7turn539768search1
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

### Supervisión de procesos / FFmpeg — nueva etapa

`ProcessRunner` dispone de un modo de ejecución con captura de `stderr` mediante pipe local y sondeo sin bloqueo.

Se añadió además `FfmpegSupervisor`, que encapsula:

- validación del `OutputProfile` antes de iniciar;
- construcción de argumentos FFmpeg desde el contrato de salida;
- arranque controlado del proceso;
- polling del estado del proceso;
- acumulación de `stderr` para diagnóstico;
- código de salida;
- parada controlada.

También existe un smoke dedicado que no contacta ningún servicio remoto: comprueba la frontera de validación y el fallo determinista de ejecutable ausente.

**Todavía no se marca como verificado por CI** hasta observar el nuevo workflow Windows.

La supervisión tampoco equivale todavía a streaming real. Faltan:

- descubrimiento/política del binario FFmpeg;
- pipe raw de vídeo conectado al proceso;
- ruta de audio separada y sincronizada;
- muxer/encoder real probado;
- clasificación estructurada de logs;
- backoff/restart;
- health state de output;
- reconexión RTMP.

## CI de referencia

Head anterior `f48b00811c57e0e8fa86a9c43459490a3a3dca32`:

- `CI` run 338 — success.
- `Character Runtime Tests` run 9 — success.
- `Native Windows Build` run 124 — success, incluyendo build, `cari-core-smoke`, exe y ZIP.

La nueva capa `FfmpegSupervisor` está en commits posteriores y requiere su propia ronda de CI.

## Gates siguientes

1. CI Windows del supervisor FFmpeg + smoke dedicado.
2. pipe raw A/V real y timestamps de salida.
3. encoder/muxer real.
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

`FFmpeg supervisor` != `stream RTMP funcional`.
