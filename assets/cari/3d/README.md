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
