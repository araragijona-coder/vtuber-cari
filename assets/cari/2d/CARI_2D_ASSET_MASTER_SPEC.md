# Cari V1 — 2D Asset Master Specification

**Estado:** SPEC / no es el arte final.
**Fuente canónica:** `experimental/studio/CARI_CHARACTER_BIBLE.md`.
**Objetivo:** entregar a un ilustrador/rigger una especificación completa para producir un asset 2D VTuber profesional.

## 1. Identidad visual obligatoria

El asset debe conservar exactamente los invariantes confirmados:

- piel morena/tan;
- cabello castaño de longitud media;
- inner hair más claro;
- coleta media;
- ahoge centrado;
- ojos marrones;
- pupilas blancas redondas y visibles;
- venda/curita visible sobre la nariz;
- presentación atlética de corredora;
- camiseta deportiva ajustada o atada a la cintura;
- minishorts/bike-shorts negros.

No agregar headbands, hairpins, joyería, bolsos, armas, props, ropa extra ni accesorios ajenos.

## 2. Objetivo visual

Prioridad:

1. silueta;
2. rostro;
3. cabello;
4. ropa deportiva;
5. expresividad.

Debe funcionar en thumbnail, plano medio, cuerpo completo y frame congelado.

## 3. Capas obligatorias de rigging

### Head / face

`head`
`eye_L`
`eye_R`
`iris_L`
`iris_R`
`pupil_L`
`pupil_R`
`brow_L`
`brow_R`
`mouth`
`nose_bandage`

El área de ojos y boca debe tener geometría adecuada para deformación local. Live2D recomienda editar manualmente meshes de zonas faciales cuando se necesita deformación detallada. citeturn110457search12

### Hair

`hair_back`
`hair_side_L`
`hair_side_R`
`hair_front`
`ahoge`
`ponytail`

Cada bloque móvil debe tener suficiente overlap para evitar huecos al girar la cabeza.

### Body

`neck`
`torso`
`arm_L`
`arm_R`
`hand_L`
`hand_R`
`leg_L`
`leg_R`

### Clothing

`shirt`
`shorts`
`shoe_L`
`shoe_R`

## 4. Pintura de zonas ocultas

Las zonas ocultas por otra capa deben estar dibujadas allí donde una deformación pueda revelarlas: laterales del rostro, cuello, raíz de cabello, detrás de la coleta, hombros, mangas, manos y unión torso/brazos.

No usar recortes destructivos como sustituto de geometría completa.

## 5. Lineart / color / sombras

Cuando una zona se deforma de forma independiente, mantener:

`` 
lineart
color
shadow
correction
``

como componentes editables separados cuando sea necesario.

Esto evita que una deformación doble el sombreado junto con una línea que debería permanecer estable.

## 6. Draw order

El orden de dibujo es parte del asset y debe quedar en el archivo de authoring/manifest.

Jerarquía conceptual:

```
back hair
→ body
→ clothing
→ neck/head
→ eyes/iris/pupil/brows
→ front hair
→ facial overlays
→ ahoge / ponytail accents
```

El orden exacto final lo determina el archivo de authoring, no el runtime.

## 7. Deformers y rigging

Ruta Live2D:

```
head
└── head deformation
    ├── eyes
    ├── brows
    ├── mouth
    └── front hair
```

Usar warp/rotation deformers según la necesidad. Live2D documenta ambos tipos y permite jerarquías de deformers. citeturn110457search0turn110457search4

Ruta Inochi2D:

```
character
├── body/head hierarchy
├── deformable texture nodes
├── physics
└── parameter automation
```

Inochi2D es backend opcional; sus modelos pueden llevar la licencia elegida por artista/rigger/cliente. citeturn347179search1

## 8. Backend-neutral control contract

No usar IDs propietarios de Cubism/Inochi2D dentro del renderer.

El asset se controla mediante:

- `head.yaw`
- `head.pitch`
- `head.roll`
- `gaze.x`
- `gaze.y`
- `eye.blink.L`
- `eye.blink.R`
- `mouth.open`
- `expression.*`
- `body.breath`
- `*.sway`

La traducción al backend ocurre en el adapter.

## 9. Física

Prioridad inicial:

- ponytail;
- ahoge;
- side hair.

La física debe ser estable, suave y limitada. No permitir amplitudes que rompan la silueta.

## 10. Expresiones mínimas

`neutral`
`happy`
`angry`
`sad`
`surprised`
`embarrassed`
`sleepy`
`talking`

Cada expresión debe convivir con blink, gaze, head pose y mouth open.

## 11. Exportaciones

Mantener una fuente maestra editable y exports separados:

```
source PSD / layered source
       ├── PNG/WebP expressions
       ├── Inochi2D INP
       └── Live2D project/runtime export
```

No distribuir runtime propietario de Live2D desde este repositorio.

## 12. Gate V1

Un asset pasa de SPEC a ART_READY solo cuando:

- cumple invariantes canónicos;
- todas las piezas del manifest existen;
- hay turnaround básico;
- las zonas ocultas necesarias están pintadas;
- expresiones mínimas existen;
- parámetros P0 están riggeados;
- blink/gaze/mouth/head funcionan;
- física de cabello no rompe la silueta;
- no aparecen accesorios prohibidos;
- exporta correctamente;
- la licencia del arte está documentada.

