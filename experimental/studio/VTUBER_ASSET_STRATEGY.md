# Cari Studio — estrategia de creación de avatar

Última revisión: 2026-09-21

## Objetivo

Crear el avatar de Cari sin romper el contrato de actuación existente y sin convertir una herramienta artística externa en una dependencia obligatoria del Native Engine.

## Opciones

| Ruta | Herramienta | Estado de código/runtime | Flujo para Cari | Observación |
|---|---|---|---|---|
| PNGTuber | Editor de acciones de Cari + arte PNG/WebP | IMPLEMENTADO en Cari | crear ilustraciones/expresiones → importar como acciones → usar frames/loop | menor deuda técnica |
| 2DTuber abierto | Inochi Creator + Inochi2D | EXTERNO / OPCIONAL | ilustración por capas → rig Inochi2D → adapter futuro | Inochi2D usa BSD-2-Clause y no reclama la propiedad de los modelos producidos |
| 2DTuber Live2D | Live2D Cubism | EXTERNO / OPCIONAL | ilustración PSD → rig Cubism → adapter Live2D | software y SDK tienen condiciones propias; no entra al core open-source |
| 3DTuber práctico | VRoid Studio → VRM | EXTERNO / OPCIONAL | crear personaje → exportar VRM → cargar en Three.js/three-vrm | ya encaja con la ruta 3D del proyecto |
| 3DTuber open tooling | Blender → glTF/VRM | EXTERNO / OPCIONAL | modelado/rig → exportar glTF/VRM → cargar en Three.js | máxima libertad de pipeline, mayor trabajo artístico |

## Cari base asset actual

Estado: `BASE_ART_V0`.

Los tres frames base están en:
- `assets/cari/expressions/cari_neutral.png`
- `assets/cari/expressions/cari_happy.png`
- `assets/cari/expressions/cari_angry.png`

Su manifest y las restricciones de diseño están en:
- `assets/cari/expressions/manifest.json`
- `assets/cari/expressions/DESIGN_SPEC.md`

El Action Store existente los precarga automáticamente solo cuando una acción no tiene frames personalizados. No se crea un segundo editor ni un segundo sistema de assets.

La calidad artística de estos archivos se considera base funcional V0; reemplazarlos posteriormente no requiere cambiar el contrato de actuación ni la arquitectura de renderer.

## Qué puede hacer el sistema actual

Cari Studio ya dispone de:

- contrato neutral de actuación;
- renderer Three.js/glTF;
- selector/carga GLB/glTF;
- tracking MediaPipe;
- lip-sync por amplitud como fallback;
- overlay experimental integrado al compositor D3D11;
- editor de acciones PNG/WebP.

Por tanto, crear una nueva infraestructura de runtime no es necesario para comenzar con PNG o 3D.

## Creación asistida desde ChatGPT

La generación de imágenes puede utilizarse para producir el arte base de un PNGTuber o las hojas/expresiones que luego se preparan y riggean. Eso no equivale a un modelo Live2D o VRM completo: el rig, mapeo de deformaciones, materiales, huesos, blendshapes y validación del asset siguen siendo tareas separadas.

## Licencias relevantes

### Inochi2D

El proyecto y sus subproyectos se publican bajo BSD 2-Clause. Los modelos creados con Inochi Creator no quedan bajo la licencia del proyecto; la licencia del modelo la decide el artista/rigger/cliente. Esto permite evaluar Inochi2D como backend opcional sin asumir que Cari posee el arte generado. Fuente: https://github.com/Inochi2D/inochi2d/wiki/Legal-Info

### Live2D

Cubism Editor proporciona herramientas de modelado/animación 2D, incluyendo physics y lip-sync, pero es software propietario. Su integración/distribución está sujeta a las condiciones de licencia de Live2D. Debe permanecer como adapter opcional. Fuente: https://www.live2d.com/en/cubism/about/

### VRoid / VRM

VRoid Studio permite crear modelos 3D y exportarlos como VRM. Los términos de uso de los datos del modelo pueden definirse y los assets de terceros conservan sus propias condiciones. VRM almacena metadatos de licencia/uso dentro del modelo. Fuentes:
- https://vroid.com/en/studio
- https://vrm.dev/en/licenses/1.0/
- https://github.com/vrm-c/vrm-specification

### Blender / three-vrm

Blender es software libre bajo GPL; la documentación oficial indica que el artwork creado con Blender puede utilizarse libremente. `@pixiv/three-vrm` se publica bajo MIT y es compatible con el renderer Three.js. Fuentes:
- https://www.blender.org/about/license/
- https://github.com/pixiv/three-vrm/blob/dev/LICENSE

## Decisión actual

1. **PNGTuber:** seguir soportándolo como fallback universal y como vía rápida de pruebas.
2. **3DTuber:** mantenerlo como ruta principal de producción porque el renderer actual ya usa Three.js/glTF y el ecosistema VRM encaja directamente.
3. **2DTuber abierto:** mantener Inochi2D como candidato para un adapter futuro.
4. **Live2D:** no incorporarlo al core mientras no exista una decisión de licencia/distribución específica.
5. No agregar un nuevo renderer 2D/3D hasta que exista un modelo real que pruebe la necesidad.

## Condición de promoción

Un avatar real puede sustituir el placeholder únicamente cuando pase:

- carga correcta;
- expresión/pose;
- tracking;
- lip-sync;
- overlay/composición;
- rendimiento;
- cierre/reinicio;
- licencia/documentación del asset.

Hasta entonces el placeholder y el contrato neutral siguen siendo válidos y no deben eliminarse.


## Asset V1 technical package — 2026-09-21

El paquete técnico canónico de Cari V1 está en:
- assets/cari/2d/
- assets/cari/3d/

Incluye manifest de capas, manifest de parámetros, expression sheet, checklist de entrega, especificaciones 2D/3D y registro de licencia.

Estado:
- SPECIFICATION: IMPLEMENTED
- ART V1: PENDING
- RIG V1: PENDING
- TRACKING_TESTED: PENDING
- WINDOWS/HARDWARE: PENDING

No crear un segundo package ni una segunda convención de nombres.
