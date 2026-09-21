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

## Regla
No usar cantidad de commits, archivos o líneas como medida de progreso. El porcentaje depende de implementación, pruebas, validación y riesgo residual.