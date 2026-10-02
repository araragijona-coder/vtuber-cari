# MACH-GIRLS — GAME BRAIN

## Status

MASTER CURRENT DESIGN / RECOVERY BRAIN

This document exists so a future AI can reconstruct the intended Mach-Girls experience without relying on conversational memory or simplifying the project from the visible MVP code.

## Recovery rule

When the target experience is unclear, consult sources in this order:

1. this master brain;
2. specialized Mach-Girls design documents;
3. current implementation code;
4. historical documentation for provenance;
5. external research for context only.

The repository's current documentation and code must be checked before resolving contradictions. If the repository cannot establish a resolution, mark the issue:

`OPEN DESIGN QUESTION`

Do not silently merge current design, historical context, external reference and implementation details.

## Current design identity

```text
MACH-GIRLS
=
ORIGINAL WORLD
+
ORIGINAL STORY
+
ORIGINAL CHARACTERS
+
ORIGINAL GAMEPLAY DESIGN
+
2.5D PRESENTATION
+
LOWER PRODUCTION COST
```

Mach-Girls is not a reduced copy of an external game.

Historical continuity remains protected:

```text
Rocket Bunny Petty
= HISTORICAL / ORIGINAL WORKING TITLE
```

## 2.5D combat experience target

The intended combat experience is not:

`two sprites + cards`

It is a complete visual combat stage containing:

```text
2.5D battlefield
characters with visual presence
motorcycles
enemies occupying the scene
enemy damage/status presentation
combat timer
cards / skills
Energy
telegraphs
BREAK
BURST
damage effects
camera movement
impact effects
motion trails
particles
lighting
parallax
layered UI
```

Final character art is not implied by technical placeholders.

## Layer architecture

The presentation model is:

```text
BACKGROUND
↓
FAR PARALLAX
↓
MIDGROUND
↓
ENEMY
↓
COMBAT FX
↓
CHARACTER + MOTORCYCLE
↓
FOREGROUND FX
↓
HUD
↓
CARDS
```

Depth is simulated with 2D techniques:

- scale;
- offsets;
- z-order;
- parallax;
- lighting/intensity hints;
- interpolated camera motion;
- limited deterministic screen shake.

No 3D engine is assumed.

## Engine boundary

Current delivery architecture:

```text
HTML
CSS
Vanilla JavaScript
Canvas + DOM
Telegram WebApp SDK
GitHub Pages
localStorage
```

Do not assume migration to Unity, Unreal or Godot without an explicit technical decision.

## Combat rules boundary

The presentation layer must not redefine:

- CombatClock;
- Energy;
- auto attacks;
- enemy behavior;
- BREAK;
- BURST;
- card effects;
- save/replay;
- RNG;
- telemetry semantics.

Combat remains semi-real-time. No END TURN, turn ownership or hard pause model is introduced.

## Phase 25 current presentation contract

Phase 25 reconstructs the visual scene around the existing combat slice.

### Visual states

```text
NORMAL
ATTACKING
HURT
BREAK
BURST READY
BURST ACTIVE
VICTORY
DEFEAT
```

### Camera presets

```text
IDLE
APPROACH
ATTACK
IMPACT
BREAK
BURST
VICTORY
DEFEAT
```

Camera parameters:

`zoom / offsetX / offsetY / duration / shake`

Transitions are interpolated.

### Character + motorcycle

Character and motorcycle are one logical visual composition.

Runtime infrastructure supports:

```text
character asset
motorcycle asset
relative offset
relative scale
shared anchor
identity layer
```

The current motorcycle and character fixtures are technical placeholders and are explicitly NOT FINAL ART.

## Placeholder policy

Technical placeholders exist to validate:

- scene composition;
- scale;
- anchor;
- idle;
- attack;
- hurt;
- movement/recoil;
- camera;
- lighting;
- VFX;
- depth.

They do not represent Yuri, Maki Mach or any final character.

No placeholder can become APPROVED art.

## Asset Studio integration

The Asset Studio remains the human authoring and approval boundary.

Catalog:

`mach_girls_asset_catalog_v1`

Only:

`status = APPROVED`

assets may be consumed by combat presentation.

Conceptual mapping:

```text
CHARACTER slot → player/enemy state slot
PORTRAIT slot → player/enemy portrait
MOTORCYCLE slot → player/enemy motorcycle composition
VFX_REFERENCE → corresponding presentation effect
```

Future approved assets should replace placeholders without requiring the scene architecture to be rebuilt.

## Current playable identity

`yuri` remains the existing current-proposed playable character identity for Phase 21.

```text
Yuri ↔ Maki Mach
= OPEN DESIGN QUESTION
```

Do not create `maki_mach`, merge identities, split identities or invent explanatory lore without an explicit decision.

## External reference guardrail

`Chasing KALEIDO` may be consulted for:

- combat presentation scale;
- semi-real-time card-combat patterns;
- Rider + motorcycle relationship;
- enemy staging;
- battle HUD;
- timers;
- cards;
- VFX;
- camera language;
- 3D presentation as a visual reference.

External material is research/context only. Do not copy:

```text
characters
names
story
world
art
assets
animations
UI
code
exact skills
exact card effects
exact balance
```

External information never overwrites a Mach-Girls repository decision automatically.

## Protected historical/open questions

Phase 14–16 historical evidence remains protected and must not be rewritten as Mach-Girls gameplay evidence.

Nitro / Redline global systems remain outside the current authorized boundary and continue as:

`OPEN DESIGN QUESTION`

Other unresolved design decisions remain explicitly labeled rather than inferred.

## Phase 25 result boundary

Phase 25 is successful when:

`SCENE ARCHITECTURE VERIFIED`

It is not successful merely because a placeholder looks polished, and it does not constitute final character-art approval.

## Source map

Current detailed sources include:

- `docs/design/MACH_GIRLS_MASTER_REFERENCE.md`
- `docs/design/MACH_GIRLS_CREATIVE_DIRECTION.md`
- `docs/design/DESIGN_BIBLE.md`
- `docs/design/ART_DIRECTION.md`
- `docs/design/ASSET_STUDIO.md`
- `docs/design/CHARACTER_BIBLE.md`
- `docs/design/CHARACTER_CLASS_CARD_EFFECT_SYSTEM.md`
- `docs/design/CARD_EFFECT_CATALOG.md`

Historical material remains in its documented historical locations.

## Recovery principle

```text
CURRENT DESIGN
→ MASTER BRAIN

DETAILED DESIGN
→ SPECIALIZED DOCUMENTS

IMPLEMENTATION
→ CODE

HISTORICAL CONTEXT
→ HISTORICAL DOCUMENTATION

EXTERNAL CONTEXT
→ WEB RESEARCH
```


## Phase 25 verification snapshot — 2026-10-02

The Phase 25 implementation was validated by the permanent `Rocket Bunny Runtime Tests` workflow at commit `9e84f8a9b0e8511f3f39f51a6e526030dcd0ae47`.

```text
149 tests
149 pass
0 fail
CI = SUCCESS
```

The deployed GitHub Pages root exposes the promoted combat timer and scene-state HUD in the served page. The single authorized Browser/Fish combat QA pass did not complete the requested battle interaction, so visual runtime behavior and screenshots remain NOT VERIFIED by that gate.

Final character and motorcycle art remain technical placeholders / approval-gated.


## Phase 26 — Authoritative Combat Visual Reference

The authoritative visual presentation contract is now stored at:

[docs/design/MACH_GIRLS_COMBAT_VISUAL_REFERENCE.md](../design/MACH_GIRLS_COMBAT_VISUAL_REFERENCE.md)

Mach-Girls combat is a complete 2.5D scene, not a minimal two-sprite/card interface.

The contract covers:

- full battlefield composition and layer order;
- character + motorcycle as one rider unit;
- enemy spatial staging;
- timer and combat-state hierarchy;
- telegraph / threat communication;
- damage, BREAK and BURST presentation;
- cards, ownership, role/effect identity, cost and state;
- Energy and resource readability;
- camera presets and parallax;
- foreground FX and lighting;
- responsive behavior;
- Asset Studio slots and placeholder policy.

Current status:

`PROPOSED VISUAL REFERENCE`

Human review remains required before this reference becomes an approved final visual baseline. Final character and motorcycle art remain human-approval gated.

Phase 25 live visual runtime remains `NOT VERIFIED`; the Phase 26 document is a design authority and does not replace Browser evidence.
