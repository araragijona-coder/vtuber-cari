# ROCKET BUNNY PETTY — FASE 6 FINAL
## Aislamiento contrafactual de Redline

### Estado
- **[VERIFIED] BASE SHA:** `d2921959578bc8c1db0a792a1a573bff539f77f5`
- **[VERIFIED] HEAD remoto previo:** `d2921959578bc8c1db0a792a1a573bff539f77f5`
- **[UNKNOWN] LOCAL WORKTREE STATUS:** UNKNOWN; GitHub no expone el worktree local.
- **[VERIFIED] Producción modificada:** NO. Fase aislada en `tools/design_prototypes/rocket_bunny_phase6/`.
- **[VERIFIED] `.github/**`, `cari-studio/**`, `.agent/**` y Fases 3–5:** sin cambios.

### 1. Experimento
A/B causal:
- **A:** Nitro + Ram + Guard, Redline OFF.
- **B:** exactamente A + Redline ON.

Constantes: card pool/deck, enemigos, Enemy Intent, comportamiento, políticas, Energy, HP, max turns, RNG, variance y seeds.

**[VERIFIED]** Seeds 100001–110000: 10.000 paired seeds. 10.000 simulaciones principales por modelo. Las cinco políticas se ejecutaron sobre las mismas seeds.

**[NOT_RUN]** Modelo C opcional: omitido porque cambiar Ram/Guard además de Redline contaminaría la comparación; A/B ya aíslan la variable obligatoria.

### 2. Redline — reglas exactas
- **Coste:** 25 Nitro.
- **Activación:** antes de una carta legal.
- **Daño:** carta ×1.25.
- **Duración:** una resolución.
- **Siguiente golpe enemigo:** ×1.25.
- No crea Energy ni otro recurso.
- Si el enemigo sobrevive, ATTACK/SPECIAL puede devolver daño amplificado.

A mantiene Pump +35 Nitro; Ram −40 Nitro/+14 daño; Guard −25 Nitro/14 block.

### 3. Métricas principales
| Métrica | A OFF | B ON |
|---|---:|---:|
| Win rate | 53.27% | 55.18% |
| Avg turns | 5.4494 | 5.3874 |
| Median | 6 | 6 |
| Energy spent | 13.0467 | 12.8424 |
| Energy waste | 0.3015 | 0.3198 |
| Nitro generated | 33.1380 | 33.2605 |
| Nitro spent | 18.6865 | 20.4990 |
| Nitro spend frequency | 53.73% | 58.82% |
| ENEMY_ATTACK deaths | 4,673 | 4,482 |

**[VERIFIED]** B cambia el win rate +1.91 pp en este simulador; no es el criterio principal.

### 4. Nitro allocation
| Modelo | Ram | Guard | Redline |
|---|---:|---:|---:|
| A | 19.85% | 80.15% | 0% |
| B | 16.06% | 25.89% | 58.06% |

A: 1.326 Ram / 5.353 Guard. B: 1.201 Ram / 1.936 Guard / 4.342 Redline.

**[VERIFIED]** Redline no supera 95% ni cae por debajo de 5%.

Comparación histórica inspeccionada: Fase 4 ~76% Redline del gasto relacionado reportado; Fase 5 B = Ram 16.40%, Guard 29.46%, Redline 54.14%; Fase 6 B = 16.06%, 25.89%, 58.06%.

**[INFERRED]** Redline es el mayor consumidor en B, pero no el único.

### 5. Decision divergence A vs B
Política `adaptive`, paired seeds:
- **[VERIFIED] ACTION DIVERGENCE:** 40.80%.
- **[VERIFIED] TIMING DIVERGENCE:** 40.80%.
- **[VERIFIED] OUTCOME DIVERGENCE:** 2.07%.
- Avg action divergence: 2.3547.
- Avg timing divergence: 0.4342.

Timing = diferencia en las posiciones de activación Redline; A no tiene activaciones.

**[INFERRED]** Redline cambia la secuencia de decisiones sin cambiar las demás reglas.

### 6. Opportunity / missed opportunity
B adaptive:
- Opportunities: **12.949**.
- Activations: **4.342**.
- Missed: **8.607**.
- Activation/opportunity: **33.53%**.

**[INFERRED]** No es obligatoria.

### 7. Activación contextual
| Contexto | Opportunities | Activations |
|---|---:|---:|
| ATTACK | 2,574 | 3 |
| DEFEND | 10,375 | 4,339 |
| Player HP high | 4,316 | 4,036 |
| Player HP mid | 5,351 | 306 |
| Player HP low | 3,282 | 0 |
| Enemy HP high | 3,292 | 3,249 |
| Enemy HP mid | 5,058 | 965 |
| Enemy HP low | 4,599 | 128 |
| Nitro 25–39 | 10,779 | 4,080 |
| Nitro 40–69 | 2,129 | 262 |
| Nitro 70–100 | 41 | 0 |

**[VERIFIED]** El gasto depende del estado, no solamente del volumen de Nitro.

### 8. Riesgo / recompensa
**Beneficio — [VERIFIED]** B adaptive: 12.947 daño adicional medio por simulación; 4.342 activaciones; ~29.82 daño adicional/activación.

**Riesgo — [VERIFIED]** B adaptive: 1 evento de riesgo en 4.342 activaciones; +0.0011 daño entrante medio por simulación.

Traza real, seed **104391**:
- turno 4, ATTACK;
- Enemy HP 6 después de `REDLINE+ram`;
- Player HP 55;
- golpe base 45 → golpe Redline 56;
- **+11 daño entrante**;
- Nitro restante 10.

Política `redline` como prueba crítica: 1.838 activaciones, **580 risk events**, 31.56% de activaciones con riesgo; +3.2297 daño y +0.638 daño entrante medios por simulación.

**[INFERRED]** La relación riesgo/recompensa es observable en trazas; no prueba preferencia humana.

### 9. Counterfactuals predefinidos
| Estado | OFF | ON | Regla |
|---|---|---|---|
| 1 — HP85 / Enemy120 / Nitro80 / ATTACK | Ram | Redline+Ram | HP≥55 y Nitro≥25 |
| 2 — HP35 / Enemy90 / Nitro80 / ATTACK | Ram | Ram | HP<55 bloquea Redline |
| 3 — HP60 / Enemy45 / Nitro80 / DEFEND | Ram | Redline+Ram | HP≥55 y Nitro≥25 |
| 4 — HP60 / Enemy140 / Nitro50 / SPECIAL | Ram | Redline+Ram | HP≥55 y Nitro≥25 |

**[VERIFIED]** Los cuatro estados fueron fijados antes de interpretar resultados.

### 10. Dominance
Criterio fijo: **≥10 pp**.
- A spread: **5.91 pp**.
- B spread: **5.91 pp**.
- **[VERIFIED]** No se cruza 10 pp.

| Política | A | B |
|---|---:|---:|
| aggressive | 55.96% | 55.96% |
| defensive | 56.29% | 56.29% |
| generator | 50.38% | 50.38% |
| redline | 55.96% | 54.93% |
| adaptive | 53.27% | 55.18% |

### 11. Determinismo y tests
- **[VERIFIED]** `phase6_redline.test.mjs`: PASS.
- **[VERIFIED]** 10.000 seeds.
- **[VERIFIED]** A/B deterministas en muestra repetida de 250 seeds.
- **[VERIFIED]** Counterfactuals comprobados.
- **[VERIFIED]** A = 0 Redline uses; B >0.
- **[VERIFIED]** Sin dependencias externas.

### 12. Evidence states / límites
- **VERIFIED:** HEAD, seeds, reglas, simulaciones, métricas, divergence, allocation, contexto, riesgo, counterfactuals, dominance y determinismo.
- **INSPECTED:** continuidad Fases 4–5.
- **INFERRED:** Redline aporta decisión mecánica independiente bajo este modelo.
- **PROPOSED:** mantener candidato aislado.
- **UNKNOWN:** diversión, preferencias humanas, UX, retención y balance final.
- **NOT_RUN:** playtesting humano y modelo C.
- **BLOCKED:** ninguno.

Limitaciones: políticas heurísticas; seeds emparejadas solo al inicio; trayectorias divergentes pueden consumir RNG posterior distinto; riesgo/recompensa son métricas del simulador.

### 13. Final Gate
**[INFERRED] FINAL GATE: SUPPORTS**

A/B cambia decisiones en 40.80% de las seeds, mantiene utilidad contextual, no es obligatoria (>95%) ni irrelevante (<5%), y presenta riesgo/recompensa observable.

### 14. Design Decision
**[INFERRED] DESIGN DECISION: KEEP**

KEEP significa conservar Redline **solo como candidato de prototipo/diseño**, no integrarlo todavía al runtime. La evidencia causal justifica conservar la hipótesis; no demuestra diversión ni balance de producción.

### 15. Next experiment
**[PROPOSED] Fase 7 — coste de oportunidad de Redline.** Registrar, para cada gasto, Nitro que habría ido a Ram, a Guard, Nitro conservado y Nitro gastado en Redline. Objetivo: separar divergencia nueva de Redline frente a simple desplazamiento del presupuesto.

### 16. Git / scope
- **[VERIFIED]** 3 archivos nuevos.
- **[VERIFIED]** 0 modificaciones, 0 eliminaciones, 0 renombres.
- **[VERIFIED]** Un único commit.
- **[VERIFIED]** Commit: `feat: isolate Rocket Bunny Redline experiment`.
- **[UNKNOWN]** Local worktree: UNKNOWN.

### 17. FINAL SHA
**[VERIFIED AFTER COMMIT]** El SHA final exacto se registra en la verificación remota posterior al único commit de esta fase.