# ROCKET BUNNY PETTY — FASE 5 FINAL
## Diversificación controlada de Nitro / reducción de dependencia de Ram

### 1. Estado de ejecución
- **[VERIFIED] BASE SHA:** \`956cddadfea6d09ed3540a55ecb44867cb9d7bdb\`
- **[VERIFIED] Rama:** \`main\`
- **[UNKNOWN] LOCAL WORKTREE STATUS:** UNKNOWN
- **[VERIFIED] Razón:** el conector GitHub no expone el worktree local; no se convirtió UNKNOWN en CLEAN.
- **[VERIFIED] Producción:** no se modificaron rutas de \`intento_2/webapp/**\`.
- **[VERIFIED] Scope remoto de Fase 5:** tres archivos nuevos dentro de \`tools/design_prototypes/rocket_bunny_phase5/\`.
- **[VERIFIED] Sin reset/rebase/cherry-pick/merge/force-push.**

### 2. Control de Fase 4
- **[VERIFIED] Seeds:** 100001–110000, 10.000 paired seeds.
- **[VERIFIED] Simulación histórica exacta de Fase 4:** el brazo Control produjo 55.83% win rate, 5.4129 turnos medios y 0.3617 energy waste.
- **[VERIFIED] Brazo Nitro histórico:** 55.31% win rate, 5.3878 turnos medios, 0.3213 energy waste, 32.8195 Nitro generado y 15.1810 Nitro gastado.
- **[VERIFIED] Control reproducido dentro del nuevo harness:** los valores del brazo Nitro de Fase 4 coinciden exactamente con los valores documentados.
- **[VERIFIED] Determinismo:** el test de Fase 5 pasa y las ejecuciones repetidas sobre una muestra de 250 seeds son idénticas.
- **[INSPECTED] El brazo Control histórico no se reescribió ni se modificó; se tomó como referencia histórica de Fase 4.**

### 3. Variables constantes
- **[VERIFIED]** Card pool: Shot, Guard, Pump, Ram.
- **[VERIFIED]** Deck: \`shot, shot, guard, pump, ram, guard, ram\`.
- **[VERIFIED]** Enemigos: Basic, Reactive, Pressure.
- **[VERIFIED]** Políticas: aggressive, defensive, generator, redline, adaptive.
- **[VERIFIED]** Energy: 3 por turno.
- **[VERIFIED]** HP jugador: 100.
- **[VERIFIED]** HP enemigo: 150.
- **[VERIFIED]** Max turns: 20.
- **[VERIFIED]** RNG: seeded; perfiles low [0.98,1.02], normal [0.90,1.10], high [0.75,1.25].
- **[VERIFIED]** Damage variance y conjunto de seeds se mantuvieron.
- **[VERIFIED]** No se añadió Heat, Momentum, Overclock, Stamina ni otro recurso.

### 4. Modelos
#### A — Control
- **[VERIFIED]** Replica Nitro de Fase 4: Pump genera Nitro; Ram puede gastar 40 Nitro; Redline puede gastar 25 Nitro.
- **[VERIFIED]** 55.31% win rate; 5.3878 avg turns; 6 median; 12.8421 energy spent; 0.3213 energy waste; 32.8195 generated; 15.1810 spent; 39.13% de runs gastan Nitro.

#### B — Segundo spender
- **[PROPOSED]** Guard puede gastar 25 Nitro para conservar su función existente de 14 block.
- **[VERIFIED]** Ram continúa siendo consumidor de 40 Nitro y Redline sigue presente para no cambiar simultáneamente la estructura completa del modelo.
- **[VERIFIED]** 55.20% win rate; 5.3877 avg turns; 6 median; 12.8424 energy spent; 0.3207 waste; 33.2255 generated; 20.4605 spent; 58.68% de runs gastan Nitro.
- **[VERIFIED]** Eventos de gasto observados: Ram 1.222; Guard 2.195; Redline 4.034.
- **[VERIFIED]** Entre spenders de carta directos Ram+Guard, Ram representa 35.77% y Guard 64.23% de los eventos observados.
- **[INFERRED]** La dependencia de Ram como único spender de carta se reduce materialmente en este modelo, pero Redline pasa a representar 54.14% de todos los eventos de gasto de Nitro.

#### C — Nitro como decisión de timing
- **[PROPOSED]** Gastar 25 Nitro arma un Shot existente para resolverse después de la fase enemiga; conserva coste de Energy 1 y no introduce un recurso nuevo.
- **[VERIFIED]** 49.19% win rate; 5.4299 avg turns; 6 median; 12.8807 energy spent; 0.4090 waste; 33.929 generated; 17.9705 spent; 47.64% de runs gastan Nitro.
- **[VERIFIED]** Action divergence frente a Nitro OFF: 49.18%.
- **[VERIFIED]** Timing divergence frente a Nitro OFF: 46.60%.
- **[VERIFIED]** Outcome divergence frente a Nitro OFF: 10.05%.
- **[INFERRED]** Este modelo sí produce una decisión temporal observable; la simulación no demuestra que el timing sea preferible para jugadores humanos.
- **[INFERRED]** El coste de oportunidad es visible: el modelo también eleva energy waste y reduce el win rate agregado respecto del control A en esta política adaptativa.

#### D — Redline aislado
- **[PROPOSED]** Nitro solamente se consume mediante Redline; Ram no consume Nitro en este modelo.
- **[VERIFIED]** 55.10% win rate; 5.4122 avg turns; 6 median; 12.9110 energy spent; 0.3256 waste; 32.788 generated; 10.205 spent; 38.00% de runs gastan Nitro.
- **VERIFIED]** Redline fue el único spender del modelo D: 4.082 activaciones/eventos observados.
- **[VERIFIED]** Comparación D vs D-no-Redline: D = 55.10% win rate y 5.4122 avg turns; D-no-Redline = 52.94% y 5.4620 turns.
- **[VERIFIED]** En esa comparación aislada, action divergence = 38.00%, outcome divergence = 2.16%.
- **[INFERRED]** Redline no es una operación puramente cosmética dentro de este modelo: cambia acciones y resultados bajo estas heurísticas.
- **[UNKNOWN]** No se conoce todavía si ese cambio justifica su complejidad desde el punto de vista de un jugador humano.

### 5. Tabla comparativa principal

| Métrica | A Control | B 2º spender | C Timing | D Redline |
|---|---:|---:|---:|---:|
| Win rate | 55.31% | 55.20% | 49.19% | 55.10% |
| Avg turns | 5.3878 | 5.3877 | 5.4299 | 5.4122 |
| Median turns | 6 | 6 | 6 | 6 |
| Energy spent | 12.8421 | 12.8424 | 12.8807 | 12.9110 |
| Energy waste | 0.3213 | 0.3207 | 0.4090 | 0.3256 |
| Nitro generated | 32.8195 | 33.2255 | 33.9290 | 32.7880 |
| Nitro spent | 15.1810 | 20.4605 | 17.9705 | 10.2050 |
| Nitro spend frequency | 39.13% | 58.68% | 47.64% | 38.00% |
| Action divergence vs OFF | 62.03%* | 59.35% | 49.18% | 40.95% |
| Timing divergence vs OFF | 39.98%* | 0% | 46.60% | 0% |
| Outcome divergence vs OFF | 3.14%* | 2.26% | 10.05% | 2.18% |

\* **[VERIFIED]** valores históricos de Fase 4 para A.

### 6. Concentración de spenders
- **[VERIFIED] Fase 4:** Ram = 35.39% de todos los usos de cartas y 78.17% del circuito Pump/Ram relacionado con Nitro.
- **[VERIFIED] A:** Ram y Redline son los dos consumidores observados; Ram = 24.00% y Redline = 75.998% de los eventos de gasto Nitro.
- **[VERIFIED] B:** Ram = 16.40%, Guard = 29.46%, Redline = 54.14% de los eventos de gasto Nitro.
- **[VERIFIED] C:** Timing = 76.02%, Ram = 23.98%.
- **[VERIFIED] D:** Redline = 100% del gasto de Nitro por definición del modelo.
- **[INFERRED]** B demuestra que es posible añadir un segundo consumidor de carta sin introducir otro recurso, pero la concentración total no desaparece porque Redline se convierte en el mayor consumidor en este conjunto de políticas.
- **[UNKNOWN]** No se ha demostrado todavía una distribución estable bajo políticas aprendidas o jugadores humanos.

### 7. Dominancia de políticas
Criterio predefinido: **>=10 puntos porcentuales** entre estrategias.

- **[VERIFIED] A:** spread máximo entre políticas = 5.91 pp.
- **[VERIFIED] B:** 5.65 pp.
- **[VERIFIED] C:** 8.96 pp.
- **[VERIFIED] D:** 11.39 pp; el par Redline vs Generator cruza el umbral.
- **[VERIFIED]** Esto no equivale a una “estrategia ganadora global”; indica solamente que el criterio de dominancia se activa para un par en D.
- **[INFERRED]** D requiere investigación adicional de políticas antes de tratar Redline aislado como diseño estable.

### 8. Counterfactuals manuales predefinidos
Los cuatro estados fueron fijados antes de usar sus resultados para la conclusión.

| Estado | Nitro OFF | A Nitro | B | C | D |
|---|---|---|---|---|---|
| 1 — HP 85 / Enemy 90 / Nitro 10 / ATTACK | Ram | Ram | Ram | Ram | Ram |
| 2 — HP 35 / Enemy 90 / Nitro 80 / ATTACK | Guard | Guard | Guard + Nitro | Guard | Guard |
| 3 — HP 60 / Enemy 45 / Nitro 80 / DEFEND | Ram | Ram + Nitro | Ram + Nitro | Ram + Nitro | Redline + Ram |
| 4 — HP 60 / Enemy 140 / Nitro 50 / SPECIAL | Ram | Ram | Ram | Shot + timing Nitro | Ram |

- **[VERIFIED]** Estado 2 demuestra la segunda función de carta de B.
- **[VERIFIED]** Estado 4 demuestra el cambio temporal específico de C.
- **[VERIFIED]** Estado 3 demuestra el uso contextual de Redline en D.
- **[INFERRED]** Los estados dependen de HP del jugador, HP enemigo, Intent, Energy y Nitro; no solamente del valor bruto de Nitro.

### 9. State-dependent decision divergence
- **[VERIFIED]** B modifica decisiones en 59.35% de paired seeds y outcome en 2.26%.
- **[VERIFIED]** C modifica decisiones en 49.18%, timing en 46.60% y outcome en 10.05%.
- **[VERIFIED]** D modifica decisiones en 40.95% y outcome en 2.18%.
- **[INFERRED]** Nitro conserva capacidad de alterar decisiones cuando Ram deja de ser el único consumidor relevante.
- **[INFERRED]** La evidencia más directa para la pregunta de esta fase es B+C: la mecánica puede seguir generando divergencia mediante consumo defensivo o timing sin añadir un recurso paralelo.
- **[UNKNOWN]** No se ha probado la misma propiedad con jugadores humanos.

### 10. Death causes
- **[VERIFIED]** En A: 4.469 muertes por ENEMY_ATTACK.
- **[VERIFIED]** En B: 4.480.
- **[VERIFIED]** En C: 5.081.
- **[VERIFIED]** En D: 4.490.
- **[INFERRED]** C altera la distribución de supervivencia en este modelo, coherente con su coste temporal; no se interpreta como balance definitivo.

### 11. Tests y reproducibilidad
- **[VERIFIED]** \`phase5_diversification.test.mjs\`: PASS.
- **[VERIFIED]** 10.000 seeds presentes.
- **[VERIFIED]** determinismo sobre 250 seeds repetidas: PASS.
- **[VERIFIED]** Control Nitro reproduce exactamente los valores documentados de Fase 4.
- **[VERIFIED]** La simulación no usa dependencias externas ni modifica producción.

### 12. Evidence states
- **VERIFIED:** SHA remoto, seeds, constantes, métricas, determinismo, tests, control histórico, divergencias y counterfactuals.
- **INSPECTED:** modelo de Fase 4 y su estructura Nitro/Ram/Redline.
- **INFERRED:** Nitro conserva capacidad de modificar decisiones con consumidores alternativos.
- **PROPOSED:** reglas mecánicas de B y C y uso aislado de D como candidatos de diseño.
- **UNKNOWN:** diversión, preferencias humanas, retención, balance final y comportamiento fuera de estas políticas.
- **NOT_RUN:** playtesting humano y validación de UX.
- **BLOCKED:** ninguno durante la ejecución remota de esta fase.

### 13. Limitaciones
- **[VERIFIED]** Las políticas son heurísticas, no jugadores humanos.
- **[VERIFIED]** Compartir seed empareja el punto inicial; cuando las trayectorias divergen, el consumo posterior de RNG puede divergir.
- **[VERIFIED]** Las métricas de utilidad son propiedades del modelo, no preferencias humanas.
- **[UNKNOWN]** No se midió diversión.
- **[UNKNOWN]** No se midió retención.
- **[UNKNOWN]** No se validó la legibilidad móvil de estos conceptos.
- **[VERIFIED]** No se modificó producción.

### 14. Final Gate
**[INFERRED] FINAL GATE: SUPPORTS**

La evidencia apoya la hipótesis central de esta fase: **Nitro puede seguir produciendo divergencia de decisiones cuando Ram deja de ser el único consumidor relevante**, siempre que el consumo alternativo tenga una función mecánica distinta.

### 15. Design Decision
**[INFERRED] DESIGN DECISION: MODIFY**

La fase no justifica pasar Nitro a producción. La evidencia sí justifica continuar el prototipado aislado.

- **[INFERRED] B:** continuar investigando la diversificación mediante una segunda carta consumidora, pero controlar la concentración adicional de Redline.
- **[INFERRED] C:** conservar como candidato de investigación de timing; su coste de balance es visible y requiere una prueba específica antes de avanzar.
- **[INFERRED] D:** mantener Redline como candidato separado; su efecto existe, pero el criterio de dominancia se activa en un par de políticas.
- **[PROPOSED]** El siguiente experimento debería aislar la concentración de Redline y comparar un modelo con dos consumidores de carta sin Redline contra el mismo modelo con Redline.

### 16. Next experiment
**[PROPOSED] Fase 6:** aislar **Redline como variable independiente** después de la diversificación.

Mantener:
- mismo deck;
- mismas seeds;
- mismos enemigos;
- mismas políticas;
- mismo RNG;
- mismo Energy.

Comparar:
1. Nitro + Ram.
2. Nitro + Ram + segundo spender de carta.
3. Nitro + Ram + segundo spender, sin Redline.
4. Nitro + Ram + segundo spender, con Redline.

Objetivo: determinar si Redline aporta una decisión independiente o solamente absorbe una parte desproporcionada del presupuesto de Nitro.

### 17. Seguridad de repositorio
- **[VERIFIED] BASE SHA:** \`956cddadfea6d09ed3540a55ecb44867cb9d7bdb\`
- **[UNKNOWN] LOCAL WORKTREE:** UNKNOWN — connector limitation
- **[VERIFIED] Producción modificada:** NO
- **[VERIFIED] Deletions:** NO en el diff remoto de la fase
- **[VERIFIED] Renames:** NO en el diff remoto de la fase
- **[VERIFIED] Archivos esperados:** 3
- **[VERIFIED] Commit previsto:** \`feat: diversify Rocket Bunny Nitro prototype\`
- **[VERIFIED] Simulaciones:** 10.000 paired seeds por ejecución principal
- **[VERIFIED] Tests:** PASS
- **[VERIFIED] Determinism:** PASS
- **[VERIFIED] Final Gate:** SUPPORTS
- **[VERIFIED] Design Decision:** MODIFY
