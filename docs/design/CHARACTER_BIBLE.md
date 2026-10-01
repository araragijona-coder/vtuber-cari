# Rocket Bunny Petty — Character Bible

## Status

CHARACTER SPECIFICATION BASELINE.

Current runtime character information is limited mainly to enemy identity metadata. No character art asset set was identified in the repository tree.

## Required schema

Every future character record must contain:
- character_id
- display_name
- age
- age_status
- faction
- role
- personality
- narrative_function
- combat_role
- visual_identity
- color_palette
- silhouette
- vehicle
- relationship_links

## Adult presentation gate

AUTHOR DECISION:

adult_presentation_eligible = true only when:
- age_status = VERIFIED
- age >= 18

Appearance, height, license, independence, occupation, narrative role or anime stylization cannot substitute for explicit adult age.

ERO_KAWAII is therefore unavailable to any character whose adult status is not explicitly verified.

## Current runtime records

### street_punk
- display_name: STREET PUNK
- age: UNKNOWN
- age_status: UNKNOWN
- faction: UNKNOWN
- role: enemy combatant
- combat_role: AGGRESSIVE
- visual_identity: street-rider
- personality: not authored in runtime
- narrative_function: UNKNOWN
- color_palette: UNKNOWN
- silhouette: UNKNOWN
- vehicle: UNKNOWN
- relationship_links: none established
- adult_presentation_eligible: false

### iron_guard
- display_name: IRON GUARD
- age: UNKNOWN
- age_status: UNKNOWN
- faction: UNKNOWN
- role: enemy combatant
- combat_role: DEFENSIVE
- visual_identity: armored-guard
- personality: not authored in runtime
- narrative_function: UNKNOWN
- color_palette: UNKNOWN
- silhouette: UNKNOWN
- vehicle: UNKNOWN
- relationship_links: none established
- adult_presentation_eligible: false

### nitro_raider
- display_name: NITRO RAIDER
- age: UNKNOWN
- age_status: UNKNOWN
- faction: UNKNOWN
- role: enemy combatant
- combat_role: TACTICAL
- visual_identity: nitro-raider
- personality: not authored in runtime
- narrative_function: UNKNOWN
- color_palette: UNKNOWN
- silhouette: UNKNOWN
- vehicle: UNKNOWN
- relationship_links: none established
- adult_presentation_eligible: false

### banchou_rookie
- display_name: BANCHOU ROOKIE
- age: UNKNOWN
- age_status: UNKNOWN
- faction: UNKNOWN
- role: elite enemy combatant
- combat_role: ELITE
- visual_identity: rookie-banchou
- personality: not authored in runtime
- narrative_function: UNKNOWN
- color_palette: UNKNOWN
- silhouette: UNKNOWN
- vehicle: UNKNOWN
- relationship_links: none established
- adult_presentation_eligible: false

## Mach-Girls roster direction

PROPOSED CURRENT FRANCHISE / DESIGN DIRECTION:

The roster may expand beyond the original protagonist-centered framing.

Yuri remains a central character. New characters must not be authored as mechanical copies of Yuri.

Future characters should be defined by the chain:

```text
PERSONALITY
↓
ROLE
↓
DRIVING STYLE
↓
COMBAT IDENTITY
↓
CARD EFFECTS
↓
VFX
↓
ANIMATION
↓
UI PRESENTATION
```

Primary future combat-role families:

- STRIKER / DPS — speed, momentum, multi-hit, burst, BREAK exploitation.
- DEFENDER / TANK — shield, interception, protection, stability, counters.
- SUPPORT / HEALER — healing, regeneration, buffs, cleanse, Energy/cooldown support.
- DEBUFFER / CONTROL — WEAK, EXPOSED, defense reduction, telegraph control, BREAK preparation.

A character may have incidental damage outside its primary role; the constraint is identity coherence across personality, mechanics and presentation.

See MACH_GIRLS_CREATIVE_DIRECTION.md for the full role and roster framework.

## Proposed roster slots

PROPOSED ONLY:
- protagonist/player character;
- primary romantic counterpart;
- rival/banchou;
- garage/support character;
- faction representative;
- story bosses.

No names, ages, relationships or sexuality are invented by this phase.

## Character design language

BŌSŌZOKU — PROPOSED:
- motorcycle-centered silhouette;
- faction marks and patches;
- durable street/riding materials;
- protective details;
- expressive poses.

MONSTERS OF SPEED — PROPOSED:
- aerodynamic silhouette;
- speed-oriented shapes;
- sport/cyberpunk materials;
- technical/racing cues.

These are abstract design principles, not copies of external franchises.

## Relationship model

Relationship links should be explicit:
source_character → relationship_type → target_character → state/progression

Candidate types:
- ally
- rival
- romance
- mentor
- faction tie
- family
- garage partnership

No relationship is canonical until authored and recorded.

## Character-to-gameplay rule

A character should ideally provide at least one of:
- narrative choice;
- combat identity;
- card/deck identity;
- enemy behavior;
- garage/build identity;
- authored reaction.

A decorative-only character remains possible when the presentation goal justifies the production cost.


## Phase 20 — class and card design system

CURRENT DESIGN SYSTEM:

Future characters follow the pipeline:

```text
PERSONALITY
↓
FANTASY
↓
BAND / PHILOSOPHY
↓
DRIVING STYLE
↓
PRIMARY CLASS
↓
SUBROLE
↓
AUTO-COMBAT BEHAVIOR
↓
RESOURCE / RHYTHM
↓
CARD IDENTITY
↓
EFFECTS
↓
ANIMATION
↓
VFX / AUDIO / UI
```

The formal design system is defined in:
- `docs/design/CHARACTER_CLASS_CARD_EFFECT_SYSTEM.md`
- `docs/design/CARD_EFFECT_CATALOG.md`

Phase 20 is documentation only. A design record does not make a character playable.

The existing adult-presentation gate remains unchanged: age_status must be VERIFIED and age must be >= 18 before any character is eligible for ERO_KAWAII presentation.

APEX, VECTORIA and INERCIA are PROPOSED DESIGN EXAMPLES, not runtime characters.


## Phase 21 — vertical-slice kit records

### CURRENT PROPOSED PLAYABLE KIT — Yuri

- character_id: yuri
- display_name: YURI
- age: UNKNOWN
- age_status: UNKNOWN
- class: STRIKER
- subrole: SPEED / BREAK
- status: CURRENT PROPOSED PLAYABLE KIT
- canon_lore_changed: false

The existing adult-presentation gate is unchanged. No adult eligibility is inferred from this kit.

### TEST-ONLY CHARACTER — TEST SUPPORT

- character_id: test_support
- display_name: TEST SUPPORT
- age: UNKNOWN
- age_status: UNKNOWN
- class: SUPPORT
- subrole: HYBRID SUPPORT
- test_only: true
- canon: false

This fixture exists only to validate HEAL, BUFF, CLEANSE and DAMAGE REDUCTION. It is not part of the canonical roster.

### Phase 21 boundary

No final roster, faction, relationship, lore, age or commercial naming decision is established by these runtime records.