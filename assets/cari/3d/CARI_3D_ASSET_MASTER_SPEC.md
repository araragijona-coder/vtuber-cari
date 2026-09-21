# Cari V1 — 3D Asset Master Specification

**Estado:** SPEC / no es modelo final.

## Objetivo

Preservar el mismo diseño y la misma semántica de actuación entre 2D y 3D.

## Identidad visual

Usar exactamente los invariantes de `CARI_CHARACTER_BIBLE.md`.

## Mesh / topology

Separar como mínimo:

- head;
- hair_back;
- hair_side_L/R;
- hair_front;
- ahoge;
- eyes/iris/pupil/brows;
- mouth;
- nose_bandage;
- torso/shirt;
- arms/hands;
- legs/shorts;
- shoes;
- ponytail.

## Skeleton

Jerarquía mínima sugerida:

```
root
└── pelvis
    ├── spine
    │   ├── chest
    │   ├── neck
    │   │   └── head
    │   └── shoulders
    ├── leg_L
    └── leg_R
```

Cabeza, ojos, boca y cabello deben poder recibir animación facial sin romper la postura base.

## Facial control

Mapear el mismo namespace backend-neutral de `parameter-manifest.json`.

Para morph targets, preferir nombres estables y semanticamente claros.

## Materials

Prioridad:

1. lectura del rostro;
2. ojos/iris/pupilas;
3. cabello;
4. ropa deportiva.

Evitar texturas innecesariamente grandes.

## Export

Preferir GLB para distribución autónoma y glTF cuando la separación de assets sea útil.

El renderer existente acepta `glb` y `gltf`. GLTFLoader es el loader oficial de Three.js para glTF 2.0. citeturn110457search1

VRM puede usarse como capa de avatar cuando sus metadatos/licencia estén correctamente definidos.

## Gate 3D_READY

- silueta canónica;
- materiales legibles;
- facial controls;
- blink;
- gaze;
- mouth;
- pose;
- cabello con movimiento;
- GLB/glTF válido;
- carga en ThreeAvatarRenderer;
- sesión prolongada;
- licencia documentada.
