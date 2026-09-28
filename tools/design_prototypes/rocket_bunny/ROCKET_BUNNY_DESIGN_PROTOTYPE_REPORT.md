# ROCKET BUNNY PETTY — FASE 3
## PROTOTIPO MECÁNICO CONTROLADO — NITRO / REDLINE / ENEMY INTENT

**Base SHA:** `e4499f261d9a69404d6c764acaaafdfb37ae49c1`  
**HEAD verificado:** `e4499f261d9a69404d6c764acaaafdfb37ae49c1`  
**Modo:** simulación aislada; no producción.

## 1. HYPOTHESIS

> Rocket Bunny Petty puede diferenciarse mecánicamente si las cartas funcionan como maniobras dentro de un sistema de ritmo/velocidad/riesgo.

Estado previo: `INFERRED`.

Pregunta: ¿Nitro/Redline cambia qué carta se juega, cuándo se juega y cuánto riesgo se acepta, en vez de ser simplemente otra barra de recurso?

## 2. EXPERIMENTAL DESIGN

Baseline:
`Energy + Cards + Enemy Intent + Seeded RNG`.

Prototype:
`Energy + Cards + Enemy Intent + Nitro + Redline + Seeded RNG`.

Reglas mínimas:
- Energy: 3 por turno.
- Nitro: 0–100.
- `NITRO PUMP`: coste 1, daño 7, +35 Nitro.
- `EMBESTIDA NITRO`: coste 2, daño 26; con >=40 Nitro consume 40 y añade 14 daño.
- Redline: consume 25 Nitro; aumenta 25% el daño de la siguiente carta y 25% el siguiente impacto enemigo.
- Redline es temporal; no se añadió Heat independiente.
- Enemy Intent: ATTACK / DEFEND / SPECIAL.
- Variación normal: 0.90–1.10.
- Perfiles RNG adicionales: low 0.98–1.02; high 0.75–1.25.
- No se implementó Overclock, Ultimate, backend, WebSocket, CloudStorage, PvP, meta-progression ni producción.

Criterios definidos antes de observar resultados:
- Cambio de timing: diferencia de duración media >=0.20 turnos.
- Uso no trivial: Nitro gastado >0 y Redline entre 5% y 95% de las simulaciones adaptativas.
- Estrategia dominante: una política supera a todas las demás por >=10 puntos porcentuales.
- SUPPORTS exige simultáneamente cambio de selección, timing, uso no trivial, dependencia de estado y ausencia de estrategia dominante.

## 3. SIMULATION

**Simulaciones:** 10.000 por configuración.  
**Seeds:** 100001–110000.  
**Configuraciones:** baseline/prototype; 3 enemigos; 5 políticas; 3 perfiles RNG.  
**Determinismo:** mismo seed/configuración produjo el mismo trace y resultado.

Estado: `VERIFIED`.

## 4. BASELINE VS PROTOTYPE

| Métrica | Baseline | Nitro/Redline | Lectura |
|---|---:|---:|---|
| Win rate | 66.97% | 55.31% | El prototipo actual es menos eficiente con estos parámetros. |
| Avg turns | 5.151 | 5.388 | Diferencia +0.237; supera el criterio. |
| Median turns | 5 | 6 | Cambio observable de duración. |
| Avg Energy spent | 12.029 | 12.842 | Cambia el uso de Energy. |
| Energy waste | 0.424 | 0.321 | Menor desperdicio en prototype. |
| Nitro generated | 0 | 32.820 | Nitro sí entra en el ciclo de recursos. |
| Nitro spent | 0 | 15.181 | Nitro no es solo acumulación. |
| Redline activation | 0% | 38.00% | Uso intermedio. |
| Card/action diversity | 4 | 4 | No aumenta cantidad; cambia el rol y distribución. |
| Deaths by enemy attack | 3,303 | 4,469 | El tuning actual genera más derrotas. |

**Evidencia:** `VERIFIED`.

## 5. SECOND ENERGY TEST

Resultado: **no se comporta como una segunda Energy pura**, porque Nitro no paga todas las acciones y solo tiene interacciones específicas.

Pero existe un riesgo: `EMBESTIDA NITRO` concentra 35.39% del uso de cartas del agente adaptativo. Por tanto:

`EVIDENCE: PARTIAL SUPPORT — NITRO CAN COLLAPSE INTO A SINGLE-SPENDER RESOURCE`.

No se añadieron Heat/Momentum/Overclock para esconder el problema.

## 6. DOMINANT STRATEGY TEST

Win rate por política en enemigo BASIC:

Baseline:
- aggressive 67.0%
- defensive 67.0%
- generator 67.0%
- redline 67.0%
- adaptive 67.0%

Prototype:
- aggressive 56.0%
- defensive 56.3%
- generator 50.4%
- redline 56.3%
- adaptive 55.3%

No aparece una estrategia dominante bajo el criterio predefinido de 10 puntos porcentuales.

En REACTIVE prototype:
- aggressive 76.0%
- defensive 75.3%
- generator 74.1%
- redline 72.6%
- adaptive 68.3%

En PRESSURE prototype:
- aggressive 68.1%
- defensive 68.1%
- generator 70.0%
- redline 67.2%
- adaptive 64.9%

Estado: `VERIFIED — NO DOMINANT STRATEGY DETECTED`.

## 7. DECISION BRANCH TEST

Estados conceptuales evaluados:

### ATTACK_PRESSURE
HP 50 / Enemy HP 70 / Energy 2 / Nitro 60 / Intent ATTACK
- Prototype: Guard 40, Ram 40, Shot 18, Redline 25, Pump -6.

### DEFEND_WINDOW
HP 80 / Enemy HP 55 / Energy 2 / Nitro 60 / Intent DEFEND
- Prototype: Ram 40, Shot 20, Redline 25, Guard 5, Pump 2.

### LOW_NITRO
HP 70 / Enemy HP 90 / Energy 2 / Nitro 10 / Intent DEFEND
- Prototype: Shot 20, Pump 15, Ram 23, Guard 5.

### FINISH_WINDOW
HP 45 / Enemy HP 30 / Energy 2 / Nitro 80 / Intent ATTACK
- Prototype: Ram 48, Guard 40, Shot 18, Redline 25, Pump -6.

La valoración contextual cambia. `NITRO PUMP` pasa de valor 15 con Nitro bajo a -6 bajo presión y Nitro alto. `EMBESTIDA NITRO` pasa de 23 a 48 entre estados.

Estado: `VERIFIED`.

## 8. CARD VALUATION

La prueba demuestra dependencia del estado:
- Pump cambia según Nitro, HP e Intent.
- Ram cambia según Nitro y HP enemiga.
- Guard cambia según Intent y HP.
- Redline introduce una acción contextual adicional.

Esto apoya la hipótesis mecánica, pero no demuestra diversión.

Estado: `SUPPORTS — STATE DEPENDENCY`.

## 9. ENEMY INTENT

Prototype + adaptive:
- BASIC: response 0.000 / counter 0.000 / win 55.31%.
- REACTIVE: response 1.82 por combate / counter 0.91 / win 68.30%.
- PRESSURE: response 0.000 / counter 0.000 / win 64.90%.

El REACTIVE sí modifica el valor de acciones y produce counterplay observable. No utiliza información invisible.

Estado: `VERIFIED`.

## 10. RNG ANALYSIS

| Perfil | Baseline win | Prototype win | Prototype avg turns | Prototype Nitro spent |
|---|---:|---:|---:|---:|
| Low | 67.2% | 54.9% | 5.40 | 15.06 |
| Normal | 67.0% | 55.3% | 5.39 | 15.18 |
| High | 65.9% | 54.8% | 5.38 | 15.19 |

La varianza cambia resultados, pero no elimina el ciclo Nitro -> gasto -> decisión.

No se afirma que el RNG sea “justo” para humanos: la simulación solo demuestra propiedades mecánicas observables.

Estado: `VERIFIED`.

## 11. MANUAL TRACES

Se generaron 3 traces para cada modelo: seeds 100001, 100777 y 109999.

Formato:
`TURN / PLAYER STATE / ENEMY INTENT / AVAILABLE CARDS / ACTION / ENERGY / NITRO`.

### Baseline 100001
1. T1 / HP100 / ATTACK / precision, shot, guard, heavy / heavy / 3→1 / 0→0
2. T1 / HP100 / ATTACK / precision, shot, guard / guard / 1→0 / 0→0
3. T2 / HP69 / ATTACK / precision, shot, guard, heavy / heavy / 3→1 / 0→0

### Baseline 100777
1. T1 / HP100 / ATTACK / shot, guard, heavy / heavy / 3→1 / 0→0
2. T1 / HP100 / ATTACK / shot, heavy / guard / 1→0 / 0→0
3. T2 / HP69 / ATTACK / shot, guard, precision / heavy / 3→1 / 0→0

### Baseline 109999
1. T1 / HP100 / ATTACK / guard, precision, shot, heavy / heavy / 3→1 / 0→0
2. T1 / HP100 / ATTACK / precision, shot / guard / 1→0 / 0→0
3. T2 / HP69 / ATTACK / precision, shot, shot, heavy / heavy / 3→1 / 0→0

### Prototype 100001
1. T1 / HP100 / ATTACK / guard, shot, guard, ram / ram / 3→1 / 0→0
2. T1 / HP100 / ATTACK / shot, guard / guard / 1→0 / 0→0
3. T2 / HP69 / ATTACK / shot, guard, pump, ram / ram / 3→1 / 0→0

### Prototype 100777
1. T1 / HP100 / ATTACK / shot, pump, ram / ram / 3→1 / 0→0
2. T1 / HP100 / ATTACK / pump, ram / shot / 1→0 / 0→0
3. T2 / HP55 / ATTACK / pump, ram, guard / guard / 3→2 / 0→0
4. T2 / HP55 / ATTACK / pump, ram / guard / 2→1 / 0→0
5. T2 / HP55 / ATTACK / ram / pump / 1→0 / 0→35
6. T3 / HP38 / ATTACK / ram, shot / guard / 3→2 / 35→35
7. T3 / HP38 / ATTACK / shot / ram / 2→0 / 35→35

### Prototype 109999
1. T1 / HP100 / ATTACK / guard, guard, shot, ram / ram / 3→1 / 0→0
2. T1 / HP100 / ATTACK / guard, shot / guard / 1→0 / 0→0
3. T2 / HP69 / ATTACK / guard, shot, shot, ram / ram / 3→1 / 0→0
4. T2 / HP69 / ATTACK / shot, shot / guard / 1→0 / 0→0

Los traces muestran un patrón que las métricas agregadas ocultan: Nitro aparece como una decisión de timing en runs donde el Pump llega antes del spender.

Estado: `VERIFIED`.

## 12. DETERMINISM

Seed de validación: 123456.

`same seed + same configuration = same trace + same result`.

Resultado: `PASS`.

## 13. CONTRADICTIONS / RISKS

1. La hipótesis de diferenciación recibe soporte, pero la parametrización actual no está lista para producción.
2. El prototype reduce el win rate del agente adaptativo de 66.97% a 55.31%.
3. Ram concentra demasiado valor/uso y puede convertir Nitro en “recurso para una carta”.
4. Redline es contextual, pero algunas políticas nunca la activan.
5. El modelo prueba mecánicas, no diversión.
6. Parte de la diferencia proviene del cambio de pool de cartas, no solo del recurso Nitro.
7. Enemy Intent funciona como input, pero tres arquetipos no validan todavía una taxonomía completa.
8. No se deben añadir Heat, Momentum, Overclock u otros recursos para tapar estos problemas.

## 14. EVIDENCE STATES

| Afirmación | Estado |
|---|---|
| HEAD coincide con SHA base | VERIFIED |
| Prototipo aislado del runtime | VERIFIED |
| 10.000 seeds por configuración | VERIFIED |
| Determinismo | VERIFIED |
| Nitro genera y gasta | VERIFIED |
| Redline tiene uso no trivial | VERIFIED |
| Valor de cartas depende del estado | VERIFIED |
| No hay estrategia dominante según criterio | VERIFIED |
| Nitro será divertido | UNKNOWN |
| Nitro debe integrarse en producción | INFERRED — todavía no |

## 15. TEST COMMANDS

```
node tools/design_prototypes/rocket_bunny/prototype.mjs
node tools/design_prototypes/rocket_bunny/prototype.test.mjs
```

Resultado: `prototype tests: PASS`.

No se ejecutó la suite completa del juego. Esto no es un `PASS` del runtime.

## 16. FINAL DESIGN CONCLUSION

**Hypothesis:** `SUPPORTS` con alcance limitado.

La simulación sí demuestra que Nitro/Redline puede modificar:
- selección;
- timing;
- gasto de recursos;
- valoración contextual;
- respuesta a Enemy Intent;
- exposición al riesgo.

No demuestra que el sistema sea divertido ni que los valores actuales sean adecuados.

**FINAL GATE: MODIFY**

La siguiente fase debe modificar el núcleo antes de integrar. No debe añadir sistemas secundarios.

## 17. NEXT EXPERIMENT

1. Mantener solamente Energy + Nitro.
2. Mantener Redline temporal; no añadir Heat independiente.
3. Hacer un experimento counterfactual con el mismo pool de cartas y cambiar únicamente las reglas de Nitro.
4. Separar claramente generator/spender para comprobar si Nitro sigue teniendo valor cuando no existe una carta dominante.
5. Repetir 10.000 seeds.
6. Mantener Enemy Intent.
7. Solo después crear un prototipo jugable mínimo.

## 18. OUT OF SCOPE

No implementados: Overclock definitivo, Heat independiente, Ultimate Burn, Ride Modules, Reputation, Mutators, Daily Street, Campaign, Map, PvP, Leaderboard, Backend, WebSocket, CloudStorage, Monetization, Gacha, múltiples monedas, Crafting, Inventory, Reaction Cards, Drone Swarm, Narrative System y Fanservice System.

## 19. REPOSITORY SAFETY

```
BASE SHA: e4499f261d9a69404d6c764acaaafdfb37ae49c1
FINAL SHA: <se completa tras commit>
HEAD VERIFIED: YES
WORKTREE CLEAN: UNKNOWN — el conector no expone el worktree local del usuario
PRODUCTION MODIFIED: NO
PROTOTYPE FILES: tools/design_prototypes/rocket_bunny/**
OUT-OF-SCOPE CHANGES: NONE OBSERVED
SIMULATIONS: 10,000 por configuración
DETERMINISM: PASS
TESTS: prototype tests PASS
COMMIT: feat: add Rocket Bunny design prototypes
HYPOTHESIS: SUPPORTS
FINAL GATE: MODIFY
```
