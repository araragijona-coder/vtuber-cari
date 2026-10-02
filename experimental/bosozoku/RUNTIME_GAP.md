# Rocket Bunny Petty — Runtime Gap Analysis

## Fuente funcional

El GDD define una condición de victoria basada en posición/meta y una traducción de estadísticas RPG a conducción:

- ATK → Velocidad / Aceleración.
- DEF → Equilibrio / Tracción.
- Nitro/Oxido → impulso temporal.
- Turbulencia/Distracción → alteración del orden.
- Acierto/Ojo de Ruta → precisión.
- Capacidad de Manejo/Reflejos → crítico.
- Adelantamiento Crítico → rebase de 1–2 puestos.

## Estado real del runtime

El archivo intento_2/webapp/js/combat.js actualmente valida CombatInitDTO y TurnResultDTO, mantiene currentHp, aplica damage_dealt y representa la batalla mediante barras de HP.

Por lo tanto, el runtime actual no implementa todavía:

1. posición de pista;
2. velocidad/aceleración como condición de avance;
3. tracción;
4. orden de carrera;
5. precisión;
6. adelantamiento crítico;
7. cruce de meta como condición primaria;
8. 4 vs 4 / 4 vs 1 como resolución de carrera.

## Regla de integración

El mazo semilla se mantiene como contenido de diseño/prototipo hasta que exista un contrato de carrera compatible.

No se introducen estadísticas inventadas para Nitori, Sashi, Rinka o Tsubaki Hibana dentro de DefaultDatabase runtime.

## Próximo puente técnico

La siguiente capa debe introducir un RaceStateDTO y una resolución de acciones de carrera antes de adaptar combat.js.

La migración deberá mantener compatibilidad con el renderizador actual durante la transición, en lugar de sustituirlo de golpe.