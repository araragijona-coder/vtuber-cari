# Rocket Bunny Petty — Phase 11 Final

## BASE

`b9ccbe8bfea3f1c2e1e1cc24321182c87dc68e99`

Historical Phase 10 commit:

`feat: analyze Rocket Bunny Redline cost sensitivity`

## PHASE 9 CONTROL — VERIFIED

| Set | Expected | Reproduced |
|---|---:|---:|
| A | 9,548 | 9,548 |
| B | 1,687 | 1,687 |
| C | 961 | 961 |
| UNION | 10,274 | 10,274 |

Historical Phase 9 tests: PASS. Historical deterministic replay: PASS.

The required control gate passed before the Phase 11 reachability audit.

## SOURCES — VERIFIED

Phase 11 uses the real historical artifacts:

- `tools/design_prototypes/rocket_bunny_phase9/phase9_forced_choice.mjs`
- `tools/design_prototypes/rocket_bunny_phase6/phase6_redline.mjs`
- Phase 10 reference: `tools/design_prototypes/rocket_bunny_phase10/phase10_redline_cost.mjs`
- Phase 10 report: `tools/design_prototypes/rocket_bunny_phase10/ROCKET_BUNNY_PHASE10_FINAL.md`

No Phase 6 or Phase 9 source was modified.

## STATE GENERATION

Method:

`CONTROLLED STATE GENERATION`

The generator changes only action selection in memory. Historical card costs, damage, RNG, Nitro generation/spending, enemy logic, Energy rules and Redline logic remain unchanged.

A reproducible mechanically reached Nitro-25 state was found at seed `107771`:

- pre-state Nitro: 65
- legal Ram Nitro spend: 40
- resulting Nitro: 25
- resulting Energy: 1
- resulting enemy HP: 9
- resulting player HP: 21
- enemy intent: ATTACK
- RNG state preserved
- the state remains a live combat state

This is evidence that Nitro 25 is mechanically reachable under controlled action selection.

### Target population

| Nitro initial | States generated | Cost 25 legal | Cost 30 legal | 25 exclusive | Both |
|---:|---:|---:|---:|---:|---:|
| 25 | 1 proof state | 1 | 0 | 1 | 0 |
| 26 | 0 | 0 | 0 | 0 | 0 |
| 27 | 0 | 0 | 0 | 0 | 0 |
| 28 | 0 | 0 | 0 | 0 | 0 |
| 29 | 0 | 0 | 0 | 0 | 0 |

The one Nitro-25 proof state is not a >=500-state population and is not sufficient for the requested paired experiment.

## REACHABILITY AUDIT — VERIFIED

The exact historical Phase 6 source has:

- initial Nitro = 0
- Pump generation = +35
- Guard Nitro spend = -25
- Ram Nitro spend = -40
- Redline spend = -25
- Nitro cap = 100

Every mutation preserves congruence modulo 5. Therefore:

`Nitro % 5 === 0`

for every state reachable without changing the historical mechanics.

The 10,000-seed adaptive audit observed only:

`0, 5, 10, 15, 20, 30, 35, 40, 45, 55, 70`

and no non-multiple-of-5 Nitro value.

Observed Redline opportunity values were:

`30, 35, 40, 45, 55, 70`

with the exact adaptive sample containing one Nitro-30 opportunity observation and no Nitro-25–29 opportunity observations.

The adaptive absence of 25 is a distribution result. The impossibility of 26–29 is a mechanics result.

## COST 25 VS COST 30

The legality threshold itself is deterministic:

| Nitro | Cost 25 | Cost 30 | 25 exclusive | Both |
|---:|:---:|:---:|:---:|:---:|
| 25 | legal | illegal | yes | no |
| 26 | legal | illegal | yes | no |
| 27 | legal | illegal | yes | no |
| 28 | legal | illegal | yes | no |
| 29 | legal | illegal | yes | no |

The 26–29 rows are threshold logic only; they are not reachable game states.

A full paired damage/incoming/risk comparison was **NOT RUN**, because the required 25–29 mechanically valid state population cannot be produced without changing the historical Nitro mechanics.

No cost is selected.

## ENERGY / NITRO / REDLINE CONFIGURATION

No balance variant was introduced.

- offensive Redline multiplier: 1.25
- defensive amplification configuration: ON
- Energy rules: unchanged
- Nitro generation: unchanged
- Ram Nitro cost: unchanged at 40
- Guard Nitro cost: unchanged at 25
- Redline mechanics: unchanged

## RISK

No paired cost-risk dataset was produced.

Therefore:

- risk opportunity: NOT VALIDATED
- risk event: NOT VALIDATED
- incoming additional damage: NOT VALIDATED
- survival outcome: NOT VALIDATED

No interpretation about fun or player preference is made.

## DETERMINISM

250-seed replay of the exact historical Phase 6 runtime: PASS.

Phase 9 historical control deterministic replay: PASS.

The controlled Nitro-25 proof is reproducible from the declared seed and action-selection harness.

## TESTS

PASS:

- Phase 9 control: 9,548 / 1,687 / 961 / 10,274
- Nitro modulo-5 invariant
- Nitro 25 controlled proof state
- cost-25 threshold at 25
- cost-30 threshold at 30
- 25/26/27/28/29 threshold matrix
- deterministic 250-seed replay

## EVIDENCE

### VERIFIED

- Exact Phase 9 control.
- Exact historical Phase 6 Nitro arithmetic.
- 10,000-seed adaptive reachability audit.
- Nitro modulo-5 invariant.
- Reproducible mechanically reached Nitro-25 state.
- Cost threshold behavior.
- 250-seed deterministic replay.
- No runtime file changed.

### SUPPORTED

- The requested Nitro 26–29 state population cannot be generated while preserving the historical Nitro arithmetic.

### INFERRED

- A genuine 25–30 cost comparison for Nitro 26–29 would require either a different Nitro arithmetic lattice or explicitly synthetic states outside the current mechanics.

### UNKNOWN

- Human preference.
- Fun.
- UX.
- Production balance.

### NOT VALIDATED

- >=500 Nitro-25 states.
- Nitro 26–29 states.
- Paired 25-vs-30 damage metrics.
- Paired incoming/risk metrics.
- Human playtesting.
- Runtime integration.

## FINAL GATE

`BLOCKED`

Reason: the requested Nitro 26–29 states are mechanically unreachable under the unchanged historical rules. Continuing would require violating the Phase 11 constraint against arbitrary Nitro injection or changing the relevant mechanics.

## DESIGN DECISION

`RESEARCH MORE / NO COST DECISION`

No production cost is selected. No Redline runtime integration is authorized.

## LIMITATIONS

- The controlled generator is a state-generation harness, not normal player behavior.
- The one Nitro-25 proof state is evidence of reachability, not a statistical sample.
- Threshold rows for 26–29 are logical legality checks, not real game states.
- Heuristic/adaptive simulation is not human play.
- Risk remains simulator-defined.
- No human playtest was performed.

## NEXT RESEARCH

Before another cost experiment, decide whether the research target should be:

1. the mechanically reachable Nitro lattice, including a properly sized Nitro-25 population; or
2. a separately authorized mechanics experiment that changes Nitro generation/spending so non-multiple-of-5 values can exist.

No Phase 12 was started.
