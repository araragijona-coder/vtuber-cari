# ROCKET BUNNY PETTY — FASE 4 FINAL
## Experimento Counterfactual — Aislamiento de Nitro

### Control de ejecución
- **BASE SHA:** `8e80fc70597cb1041049c4a6317d9ba5457c72a2`
- **HEAD VERIFICATION:** VERIFIED en GitHub antes de escribir.
- **Rama:** `main`
- **Producción modificada:** NO.
- **Superficie permitida:** `tools/design_prototypes/rocket_bunny/**`
- **Estado del worktree local:** UNKNOWN; el conector GitHub no expone el worktree local.
- **Objetivo:** aislar causalmente el efecto de Nitro manteniendo constante el pool de cartas, enemigos, política, seeds y perfiles RNG.

## Hipótesis
> Manteniendo iguales cartas, RNG, enemigos y condiciones, activar Nitro cambia decisiones y timing del agente.

**Estado final:** **SUPPORTS** para el modelo experimental definido, con limitaciones descritas abajo.

## Modelo control
`Energy + mismas Cards + Enemy Intent + Seeded RNG`

## Modelo Nitro
`Energy + mismas Cards + Enemy Intent + mismo Seeded RNG + Nitro + Redline`

### Diferencia mecánica exacta
El pool y deck son idénticos en ambos brazos:
`DISPARO NEON`, `ESCUDO DARK`, `NITRO PUMP`, `EMBESTIDA NITRO`.
- Shot: coste 1, daño 18.
- Guard: coste 1, block 14.
- Pump: coste 1, daño base 7.
- Ram: coste 2, daño base 26.

Control: Pump no genera Nitro; Ram no gasta Nitro; Redline no existe.
Nitro: Pump genera 35 Nitro; Ram puede gastar 40 Nitro para +14 daño; Redline consume 25 Nitro y multiplica el siguiente daño de carta por 1.25 y el siguiente golpe enemigo por 1.25.

No se añadieron Heat, Momentum, Overclock, Ultimate, cartas adicionales, enemigos adicionales ni sistemas de producción.

## Configuración
- Seeds: **100001–110000**
- Paired seeds: **10.000**
- Ejecuciones: **20.000** para el análisis principal (10.000 control + 10.000 Nitro), más matrices por políticas, enemigos y RNG.
- Max turns: 20.
- Energy/turn: 3.
- HP jugador: 100.
- HP enemigo: 150.
- RNG: low [0.98,1.02], normal [0.90,1.10], high [0.75,1.25].
- Enemigos: Basic, Reactive, Pressure.
- Políticas: aggressive, defensive, generator, redline, adaptive.

## Resultados principales

| Métrica | CONTROL | NITRO |
|---|---:|---:|
| Win rate | 55.83% | 55.31% |
| Loss rate | 44.17% | 44.69% |
| Avg turns | 5.4129 | 5.3878 |
| Median turns | 6 | 6 |
| Avg Energy spent | 12.8770 | 12.8421 |
| Avg Energy waste | 0.3617 | 0.3213 |
| Avg Nitro generated | 0 | 32.8195 |
| Avg Nitro spent | 0 | 15.1810 |
| Avg Nitro remaining | 0 | 17.6380 |
| Redline activation | 0% | 38.00% |

La diferencia de win rate es pequeña (-0.52 puntos porcentuales), mientras que la estructura de recursos cambia de forma observable.

## Paired Action Divergence
En las mismas 10.000 seeds:
- **Action divergence:** 62.03%.
- **Timing divergence:** 39.98%.
- **Average timing divergence score:** 0.6424.
- **Win/loss outcome divergence:** 3.14%.

Esto proporciona evidencia directa de que Nitro no se limita a cambiar el resultado final: en este modelo de política, cambia la secuencia de acciones en una mayoría de seeds paired.

### Seeds con divergencia reproducible
100002, 100003, 100004, 100009, 100010, 100011, 100012, 100014, 100015, 100016, 100017, 100018, 100022, 100023, 100025, 100026, 100027, 100028, 100029, 100030, 100031, 100032, 100033, 100034, 100035.

## Card Value Shift

El control mantiene valores de Pump y Ram constantes respecto a Nitro:
- Control Pump = 7; Ram = 26.
- Nitro, Low Nitro: Pump 15; Ram 23.
- Nitro, Medium/High Nitro: Pump 2; Ram 40.
- Nitro, Attack Pressure: Pump -6; Ram 40.

Los valores son **scores del modelo**, no mediciones de utilidad humana. Aun así, muestran que el estado Nitro altera la valoración contextual de cartas.

## Nitro Spender Test
En Nitro:
- Ram representa **35.39%** de todos los usos de cartas.
- Considerando Pump + Ram como acciones directamente ligadas al circuito de Nitro, Ram concentra **78.17%** de esas acciones.

**Clasificación:** **PARTIAL SUPPORT + BALANCE ISSUE** para la preocupación de concentración de spender.

La concentración no invalida el efecto causal; sí limita el diseño actual y justifica MODIFY antes de producción.

## Dominant Strategy
Se conservó el umbral predefinido de **>=10 puntos porcentuales**.

No apareció una política que superara a las demás por >=10 pp:
- Basic, Nitro: rango aproximado 50.38–56.29%.
- Reactive, Nitro: 68.31–76.19%.
- Pressure, Nitro: 64.97–69.97%.

**Resultado:** no se detectó una política dominante bajo el criterio predefinido.

## Enemy Intent
Adaptive, control vs Nitro:
- Basic: 55.83% vs 55.31%.
- Reactive: 75.67% vs 74.63%.
- Pressure: 67.57% vs 67.57%.

El sistema mantiene diferencias pequeñas de resultado agregado, mientras las políticas y secuencias pueden divergir.

## RNG
Adaptive + Basic:
| Perfil | CONTROL | NITRO |
|---|---:|---:|
| Low | 55.25% | 54.88% |
| Normal | 55.83% | 55.31% |
| High | 55.34% | 54.78% |

La conclusión sobre divergencia no depende de un único perfil de amplitud, pero esto sigue siendo una simulación, no una validación de percepción de justicia.

## Paired Counterfactual Traces
Se generaron 10 pares reproducibles con seeds 100001–100010.

| Seed | Primer estado divergente | CONTROL | NITRO |
|---|---|---|---|
| 100001 | ninguno | RAM → GUARD → RAM → GUARD → RAM → SHOT | misma secuencia |
| 100002 | T1, DEFEND, Nitro 0 | RAM | PUMP |
| 100003 | T1, DEFEND, Nitro 0 | RAM | PUMP |
| 100004 | T2, DEFEND, Nitro 0 | RAM | PUMP |
| 100005 | ninguno | misma secuencia | misma secuencia |
| 100006 | ninguno | misma secuencia | misma secuencia |
| 100007 | ninguno | misma secuencia | misma secuencia |
| 100008 | ninguno | misma secuencia | misma secuencia |
| 100009 | T2, DEFEND, Nitro 0 | RAM | PUMP |
| 100010 | T2, DEFEND, HP 69 | RAM | PUMP |

Los traces completos quedan reproducibles mediante el script del experimento; los estados mostrados arriba son los primeros puntos de divergencia.

## Reproducibilidad
**PASS.**
El mismo conjunto de paired seeds produjo el mismo resultado dos veces en la prueba de determinismo.

## Tests
Comandos ejecutados:
`node tools/design_prototypes/rocket_bunny/phase4_counterfactual.mjs`
`node tools/design_prototypes/rocket_bunny/phase4_counterfactual.test.mjs`

Resultado:
`phase4 tests: PASS`

No se ejecutó la suite completa del juego.

## Limitaciones
- Las políticas son heurísticas y no representan jugadores humanos.
- Compartir seed no significa que toda la secuencia RNG posterior sea idéntica si los estados divergen y consumen distinto número de muestras; el emparejamiento controla el seed inicial, no garantiza identicalidad causal de cada draw posterior.
- Card Value Shift es un score diseñado para el experimento, no utilidad humana observada.
- El experimento demuestra cambio de decisiones dentro de este modelo; no demuestra diversión, retención ni balance definitivo.
- No se tocó producción.

## Evidence States
- **VERIFIED:** HEAD base, archivos objetivo de Fase 3, 10.000 paired seeds, 20.000 ejecuciones principales, métricas calculadas, determinismo y tests.
- **INSPECTED:** código de Fase 3 y su diferencia de pool.
- **INFERRED:** Nitro modifica selección/timing en este agente bajo las reglas experimentales.
- **UNKNOWN:** comportamiento de jugadores humanos.
- **CONTRADICTED:** la hipótesis de que Nitro solo cambia daño no queda respaldada por este experimento; se observó divergencia de acciones y timing.

## Limitaciones causales importantes
El experimento aísla la **presencia/ausencia de la mecánica Nitro** dentro de un mismo pool, pero el control contiene cartas llamadas Nitro Pump/Embestida Nitro con su comportamiento Nitro desactivado. Esto es intencional: mantiene idéntico contenido y modifica únicamente la mecánica.

## Final Hypothesis Status
**SUPPORTS**

Nitro produce divergencia de acciones (62.03%), timing (39.98%), valoración contextual y uso no trivial, manteniendo el mismo pool, enemigos y seeds iniciales.

## Final Gate
**MODIFY**

La evidencia apoya continuar investigando Nitro, pero la concentración del spender Ram (78.17% del circuito Pump/Ram) y la dependencia de heurísticas impiden tratar el diseño actual como listo para integración.

El siguiente paso no debe ser producción. Debe ser un prototipo jugable aislado o un experimento de rediseño mínimo que pruebe si el valor de Nitro puede distribuirse sin agregar nuevos subsistemas.

## Seguridad de repositorio
- BASE SHA: `8e80fc70597cb1041049c4a6317d9ba5457c72a2`
- FINAL SHA: PENDIENTE DE COMMIT
- HEAD VERIFIED: YES
- PRODUCTION MODIFIED: NO
- OUT-OF-SCOPE CHANGES: NONE
- PAIRED SEEDS: 10.000
- SIMULATIONS: 20.000 principales
- DETERMINISM: PASS
- TESTS: PASS
- COMMIT: `feat: isolate Nitro design experiment`
- ACTION DIVERGENCE: 62.03%
- TIMING DIVERGENCE: 39.98%
- CARD VALUE SHIFT: OBSERVED
- NITRO SPENDER CONCENTRATION: 78.17% Ram dentro de acciones Pump/Ram
- HYPOTHESIS: SUPPORTS
- FINAL GATE: MODIFY
