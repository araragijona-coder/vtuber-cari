# Rocket Bunny Petty — Balance, Táctica y Ley del RNG Justo

> Estado: GDD / especificación de diseño v1
> Fuente: material de diseño proporcionado para este proyecto.
> Regla documental: no se inventan fórmulas de combate, probabilidades ni parámetros de balance no definidos por la fuente.

## 1. Dificultad Táctica y Esfuerzo Intelectual

La campaña y los jefes **Banchou** deben exigir decisiones y lectura del estado de la carrera.

El diseño busca que el jugador:
- analice la forma óptima de superar al rival;
- utilice cartas tácticas;
- gestione posiciones en pista;
- aproveche sinergias entre waifus;
- compense limitaciones estadísticas mediante mejor ejecución.

La dificultad debe ser principalmente **estratégica y resoluble**, no un bloqueo artificial basado únicamente en un muro de poder.

### Regla de diseño

La resolución automática no debe convertir el contenido principal en una secuencia sin decisiones significativas.

Los detalles concretos de IA enemiga, complejidad de mapas, cantidad de decisiones por turno y parámetros de dificultad quedan pendientes hasta contar con un contrato de carrera estable.

## 2. Economía de Tiempo y Combustible

El ciclo de progreso debe poder analizarse de forma determinista a nivel de diseño:

**tiempo disponible + Combustible → actividades → materiales → mejora → siguiente objetivo**

El juego debe respetar el tiempo del jugador mediante los Tanques de Reserva definidos en la economía:
- hasta **2 tanques de reserva** para F2P;
- ampliables hasta **5 tanques de reserva** mediante la expansión del Garaje.

Los costes exactos de cada actividad, ritmos de recuperación y duración del ciclo de farmeo permanecen como **PENDING_BALANCE** hasta que se definan.

## 3. RNG como Mecánico Troll

El RNG puede representarse dentro de la ficción como un elemento humorístico del taller:
- **Gremlin del Taller**;
- mecánico bromista;
- personaje o recurso narrativo equivalente.

Su función es convertir un resultado desafortunado en una situación cómica del mundo del juego, sin ocultar las reglas matemáticas reales.

### Separación entre ficción y sistema

El RNG narrativo no modifica ni sustituye las reglas estadísticas reales.

La interfaz y los sistemas deben seguir mostrando resultados comprensibles y trazables aunque la presentación use al «Mecánico Troll» como recurso humorístico.

## 4. Ley de Tolerancia al Fallo — Máximo -30%

### Regla principal

Ningún drop de equipamiento ni mejora aleatoria debe producir un objeto completamente inútil para la progresión.

Cuando una combinación de estadísticas secundarias se desvía del resultado óptimo ideal, la **reducción máxima de rendimiento permitida es del 30% respecto del rendimiento óptimo ideal**.

### Límite matemático de diseño

- rendimiento óptimo ideal = 100%;
- penalización máxima por mala suerte = **30%**;
- rendimiento mínimo permitido por esta regla = **70% del óptimo**.

El 70% es la consecuencia matemática del límite definido y no una tasa adicional de balance.

### Importante: no inventar la fórmula

Esta regla **no define todavía** cómo se calcula el rendimiento compuesto de una build.

No se establece por cuenta propia:
- fórmula de DPS;
- fórmula de velocidad;
- ponderación entre estadísticas;
- función de tracción;
- conversión entre velocidad y posiciones;
- valor exacto de una carta;
- valor exacto de un Motor SR.

Esos elementos quedan como **PENDING_BALANCE** y deberán formalizarse cuando exista el contrato de carrera.

## 5. Recuperación frente al RNG

El jugador debe disponer de rutas para corregir resultados subóptimos:

**RNG → detección del resultado → reciclaje → Fragmentos de Motor SR → Motor SR dirigido**

y:

**RNG → Wrench Keys → fijación/elección de estadísticas adicionales**

Estas rutas no deben eliminar completamente el azar, pero sí impedir que una mala racha bloquee indefinidamente la progresión.

## 6. Triunfo del Ingenio

El sistema de balance debe permitir que una build con resultados no óptimos siga teniendo una ruta de victoria mediante:
- mejor posicionamiento;
- uso correcto de cartas tácticas;
- sinergias de equipo;
- gestión de Combustible y recursos;
- reciclaje inteligente;
- selección dirigida de equipamiento;
- Wrench Keys;
- ejecución superior durante la carrera.

La posibilidad de compensar una build imperfecta es una **regla de diseño**, no una afirmación de que cualquier fase será ganable con cualquier equipo.

La dificultad concreta por fase y Banchou debe quedar definida mediante datos de mapa y reglas del RaceStateDTO.

## 7. Contrato de Balance Futuro

El módulo de balance deberá poder comprobar como mínimo:
- rendimiento óptimo de referencia;
- rendimiento resultante;
- déficit relativo;
- límite máximo de déficit;
- fuente del déficit;
- vía de corrección disponible.

No debe aceptar una configuración que supere el límite de penalización de **30%** una vez que exista una fórmula de rendimiento verificable.

## 8. Dependencia con la Carrera

El runtime heredado todavía usa HP/daño en intento_2/webapp/js/combat.js, mientras que Rocket Bunny Petty necesita una carrera basada en posición, avance, adelantamiento y meta.

Por ello, esta ley de balance se registra como **GDD/contrato de diseño** y no se conecta aún al combate legado.

Primero debe estabilizarse un RaceStateDTO y una función de resolución de rendimiento; después este límite podrá convertirse en una invariante ejecutable del runtime.
