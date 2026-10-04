# Rocket Bunny Petty — Decision Log

## Phase decisions
Phase 3: SUPPORTS / MODIFY.
Phase 4: SUPPORTS / MODIFY.
Phase 5: SUPPORTS / MODIFY.
Phase 6: SUPPORTS / KEEP.
Phase 7: SUPPORTS / KEEP.
Phase 8: SUPPORTS / MODIFY.
Phase 9: SUPPORTS / RESEARCH MORE.
Phase 10: SUPPORTS / MODIFY — cost sensitivity is observed at 20–24 Nitro; 25 vs 30 is unresolved for broader state coverage; amplification remains research-only.
Phase 11: BLOCKED / RESEARCH MORE — Nitro 26–29 are unreachable under unchanged historical Nitro arithmetic; no cost is selected.

## Phase 14 evidence state
Phase 14-A: COMPLETED — authentic causal experimental evidence.
Phase 14-B: COMPLETED — AUTHENTIC HISTORICAL PAIRED EVIDENCE.
Phase 14-C: COMPLETED in project phase history; original bootstrap procedure and historical interval values are not recoverable from current repository evidence.
Phase 14-D: COMPLETED in project phase history; it must not imply recovery of missing Phase 14-C bootstrap provenance.
Phase 14-E: COMPLETED — RECONSTRUCTED_WITH_EXPLICIT_METHOD.

Phase 14-E is a reconstruction from immutable Phase 14-B evidence. It is not the original Phase 14-C result, does not recover the original bootstrap procedure and does not create new gameplay evidence.

## Standing decisions
- Nitro is not integrated.
- Redline is not integrated.
- Isolate variables.
- Win rate is insufficient by itself.
- Use equivalent states for opportunity-cost tests.
- Use paired seeds and deterministic replay.
- Separate VERIFIED, INSPECTED, INFERRED, PROPOSED, UNKNOWN, HISTORICAL, AUTHENTIC and RECONSTRUCTED evidence.
- Documentation is durable project knowledge.
- Phase 10 and Phase 11 did not change runtime.
- Phase 14-A through Phase 14-E did not authorize runtime integration.
- Human playtesting remains UNKNOWN / NOT RUN.
- Nitro / Redline remain OPEN DESIGN QUESTION.

## Post-Phase 16 product specification state

The repository contains a product-system specification and a character/art/gameplay-completion specification.

Design records:
- PRODUCT_SYSTEM_SPEC.md
- GAMEPLAY_GAP_ANALYSIS.md
- CHARACTER_BIBLE.md
- ART_DIRECTION.md
- POST_PHASE16_CHARACTER_GAMEPLAY_SPEC.md

The audit establishes that the current runtime remains an MVP combat slice. Garage, narrative, relationship, route, recurring-content, challenge-mode, wardrobe and character-art systems are not implemented merely because they are documented.

## Creative pivot — 2026-10-01

Recorded as a documentation/direction decision only.

- Rocket Bunny Petty = HISTORICAL / ORIGINAL WORKING TITLE.
- Mach-Girls = PROPOSED CURRENT FRANCHISE / DESIGN DIRECTION.
- Final commercial/legal naming remains OPEN DESIGN QUESTION.
- Yuri remains a central protagonist.
- Franchise direction expands toward an ensemble universe of characters, motorcycles, speed, bands, rivalries, technology and personality.
- 2.5D anime/cyberpunk/bōsōzoku presentation is PROPOSED.
- Character creation follows personality → role → driving style → combat identity → card effects → VFX → animation → UI presentation.
- G-Force Affinity is OPEN DESIGN QUESTION / PROPOSED.
- Mach Breaker is OPEN DESIGN QUESTION / PROPOSED.
- Sound Barrier Dolls and Gravity Queens are PROPOSED faction concepts.
- Phase 19 remains CURRENT COMBAT PRESENTATION WORK and is not reopened by this pivot.
- Nitro global and Redline global remain unchanged and are not introduced by this documentation phase.
- Phase 14–16 evidence remains unchanged.

Detailed direction: MACH_GIRLS_CREATIVE_DIRECTION.md.

## Current state
Current HEAD before the Mach-Girls documentation pivot: 7a5b06d282af9f93c84d587921ada009ecbdc08a

This documentation phase does not create a gameplay implementation phase.

## Current open questions
1. What Nitro cost produces useful decisions for Redline?
2. What defensive risk level is appropriate?
3. Does Redline retain value without becoming mandatory?
4. Should Nitro have multiple meaningful consumers?
5. How should Nitro interact with the rest of combat?
6. Which mechanics truly express Rocket Bunny identity?
7. Can Player Behavior → Character Perception → Diegetic Reaction become a real mechanic without becoming noisy or intrusive?
8. What evidence is required before any idea enters runtime?
9. What is the minimum onboarding/progression slice that makes the MVP feel like a complete session?
10. Which single gameplay gap should be prototyped first under a controlled validation phase?

These remain OPEN DESIGN QUESTION items unless a later explicit and verifiable decision changes their status. This list is not a roadmap.


## Phase 20 — character identity, class and card effect specification

Phase 20: COMPLETED — DESIGN DOCUMENTATION ONLY.

VERIFIED FROM CURRENT CODE:
- entry HEAD was `9fcb2f04d7ffcff22d129e0b09fe81f3df7b5815`;
- nine current card identities exist in the runtime;
- current primitives cover direct/conditional damage, shield, Energy, draw, WEAK, EXPOSED, BREAK and Burst;
- healing, regeneration, general buffs, cleanse, AoE, multi-hit, counters, interception, cooldown manipulation and Momentum are not general runtime card primitives;
- Phase 20 did not change runtime combat systems.

PROPOSED:
- STRIKER / DPS, DEFENDER / TANK, SUPPORT / HEALER and DEBUFFER / CONTROL as base role families;
- personality × class design matrix;
- driving-style vocabulary;
- official character/card templates;
- role-integrity review;
- APEX, VECTORIA and INERCIA as design examples.

OPEN DESIGN QUESTION:
- final class taxonomy and subroles;
- timing-window primitive;
- AoE/multi-hit model;
- healing/regeneration model;
- buff/cleanse/cooldown support;
- counter/interception model;
- Momentum;
- G-Force Affinity;
- Mach Breaker;
- future roster and faction assignments.

No Phase 21 implementation is authorized by this entry.


## Phase 21 — core combat effects and character kit vertical slice

Phase 21: IMPLEMENTED — CONTROLLED VERTICAL SLICE.

VERIFIED FROM CURRENT CODE:
- entry HEAD was 68e73d2af910b38510732d0b9883b32cf53f5400;
- generic HEAL, DAMAGE_OUT BUFF, CLEANSE, MULTI-HIT and DAMAGE REDUCTION primitives are implemented;
- the nine previous MVP cards remain in the catalog with characterId = null;
- SaveManager remains saveVersion 1.

CURRENT PROPOSED:
- Yuri is the default proposed playable kit: STRIKER / SPEED-BREAK;
- TEST SUPPORT is test-only and not canon;
- the new character layer is configuration/metadata, not a final roster system.

OPEN DESIGN QUESTION:
- final Yuri canon kit;
- ally targeting outside the one-player/one-enemy slice;
- AOE, regeneration, counter/interception, cooldown manipulation, slow, target manipulation;
- Momentum, G-Force Affinity and Mach Breaker;
- APEX, VECTORIA and INERCIA remain non-playable design examples.

## Phase 22 — Yuri / Maki Mach protagonist continuity

Phase 22: **COMPLETED — DOCUMENTATION DECISION C**.

### HISTORICAL / ESTABLISHED DESIGN REFERENCE

- Pre-Mach-Girls documents already use **Yuri** as the protagonist/central-character reference.
- POST_PHASE16_CHARACTER_GAMEPLAY_SPEC.md contains the pre-Mach product identity **DETERMINISTIC YURI CYBERPUNK BŌSŌZOKU CARD BATTLER**.
- LORE_Y_DISENO.md establishes the historical protagonist's lore and world context but does not identify that protagonist as Maki Mach.
- Phase 21 uses technical identity character_id: yuri for the CURRENT PROPOSED PLAYABLE KIT.

### CURRENT PROPOSED

- Maki Mach was introduced by the later Mach-Girls creative-direction layer as a CURRENT PROPOSED CHARACTER CONCEPT centered on speed/Mach and surpassing the sound barrier.

### DECISION

**C — YURI / MAKI MACH RELATIONSHIP STILL UNRESOLVED**

No repository evidence is sufficient to conclude either:
- Yuri = Maki Mach, or
- Yuri and Maki Mach are separate people.

### IMPACT

- Yuri remains the valid existing protagonist/Phase 21 proposed playable reference.
- Maki Mach remains a proposed character concept.
- No rename, merge or split is performed.
- No definitive maki_mach runtime characterId is created.
- No historical Yuri lore is rewritten.
- No alias, genealogy, replacement or secret-identity lore is invented.
- Asset work must remain neutral and must not force the identities together or apart.

### STATUS

OPEN DESIGN QUESTION

This entry is the durable decision record for the Yuri/Maki continuity question.


## Phase 33 — Yuri progression payoff implementation

Phase 33 decision `33-GAMEPLAY-YURI-PROGRESSION-DECISION-02` selected **C — `yuri_derrape_break_payoff`** as the primary Yuri progression slice.

**CURRENT PROPOSED / TEST-ONLY / PROVISIONAL**

- `DERRAPE YURI` against `EXPOSED` adds `+6 BREAK` as a separate progression payoff.
- Without `EXPOSED`, the progression adds no BREAK.
- The existing `yuri_derrape_expuesto.effects.bonus = 10` remains untouched; GP-004 is not repaired by this phase.
- The reward option is character-bound to `yuri`, persists in the existing saveVersion 1 progression payload and remains separate from legacy `cardDamageBonuses` data.
- `+6 BREAK` is explicitly **TEST-ONLY / PROVISIONAL** and is not final balance or canon.

