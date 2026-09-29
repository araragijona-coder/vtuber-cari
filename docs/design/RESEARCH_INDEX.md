# Rocket Bunny Petty — Research Index

## Evidence-state vocabulary
Use explicit labels when describing research:
- COMPLETED — phase work has been completed according to its available record.
- HISTORICAL — describes a prior state or decision; not necessarily the current gate.
- AUTHENTIC — evidence produced from the historical execution/provenance being described.
- RECONSTRUCTED — evidence recomputed from preserved source material with an explicit method; not historical recovery.
- VERIFIED — directly checked by the applicable phase gate.
- UNKNOWN — evidence is unavailable or has not been established.
- PROPOSED — design intent or hypothesis, not a decision.
- OPEN DESIGN QUESTION — unresolved design question; not a roadmap commitment.

## Current research state
The completed research chain is:

Phase 14-A → Phase 14-B → Phase 14-C → Phase 14-D → Phase 14-E

Current HEAD:
bec0590834c9f00a39d8dec30074ec99caa5dd76

Phase 14-B is AUTHENTIC HISTORICAL PAIRED EVIDENCE.

Phase 14-E is RECONSTRUCTED_WITH_EXPLICIT_METHOD. Its source code explicitly records:
- ORIGINAL BOOTSTRAP PROCEDURE NOT RECOVERABLE.
- HISTORICAL INTERVALS NOT AVAILABLE FOR EXACT HISTORICAL REPRODUCTION.
- The authentic Phase 14-B artifact remains unchanged.
- Gameplay/design changes: NONE.

Therefore Phase 14-E must not be described as recovered Phase 14-C, an original Phase 14-C result, a historical bootstrap reproduction, or new gameplay evidence.

No formal subsequent Phase 15 was defined in the repository before the documentation synchronization task.

## Design experiments
- Phase 3: tools/design_prototypes/rocket_bunny/
- Phase 4: tools/design_prototypes/rocket_bunny_phase4/
- Phase 5: tools/design_prototypes/rocket_bunny_phase5/
- Phase 6: tools/design_prototypes/rocket_bunny_phase6/
- Phase 7: tools/design_prototypes/rocket_bunny_phase7/
- Phase 8: tools/design_prototypes/rocket_bunny_phase8/
- Phase 9: tools/design_prototypes/rocket_bunny_phase9/

Phase directories are primary records; EXPERIMENT_LEDGER.md is the consolidation index.

## External / comparative references
Slay the Spire; Balatro; Monster Train; Inscryption; Hades; Dead Cells; Marvel Snap; Legends of Runeterra / Path of Champions.

These are comparative/inspirational references only. They do not prove that Rocket Bunny should adopt any specific mechanic, structure or presentation.

## Mechanic research
Nitro and Redline: see MECHANICS_LEDGER.md and the historical phase records.
Energy, cards, deck/hand/discard, enemy intent and RNG: see MECHANICS_LEDGER.md.
Player Behavior → Character Perception → Diegetic Reaction: see PLAYER_BEHAVIOR_SYSTEM.md; PROPOSED / NOT VALIDATED.

## Historical Phase 10 / Phase 11 research
Phase 10 tested Redline cost/risk sensitivity and recorded its historical observations in EXPERIMENT_LEDGER.md.
Phase 11 recorded the historical reachability result that Nitro 26–29 are unreachable under the unchanged historical arithmetic and ended BLOCKED / RESEARCH MORE.

Those entries remain HISTORICAL. They are not a current implementation gate.

## Phase 14 record
Phase 14-A: COMPLETED; authentic causal evidence.
Phase 14-B: COMPLETED; AUTHENTIC HISTORICAL PAIRED EVIDENCE.
Phase 14-C: COMPLETED in the project phase history; original bootstrap provenance is not recoverable from the current repository evidence.
Phase 14-D: COMPLETED in the project phase history; no claim of historical bootstrap recovery is made.
Phase 14-E: COMPLETED; RECONSTRUCTED_WITH_EXPLICIT_METHOD.

## Open questions
1. What Nitro cost produces useful decisions for Redline?
2. What defensive risk level is appropriate?
3. Does Redline retain value without becoming mandatory?
4. Should Nitro have multiple meaningful consumers?
5. How should Nitro interact with the rest of combat?
6. Which mechanics truly express Rocket Bunny identity?
7. Can Player Behavior → Character Perception → Diegetic Reaction become a real mechanic without becoming noisy or intrusive?
8. What evidence is required before any idea enters runtime?

All eight remain OPEN DESIGN QUESTION items unless a later, explicit, verifiable decision changes their status. This list is not a roadmap.

## Human validation
Human playtesting: UNKNOWN / NOT RUN.

Mechanical or statistical evidence does not establish fun, memorability, UX quality, retention, usability, or production readiness.

## Research record requirements
Every new phase should record hypothesis, base SHA, method/sample size, deterministic test status, observations, limitations, evidence classification, design decision, next question and runtime impact.
