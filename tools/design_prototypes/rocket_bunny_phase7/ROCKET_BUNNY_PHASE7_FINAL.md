# ROCKET BUNNY PETTY — FASE 7 FINAL
## Descomposición causal: Redline vs redistribución del Nitro

### Git / estado
- [VERIFIED] Base SHA: e0846410ccb477df2dcfbcabcb21d78080b33547
- [VERIFIED] HEAD remoto previo: coincidió exactamente.
- [UNKNOWN] LOCAL WORKTREE STATUS: UNKNOWN.
- [VERIFIED] Producción y Fases 3–6: sin cambios.

### Diseño
A = Nitro + Ram + Guard, Redline OFF. B = mismo modelo + Redline ON. C es un ledger explícito sobre B; no cambia reglas. D es un auditor contrafactual sobre los cuatro estados fijados.
Variable independiente: Redline. Constantes: deck, cards, enemies, intent, behavior, policy, Energy, RNG, variance, max turns, Nitro generation y seeds.
Seeds 100001–110000: 10.000 paired seeds.

### Reproducción A/B
| Métrica | A OFF | B ON |
|---|---:|---:|
| Win rate | 53.27% | 55.18% |
| Avg turns | 5.4494 | 5.3874 |
| Median turns | 6 | 6 |
| Energy spent | 13.0467 | 12.8424 |
| Energy waste | 0.3015 | 0.3198 |
| Nitro generated | 33.1380 | 33.2605 |
| Nitro spent | 18.6865 | 20.4990 |
| Nitro remaining | 14.4505 | 12.7615 |

[VERIFIED] Los valores fundamentales reproducen Fase 6.

### Nitro budget / redistribution
Cantidad real de Nitro gastado:
| Modelo | Ram | Guard | Redline |
|---|---:|---:|---:|
| A | 53,040 | 133,825 | 0 |
| B | 48,040 | 48,400 | 108,550 |

Shares: A = Ram 28.38%, Guard 71.62%. B = Ram 23.44%, Guard 23.61%, Redline 52.95%.
Cambios: Ram -4.95 pp; Guard -48.00 pp; Redline +52.95 pp.
Además, Nitro spent aumenta 1.8125 por simulación y Nitro remaining baja 1.6890.
[INFERRED] No es únicamente mover el mismo presupuesto: Redline desplaza gasto, pero B también termina gastando más Nitro.

### New decision structure
A presenta 9 transiciones únicas intent:tipo:acción; B presenta 14.
A presenta 4 patrones de asignación acumulativa; B presenta 7.
B añade transiciones Redline+Guard/Ram/Shot en estados de ATTACK/DEFEND que no existen en A.
[INFERRED] Existe estructura mecánica adicional, aunque parte de la divergencia es redistribución.

### Divergence
Adaptive, paired seeds:
- ACTION DIVERGENCE: 40.80%
- TIMING DIVERGENCE: 40.80%
- OUTCOME DIVERGENCE: 2.07%
- Avg action divergence: 2.3547
- Avg timing divergence: 0.4342

### Risk / reward
B adaptive: 4,342 activaciones; +12.947 daño adicional medio; +0.0011 daño entrante medio; 1 evento de riesgo.
Policy redline: 1,838 activaciones; 580 eventos de riesgo; +3.2297 daño adicional medio; +0.6380 daño entrante medio.
[INFERRED] La exposición defensiva está causalmente vinculada a la regla de Redline que amplifica el siguiente golpe enemigo.

### Counterfactuals
| Estado | OFF | ON | Clasificación |
|---|---|---|---|
| A HP90 / Enemy80 / E2 / N80 / ATTACK | Ram | Redline + Ram | RISK |
| B HP35 / Enemy80 / E2 / N80 / ATTACK | Guard | Guard | NO CHANGE |
| C HP90 / Enemy25 / E2 / N80 / DEFEND | Ram | Redline + Ram | RESOURCE ALLOCATION |
| D HP50 / Enemy100 / E2 / N50 / SPECIAL | Ram | Ram | NO CHANGE |

[VERIFIED] Los cuatro estados fueron predefinidos. El OFF usa la misma función objetiva de score declarada en Fase 6; no se añadió un criterio posterior a los resultados.

### Dominance
Umbral fijo: >=10 pp. Policy spread A = 5.91 pp; B = 5.91 pp. No se cruza el umbral.

### Determinism
[VERIFIED] Repetición de 250 seeds: A PASS; B PASS. Misma configuración + seed produce la misma traza y resultado.

### Evidence states
- VERIFIED: base, reproducción, seeds, presupuesto, allocation, divergencia, counterfactuals, dominance y determinismo.
- INSPECTED: continuidad con Fase 6.
- INFERRED: Redline añade estructura de decisión y no se explica principalmente por simple redistribución.
- PROPOSED: mantener candidato de prototipo.
- UNKNOWN: diversión, preferencias humanas, UX y balance de producción.
- NOT_RUN: playtesting humano.
- BLOCKED: ninguno.

### Limitations
Policies heurísticas; divergencia posterior puede consumir RNG distinto; allocation mide economía mecánica; 'nueva decisión' significa transición mecánica distinta, no preferencia psicológica; C/D son instrumentos de medición, no nuevas mecánicas.

### FINAL GATE
**SUPPORTS**

### DESIGN DECISION
**KEEP** — conservar Redline como candidato de prototipo, no integrarlo al runtime. La concentración de 52.95% del Nitro gastado en B justifica continuar investigando.

### NEXT EXPERIMENT
Fase 8 propuesta: coste de oportunidad por activación, separando Nitro que habría ido a Ram, Guard, conservación y Redline, junto con daño ofensivo y defensivo incremental.

### Git final
Se exige un único commit: feat: analyze Rocket Bunny Redline causality. LOCAL WORKTREE STATUS = UNKNOWN.