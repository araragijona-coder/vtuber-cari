# Rocket Bunny Petty — Design Bible

## Identity
ROCKET BUNNY PETTY = small-scale game + strong identity + memorable characters + story + systems with personality + reactions to player behavior.

This is a product/design direction, not a claim of superiority over other games.

## Naming and franchise direction

```text
Rocket Bunny Petty
= HISTORICAL / ORIGINAL WORKING TITLE

Mach-Girls
= PROPOSED CURRENT FRANCHISE / DESIGN DIRECTION
```

This is a creative-direction record only. It is not a commercial/legal rename and does not authorize repository, URL, route, asset or file renaming.

Yuri remains a central protagonist. The future franchise scope is an ensemble universe rather than a story model restricted to one character.

Detailed creative rules are centralized in MACH_GIRLS_CREATIVE_DIRECTION.md.

## Product identity baseline

AUTHOR DECISION:

DETERMINISTIC YURI CYBERPUNK BŌSŌZOKU CARD BATTLER
+
RPG DE GARAJE
+
CONSTRUCCIÓN DE MAZOS
+
NARRATIVA INTERACTIVA
+
RELACIONES ENTRE PERSONAJES
+
POV DEL PROTAGONISTA
+
PRESENTACIÓN 2D DINÁMICA
+
SESIONES CORTAS

This is a target identity. POST_PHASE16_CHARACTER_GAMEPLAY_SPEC.md and GAMEPLAY_GAP_ANALYSIS.md define the current implementation boundary.

## Direction
- Small, deliberately bounded scope — PROPOSED.
- Strong identity and personality — PROPOSED.
- Memorable characters and narrative — PROPOSED.
- Meaningful decisions — INFERRED as a research goal; human validation is UNKNOWN.
- Systems with personality — PROPOSED.
- Authored reactions to player behavior — PROPOSED, not implemented.
- Prioritize fun and memorability over content quantity — PROPOSED.
- Tactical readability is the first visual priority — AUTHOR DECISION.

## Evidence boundary
Mechanical research, deterministic replay, paired comparisons and statistical reconstruction are evidence about tested mechanical questions only.

They do not establish fun, memorability, UX quality, retention, usability, production balance or production readiness.

Human playtesting remains UNKNOWN / NOT RUN.

## Current research state
Phase 14-A → Phase 14-B → Phase 14-C → Phase 14-D → Phase 14-E

Phase 14-B is AUTHENTIC HISTORICAL PAIRED EVIDENCE.

Phase 14-E is RECONSTRUCTED_WITH_EXPLICIT_METHOD and does not recover the original Phase 14-C bootstrap procedure or historical interval values.

The repaired Phase 16 statistical specification did not by itself authorize a completed gameplay experiment. Product specifications are not experimental evidence.

## Open design questions
Nitro and Redline remain OPEN DESIGN QUESTION:
- Redline cost;
- Redline damage;
- defensive amplification;
- defensive risk;
- Nitro lattice;
- Nitro consumers;
- balance parameters;
- runtime integration.

## Character/art boundary
Formal character, wardrobe and presentation rules live in:
- CHARACTER_BIBLE.md
- ART_DIRECTION.md
- POST_PHASE16_CHARACTER_GAMEPLAY_SPEC.md

No current runtime art asset set was identified by repository audit.

## Gameplay completion boundary
Current runtime is an MVP combat slice. It should not be described as the complete RPG/garage/narrative/deckbuilding product until those systems exist in code and are player-facing.

The authoritative gap inventory is GAMEPLAY_GAP_ANALYSIS.md.

## Non-goals
Do not use this document to rank the game against competitors, approve a prototype for runtime, or create a composite score for mechanics.


## Phase 20 design-system references

The detailed future character and card specification is defined in:
- `docs/design/CHARACTER_CLASS_CARD_EFFECT_SYSTEM.md`
- `docs/design/CARD_EFFECT_CATALOG.md`

VERIFIED FROM CURRENT CODE:
The present runtime remains the Phase 18/19 semi-real-time MVP slice with nine cards and a limited effect primitive set.

PROPOSED:
Future characters should receive distinct class, driving-style, card and presentation identities.

OPEN DESIGN QUESTION:
Any effect absent from the support matrix requires a later explicit implementation decision and must not be inferred as already supported.


## Phase 21 — character kit vertical slice

### VERIFIED FROM CURRENT CODE

The runtime now supports a small generic effect layer for HEAL, timed damage-output BUFF, CLEANSE, deterministic MULTI-HIT and timed incoming DAMAGE REDUCTION.

### CURRENT PROPOSED

The default player battle uses the proposed Yuri vertical-slice kit. A test-only URL mode loads TEST SUPPORT for controlled validation.

This is an implementation proof, not a declaration of final roster or canon.

### OPEN DESIGN QUESTION

Future kits still require decisions on final class/subrole taxonomy, ally targeting, broader roster composition, advanced support/control primitives and final Yuri canon identity.