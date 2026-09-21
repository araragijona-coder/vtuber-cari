## 2026-09-21 — OBS Companion

- Se auditó el escenario con OBS como streamer principal.
- Se confirma que Cari no debe duplicar encoder/mux/RTMP de OBS en modo companion.
- ObsService incorpora mute/volume, Scene Items, Replay Buffer, batch transition y reconexión WebSocket acotada.
- Se corrigió el envelope de eventos para que el renderer preserve obs.event y reciba eventType.
- OBS_USAGE_AUDIT.md documenta MUST/SHOULD/NICE TO HAVE y los gates de validación real.
- Progreso canónico sin cambio: Ingeniería ~71%, Producto usable ~58%, Seguimiento ~65.

## 2026-09-21 — Continuidad automática

- Se añadió `tools/verify_bitacora.py` para validar la memoria de ingeniería y evitar divergencias documentales.
- Se añadieron tests y ejecución desde CI.
- No modifica el porcentaje del producto: Ingeniería ~71%, Producto usable ~58%, Seguimiento ~65%.

## 2026-09-21 — Status de cámara activa

- El status nativo ahora reporta frames/FPS/errores de la fuente activa Media Foundation cuando corresponde.
- WGC conserva sus métricas para ventana/pantalla.
- Estado: corrección de coherencia; validación Windows pendiente.

## 2026-09-21 — PTS Libav

- Se ampliaron métricas de paquetes codificados con primer PTS de audio y vídeo.
- El audio reancla su reloj de samples cuando el FIFO queda vacío, usando el PTS explícito del siguiente paquete.
- El smoke de Libav ahora verifica límites de PTS de paquetes codificados.
- Estado: PTS E2E experimental, pendiente de validación Windows.

# Cari Studio — Engineering Changelog

> La bitácora de continuidad canónica es experimental/studio/BITACORA.md.

## 2026-09-21

### Continuidad
- Sincronizado el checkpoint con PROJECT_STATUS.md.
- La cifra vigente pasa a ser Ingeniería ~68%, Producto usable ~54%, Seguimiento global ~62%.
- Se mantiene la regla de NO REPETIR para componentes ya implementados.

### VTuber / arte
- Se documenta Cari V1 como nueva dirección artística independiente del runtime.
- El arte V0 se mantiene como fallback funcional; no se considera arte final.
- Se documentan requisitos de silueta, legibilidad, rigging, expresiones y compatibilidad 2D/3D.
- La demo conceptual se clasifica como referencia artística y no como validación del runtime.

### Ingeniería
- Se mantiene la separación Electron control-plane / C++ media-plane.
- Se mantiene Three.js/glTF/VRM como ruta 3D actual y Live2D como adapter opcional.
- No se crea un segundo tracker, scheduler, renderer ni supervisor FFmpeg.

## 2026-09-21 — Continuidad y arte

- Se confirma BITACORA.md como memoria canónica.
- El estado vigente se mantiene en Ingeniería ~71%, Producto usable ~58%, Seguimiento ~65%.
- Se corrige la dirección artística V1 para respetar las restricciones canónicas de CARI_CHARACTER_BIBLE.md.
- Se elimina la deriva hacia prendas y accesorios no definidos.
- Se eleva el fallback procedural Three.js con iluminación de presentación, materiales toon, ojos/iris/pupilas, mechones frontales y lectura atlética.
- El fallback sigue clasificado como CODE_EXISTS, no como asset de producción.
- Se añade ART_QUALITY_GATE.md.

## Regla
No usar cantidad de commits, archivos o líneas como medida de progreso. El porcentaje depende de implementación, pruebas, validación y riesgo residual.

## 2026-09-21 — P0-P3 continuity

- Se fija el backlog ejecutivo P0 > P1 > P2 > P3 y se añade a BITACORA.md como memoria anti-repetición.
- Se confirma Ingeniería ~71%, Producto usable ~58%, Seguimiento ~65% como checkpoint vigente.
- Se elimina la dependencia de use_wallclock_as_timestamps del camino raw de FFmpeg; la ruta Libav queda como candidata para PTS explícitos E2E.
- Se documenta que V0/placeholder no es el asset Cari V1 final.


## 2026-09-21 — Asset registry + GPU research

- Se añade frontera declarativa para modelos de avatar GLB/GLTF.
- Se valida el asset antes de cargarlo en el overlay.
- Test portable: PASS.
- Investigación oficial registrada para MediaPipe LIVE_STREAM y FFmpeg D3D11/NVENC.
- El camino GPU directo sigue experimental y no está validado en Windows/hardware.
- Porcentaje canónico sin incremento: Ingeniería ~71%, Producto usable ~58%, Seguimiento ~65%.

## 2026-09-21 — Runner evidence LOG-030

- Se registra evidencia actual de GitHub Actions con jobs que fallan antes de registrar steps/logs, incluido el job probe del workflow diagnóstico.
- Se mantiene CI como bloqueado por infraestructura.
- No se modifica el porcentaje canónico: Ingeniería ~71%, Producto usable ~58%, Seguimiento ~65%.

## 2026-09-21 — LOG-031 continuidad GPU/CI

- Se reconcilia la documentación con el estado vivo del proyecto.
- El porcentaje permanece en Ingeniería ~71%, Producto usable ~58%, Seguimiento ~65%.
- Se registra investigación oficial de FFmpeg D3D11 hardware frames y Microsoft D3D11 shared resources.
- Se mantiene la ruta D3D11Compositor como única implementación GPU; no se crea renderer paralelo.
- Se mantiene Libav como ruta experimental para PTS explícitos.
- CI continúa bloqueada sin steps/logs observables.
- Nuevo siguiente foco: eliminar readback CPU por frame en la ruta GPU y conseguir E2E Windows observable.

## 2026-09-21 — LOG-032 GPU -> encoder
- Se añadió D3D11AvFrameBridge y smoke experimental de encoder hardware.
- FFmpeg API research confirma hw_frames_ctx, AV_PIX_FMT_D3D11 y AVCodecHWConfig como base del camino.
- Estado: experimental; Windows, GPU/driver y encoder real pendientes.
- Progreso canónico se mantiene en Ingeniería ~71%, Producto usable ~58%, Seguimiento ~65%.

## 2026-09-21 — Output resilience
- Se añadió retry RTMP con backoff acotado.
- Se añadió clasificación de errores para no reintentar indiscriminadamente fallos de encoder/mux/input.
- Se añadió smoke de retry y diagnóstico.
- Estado: experimental; no validado contra red/RTMP real.

## 2026-09-21 — D3D11 → Libav hardware
- Se integró el bridge D3D11 existente en `LibavMediaOutput`.
- Se añadió API de salida hardware y smoke A/V dedicado.
- El camino evita readback CPU en la entrega de textura al encoder.
- Estado: experimental; requiere FFmpeg development build + Windows/GPU real.
- Porcentaje canónico sin cambio: Ingeniería ~71%, Producto usable ~58%, Seguimiento ~65%.


## 2026-09-21 — LOG-035 continuity checkpoint
- Se documenta el bloqueo persistente de GitHub Actions sin steps/logs.
- Se documenta la divergencia histórica creciente de la rama sin reescribir commits.
- Se mantiene Ingeniería ~71%, Producto usable ~58%, Seguimiento ~65%.
- Próximo foco: validación Windows de Libav + D3D11 hardware y E2E observable.


## 2026-09-21 — LOG-039 continuity

- Se actualiza la bitácora canónica con el estado de OutputRetryPolicy, clasificación de errores y cobertura CI explícita para los smoke de resiliencia.
- No se crean subsistemas paralelos ni se reabren componentes marcados como NO REPETIR.
- Progreso canónico: Ingeniería ~71%, Producto usable ~58%, Seguimiento ~65%.

## 2026-09-21 — LOG-040 CI evidence

- Se registra la evidencia de ejecución en HEAD eab7897a5c971a64acc9c31cdf5c4557ffaf4b8f.
- Native Windows, CI, Character Runtime y Runner Diagnostic continúan terminando sin steps/logs.
- No se incrementa el porcentaje por este bloqueo.
- Progreso canónico: Ingeniería ~71%, Producto usable ~58%, Seguimiento ~65%.

## 2026-09-21 — LOG-041 continuity validator
- Se consolida experimental/studio/tools/verify_bitacora.py como validator canónico.
- tools/verify_bitacora.py queda como wrapper de compatibilidad.
- Se añaden tests unittest reales para validez, duplicación de LOG, deriva de porcentajes y deriva de HEAD.
- CI ejecuta el validator y la suite específica de continuidad.
- Se mantiene sin cambios el porcentaje canónico: Ingeniería ~71%, Producto usable ~58%, Seguimiento ~65%.
- No se añade ninguna implementación multimedia paralela ni se reabren componentes marcados como NO REPETIR.

## 2026-09-21 — LOG-042 Output retry persistence
- Se corrige el reinicio accidental del contador de retry durante reconexión automática.
- La sesión manual limpia el presupuesto; la reconexión automática lo conserva.
- Se mantienen smoke tests de retry/diagnóstico.
- CI continúa bloqueada sin steps/logs observables.
- Porcentaje canónico sin cambio: Ingeniería ~71%, Producto usable ~58%, Seguimiento ~65%.

## 2026-09-21 — LOG-043 GPU -> Libav runtime
- Se añadió LibavRuntimeBackend opt-in.
- El bridge D3D11 usa frames del pool hardware de FFmpeg y CopyResource GPU->GPU.
- Se elimina el readback CPU del frame final en el camino libav-d3d11.
- CARI_ENABLE_LIBAV_OUTPUT=ON habilita la ruta y CARI_OUTPUT_BACKEND=libav-d3d11 la selecciona.
- El backend raw CLI continúa como default.
- Estado experimental; Windows/hardware pendiente.
- Porcentaje canónico sin incremento: Ingeniería ~71%, Producto usable ~58%, Seguimiento ~65%.
