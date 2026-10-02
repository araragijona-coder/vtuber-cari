# Mach-Girls — 2.5D Editor / Asset Pipeline Contract

## 1. Propósito

Este documento define el contrato mínimo de datos para que un asset administrado por el **Asset Studio** pueda convertirse posteriormente en un **Actor 2.5D** sin crear un segundo renderer, segundo sistema de cámara ni segundo game loop.

La regla principal es:

`EDITOR → CREA DATOS`  
`ENGINE → INTERPRETA DATOS`

Esta fase define el contrato y sus límites. No implementa editor visual, deformación de mesh, física, lighting avanzado, shaders, nuevas partículas, IA de preparación, exportación ni escenas nuevas.

El contrato está diseñado para reutilizar las primitivas actuales de Mach-Girls:

`Asset Catalog → Actor → Scene → World Space → Camera → Renderer → Presentation`

---

## 2. Auditoría del sistema actual

### Asset system — FOUND

El Asset Studio actual utiliza el catálogo:

`mach_girls_asset_catalog_v1`

con registros que ya contienen, entre otros:

- `assetId`
- `type`
- `entityId`
- `state`
- `angle`
- `facing`
- `sourceType`
- `source`
- `status`
- `scale`
- `anchor`
- `anchorX`
- `anchorY`
- `offsetX`
- `offsetY`
- `flipX`
- `layer`
- `sceneRole`
- `depth`
- `baselineScale`
- `focusScale`
- `focusOffsetX`
- `focusOffsetY`
- `allowedShots`
- `foregroundPriority`
- `backgroundPriority`
- dimensiones y metadatos de aprobación.

El catálogo sigue siendo una capa de autoría local. El PNG de producción continúa siendo un asset estático del proyecto.

### Actor system — FOUND

Existe `MachGirlsActor` con:

- identidad de actor;
- `role`;
- `layer`;
- transform;
- `assetRef`;
- `anchor`;
- hijos;
- metadata;
- máquina de estados de animación.

### Layer system — FOUND, con gap

Existe un **layer system de Scene**:

`BACKGROUND / FAR / MID / GROUND / ACTORS / FX / FOREGROUND`

y `Scene.renderables()` ordena primero por layer de escena y luego por `z`.

Esto **no equivale todavía** a un sistema persistente de sub-layers visuales internos de un Actor.

Por tanto:

> `Scene.layers` se REUSE.

> `Actor.layers[]` 2.5D es un DOCUMENT GAP que este contrato define para una futura capa de datos; no se implementa en esta fase.

No deben crearse dos sistemas de Scene layers equivalentes.

### Scene system — FOUND

Existe `MachGirlsScene` con registro de actores, efectos, renderables y snapshot.

### Camera system — FOUND

Existe `MachGirlsSceneCamera` con:

- posición;
- zoom;
- offsets;
- transición;
- shake;
- estado activo.

Además, el Shot Director existente consume metadata de staging del Asset Studio.

### Renderer — FOUND

Existe `MachGirlsSceneRenderer`.

El flujo actual respeta:

`WORLD POSITION → CAMERA → PROJECTION → RENDER`

`MachGirlsWorldSpace.worldToScreen()` es la proyección explícita de World Space a coordenadas de pantalla.

---

## 3. Vocabulario

### ASSET

Archivo o recurso fuente administrado por Asset Studio.

Ejemplo:

`yuri_attack.png`

Su identidad y metadata pertenecen al catálogo.

Un Asset no es por sí mismo una entidad del mundo.

### ACTOR

Entidad visual colocada en el mundo que utiliza uno o varios Assets.

Ejemplos de tipo:

- PLAYER
- ENEMY
- NPC
- BOSS
- GENERIC

Un Actor no crea una nueva identidad de gameplay. Una futura definición puede enlazar opcionalmente un actor con una entidad formal, pero no inventa IDs de personajes.

### LAYER

Unidad visual independiente dentro de un Actor 2.5D.

Ejemplos:

- hair_back
- body
- head
- eyes
- hair_front
- accessory

Cada Layer referencia un Asset existente o futuro. Los valores canónicos del Asset Studio no deben copiarse innecesariamente dentro del Layer.

### SCENE

Composición de Actors, efectos, cámara y orden de presentación.

Scene sigue siendo responsabilidad del engine.

### PROJECT

Contenedor lógico de assets, definiciones de actores, escenas y configuraciones de authoring.

No es una nueva runtime authority.

### PREPARATION STATUS

Estado de preparación/aprobación del recurso.

En esta fase los estados persistentes canónicos siguen siendo exactamente los del Asset Studio:

- `DRAFT`
- `TECHNICAL_PLACEHOLDER`
- `APPROVED`

No se agrega todavía `IMPORTED`, `PREPARING`, `READY` ni `NEEDS_REVIEW`.

Esas etapas solo podrán añadirse cuando exista un flujo real que las necesite.

`APPROVED` continúa significando **aprobación humana explícita**.

### PRESENTATION CONFIG

Configuración que determina cómo un Actor debe entrar en la composición visual existente: role, staging, escala, cámara, movimiento y efectos.

No modifica gameplay.

---

## 4. Relación Asset → Actor → Layer

La relación conceptual es:

`ASSET`
↓
`ACTOR 2.5D`
↓
`LAYERS`
↓
`SCENE`

### Single-asset actor

Un PNG individual puede alimentar un Actor sin necesidad de separar el arte.

Ejemplo conceptual:

`sourceAssetId = "yuri_attack"`

El Actor utiliza la metadata existente del Asset Studio para:

- source;
- anchor;
- scale;
- offset;
- flipX;
- state;
- sceneRole;
- staging.

### Composite actor

Un Actor puede estar compuesto por varios Layers.

Cada Layer referencia un `assetId`.

La futura estructura debe distinguir:

`ASSET DATA`

de:

`ACTOR COMPOSITION DATA`

El Actor no debe duplicar la metadata del Asset Studio salvo para valores estrictamente relativos a la composición.

---

## 5. Estructura conceptual mínima

La forma de referencia para futuras implementaciones es:

```js
{
  schemaVersion: 1,

  id: "actor-id",
  sourceAssetId: "asset-id",
  entityType: "PLAYER | ENEMY | NPC | BOSS | GENERIC",
  preparationStatus: "DRAFT | TECHNICAL_PLACEHOLDER | APPROVED",

  layers: [
    {
      id: "body",
      assetId: "asset-body",
      z: 0,
      visible: true,
      opacity: 1,
      transform: {
        x: 0,
        y: 0,
        rotation: 0,
        scale: 1
      },
      anchor: "INHERIT"
    }
  ],

  actor: {
    position: { x: 0, y: 0 },
    rotation: 0,
    scale: 1
  },

  presentation: {
    sceneRole: null,
    depth: 0.7,
    baselineScale: 1,
    focusScale: 1.08,
    focusOffsetX: 0,
    focusOffsetY: 0,
    allowedShots: []
  },

  mesh: {
    enabled: false
  },

  motion: {
    enabled: true
  },

  lighting: {
    enabled: false
  },

  physics: {
    enabled: false
  },

  vfx: {
    enabled: false
  }
}
```

Esta estructura es **conceptual**. No es todavía una API runtime ni un archivo ejecutable.

### Regla de reutilización

`presentation.sceneRole`, `presentation.depth`, `baselineScale`, `focusScale`, offsets y `allowedShots` deben derivarse de los datos del Asset Studio cuando corresponda.

No deben convertirse en una segunda copia editable sin una razón explícita de composición.

---

## 6. Profundidad 2.5D

### Layer Z

`layers[].z` es una **profundidad relativa de composición**, no una coordenada 3D física.

Unidad:

`unitless logical depth`

Convención:

- `z < 0`: detrás del plano base;
- `z = 0`: plano base del Actor;
- `z > 0`: delante del plano base.

Los valores negativos están permitidos.

Rango recomendado para authoring:

`-1.0 … +1.0`

El rango recomendado no es una restricción lógica del contrato.

### Orden

Los Layers se ordenan por `z` dentro del Actor.

La composición global sigue respetando primero el sistema de Scene layers existente.

Por tanto existen dos niveles distintos:

`Scene.layer`
→ orden macro de la escena.

`ActorLayer.z`
→ profundidad relativa dentro del Actor.

No deben fusionarse en un único sistema.

### Compatibilidad con World Space

El `z` de Actor Layer **no debe copiarse ciegamente** al `transform.z` de World Space.

Actualmente World Space define `transform.x/y/z` como coordenadas `WORLD_STAGE_PX` y dispone de su propia proyección.

Una futura fase deberá definir el adaptador que traduzca:

`ActorLayer.z`
→ composición 2.5D
→ World/Render ordering

sin alterar el contrato actual de World Space.

---

## 7. Transform y anchors

Los anchors canónicos continúan perteneciendo al Asset:

- FEET_CENTER
- CENTER
- HEAD
- CUSTOM

El Actor Layer usa:

`anchor = "INHERIT"`

por defecto.

Eso significa que el anchor efectivo proviene del Asset Studio.

Los overrides futuros deben ser relativos y explícitos; no deben clonar `anchorX`, `anchorY`, `offsetX`, `offsetY` del Asset sin necesidad.

El transform del Layer es relativo al Actor:

- `x`
- `y`
- `rotation`
- `scale`

Las unidades exactas de rotation siguen las convenciones del engine existente.

---

## 8. Preparation Status

Los estados actuales del Asset Studio siguen siendo la fuente de verdad:

### DRAFT

Asset cargado o editado, pendiente de aprobación.

### TECHNICAL_PLACEHOLDER

Fixture técnico.

No representa arte final y no puede ascender automáticamente a APPROVED.

### APPROVED

Arte aprobado explícitamente por una persona.

Un Actor 2.5D no puede reinterpretar un placeholder como arte final.

No se añade un cuarto estado solo para satisfacer al editor.

Las futuras etapas de preparación, si son necesarias, deben ser una capa explícita y compatible con el registry actual, no una redefinición silenciosa de estos tres estados.

---

## 9. BASIC / ADVANCED

### BASIC

Propiedades de authoring que deben poder existir sin conocimiento de rendering avanzado:

- asset source;
- posición del Actor;
- escala;
- rotación;
- anchor;
- profundidad de composición;
- visibilidad;
- movimiento basado en la Animation/Scene existente;
- configuración básica de cámara/presentation;
- selección de VFX ya existentes.

### ADVANCED

Propiedades de authoring reservadas para fases posteriores:

- Layer Z detallado;
- anchor overrides;
- mesh;
- deformation;
- parallax;
- physics parameters;
- lighting;
- normal maps;
- VFX parameters;
- procedural motion;
- parámetros avanzados de cámara.

La existencia de un campo ADVANCED en el contrato no implica que el motor actual deba implementarlo.

---

## 10. Compatibilidad con Mach-Girls

El Actor 2.5D debe entrar en el pipeline existente:

`ACTOR DATA`
↓
`World Actor`
↓
`Scene`
↓
`Camera`
↓
`Projection`
↓
`Renderer`
↓
`Combat Presentation`

El contrato no crea:

- otro renderer;
- otra cámara;
- otro animation loop;
- otro requestAnimationFrame;
- otro combat loop;
- otra autoridad de gameplay.

### Gameplay authority

El editor no puede modificar directamente:

- CombatEngine
- GameState
- Energy
- Cards
- BREAK
- BURST
- RNG
- AI
- Save

Un Actor 2.5D es una definición visual/presentacional.

---

## 11. Compatibilidad con Asset Studio

Asset Studio continúa siendo la fuente de verdad para:

- asset identity;
- asset classification;
- entity assignment;
- state;
- angle;
- facing;
- flipX;
- scale;
- anchor;
- offset;
- safe area;
- approval status.

La capa 2.5D debe **referenciar** estos datos.

En particular:

`ActorLayer.assetId → mach_girls_asset_catalog_v1.assets[].assetId`

La resolución efectiva debe obtener del catálogo el asset y su metadata canónica.

Los datos de staging ya existentes:

- sceneRole;
- depth;
- baselineScale;
- focusScale;
- focusOffsetX/Y;
- allowedShots;
- foregroundPriority;
- backgroundPriority

son reutilizables por el Actor 2.5D y no deben duplicarse como otro sistema de staging.

---

## 12. Future extension points

El contrato deja puntos de extensión para futuras fases, sin implementarlos ahora.

### Mesh deformation

`mesh.enabled`

Podrá habilitar una representación deformable, pero no convierte al Actor en un modelo 3D tradicional.

### Procedural motion

`motion.enabled`

Podrá seleccionar movimiento adicional sobre la infraestructura de Animation/Scene existente.

### Breathing / expressions

Podrán añadirse como parámetros de motion/presentation sobre Layers sin alterar gameplay.

### Hair / cloth physics

Podrán añadir parámetros dentro de `physics`.

No deben crear un segundo game loop.

### Lighting / normal maps

Podrán colgar de `lighting` cuando el renderer los soporte.

### Camera response

Podrán reutilizar `presentation` y el Camera/Shot Director existente.

### VFX

Podrán ampliar `vfx` reutilizando la infraestructura de presentación existente.

### Skills

Una Skill puede referenciar presentación, pero el Actor 2.5D no puede convertirse en autoridad de resolución de Skill.

La resolución sigue siendo responsabilidad del gameplay engine.

---

## 13. Regla de no duplicación

Antes de crear una nueva estructura runtime:

1. buscar si el dato ya existe en Asset Studio;
2. buscar si existe en Actor;
3. buscar si existe en Scene;
4. buscar si existe en World Space;
5. buscar si existe en Camera/Shot Director;
6. buscar si existe en Animation;
7. reutilizar cuando sea compatible.

Solo se agrega una estructura nueva cuando representa una responsabilidad que actualmente no existe.

En esta auditoría:

`Asset Registry` → REUSE  
`Actor` → REUSE  
`Scene` → REUSE  
`Camera` → REUSE  
`Renderer` → REUSE  
`Animation` → REUSE  
`Actor internal layers persistence` → DOCUMENT GAP

---

## 14. Límites de Phase 30-A

Esta fase NO implementa:

- editor visual;
- mesh deformation;
- física;
- lighting avanzado;
- normal maps;
- shaders;
- partículas nuevas;
- parallax runtime;
- IA de preparación;
- exportación;
- sistema completo de escenas;
- nuevas mecánicas de gameplay.

Tampoco modifica el Asset Studio existente.

La única entrega de esta fase es el contrato documental que permita que una futura implementación produzca datos compatibles con el engine actual.

## 15. Gate de salida

30-A queda cerrado cuando:

- un Asset del Asset Studio tiene una ruta conceptual clara hacia un Actor;
- un Actor puede describirse como uno o varios Layers;
- los Layers tienen profundidad relativa 2.5D;
- los datos canónicos del Asset Studio no se duplican innecesariamente;
- Scene, Camera, World Space, Renderer y Animation son reutilizados;
- no se introduce una nueva autoridad de gameplay;
- las extensiones futuras tienen puntos definidos sin implementar sus sistemas.

**Estado: CONTRACT DEFINED — IMPLEMENTATION DEFERRED**
