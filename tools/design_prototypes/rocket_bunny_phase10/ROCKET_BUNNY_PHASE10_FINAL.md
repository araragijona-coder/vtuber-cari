# Rocket Bunny Petty — Phase 10 Final

## Control
Phase 9 control reproduced exactly before Phase 10:
A 9,548; B 1,687; C 961; Union 10,274. Historical Phase 6/9 files were not modified.

## Design
10,000 seeds per cost, 100001–110000. Exact Phase 9 state extraction. Cost was the only main variable: 20, 25, 30 Nitro. Offensive multiplier stayed 1.25. Phase 10B fixed cost at 25 and toggled only defensive amplification.

## Normal adaptive results
| Metric | 20 | 25 | 30 |
|---|---:|---:|---:|
| Win rate, secondary | 43.92% | 44.05% | 44.05% |
| Opportunities | 12,729 | 12,171 | 12,171 |
| Activations | 4,535 | 4,311 | 4,311 |
| Activation/opportunity | 35.63% | 35.42% | 35.42% |
| Missed | 8,194 | 7,860 | 7,860 |
| Nitro generated/run | 29.8480 | 29.8690 | 29.8690 |
| Nitro spent/run | 22.5525 | 22.0700 | 22.0700 |
| Nitro remaining/run | 7.2955 | 7.7990 | 7.7990 |
| Energy spent/run | 12.5481 | 12.5583 | 12.5583 |
| Energy waste/run | 1.1991 | 1.1982 | 1.1982 |
| Affected-card damage/run | 13.5654 | 12.8818 | 12.8818 |
| Incoming amplified damage/run | 0.1276 | 0 | 0 |
| Risk events | 116 | 0 | 0 |
| Risk rate/activation | 2.56% | 0% | 0% |

Observed opportunity band: cost 20 had 565 opportunity observations at Nitro 20–24. No 25–29 opportunity observations occurred. Thus 25 and 30 were identical in this exact 10,000-seed adaptive run.

## Frozen-state analysis
The exact Phase 9 union has 10,274 states, and every one has Nitro >=30. Therefore forced Redline resolution is identical at costs 20/25/30 on that historical union.

| Metric | 20 | 25 | 30 |
|---|---:|---:|---:|
| States | 10,274 | 10,274 | 10,274 |
| Direct affected-card damage | 23.4880 | 23.4880 | 23.4880 |
| Base affected-card damage | 18.7943 | 18.7943 | 18.7943 |
| Pure Redline bonus | 4.6937 | 4.6937 | 4.6937 |
| Incoming | 11.4518 | 11.4518 | 11.4518 |
| Risk events | 2,101 | 2,101 | 2,101 |
| Risk rate | 20.45% | 20.45% | 20.45% |

Set A (Redline + Guard), 9,548 states: direct 22.7987; base 18.2430; bonus 4.5557; incoming 12.3226; risk 2,101/9,548.
Set B (Redline + Ram), 1,687 states: direct 32.2887; base 25.8358; bonus 6.4529; incoming 5.8755; risk 177/1,687.
Set C (Redline + Guard + Ram), 961 states: direct 32.0884; base 25.6774; bonus 6.4110; incoming 10.3143; risk 177/961.

## Divergence
| Comparison | Action | Timing | Outcome |
|---|---:|---:|---:|
| 20 vs 25 | 2.23% | 2.23% | 0.13% |
| 25 vs 30 | 0% | 0% | 0% |
| 20 vs 30 | 2.23% | 2.23% | 0.13% |

These are paired policy-trace divergences, not human preference measurements.

## Phase 10B — defensive amplification
Cost fixed at 25. OFF and ON preserve opportunities, activations, Nitro spending and Energy accounting. ON changes ATTACK 45 -> 56. In the exact Phase 9 union, OFF mean incoming is 9.2024 and ON is 11.4518, delta +2.2495 per frozen state. There are 2,101 ATTACK states. One-hit survival outcome divergence is 0.4769% of the union, 2.3322% conditional on ATTACK. No action/timing divergence is created by amplification alone in this frozen one-action comparison.

## Evidence
VERIFIED: exact Phase 9 control; 10,000 seeds per cost; normal aggregates; frozen-state separation of base affected-card damage and pure Redline bonus; 20–24 opportunity band; no 25–29 observed; deterministic replay.
INSPECTED: Phase 6, Phase 9, Phase 8/9 continuity and current design ledgers.
INFERRED: cost sensitivity in this model is concentrated around the 20–24 eligibility band; 25 vs 30 remains unresolved outside the observed state distribution.
PROPOSED: targeted generation/collection of 25–29 Nitro states and human playtesting.
UNKNOWN: fun, UX, player preference, broader decks/enemies/policies, production balance.
NOT RUN: runtime integration and human playtesting.

## Limitations
Heuristic policies are not human players. Paired traces can consume RNG differently after divergence. The Phase 9 union cannot distinguish 25 from 30 because all 10,274 states have Nitro >=30. Win rate is secondary and not used to rank costs. Risk is simulator-defined.

## Final gate
SUPPORTS

## Design decision
MODIFY

No 20/25/30 ranking or winner is declared. This phase supports further Redline research but does not authorize runtime integration.
