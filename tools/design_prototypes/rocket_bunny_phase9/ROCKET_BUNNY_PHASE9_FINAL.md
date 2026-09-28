# ROCKET BUNNY PETTY — FASE 9 FINAL
## Forced-choice opportunity isolation

### 1. Git / estado
- [VERIFIED] Base SHA: 6c89c320d93937f7f13769dcb928becb394109ee.
- [VERIFIED] HEAD remoto previo: 6c89c320d93937f7f13769dcb928becb394109ee.
- [UNKNOWN] LOCAL WORKTREE STATUS = UNKNOWN.
- [VERIFIED] Sin reset, rebase, cherry-pick, merge, force push ni branches.
- [VERIFIED] Solo 3 archivos nuevos bajo tools/design_prototypes/rocket_bunny_phase9/.
- [VERIFIED] Producción y fases anteriores sin modificaciones.
- [NOTE] El SHA final se verifica después del commit.

### 2. Diseño
[VERIFIED] Se ejecuta primero el modelo B real sobre 10.000 seeds y se extraen estados donde Redline es legal. Cada estado se congela y se ramifica independientemente:
REDLINE / GUARD / RAM / NO-SPENDER cuando sea legal.
No existe política para elegir una rama ni función de utilidad.

### 3. Seeds y simulaciones
- [VERIFIED] Seeds: 100001–110000; 10.000 exactas.
- [VERIFIED] Simulación normal de extracción: 10.000.
- [VERIFIED] Estados congelados únicos unión A+B: 10.274.
- [VERIFIED] Ramas forzadas: Redline 10.274; Guard 9.548; Ram 1.687; No-spender 9.406.
- [VERIFIED] Ejecuciones primarias: 40.915.
- [VERIFIED] Replay determinista: hasta 250 estados reales.

### 4. Sets
| Set | Condición | Estados |
|---|---|---:|
| A | Redline + Guard | 9.548 |
| B | Redline + Ram | 1.687 |
| C | Redline + Guard + Ram | 961 |
| Unión | A + B deduplicado | 10.274 |

[VERIFIED] Ningún estado fue fabricado para ampliar la muestra.

### 5. No-spender
- Unión: 9.406 / 10.274 = 91,55%.
- A: 8.680 / 9.548 = 90,91%.
- B: 1.552 / 1.687 = 92,00%.
- C: 826 / 961 = 85,95%.

[VERIFIED] No-spender = Shot cuando Shot es legal. Si no, queda unavailable.

### 6. Estado congelado
Se conserva seed, turn, HP de ambos, Energy, Nitro, intent, hand, draw pile, discard, enemy state, acciones legales, Redline/Guard/Ram legality, Redline pending, block y estado interno del xorshift RNG.

[VERIFIED] Todas las ramas comienzan con el mismo stateKey y ejecuciones independientes.
[VERIFIED] La acción forzada termina la secuencia de acciones de ese turno y después se resuelve la respuesta enemiga; así se evita contaminar la comparación con decisiones posteriores de la política adaptive.

### 7. RNG
[VERIFIED] El PRNG de Phase 6 se instrumenta solo en memoria para exponer su estado.
[VERIFIED] Todas las ramas parten del mismo RNG state.
[INFERRED] Después de la acción forzada, el consumo de RNG puede divergir si las acciones consumen diferente cantidad de draws; la comparación causal se limita a la acción forzada y a la respuesta inmediata.

### 8. SET A — Redline + Guard
| Métrica | Redline | Guard |
|---|---:|---:|
| Estados | 9.548 | 9.548 |
| Nitro cost | 25 | 25 |
| Nitro neto medio | 24,9120 | 25,0000 |
| Daño directo medio | 21,3421 | 0 |
| Daño recibido medio | 6,0326 | 5,3564 |
| Energy media | 1,4949 | 1,0000 |

[VERIFIED] Redline − Guard:
- daño directo: +21,3421
- daño recibido: +0,6762
- coste nominal Nitro: 0
- Energy: +0,4949

### 9. SET B — Redline + Ram
| Métrica | Redline | Ram |
|---|---:|---:|
| Estados | 1.687 | 1.687 |
| Nitro cost | 25 | 40 |
| Nitro neto medio | 25,0000 | 40,0000 |
| Daño directo medio | 25,6959 | 29,3604 |
| Daño recibido medio | 1,5679 | 0,7706 |
| Energy media | 1,9941 | 2,0000 |

[VERIFIED] Redline − Ram:
- Nitro nominal: −15
- daño directo: −3,6645
- daño recibido: +0,7973
- Energy: −0,0059

### 10. SET C — triple
| Métrica | Redline | Guard | Ram |
|---|---:|---:|---:|
| Estados | 961 | 961 | 961 |
| Nitro cost | 25 | 25 | 40 |
| Daño directo medio | 25,0562 | 0 | 28,5213 |
| Daño recibido medio | 2,7523 | 4,2300 | 1,3528 |
| Energy media | 1,9896 | 1,0000 | 2,0000 |

[VERIFIED] Redline − Guard: +25,0562 daño; −1,4776 daño recibido; +0,9896 Energy; mismo coste nominal.
[VERIFIED] Redline − Ram: −3,4651 daño; +1,3996 daño recibido; −15 Nitro; −0,0104 Energy.

### 11. Redline vs No-spender
| Set | Estados | Δ daño | Δ daño recibido | Δ Nitro |
|---|---:|---:|---:|---:|
| A | 8.680 | +3,8632 | +0,2911 | +25 |
| B | 1.552 | +9,6108 | −0,6553 | +25 |
| C | 826 | +9,2724 | −1,2312 | +25 |

[VERIFIED] Redline produce daño directo adicional frente a no gastar Nitro.
[INFERRED] El daño recibido no es un atributo fijo de Redline; depende del estado y de si existe respuesta enemiga.

### 12. Carta afectada
SET A:
- Ram 49,49%
- Shot 29,83%
- Guard 20,43%
- Pump 0,25%

SET B:
- Ram 99,41%
- Guard 0,59%

SET C:
- Ram 98,96%
- Guard 1,04%

[VERIFIED] Redline puede afectar distintas cartas; en los estados donde Ram compite directamente, Ram concentra la selección.

### 13. Riesgo
Definición: RISK EVENT = existe respuesta enemiga y Redline amplifica el golpe siguiente según la implementación de Phase 6.

ATTACK:
- 2.101 estados Redline.
- 1.994 risk events.
- 94,91% tuvieron respuesta amplificada.
- Golpe bruto: 45 → 56.

DEFEND:
- 8.173 estados.
- 0 risk events.

SPECIAL:
- 0 estados.
- [UNKNOWN] El enemigo básico no generó SPECIAL en estos candidatos.

[VERIFIED] El riesgo se mide como evento mecánico real, no como etiqueta conceptual.

### 14. Beneficio ofensivo / coste defensivo
[VERIFIED] Se mantienen separados:
- beneficio ofensivo = daño de la carta forzada;
- coste defensivo = daño recibido en la respuesta;
- coste de recurso = Nitro cost;
- timing = Energy gastada;
- riesgo = amplificación real del golpe enemigo.

No se usa una puntuación compuesta.

### 15. Counterfactuals manuales
[VERIFIED] Los cuatro estados conceptuales anteriores son MANUALLY CONSTRUCTED y no se mezclan con estadísticas reales.

Supuesto explícito: hand = [shot, guard, pump, ram].

Valores nominales:
- A ATTACK: Redline+Ram 50; Guard bloquea 14; Ram 40.
- B ATTACK: mismas consecuencias mecánicas nominales; cambia el HP inicial.
- C DEFEND: no existe golpe enemigo que amplificar.
- D SPECIAL: si SPECIAL existe, 18 → 23 con Redline; no se observó SPECIAL en los candidatos reales.

### 16. Determinismo
[VERIFIED] PASS.
Misma seed + mismo estado congelado + misma acción forzada produjo la misma traza y resultado en hasta 250 estados.

### 17. Tests
[VERIFIED] PASS en runtime JavaScript aislado usando el código exacto de Phase 6 recuperado desde el SHA base.

Cubiertos:
- state freezing
- deep branch isolation
- forced Redline
- forced Guard
- forced Ram
- no-spender handling
- RNG snapshot
- damage accounting
- Nitro accounting
- player HP accounting
- enemy HP accounting
- deterministic replay

[VERIFIED] Las assertions del test cubren 10.000 seeds, A=9.548, B=1.687, C=961, unión=10.274, no-spender=9.406 y determinismo.

### 18. Limitaciones
- [VERIFIED] Phase 6 no fue modificada; la instrumentación existe solo en memoria.
- [INFERRED] La respuesta enemiga corresponde al turno inmediatamente posterior a la acción forzada.
- [INFERRED] El RNG posterior puede divergir después del punto causal.
- [VERIFIED] No-spender no significa pasar turno.
- [UNKNOWN] Diversión, preferencia humana, UX y balance de producción.
- [NOT RUN] Playtesting humano.
- [NOT RUN] Integración runtime.

### 19. Interpretación
[VERIFIED] En estados idénticos:
1. Redline cambia defensa por daño cuando compite con Guard.
2. Redline cuesta 15 Nitro menos que Ram y produce una consecuencia ofensiva distinta.
3. Redline añade daño directo frente a No-spender.
4. El riesgo de amplificar el siguiente golpe se materializa bajo ATTACK.
5. SET C demuestra coexistencia real de Redline, Guard y Ram.

[INFERRED] La evidencia de esta fase separa Redline de una simple redistribución abstracta de Nitro.

No se afirma que una alternativa sea globalmente mejor.

### 20. Evidence classification
- VERIFIED: base gate, seeds, candidate sets, frozen state, forced branches, metrics, RNG snapshot, deterministic replay y tests.
- INSPECTED: continuidad Phase 6/7/8.
- INFERRED: Redline tiene una consecuencia mecánica específica distinta de un spender genérico.
- PROPOSED: Phase 10 de sensibilidad coste/riesgo.
- UNKNOWN: balance humano y producción.
- NOT RUN: playtesting.
- BLOCKED: none.

### 21. FINAL GATE
**SUPPORTS**

La evidencia soporta específicamente la hipótesis experimental de que Redline produce consecuencias mecánicas distinguibles cuando las alternativas parten del mismo estado congelado.

### 22. DESIGN DECISION
**RESEARCH MORE**

La fase no justifica integración al runtime ni fija un balance definitivo.

### 23. Próximo experimento
**FASE 10 — REDLINE COST/RISK SENSITIVITY**

1. Mantener los mismos estados de SET C.
2. Probar costes Redline 20 / 25 / 30 Nitro.
3. Mantener inicialmente el multiplicador ofensivo fijo.
4. Separar amplificación defensiva ON/OFF.
5. Medir daño, incoming, risk events, Energy y Nitro.
6. No usar win rate como métrica principal.
7. No modificar runtime.

### 24. Git final
- [VERIFIED] Commit requerido: feat: isolate Rocket Bunny Redline opportunity choices
- [UNKNOWN] Final SHA: se verifica al cerrar el commit.
- [UNKNOWN] LOCAL WORKTREE STATUS = UNKNOWN.
