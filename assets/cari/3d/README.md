# Cari V1 — 3D Asset Package

Estado: SPEC.

Objetivo: que el mismo diseño visual de Cari pueda producir un modelo VRM/GLB/glTF sin modificar el contrato de actuación.

```
arte 2D / concept
     ↓
authoring 3D
     ↓
mesh + skeleton + materials
     ↓
GLB / glTF
     ↓
VRM opcional
     ↓
ThreeAvatarRenderer
```

Three.js carga glTF 2.0 mediante GLTFLoader; el renderer actual ya usa esa ruta.

No se distribuye aquí un modelo propietario final hasta disponer del arte aprobado y su licencia.


## Autoría Blender

El pipeline automatizado vive en experimental/studio/avatar-blender/.

Entrada:
FBX real del modelo aprobado.

Salida:
VRM 1.0 + staging .blend + reporte JSON.

Un export correcto no convierte el modelo en ART_READY ni PRODUCTION_VALIDATED: el arte, rigging, tracking, lip-sync, composición y licencia requieren sus propios gates.
