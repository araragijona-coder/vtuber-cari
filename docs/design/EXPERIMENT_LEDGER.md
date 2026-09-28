# Rocket Bunny Petty — Experiment Ledger

Historical phase records remain authoritative. This file is the consolidation index.

## Phase 3
Base: e4499f261d9a69404d6c764acaaafdfb37ae49c1
Final: 8e80fc70597cb1041049c4a6317d9ba5457c72a2
Commit: feat: add Rocket Bunny design prototypes
Question: early Nitro/Redline decision/resource behavior.
Method/size: 10,000 prototype simulations.
Result: SUPPORTS; Nitro use was nontrivial, Redline activation about 38%; no policy crossed the >=10 pp dominance threshold.
Limitations: baseline/prototype card pools differed; heuristic policies are not humans.
Decision: MODIFY.
Next: isolate Nitro with the same card pool.

## Phase 4
Base: 8e80fc70597cb1041049c4a6317d9ba5457c72a2
Final: 956cddadfea6d09ed3540a55ecb44867cb9d7bdb
Commit: feat: isolate Nitro design experiment
Question: does Nitro itself alter decisions/timing?
Method/size: 10,000 paired seeds; 20,000 runs.
Result: Control 55.83% win rate; Nitro 55.31%; action divergence 62.03%; timing 39.98%; outcome 3.14%; Ram 35.39% of card uses.
Limitations: heuristic policies and Ram concentration.
Decision: SUPPORTS / MODIFY.
Next: diversify Nitro consumers.

## Phase 5
Base: 956cddadfea6d09ed3540a55ecb44867cb9d7bdb
Final: d2921959578bc8c1db0a792a1a573bff539f77f5
Commit: feat: diversify Rocket Bunny Nitro prototype
Question: can Nitro have multiple meaningful consumers?
Method/size: Models A/B/C/D/D_NO_REDLINE/OFF on the same seed/deck/enemy framework.
Result: D versus D_NO_REDLINE had 38.00% action divergence and 2.16% outcome divergence; D was the only model crossing the >=10 pp policy-spread threshold at 11.39 pp.
Limitations: heuristic policies; multiple variants narrow causal interpretation.
Decision: SUPPORTS / MODIFY.
Next: isolate Redline.

## Phase 6
Base: d2921959578bc8c1db0a792a1a573bff539f77f5
Final: e0846410ccb477df2dcfbcabcb21d78080b33547
Commit: feat: isolate Rocket Bunny Redline experiment
Question: what changes with Redline ON versus OFF?
Method/size: 10,000 paired seeds; 20,000 primary runs.
Result: OFF 53.27% win rate; ON 55.18%; action divergence 40.80%; timing 40.80%; outcome 2.07%; ON spent 20.4990 Nitro/run versus 18.6865 OFF.
Limitations: paired policy did not prove direct Ram/Guard replacement; rare observed risk.
Decision: SUPPORTS / KEEP as prototype candidate.
Next: causality beyond redistribution.

## Phase 7
Base: e0846410ccb477df2dcfbcabcb21d78080b33547
Final: c0a3cb899e8dc95846ef51200f11693844a901ea
Commit: feat: analyze Rocket Bunny Redline causality
Question: does Redline add mechanical structure beyond redistribution?
Method/size: reproduction, allocation/action/timing/risk analysis, frozen counterfactuals, 250-seed A/B replay.
Result: Nitro allocation A Ram 28.38% / Guard 71.62%; B Ram 23.44% / Guard 23.61% / Redline 52.95%; unique action transitions 9→14; allocation patterns 4→7; one risk event observed in the adaptive sample.
Limitations: allocation is not player preference; counterfactuals constructed; no playtest.
Decision: SUPPORTS / KEEP.
Next: forced opportunity-cost isolation.

## Phase 8
Base: c0a3cb899e8dc95846ef51200f11693844a901ea
Final: 6c89c320d93937f7f13769dcb928becb394109ee
Commit: feat: analyze Rocket Bunny Redline opportunity cost
Question: can normal policy traces show direct opportunity cost?
Method/size: 10,000 paired seeds; 20,000 runs; 250 A + 250 B replays.
Result: 12,949 opportunities; 4,342 activations; 4,080/4,342 equivalent A states; direct Redline→Ram = 0 and Redline→Guard = 0 in paired policy traces.
Limitations: policy behavior cannot establish human choice.
Decision: SUPPORTS / MODIFY experiment.
Next: forced choices from identical frozen states.

## Phase 9
Base: 6c89c320d93937f7f13769dcb928becb394109ee
Final: 9d238f1533bcbc4c7cbefb3684a0b918cbd1e386
Commit: feat: isolate Rocket Bunny Redline opportunity choices
Question: do Redline and competing spenders differ when forced from the same state?
Method/size: 10,000 extraction runs; 10,274 unique A+B states; 40,915 forced executions; replay up to 250 real states.
Result: Set A (9,548) Redline 21.3421 direct damage vs Guard 0; incoming delta +0.6762. Set B (1,687) Redline 25.6959 vs Ram 29.3604, with 15 fewer nominal Nitro. Set C (961) Redline 25.0562 vs Guard 0 vs Ram 28.5213. Under ATTACK, 1,994/2,101 Redline states had amplified response.
Limitations: post-action RNG can diverge; No-spender requires Shot; human fun/UX/balance not tested.
Decision: SUPPORTS / RESEARCH MORE.
Next: Phase 10 cost/risk sensitivity.

## Historical rule
Phase-specific files under tools/design_prototypes/rocket_bunny_phase* are the primary experimental records. Do not silently replace them with this index.
