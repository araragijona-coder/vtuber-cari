# MACH-GIRLS — MASTER GAME DEVELOPMENT DIRECTIVE

## STATUS

**MANDATORY / AUTHORITATIVE / CURRENT**

This document defines the mandatory game-development direction for Mach-Girls. It governs future implementation, visual design, architecture, QA, and scope decisions unless explicitly superseded by a newer repository decision.

---

## 0. PROPÓSITO ABSOLUTO

Estás desarrollando **Mach-Girls**, un juego anime de acción/RPG 2.5D inspirado conceptualmente en la sensación de presentación de juegos como *Chasing KALEIDO* / *Chasing KaleidoRIDER*, pero con identidad, personajes, mundo, mecánicas y recursos propios.

El objetivo NO es construir una página web que tenga un combate.

El objetivo es construir:

> **UN JUEGO que visualmente y sensorialmente se comporte como un pequeño juego 3D cinematográfico, utilizando una arquitectura 2.5D eficiente.**

La tecnología puede ser Canvas, sprites, capas, parallax, composición, transformaciones y otros trucos 2.5D.

Pero:

> **La tecnología utilizada NO debe determinar cómo se siente el juego.**

El jugador debe percibir primero:

**ESCENA → PERSONAJES → MOVIMIENTO → CÁMARA → ACCIÓN → IMPACTO**

y solamente después:

**HUD → cartas → estadísticas → botones.**

---

## 1. REGLA MÁS IMPORTANTE

## NO construir una web que parezca un juego.

Construir un juego que utilice una web como plataforma.

La diferencia es fundamental.

### ❌ Arquitectura incorrecta

```
HTML
 ├── panel
 ├── botones
 ├── tarjetas
 ├── estadísticas
 ├── imagen del personaje
 └── canvas pequeño
```

### ✅ Arquitectura objetivo

```
GAME
│
├── WORLD
├── CAMERA
├── CHARACTERS
├── MOTORCYCLES
├── ENEMIES
├── ANIMATIONS
├── VFX
├── AUDIO
└── HUD
```

El HUD es una capa del juego.

NO es el juego.

---

## 2. OBJETIVO VISUAL

Mach-Girls debe intentar conseguir la sensación de:

> **"Estoy viendo una escena de un juego 3D anime."**

aunque debajo utilicemos:

- sprites;
- PNG/WebP;
- Canvas;
- capas;
- parallax;
- transformaciones 2D;
- profundidad simulada;
- cámara virtual;
- escalado;
- partículas;
- iluminación falsa;
- sombras;
- VFX;
- animaciones;
- composición.

Esto se denomina aquí:

# 2.5D CINEMÁTICO

No queremos un falso 3D rígido.

Queremos **ilusión convincente de espacio tridimensional**.

---

## 3. FILOSOFÍA 3D → 2.5D

Piensa primero como diseñador de un juego 3D.

Después encuentra la manera barata de representar ese diseño en 2.5D.

NO hacer lo contrario.

### Diseñar primero:

```
PLAYER
ENEMY
ALLY
GROUND
BACKGROUND
CAMERA
LIGHT
ACTION
```

### Después decidir:

```
¿Qué partes necesitan verdadera profundidad?
¿Qué partes pueden ser sprites?
¿Qué partes pueden ser capas?
¿Qué partes pueden ser parallax?
¿Qué partes pueden ser VFX?
¿Qué partes pueden falsificarse?
```

La regla es:

> **Simular aquello que el jugador no necesita inspeccionar.**

---

## 4. WORLD SPACE

Todos los elementos importantes del combate deben existir conceptualmente en un espacio 3D simplificado.

Cada actor debe tener como mínimo:

```js
{
  x,
  y,
  z,
  scale,
  rotation,
  state
}
```

No pensar solamente:

```
drawImage(image, screenX, screenY)
```

Pensar:

```
WORLD POSITION
       ↓
CAMERA
       ↓
PROJECTION
       ↓
SCREEN POSITION
       ↓
RENDER
```

Esto permite que:

- un personaje se acerque;
- otro se aleje;
- una motocicleta pase delante de otra;
- la cámara haga zoom;
- los personajes cambien de tamaño;
- exista profundidad;
- el foreground pueda cruzar delante de ellos;
- el escenario tenga perspectiva.

---

## 5. ESCENA 2.5D

La escena debe organizarse por profundidad.

Ejemplo:

```
Z = 100  SKY
Z = 80   FAR CITY
Z = 60   BUILDINGS
Z = 40   MIDGROUND
Z = 20   ENEMY
Z = 10   ALLY
Z = 0    PLAYER
Z = -10  GROUND EFFECTS
Z = -20  FOREGROUND
```

El renderer debe utilizar esta profundidad para:

- orden de dibujo;
- escala;
- desplazamiento;
- parallax;
- perspectiva simulada.

---

## 6. ACTORES

Los personajes NO son simplemente imágenes colocadas en la pantalla.

Un actor está compuesto por:

```
ACTOR
│
├── CHARACTER
├── MOTORCYCLE
├── SHADOW
├── ANIMATION
├── TRANSFORM
├── VFX ANCHORS
└── STATE
```

Esto permitirá reutilizar el mismo sistema para diferentes Mach-Girls.

---

## 7. CÁMARA

La cámara es uno de los elementos MÁS IMPORTANTES del juego.

No debe permanecer estática.

Debe funcionar como una cámara cinematográfica.

Estados mínimos:

```
IDLE
APPROACH
FOCUS_PLAYER
FOCUS_ENEMY
ATTACK
IMPACT
BREAK
BURST
VICTORY
DEFEAT
```

Ejemplo:

```
IDLE
 ↓
PLAYER ATTACK
 ↓
FOCUS PLAYER
 ↓
ZOOM
 ↓
MOTORCYCLE ACCELERATION
 ↓
ATTACK
 ↓
IMPACT
 ↓
CAMERA SHAKE
 ↓
ENEMY REACTION
 ↓
BREAK
 ↓
CAMERA PULLBACK
```

La cámara NO debe ser un simple `cameraX += 10`.

Debe ser un sistema independiente.

---

## 8. SHOT DIRECTOR

Todas las acciones cinematográficas deben pasar por un Shot Director.

Ejemplo:

```js
shotDirector.play("ATTACK", {
  attacker: "cari",
  target: "monster"
});
```

El Shot Director puede controlar:

- posición;
- zoom;
- duración;
- easing;
- shake;
- foco;
- transición;
- profundidad;
- composición.

Nunca dispersar la lógica cinematográfica por cientos de archivos.

---

## 9. COMBATE

El combate es:

# SEMI-REAL-TIME

NO utilizar turnos clásicos.

El mundo continúa funcionando.

Mientras tanto:

- Energy se recupera;
- cooldowns avanzan;
- enemigos preparan ataques;
- telegraphs aparecen;
- acciones ocurren;
- cartas/habilidades pueden utilizarse.

El jugador debe sentir que está interviniendo en una batalla que ya está ocurriendo.

---

## 10. GAMEPLAY ≠ PRESENTATION

Separar absolutamente:

### GAMEPLAY

```
damage
energy
cooldown
breakDamage
status
AI
cards
rules
```

de:

### PRESENTATION

```
camera
animation
VFX
sound
particles
screen shake
hit stop
character movement
```

Una habilidad debe poder producir:

```js
{
  type: "ATTACK",
  source: "cari",
  target: "monster",
  damage: 150,
  breakDamage: 35
}
```

La presentación interpreta ese evento.

---

## 11. PRESENTATION EVENTS

Construir un sistema de eventos visuales.

Ejemplo:

```
ATTACK_START
ATTACK_MOVE
ATTACK_CONTACT
DAMAGE_APPLIED
IMPACT
ENEMY_RECOIL
BREAK_TRIGGER
BURST_START
BURST_FINISH
```

Esto permite que una misma habilidad tenga:

- lógica matemática;
- animación;
- cámara;
- sonido;
- partículas;

sin mezclar responsabilidades.

---

## 12. HABILIDADES

Una carta NO debe ser simplemente:

```
-20 Energy
+150 Damage
```

Debe poder asociarse a un contrato de presentación:

```js
{
  id: "boost_strike",

  gameplay: {
    cost: 20,
    damage: 150,
    breakDamage: 35
  },

  presentation: {
    animation: "BOOST_STRIKE",
    shot: "ATTACK",
    vfx: [
      "speed_lines",
      "dust",
      "impact"
    ],
    camera: "ATTACK",
    hitStop: 70
  }
}
```

La habilidad debe sentirse como una acción jugable, no solamente como una transacción matemática.

---

## 13. HIT FEEL

Cada ataque importante debe tener sensación física.

Utilizar, cuando corresponda:

- hit stop;
- camera shake;
- flash;
- partículas;
- recoil;
- knockback;
- motion lines;
- speed lines;
- screen distortion;
- sonido;
- timing.

Ejemplo:

```
ATAQUE
 ↓
movimiento
 ↓
contacto
 ↓
0.05–0.10 s HIT STOP
 ↓
FLASH
 ↓
SHAKE
 ↓
VFX
 ↓
RECOIL
 ↓
damage
```

No abusar.

Los efectos deben reforzar el impacto, no ocultar la acción.

---

## 14. BREAK

BREAK debe ser un evento visual importante.

No solamente:

```
breakGauge = 0
```

Debe producir:

```
BREAK
 ↓
enemy stagger
 ↓
camera emphasis
 ↓
special VFX
 ↓
sound
 ↓
temporary vulnerability
```

El jugador debe reconocer inmediatamente:

> "Lo rompí."

---

## 15. BURST

BURST debe sentirse como un momento especial.

Ejemplo:

```
BURST READY
 ↓
camera transition
 ↓
character focus
 ↓
special animation
 ↓
motorcycle movement
 ↓
large VFX
 ↓
impact
 ↓
damage
 ↓
camera recovery
```

No convertir BURST en otro botón estadístico.

Debe ser una pequeña secuencia cinematográfica.

---

## 16. PARALLAX

El escenario debe tener múltiples planos.

Mínimo:

```
SKY
FAR
MID
GROUND
CHARACTERS
FOREGROUND
```

Cada plano tiene una velocidad de desplazamiento distinta.

Esto genera profundidad con un coste mínimo.

---

## 17. ILUMINACIÓN FALSA

No asumir que necesitamos iluminación 3D real.

Podemos simular iluminación utilizando:

- overlays;
- gradients;
- additive blending;
- flashes;
- sombras;
- rim lights;
- glows;
- partículas.

---

## 18. SOMBRAS

Cada personaje/moto debe poder proyectar una sombra falsa.

No tiene que ser físicamente perfecta.

Debe comunicar:

- dónde está apoyado;
- distancia del suelo;
- movimiento;
- profundidad.

---

## 19. ANIMACIÓN

Utilizar máquinas de estados.

Ejemplo:

```
IDLE
 ↓
WINDUP
 ↓
ATTACK
 ↓
RECOVERY
 ↓
IDLE
```

Daño:

```
IDLE
 ↓
HIT
 ↓
STAGGER
 ↓
IDLE
```

Break:

```
IDLE
 ↓
BREAK
 ↓
VULNERABLE
 ↓
RECOVER
```

No cambiar sprites arbitrariamente desde el código de combate.

---

## 20. ASSETS

Los assets deben estar pensados para el renderer.

Organización:

```
assets/
│
├── characters/
├── motorcycles/
├── enemies/
├── backgrounds/
├── foreground/
├── vfx/
└── audio/
```

Para cada personaje priorizar:

```
idle
move
attack
hit
break
victory
defeat
```

antes de intentar producir 50 animaciones.

---

## 21. RENDIMIENTO

El objetivo inicial es:

# 60 FPS

Siempre que el dispositivo pueda soportarlo.

Prioridades:

- un solo game loop;
- un renderer principal;
- evitar múltiples `requestAnimationFrame`;
- evitar recrear DOM constantemente;
- cachear assets;
- limitar partículas;
- utilizar object pooling cuando sea necesario;
- evitar cálculos innecesarios;
- limitar DPR cuando sea necesario;
- evitar filtros extremadamente caros;
- no renderizar elementos invisibles.

---

## 22. DOM

El DOM se reserva principalmente para:

- HUD;
- menús;
- diálogos;
- accesibilidad;
- configuración;
- debug.

No utilizar DOM para representar físicamente:

- personajes;
- motocicletas;
- enemigos;
- ataques;
- partículas.

La escena pertenece al renderer.

---

## 23. DEBUG MODE

Todo sistema de desarrollo debe poder ocultarse.

Por ejemplo:

```
F1 → Debug
```

Debug puede mostrar:

```
FPS
Actors
Z
Camera
Events
Collision
AI
State
```

Pero nunca debe formar parte de la experiencia normal.

---

## 24. LO QUE NO HACER

Está estrictamente prohibido volver a estas soluciones como arquitectura principal:

### ❌

```
HTML card
+
imagen personaje
+
botón atacar
+
cambiar número HP
```

### ❌

Crear un nuevo game loop cuando ya existe uno.

### ❌

Crear otro renderer paralelo.

### ❌

Duplicar el sistema de combate.

### ❌

Crear un segundo sistema de Energy.

### ❌

Crear otro sistema de cartas.

### ❌

Convertir cada efecto visual en un elemento DOM.

### ❌

Solucionar problemas de arquitectura añadiendo más CSS.

### ❌

Añadir características antes de conseguir una escena de combate convincente.

### ❌

Reescribir sistemas existentes sin comprobar primero si ya resuelven la necesidad.

---

## 25. REGLA DE REUTILIZACIÓN

Antes de crear cualquier sistema nuevo:

1. Buscar si ya existe.
2. Leerlo.
3. Determinar si puede reutilizarse.
4. Refactorizarlo si es necesario.
5. Solo crear uno nuevo si realmente falta.

Especialmente revisar:

```
combat.js
combat_presentation.js
combat_shot_director.js
game/
cards
energy
break
burst
enemy
effects
```

El objetivo NO es reemplazar trabajo existente sin motivo.

---

## 26. MIGRACIÓN DEL PROYECTO EXISTENTE

No destruir el proyecto actual.

Migrar progresivamente.

### FASE 1 — FOUNDATION

Construir:

```
Scene
Camera
Renderer
World Space
Actor
```

### FASE 2 — FIRST BATTLE

Crear una única escena:

```
1 Mach-Girl
1 Motorcycle
1 Enemy
1 Background
```

### FASE 3 — BASIC MOVEMENT

Implementar:

```
idle
move
approach
recoil
```

### FASE 4 — BASIC ATTACK

Una habilidad debe:

```
move
attack
impact
damage
recoil
```

### FASE 5 — CAMERA

Añadir:

```
idle
attack
impact
break
```

### FASE 6 — VFX

Añadir:

```
dust
speed lines
impact
flash
particles
```

### FASE 7 — BREAK

Implementar la secuencia completa.

### FASE 8 — BURST

Implementar la primera secuencia cinematográfica.

### FASE 9 — HUD

Integrar:

```
HP
Energy
Break
Burst
Cards
Enemy Intent
```

como overlay.

### FASE 10 — POLISH

Solo después:

- audio;
- mejores assets;
- más personajes;
- más enemigos;
- más escenarios;
- más habilidades.

---

## 27. VERTICAL SLICE OBLIGATORIO

Antes de intentar ampliar el juego debe existir una escena donde:

```
PLAYER
   +
MOTORCYCLE
   +
ENEMY
   +
BACKGROUND
   +
CAMERA
   +
ATTACK
   +
BREAK
   +
BURST
```

funcionen juntos.

La escena debe poder reproducirse sin depender de menús complejos.

Si esa escena no resulta convincente, NO añadir contenido.

Mejorar primero la presentación.

---

## 28. CRITERIO DE CALIDAD

Antes de considerar una implementación terminada, preguntarse:

### ¿Parece una página web?

Si sí:

**DETENER.**

### ¿Parece un canvas con imágenes?

Si sí:

**MEJORAR cámara, profundidad, animación y VFX.**

### ¿Parece un juego 3D simplificado?

Si sí:

**seguir.**

El objetivo visual es:

```
WEB APP
   ↓
GAME-LIKE
   ↓
2D GAME
   ↓
2.5D GAME
   ↓
"¿Esto realmente es 3D?"
```

La última reacción es el objetivo.

---

## 29. REFERENCIA CONCEPTUAL

No copiar assets, personajes, historia, interfaz ni código de otros juegos.

La referencia es únicamente la **sensación de presentación**:

- personajes anime;
- motocicletas;
- combate espectacular;
- cámaras dinámicas;
- escenas cinematográficas;
- ataques vistosos;
- composición 2.5D;
- sensación de juego 3D.

Mach-Girls debe tener identidad propia.

---

## 30. REGLA FINAL DEL PROYECTO

Cuando exista una elección entre:

### A

hacer una solución rápida que funcione técnicamente pero parezca una página web,

o:

### B

hacer una solución que preserve la ilusión de espacio, movimiento, cámara y acción,

**preferir B**, siempre que sea razonablemente eficiente.

Pero nunca sacrificar arquitectura por efectos superficiales.

La prioridad absoluta es:

```
1. GAMEPLAY CORRECTO
2. ESCENA CONVINCENTE
3. CÁMARA
4. MOVIMIENTO
5. IMPACTO
6. VFX
7. HUD
8. CONTENIDO
```

No invertir ese orden.

---

## 31. DEFINICIÓN FINAL DE MACH-GIRLS

Mach-Girls es:

> **Un anime action RPG 2.5D semi-real-time donde pilotos y motocicletas existen físicamente dentro de escenarios estilizados, combaten enemigos mediante habilidades y cartas mientras el tiempo continúa avanzando, y una cámara cinematográfica transforma cada ataque, BREAK y BURST en una pequeña escena de acción.**

La tecnología es secundaria.

La sensación del juego es primaria.

**No construyas una interfaz que describa un juego.**

**Construye una escena que se comporte como un juego.**
