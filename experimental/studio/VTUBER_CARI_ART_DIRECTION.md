# Cari Studio — dirección artística Cari V1

Fecha: 2026-09-21
Estado: SPEC / NO ES ASSET FINAL

## Objetivo

Elevar Cari desde el fallback técnico V0 a un personaje VTuber original con calidad visual de presentación comercial, sin acoplar el arte al motor, tracking ni a un modelo concreto.

La referencia de calidad se toma de propiedades observables en hojas de personaje y presentaciones VTuber maduras —silhueta clara, rostro legible, paleta consistente, asimetría controlada, expresiones y piezas preparadas para rigging—, no de copiar un personaje concreto.

## Restricciones canónicas obligatorias

Estas reglas vienen de `CARI_CHARACTER_BIBLE.md` y tienen prioridad sobre cualquier propuesta artística:

- piel morena/tan;
- cabello marrón de longitud media;
- inner hair castaño claro;
- coleta mediana;
- ahoge centrado;
- ojos marrones;
- pupilas blancas visibles;
- bandage visible en la nariz;
- presentación atlética / runner;
- camiseta deportiva ajustada o camiseta atada a la cintura;
- minishorts negros o bike shorts negros.

No añadir sin una nueva decisión de canon:

- headbands;
- hairpins/decorative clips;
- joyería;
- bolsos;
- armas;
- prendas extra no definidas;
- accesorios de cabello adicionales;
- objetos ornamentales ajenos.

## Dirección visual V1

### Objetivo de calidad

Cari debe conservar lectura inmediata en:

- thumbnail pequeño;
- plano medio de streaming;
- cuerpo completo;
- frame congelado;
- expresión facial extrema.

La silueta debe reconocerse antes de depender de texturas pequeñas.

### Rostro

Prioridad visual máxima:

- ojos grandes pero proporcionados;
- iris marrón limpio y con profundidad;
- pupilas blancas claramente visibles;
- cejas animables;
- boca con shapes suficientes para talking/lip-sync;
- bandage de nariz siempre identificable;
- expresiones con cambios de ojos, cejas, boca y postura.

### Cabello

El cabello debe verse como masa diseñada, no como casco:

- volumen medio;
- mechones frontales separados;
- coleta con silueta dinámica;
- ahoge central reconocible;
- inner hair más claro;
- piezas separadas para rigging y física.

### Ropa

La mejora estilística debe ocurrir dentro del outfit deportivo canónico:

- cortes atléticos modernos;
- bloques de color;
- ribetes/piping;
- contraste de materiales;
- proporciones limpias;
- shorts negros;
- calzado deportivo estilizado.

No usar un accesorio nuevo para resolver un problema que puede resolverse mediante color, silueta o corte de una prenda ya canónica.

### Color sugerido

`SUGGESTED`, no canon:

- base neutra oscura;
- coral/magenta como acento;
- cyan como acento secundario;
- piel/cabello con gradientes suaves.

## Referencia de benchmark

El objetivo de calidad toma como referencia la disciplina de character design observable en VTubers de alto nivel:

- silueta que funciona a escala pequeña;
- motivos visuales consistentes;
- contraste de paleta;
- detalles localizados en cara/cabello;
- variaciones de expresión claramente legibles;
- hojas/model sheets que contemplan varios ángulos y estado neutral.

Esto se documenta como benchmark técnico. No se copian diseños, modelos, logos, texturas ni elementos distintivos de personajes existentes.

## Separación para rigging

Piezas mínimas:

`head, hair_back, hair_side_L, hair_side_R, hair_front, ahoge, eye_L, eye_R, iris_L, iris_R, pupil_L, pupil_R, brow_L, brow_R, mouth, nose_bandage, neck, torso, shirt, arm_L, arm_R, hand_L, hand_R, leg_L, leg_R, shorts, shoe_L, shoe_R, ponytail`.

## Expression pack mínimo

- neutral
- happy
- angry
- sad
- surprised
- embarrassed
- sleepy
- talking

Cada expresión debe seguir compatible con blink, mouth_open, smile, brow, head rotation y gaze.

## 2D / 3D

El mismo diseño debe poder convertirse en:

`arte → capas 2D → Inochi2D/Live2D adapter`

o

`arte → authoring 3D → VRM/glTF/GLB → ThreeAvatarRenderer`

sin cambiar `AvatarActingState`.

## Gate BASE_ART_V1

Un asset real no se marca como V1 solo por verse mejor. Debe superar:

1. restricciones canónicas;
2. lectura visual;
3. carga en renderer;
4. tracking;
5. expresiones;
6. lip-sync;
7. overlay/composición;
8. rendimiento;
9. sesión sostenida;
10. cierre/reinicio;
11. licencia/documentación.

Hasta entonces el fallback estilizado sigue siendo una herramienta de validación, no el arte final.