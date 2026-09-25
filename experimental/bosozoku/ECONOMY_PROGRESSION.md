# Rocket Bunny Petty — Economía, Combustible, Progresión y Reglas del Garaje

> Estado: GDD / especificación de diseño v1 revisada
> Fuente: material de diseño proporcionado para este proyecto.
> Regla documental: no se añaden precios, tasas de conversión, probabilidades, costes o parámetros de balance que no estén definidos por la fuente.

## 1. Filosofía de diseño: Balanza 50/50

Principio rector: 50% de ganancia para el estudio y 50% de felicidad real para el jugador.

- El jugador debe sentir que, con esfuerzo razonable, puede seguir progresando.
- La estrategia y la optimización forman parte del reto real.
- La diversión y el progreso no deben quedar bloqueados detrás de muros de pago abusivos.
- El pago debe orientarse a comodidad, flexibilidad temporal o personalización, sin crear una ventaja injusta de velocidad competitiva.

### Dos significados distintos de «50/50»

1. **Balanza 50/50:** principio económico y de experiencia.
2. **50/50 del banner:** mecánica de gacha para personajes promocionales.

Son conceptos independientes y deben mantenerse en módulos distintos.

## 2. Combustible y Estamina de Resguardo

### 2.1 Combustible

El **Combustible** es la estamina indispensable para:

- ingresar a mapas de historia;
- realizar incursiones contra jefes / **Banchou**;
- farmear piezas de moto.

### 2.2 Tanque de Reserva Estándar F2P

Para reducir la penalización por no poder jugar todos los días:

- el jugador gratuito dispone de **hasta 2 tanques de reserva**;
- cada tanque de reserva es **equivalente al medidor diario de combustible**;
- el objetivo es conservar capacidad de progreso cuando el jugador no puede conectarse.

La forma exacta de acumulación, recuperación, caducidad o consumo de la reserva que no aparece definida en la fuente permanece como **PENDING_RULE / PENDING_BALANCE**.

### 2.3 Ampliación del Garaje de Repuesto

La expansión del **Garaje de Repuesto** es una forma de monetización **Pay-to-Convenience**:

- puede adquirirse mediante divisa prémium o dinero real;
- permite ampliar la capacidad hasta **5 tanques de reserva completos**;
- no debe modificar directamente la velocidad competitiva ni conceder una ventaja injusta en pista.

El precio, paquetes, límites de compra por periodo y cualquier otra regla comercial quedan como **PENDING_RULE / PENDING_BALANCE** mientras no estén definidos.

## 3. Divisas y Vocabulario del Asfalto

Toda la economía y sus diálogos deben conservar la terminología temática de las carreras callejeras.

### 3.1 Kilometraje / Millas de Asfalto — Divisa Prémium

Nombre temático:

- **Kilometraje (KM)**
- **Millas de Asfalto**

Es la divisa prémium de mayor valor.

Uso definido por la fuente:

- tiradas de banners de personajes;
- tiradas de banners de cartas SSR.

Fuentes definidas:

- eventos;
- logros;
- récords en pistas.

El nombre final de UI entre las variantes «Kilometraje» y «Millas de Asfalto» queda abierto a decisión editorial si aún no se establece uno como canónico.

### 3.2 Dinero de Pandilla / Yenes — Moneda Estándar

Nombre temático:

- **Dinero de Pandilla**
- **Yenes**

Obtención definida:

- farmeo de mapas de tráfico y mobs.

Usos definidos:

- mejoras básicas de nivel;
- piezas comunes;
- costes de reciclaje.

No se añaden cantidades ni tasas de conversión.

### 3.3 Fragmentos de Óxido — Recompensa por Duplicados

Los **Fragmentos de Óxido** se obtienen al reciclar:

- personajes repetidos del gacha;
- cartas repetidas del gacha.

Se destinan a:

- fragmentos de evolución;
- recursos raros.

No se define todavía una tabla de conversión ni precios de canje.

**Nota de separación:** los Fragmentos de Óxido son distintos de los **Fragmentos de Motor SR** obtenidos mediante reciclaje de equipamiento.

## 4. Desguace y Mercado de Repuestos

### 4.1 Reciclaje

Los componentes/equipamientos de moto no deseados o con estadísticas desalineadas pueden reciclarse.

Regla definida:

**30 piezas no deseadas recicladas → 30 Fragmentos de Motor SR.**

### 4.2 Compra Directa de Motor SR

El jugador puede usar los Fragmentos de Motor SR para obtener directamente:

**1 Motor SR** con:

- estadística principal elegida por el jugador;
- estadística secundaria elegida por el jugador.

El propósito del sistema es reemplazar una parte del RNG ciego por una ruta de progresión determinista basada en reciclaje.

No se define aquí ningún coste adicional distinto del hito de 30 piezas → 30 fragmentos → 1 Motor SR.

## 5. Llaves de Tuercas / Wrench Keys

Las **Wrench Keys** son un comodín de ingeniería para controlar el RNG del equipamiento.

Uso definido:

- fijar estadísticas adicionales;
- elegir estadísticas adicionales al mejorar un componente.

Filosofía:

- premian la constancia;
- reducen la frustración del RNG;
- no deben convertirse en un sustituto completo de la progresión.

Parámetros aún no definidos:

- fuente;
- cantidad obtenida por actividad;
- coste de uso;
- límites por pieza;
- frecuencia máxima de uso.

Todo lo anterior permanece como **PENDING_RULE / PENDING_BALANCE**.

## 6. Gacha, Pity y Monetización

### 6.1 Pity

Sistema de piedad transparente:

- **Soft Pity**;
- **Hard Pity a las 90 tiradas**.

La curva exacta de Soft Pity no está definida y permanece como **PENDING_BALANCE**.

### 6.2 50/50 de personajes promocionales

Los personajes promocionales usan una mecánica **50/50**.

La pérdida del resultado promocional debe poder conducir a una garantía posterior, pero la condición exacta de persistencia, consumo y reinicio de esa garantía debe formalizarse antes de implementación.

### 6.3 Pase Bōsōzoku

- ruta gratuita;
- ruta de pago.

No se fija todavía precio, cantidad de niveles, recompensas exactas ni duración.

### 6.4 Membresía mensual

Sistema de membresía basado en inicio de sesión mensual.

Quedan pendientes precio, duración exacta, recompensas y condiciones comerciales.

### 6.5 Skins y personalización

Venta directa de contenido cosmético, incluyendo:

- uniformes escolares;
- trajes de carreras;
- otras variantes estéticas futuras.

Regla competitiva:

**las skins no deben modificar el balance competitivo de velocidad.**

## 7. Relación entre Economía y Progresión

Flujo económico objetivo:

**jugar → farmear → reciclar → controlar RNG → mejorar build → competir**

El diseño debe permitir que el esfuerzo y la optimización tengan una vía de progreso real sin convertir el pago en una ventaja competitiva automática.

## 8. Contratos de Estado Futuros

### EconomyStateDTO

Debe contemplar como mínimo:

- combustible / estamina actual;
- estamina de reserva;
- capacidad de reserva;
- Fragmentos de Motor SR;
- Fragmentos de Óxido;
- Wrench Keys;
- Kilometraje / Millas de Asfalto;
- Dinero de Pandilla / Yenes;
- progreso del Pase Bōsōzoku;
- estado de membresía.

Los campos comerciales todavía no definidos permanecen sin valores inventados.

### EquipmentRecyclingState

Debe registrar:

- total reciclado;
- progreso hasta el siguiente hito de 30;
- fragmentos de Motor SR generados;
- historial de canjes;
- equipamiento recibido;
- estadísticas elegidas en el canje.

### BannerState

Debe registrar:

- banner activo;
- pity actual;
- contador de tiradas;
- estado del 50/50;
- garantía resultante;
- condiciones de consumo/restablecimiento cuando sean formalizadas.

### EquipmentUpgradeState

Debe registrar:

- nivel del componente;
- estadísticas existentes;
- estadísticas fijadas mediante Wrench Keys;
- historial de mejoras.

### GarageReserveState

Debe registrar:

- capacidad estándar de reserva: **2 tanques diarios**;
- capacidad ampliada máxima: **5 tanques diarios**;
- estado de la ampliación;
- fuente de capacidad adicional;
- historial de ampliaciones.

La capacidad comercial, precio y reglas de expansión permanecen pendientes hasta que se definan.

## 9. Orden de Implementación

1. EconomyStateDTO sin monetización real.
2. combustible + reserva de 2 tanques.
3. ampliación del garaje hasta 5 tanques como contrato de pay-to-convenience, sin tienda real todavía.
4. reciclaje + Fragmentos de Motor SR.
5. Fragmentos de Óxido por duplicados.
6. Wrench Keys.
7. inventario de equipamientos.
8. banner/pity como módulo separado.
9. Pase Bōsōzoku.
10. membresía.
11. tienda cosmética.

## 10. Regla de Balance y Trazabilidad

Cualquier valor no definido debe permanecer como **PENDING_BALANCE** o **PENDING_RULE**.

No se introducen por cuenta propia:

- precios;
- probabilidades exactas de Soft Pity;
- costes;
- tasas de conversión;
- recompensas no especificadas;
- frecuencias de obtención;
- límites temporales comerciales.

## 11. Dependencia con la Carrera

La economía no se conecta todavía directamente al `combat.js` heredado.

El runtime actual sigue basado en HP y resolución de daño, mientras que el GDD de Rocket Bunny Petty establece carrera, posición, adelantamiento y cruce de meta como núcleo competitivo.

La economía debe consumir un contrato de carrera estable y no adaptar sus reglas al modelo HP anterior.
