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
