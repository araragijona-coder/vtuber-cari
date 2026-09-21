# Cari V1 — 2D Asset Package

Estado: `ASSET_SPEC` — no es el arte final.

Esta carpeta define el paquete de arte profesional que debe recibir un artista/rigger para producir una versión 2D lista para PNGTuber, Inochi2D o Live2D.

## Estructura

```
assets/cari/2d/
├── source/
│   └── cari_v1_master.psd              # arte fuente real, cuando exista
├── layers/
│   ├── lineart/
│   ├── color/
│   ├── shadow/
│   └── corrections/
├── expressions/
├── physics/
├── exports/
│   ├── png/
│   ├── inochi2d/
│   └── live2d/
├── CARI_2D_ASSET_MASTER_SPEC.md
├── EXPRESSION_SHEET_SPEC.md
├── layer-manifest.json
└── parameter-manifest.json
```

No se inventan PNGs finales aquí. El repositorio ya contiene el fallback V0 en `assets/cari/expressions/`; esta carpeta define el contrato de producción V1.

## Reglas

- El nombre de cada parte debe ser estable.
- Las piezas deben conservar geometría oculta suficiente para deformación.
- No aplanar lineart/sombras cuando el rigging necesite deformarlos por separado.
- No añadir accesorios prohibidos por la Biblia canónica.
- El asset no debe depender del engine para ser editable.
