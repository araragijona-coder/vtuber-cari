# Rocket Bunny Petty — Experiment Ledger
Historical phase records remain authoritative.

## Phase 10
Base: 80950c74b914c49c897147b4b712a3d1733b211f
Historical Phase 9: 9d238f1533bcbc4c7cbefb3684a0b918cbd1e386
Question: Redline cost 20/25/30 and defensive amplification.
Method: 10,000 seeds per cost plus exact Phase 9 frozen-state analysis; separate cost-25 amplification test.
Control: A=9,548; B=1,687; C=961; Union=10,274; deterministic replay PASS.
Result: 20 -> 12,729 opportunities / 4,535 activations; 25 -> 12,171 / 4,311; 30 -> 12,171 / 4,311. No 25–29 opportunity observations occurred. Divergence: 20 vs 25 action/timing 2.23%, outcome 0.13%; 25 vs 30 all 0%.
Frozen union: all 10,274 states have Nitro >=30, so forced resolution is identical at all three costs.
Phase 10B: cost 25 fixed; amplification changes ATTACK incoming 45->56 while resource/action accounting remains unchanged.
Decision: SUPPORTS / MODIFY.
Next: targeted 25–29 Nitro state generation and human playtest.

## Phase 11
Base: b9ccbe8bfea3f1c2e1e1cc24321182c87dc68e99
Question: Can valid Nitro 25–29 states be generated without changing the historical Redline/Nitro mechanics?
Method: exact Phase 9 control first; 10,000-seed adaptive reachability audit; controlled action-selection harness using exact Phase 6 runtime; 250-seed deterministic replay.
Control: A=9,548; B=1,687; C=961; Union=10,274; PASS.
Result: historical Nitro values preserve modulo 5. Nitro 26–29 are unreachable. One mechanically reached Nitro-25 proof state was reproduced at seed 107771; it is not a >=500-state population.
Decision: BLOCKED / RESEARCH MORE. Full cost-25-vs-30 paired damage/risk experiment was not run.

## Phase 14 — evidence chain
Phase 14-A: COMPLETED — AUTHENTIC causal experimental evidence.
Phase 14-B: COMPLETED — AUTHENTIC HISTORICAL PAIRED EVIDENCE.

Phase 14-C: COMPLETED in the project phase history. The original Phase 14-C bootstrap procedure and historical interval values are not recoverable from the current repository evidence.

Phase 14-D: COMPLETED in the project phase history. No missing Phase 14-C bootstrap result is relabeled as recovered evidence.

Phase 14-E: COMPLETED — RECONSTRUCTED_WITH_EXPLICIT_METHOD.

Phase 14-E reconstructs statistical analysis from the immutable Phase 14-B evidence using an explicit paired-bootstrap method. Its own provenance states:
- ORIGINAL BOOTSTRAP PROCEDURE NOT RECOVERABLE.
- HISTORICAL INTERVALS NOT AVAILABLE FOR EXACT HISTORICAL REPRODUCTION.
- Historical artifact unchanged.
- Gameplay/design changes: NONE.

The Phase 14-E reconstruction is therefore not:
- recovered Phase 14-C;
- the original Phase 14-C result;
- a historical bootstrap reproduction;
- new gameplay evidence.

This ledger records evidence state only; it does not authorize gameplay or runtime changes.

## Current evidence boundary
Human playtesting: UNKNOWN / NOT RUN.

Nitro / Redline: OPEN DESIGN QUESTION.

No formal subsequent Phase 15 was defined in the repository before the documentation synchronization task.

## Post-Phase 16 — statistical specification repair

The first authorized Phase 16 execution attempt was BLOCKED before experimental population generation because the preregistered pairwise section specified paired contrasts, paired mean differences, 95% CIs and Holm correction but did not specify the inferential test producing the 15 pairwise p-values.

The repair is specification-only. No experimental data were generated and no historical evidence was changed.

### Repaired pairwise inferential procedure

For each co-primary metric independently:

- Omnibus test: Friedman test across N25–N30, two-sided, alpha = 0.05.
- Pairwise inferential test: **two-sided Wilcoxon signed-rank test** on the within-baseline paired differences for each preregistered Nitro pair.
- Pairing unit: complete historical baseline containing all six conditions.
- Number of pairwise contrasts: 15.
- Pairwise p-value: construct the signed-rank statistic from non-zero paired differences; rank absolute differences using average ranks for ties; use the tie-adjusted normal approximation with continuity correction; compute the two-sided p-value from the standard normal distribution. If all paired differences are zero, the pairwise p-value is 1.
- Multiple-comparison correction: Holm applied separately to the 15 pairwise p-values within each co-primary metric family.
- Alpha: 0.05, two-sided.
- Effect estimate: paired mean difference, unchanged.
- Effect CI: 95% percentile bootstrap CI, unchanged from the experimental specification.
- The Wilcoxon test supplies the pairwise inferential p-value; it does not replace or redefine the preregistered paired mean-difference effect estimate.

### Survival

Survival remains unchanged:

- Omnibus: Cochran's Q.
- Pairwise: McNemar.
- 15 preregistered contrasts.
- Two-sided alpha = 0.05.
- Holm separately across the 15 McNemar p-values.

### Bootstrap

Bootstrap remains unchanged and is not part of the pairwise hypothesis test:

- 10,000 resamples.
- Seed 161601.
- Resampling unit: complete baseline containing all six conditions.
- 95% percentile CI.
- Bootstrap is used exclusively for confidence intervals of effect estimates.

### Statistical integrity validation

- Omnibus test defined: PASS.
- Pairwise inferential test defined: PASS.
- Pairwise unit defined: PASS.
- Number of pairwise comparisons defined: PASS.
- Two-sided alpha defined: PASS.
- Holm correction defined: PASS.
- Effect estimator defined: PASS.
- Confidence interval method defined: PASS.
- Bootstrap seed defined: PASS.
- Bootstrap resampling unit defined: PASS.
- Survival omnibus defined: PASS.
- Survival pairwise test defined: PASS.
- Historical population unchanged: PASS.
- Experimental population unchanged: PASS.
- No execution performed: PASS.

No additional critical statistical gap was identified in the repaired specification. This repair does not authorize Phase 16 execution. A new explicit human authorization gate is required.
