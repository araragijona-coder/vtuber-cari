# ROCKET BUNNY PETTY — FASE 8 FINAL
## Coste de oportunidad de Redline

### Git / estado
- [VERIFIED] Base obligatoria: c0a3cb899e8dc95846ef51200f11693844a901ea.
- [VERIFIED] HEAD remoto de main antes de modificar: c0a3cb899e8dc95846ef51200f11693844a901ea.
- [UNKNOWN] LOCAL WORKTREE STATUS = UNKNOWN.
- [VERIFIED] No se creó branch y no se usaron reset, rebase, cherry-pick, merge ni force push.
- [VERIFIED] Scope: exactamente 3 archivos nuevos bajo tools/design_prototypes/rocket_bunny_phase8/.
- [VERIFIED] No se tocaron intento_2/webapp/**, .github/**, cari-studio/**, .agent/** ni runtime de producción.
- [NOTE] El SHA de un commit es content-addressed; por eso el archivo no puede contener el SHA final literal antes de crear el commit. El SHA final se verifica en Git y se reporta al cierre de la fase.

### Diseño
A = control exacto de Fase 6/7: Nitro + Ram + Guard, Redline OFF.
B = reproducción exacta de Fase 6/7: mismo modelo con Redline ON.
C = opportunity ledger sobre las trazas exactas de B; no cambia mecánicas.
Constantes: deck, cards, enemies, intent, adaptive policy, Energy, RNG, variance normal, Nitro generation, victory/defeat y max turns.
Seeds: 100001–110000, exactamente 10.000 paired seeds.
Simulación primaria: 20.000 ejecuciones. Replays deterministas: 250 A + 250 B.

### Reproducción A/B
| Métrica | A OFF | B ON |
|---|---:|---:|
| Win rate | 53.27% | 55.18% |
| Avg turns | 5.4494 | 5.3874 |
| Nitro generated | 33.1380 | 33.2605 |
| Nitro spent | 18.6865 | 20.4990 |
| Nitro remaining | 14.4505 | 12.7615 |

[VERIFIED] Coincide con Fase 7.

### Nitro ledger
| Modelo | Ram | Guard | Redline |
|---|---:|---:|---:|
| A | 53,040 | 133,825 | 0 |
| B | 48,040 | 48,400 | 108,550 |

B shares: Ram 23.44%, Guard 23.61%, Redline 52.95%.
A→B: Ram -5,000; Guard -85,425; Redline +108,550 Nitro.
B gasta +18,125 Nitro total por 10.000 runs = +1.8125/run.
[VERIFIED] Redline concentra 52.95% del Nitro gastado en B.
[INFERRED] No es una transferencia uno-a-uno: B gasta más Nitro y conserva menos.

### Redline opportunities
- Opportunities: 12,949.
- Activations: 4,342.
- Activation/opportunity: 33.53%.
- Ram legal como consumidor de Nitro: 1,339 = 10.34%.
- Guard legal como consumidor de Nitro: 9,518 = 73.50%.
- Ambos legales: 584 = 4.51%.

### Coste de oportunidad directo
Para evitar una utilidad arbitraria, el desplazamiento directo solo se reconoce cuando el estado B coincide exactamente con una traza A por turn, HP, enemy HP, Energy, Nitro, intent y hand.
- Estados equivalentes para activaciones Redline: 4,080/4,342 = 93.97%.
- Dentro de esos 4,080: reemplazo Ram = 0; reemplazo Guard = 0; A eligió otro resultado = 4,080.
- 262 activaciones = 6.03% no tuvieron estado A exactamente equivalente y no se clasifican.
[VERIFIED] Direct displaced Nitro from Ram = 0.
[VERIFIED] Direct displaced Nitro from Guard = 0.
[INFERRED] El coste de oportunidad aparece como alternativa legal disponible, no como sustitución directa demostrada por la política paired.

### Beneficio ofensivo
El campo histórico Fase 6 'redlineExtraDamage' = 12.947 representa el daño total de la carta afectada, no bonus puro.
Efecto mecánico:
- Multiplicador x1.25.
- Ram con +14 Nitro: 40 nominal → 50 con Redline; bonus nominal +10.
- Bajo variance normal [0.90, 1.10], bonus aproximado 9–11.
- Cambio real medio de enemy HP por activación Redline: -29.7582.
[VERIFIED] Beneficio ofensivo separado del coste defensivo.
[INFERRED] 12.947 no debe llamarse '+12.947 bonus'.

### Coste defensivo / riesgo
Activaciones por intent:
| Intent | Opportunities | Activations | Incoming base | Incoming con Redline |
|---|---:|---:|---:|---:|
| ATTACK | 2,574 | 3 | 45 | 56 |
| DEFEND | 10,375 | 4,339 | 0 | 0 |
| SPECIAL | 0 | 0 | 18 | 23 |

Resultado observado:
- 1 evento real de riesgo Redline.
- Mean extra incoming: 0.0011/run.
[VERIFIED] El riesgo se materializó una vez en las 10.000 B runs.
[UNKNOWN] SPECIAL no permite inferencia porque el enemigo básico no lo generó.

### Redline vs Ram
No hubo activaciones Redline con Ram legal como consumidor de Nitro.
[VERIFIED] Observed Redline→Ram direct replacements = 0.
[INFERRED] La política adaptive consume Ram antes de Redline cuando Ram +40 Nitro es legal.
Mecánica: Ram 40 Nitro/40 nominal; Redline+Ram 25 Nitro/50 nominal; bonus nominal +10; Redline puede amplificar el siguiente hit enemigo.

### Redline vs Guard
Guard legal en 73.50% de las oportunidades.
Guard cuesta 25 Nitro y aporta 14 block.
Redline cuesta 25 Nitro y aporta +25% a la carta afectada, con posible +25% al siguiente hit enemigo.
[VERIFIED] Guard es una alternativa mecánica frecuente.
[VERIFIED] No hubo sustitución directa de Guard en estados paired exactos.
[INFERRED] El coste de oportunidad frente a Guard es potencial y contextual, no una pérdida demostrada en cada activación.

### Counterfactuals
Los estados pedidos no especifican mano. Para hacer comparables Ram/Guard/Redline se fijó explícitamente hand = [ram, guard, shot].
[INFERRED] Sin una mano, los cuatro estados están subespecificados.

| Estado | Redline | Ram | Guard |
|---|---|---|---|
| A HP90 / Enemy80 / E2 / N80 / ATTACK | 50 nominal, +10; incoming 56 | 40; incoming 45 | 14 block; residual 31 |
| B HP35 / Enemy80 / E2 / N80 / ATTACK | 50 nominal, +10; incoming 56 | 40; incoming 45 | 14 block; residual 31 |
| C HP90 / Enemy25 / E2 / N80 / DEFEND | 50 nominal, +10; no incoming | 40 | 14 block; no incoming |
| D HP50 / Enemy100 / E2 / N50 / SPECIAL | 50 nominal, +10; incoming 23 | 40; incoming 18 | 14 block; residual 4 |

[VERIFIED] No se creó una función de 'mejor jugada' ni una puntuación compuesta.

### Concentration / dominance
B Nitro share: Redline 52.95%, Guard 23.61%, Ram 23.44%.
[VERIFIED] Redline supera 10 pp frente a cada consumidor individual.
[VERIFIED] Se reporta como concentración, no como dominancia.
[INFERRED] La concentración por sí sola no demuestra desaparición de las demás decisiones.

### Determinismo / tests
- A: 250 seeds repetidas PASS.
- B: 250 seeds repetidas PASS.
- Tests: Nitro ledger, opportunity detection, Ram/Guard availability, displaced spender detection, bonus damage, amplified incoming, counterfactual consistency y deterministic replay.
- [VERIFIED] phase8_redline_opportunity.test.mjs: PASS.
- [VERIFIED] Determinism A/B: PASS.

### Limitaciones / evidence state
- [VERIFIED] Policies are heuristic; no player preference inference.
- [VERIFIED] Paired matching exige estado observable idéntico.
- [VERIFIED] SPECIAL no fue observado.
- [INFERRED] El coste de oportunidad potencial requiere aislamiento adicional.
- [UNKNOWN] diversión, preferencia humana, UX y balance de producción.
- [NOT RUN] playtesting humano.
- [BLOCKED] ninguno.

### FINAL GATE
**SUPPORTS**

Interpretación limitada: Redline aporta beneficio ofensivo y riesgo defensivo medibles y consume un recurso que frecuentemente podría financiar Guard; sin embargo, el control paired no demuestra sustitución directa de Ram/Guard.

### DESIGN DECISION
**MODIFY**

Motivo: concentración alta (52.95%), Guard disponible en 73.50% de oportunidades, pero ausencia de sustitución directa demostrada. El siguiente paso debe modificar el experimento, no integrar Redline al runtime.

### Próximo experimento
**Fase 9 — forced-choice opportunity isolation**:
1. Filtrar estados donde Redline+Guard sean simultáneamente legales.
2. Congelar estado y RNG.
3. Ejecutar ramas separadas Redline / Guard / sin spender Nitro.
4. Repetir con Ram legal.
5. Medir daño, block, incoming y HP final por separado.
6. Mantener seeds paired y sin función de utilidad.
7. No tocar runtime.

### Evidence summary
- VERIFIED: base, HEAD, reproducción, 20.000 runs primarios, opportunity ledger, allocation, concentration, counterfactuals, determinism y tests.
- INSPECTED: continuidad Fase 6/7.
- INFERRED: coste potencial, ausencia de sustitución directa bajo la política current.
- PROPOSED: Fase 9.
- UNKNOWN: UX/diversión/balance humano.
- NOT RUN: playtesting.
- BLOCKED: ninguno.

### Git final
- [VERIFIED] Un único commit requerido: feat: analyze Rocket Bunny Redline opportunity cost.
- [UNKNOWN] Final SHA literal antes de crear el commit: no computable sin cambiar el contenido del propio commit.
- [UNKNOWN] LOCAL WORKTREE STATUS = UNKNOWN.
