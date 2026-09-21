# Cari Studio — dirección artística Cari V1

Fecha: 2026-09-21
Estado: SPEC / NO ES ASSET FINAL

## Objetivo
Reemplazar el aspecto provisional V0 de Cari por una identidad visual original de nivel comercial para una VTuber, sin acoplar el arte al motor, tracking ni a un modelo concreto.

## Principios visuales
- Silueta reconocible en thumbnail y plano medio.
- Diseño original; no recrear personajes existentes.
- Contraste suficiente para lectura en streaming.
- Dos o tres masas de color principales y acentos controlados.
- Rostro prioritario: ojos, cejas y boca legibles a tamaño reducido.
- Cabello agrupado en capas/mecas, preparado para rigging.
- Accesorios memorables con función identitaria.
- Ligera asimetría para evitar una silueta genérica.
- Outfit urbano/pop moderno y modular.

## Cari V1 — concepto
Identidad: VTuber original de estética felina urbana/pop, energética, simpática y ligeramente traviesa.

Paleta objetivo:
- base oscura neutra;
- magenta/coral como acento;
- cyan eléctrico como segundo acento;
- pequeños detalles luminosos;
- piel/cabello con gradientes suaves.

Cabello:
- volumen medio/largo;
- mechones frontales expresivos;
- elemento felino reconocible dentro de la silueta;
- gradiente sutil y zonas separables.

Rostro:
- ojos grandes pero proporcionados;
- iris con detalle radial limpio;
- cejas claramente animables;
- boca con shapes suficientes para talking/lip-sync;
- base neutral compatible con happy, angry, sad, surprised y shy.

Ropa:
- chaqueta corta/bolero urbano;
- top limpio;
- shorts o falda-short;
- medias altas;
- calzado estilizado;
- accesorio principal de firma;
- capas separadas para cambios futuros.

## Rigging / 2D
Separación mínima prevista:

head, hair_back, hair_side_L, hair_side_R, hair_front, ear_L, ear_R,
eye_L, eye_R, brow_L, brow_R, mouth, face_shadow, neck, torso, jacket,
top, arm_L, arm_R, hand_L, hand_R, leg_L, leg_R, shorts, stocking_L,
stocking_R, shoe_L, shoe_R, accessory_main

Debe existir margen visual alrededor de articulaciones y piezas móviles.

## 3D / VRM / GLB
El diseño debe poder traducirse a un flujo 2D o 3D sin modificar el estado de actuación:

arte → capas 2D → Inochi2D/Live2D adapter

o

arte → authoring 3D → VRM/glTF/GLB → ThreeAvatarRenderer

## Expression pack mínimo
- neutral
- happy
- angry
- sad
- surprised
- shy
- sleepy
- talking

Cada expresión debe permanecer compatible con blink, mouth_open, smile, brow, head rotation y gaze.

## Stream readability
Es fallo de diseño si a tamaño pequeño el rostro pierde expresión, la silueta se mezcla con el fondo o desaparecen los accesorios principales.

## Restricciones legales
- No incorporar assets de terceros sin licencia documentada.
- No copiar modelos, texturas, logos ni diseños distintivos de VTubers concretas.
- Live2D permanece como adapter opcional.
- Three.js/glTF/VRM sigue siendo la ruta actual de runtime.
- La demo conceptual no constituye un modelo riggeado.

## Gate BASE_ART_V1
1. licencia/documentación;
2. lectura visual;
3. carga en renderer elegido;
4. tracking;
5. expresiones;
6. lip-sync;
7. overlay/composición;
8. rendimiento;
9. sesión sostenida;
10. cierre/reinicio.