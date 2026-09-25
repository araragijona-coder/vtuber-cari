# Rocket Bunny Petty — Economía, Progresión y Reglas de Juego

> Estado: GDD / especificación de diseño v1
> Fuente: material de diseño proporcionado para este proyecto.
> Regla documental: no se añaden valores económicos, probabilidades ni costes que no estén definidos por la fuente.

## 1. Filosofía de diseño: Balanza 50/50

Principio rector: 50% de ganancia para el estudio y 50% de felicidad real para el jugador.

- El jugador debe sentir que, con esfuerzo razonable, puede seguir progresando.
- El progreso principal depende también de estrategia, composición y optimización.
- La diversión principal no debe quedar bloqueada detrás de un muro de pago ni transformarse en un modelo de Pay-to-Win agresivo.

### Dos significados distintos de «50/50»

1. Balanza 50/50: principio de diseño económico y de experiencia.
2. 50/50 del banner: mecánica de probabilidad asociada a personajes promocionales.

Son conceptos independientes y deben representarse en módulos distintos.

## 2. Estamina de Resguardo

Cuando el jugador no puede conectarse durante un día, un porcentaje importante de la estamina diaria pasa a un banco de reserva fuera de juego. Ese banco permite recuperar parte del ritmo de progreso al regresar.

Pendiente de balance: porcentaje acumulado, capacidad máxima, velocidad de recuperación, caducidad y coste de recuperación.

## 3. Desguace y Mercado de Repuestos

Los componentes de moto que no encajan con una build pueden reciclarse/venderse.

**30 equipamientos reciclados → 30 Fragmentos de Motor SR.**

Los fragmentos permiten obtener directamente **1 Motor SR** con estadística principal y secundaria elegidas por el jugador.

El sistema debe registrar cantidad reciclada, fragmentos acumulados, historial de canjes, motor obtenido y estadísticas elegidas.

## 4. Llaves de Tuercas / Wrench Keys

Las Wrench Keys permiten elegir o fijar estadísticas adicionales deseadas al mejorar un componente.

No reemplazan completamente el RNG; actúan como herramienta de control obtenida mediante constancia.

Pendiente: fuente, cantidad por actividad, coste, límites por pieza y frecuencia máxima de uso.

## 5. Gacha y Monetización

Referentes declarados: Honkai: Star Rail y Zenless Zone Zero. Se mantienen como referencias de diseño, no como valores heredados automáticamente.

### Pity

- Soft Pity.
- Hard Pity a las 90 tiradas.
- La curva exacta del Soft Pity queda pendiente.

### 50/50 promocional

Los personajes promocionales usan una mecánica 50/50 y una garantía posterior cuando la tirada promocional anterior no resultó favorable. La condición exacta de persistencia y consumo de esa garantía debe formalizarse antes de implementación.

## 6. Monetización no competitiva

### Pase Bōsōzoku

Ruta gratuita y ruta de pago.

### Membresía mensual

Sistema de login mensual orientado a jugadores frecuentes.

### Skins

Venta directa de contenido cosmético. Las skins no modifican el balance competitivo de velocidad.

## 7. Relación con la progresión

Flujo económico objetivo:

jugar → farmear → reciclar → controlar RNG → mejorar build → competir

El diseño no busca convertir el pago en una vía de ventaja competitiva automática.

## 8. Contratos futuros

### EconomyStateDTO

- estamina actual;
- estamina de resguardo;
- Fragmentos de Motor SR;
- Wrench Keys;
- progreso de Pase Bōsōzoku;
- estado de membresía;
- monedas que aún no están definidas por esta fuente.

### EquipmentRecyclingState

- total reciclado;
- progreso hasta el siguiente hito;
- fragmentos generados;
- historial de canjes.

### BannerState

- banner activo;
- pity actual;
- contador de tiradas;
- estado del 50/50;
- garantía resultante.

### EquipmentUpgradeState

- nivel del componente;
- estadísticas existentes;
- estadísticas fijadas mediante Wrench Keys;
- historial de mejoras.

## 9. Orden de implementación

1. EconomyStateDTO sin monetización real.
2. estamina + banco de resguardo.
3. reciclaje + Fragmentos de Motor SR.
4. Wrench Keys.
5. inventario de equipamientos.
6. banner/pity como módulo separado.
7. Pase Bōsōzoku.
8. membresía.
9. tienda cosmética.

## 10. Regla de balance

Cualquier valor no definido debe permanecer como PENDING_BALANCE o PENDING_RULE. No se introducen precios, tasas de conversión, probabilidades de soft pity ni costes que no estén definidos por el GDD.

## 11. Dependencia con la carrera

La economía no se conecta todavía directamente al combat.js heredado. El runtime actual sigue basado en HP y resolución de daño, mientras que el GDD de Rocket Bunny Petty establece carrera, posición, adelantamiento y cruce de meta como núcleo competitivo.

La economía debe consumir un contrato de carrera estable, no adaptar sus reglas al modelo HP anterior.