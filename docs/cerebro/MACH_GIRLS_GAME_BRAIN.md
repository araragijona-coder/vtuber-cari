# MACH-GIRLS — GAME BRAIN

## Status

MASTER CURRENT DESIGN / RECOVERY BRAIN

This document exists so a future AI can reconstruct the intended Mach-Girls experience without relying on conversational memory or simplifying the project from the visible MVP code.

## Master Game Development Directive — MANDATORY

The project now has a mandatory authoritative development directive:

[docs/cerebro/MACH_GIRLS_MASTER_GAME_DEVELOPMENT_DIRECTIVE.md](MACH_GIRLS_MASTER_GAME_DEVELOPMENT_DIRECTIVE.md)

Its central rule is:

```
BUILD A GAME THAT USES THE WEB AS A PLATFORM
NOT A WEB INTERFACE THAT DESCRIBES A GAME
```

The player must perceive, in priority order:

```
SCENE → CHARACTERS → MOVEMENT → CAMERA → ACTION → IMPACT
→ HUD → CARDS → STATS → BUTTONS
```

The target presentation is **2.5D CINEMÁTICO**: design the experience as a simplified 3D game first, then choose efficient 2.5D representations. Important combat actors conceptually live in world space with transforms including `x/y/z/scale/rotation/state`, and the pipeline is:

```
WORLD POSITION → CAMERA → PROJECTION → SCREEN POSITION → RENDER
```

The HUD is a game layer, never the game itself.

The directive also makes these architectural boundaries mandatory:

- gameplay and presentation remain separate;
- cinematic presentation flows through a Shot Director and presentation events;
- one main game loop and one main renderer;
- scene actors belong to the renderer, not DOM nodes;
- existing systems must be reused before creating replacements;
- no new gameplay systems, global Nitro, global Redline, or resolution of Yuri ↔ Maki Mach as part of visual work;
- the first convincing vertical slice has priority over adding content;
- a technically functional scene that still looks like a webpage is not an acceptable finish state.

The directive supersedes any earlier tendency to interpret the combat scene as a static illustration, minimal card interface, or simple two-sprite arrangement.

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


## Phase 27 — Cinematic combat staging

Mach-Girls combat now has an explicit presentation architecture:

```text
STAGE
→ ENTITIES
→ SHOT DIRECTOR
→ CAMERA
```

The scene is designed to be filmed by a deterministic camera rather than treated as one baked illustration.

Semantic anchors:

```text
PLAYER
PLAYER_FOCUS
COMPANION_LEFT
COMPANION_RIGHT
ENEMY_PRIMARY
ENEMY_SECONDARY
ENEMY_FAR
FOREGROUND_LEFT
FOREGROUND_RIGHT
```

Cinematic shots:

```text
ESTABLISHING
PLAYER_FOCUS
COMPANION_LEFT_FOCUS
COMPANION_RIGHT_FOCUS
ENEMY_FOCUS
ATTACK_APPROACH
IMPACT
BREAK
BURST
VICTORY
DEFEAT
```

The Shot Director is presentation-only and deterministic. It must not introduce gameplay, RNG, damage changes or roster changes.

Mach-Girls combat remains a complete 2.5D battle stage, not a minimal two-sprite/card interface.

Phase 27 extends Asset Studio staging metadata so user-produced PNGs can later carry scene role, depth, baseline/focus scale, focus offsets and allowed shots while retaining the existing human approval gate.

Phase 25 live visual runtime remains `NOT VERIFIED` until an evidence-producing browser gate completes; Phase 27 implementation status must not be used as runtime visual proof.


## Master 2.5D migration strategy

The current implementation strategy is:

> **PRESERVE THE BRAIN, RETIRE THE CURRENT SKIN, BUILD A NEW 2.5D PRESENTATION LAYER.**

Authoritative detail:
[docs/cerebro/MACH_GIRLS_2_5D_MIGRATION_STRATEGY.md](MACH_GIRLS_2_5D_MIGRATION_STRATEGY.md)

Preserve and reuse the existing gameplay brain, data, AI, balance, RNG, cards, Energy, cooldowns, BREAK, BURST and other established systems. Do not restart the project and do not create uncontrolled duplicate systems.

The old presentation may be retired from the runtime path progressively once its responsibilities are replaced and verified. Old presentation code should not be deleted blindly.

`combat.js` remains protected as a dependency map until its responsibilities can be safely separated. The new architecture should converge toward:

```
GAMEPLAY
→ controller / state / actions / resolver

PRESENTATION
→ scene / renderer / world-space actors / camera / animation / VFX / Shot Director

UI
→ HUD / cards / menus
```

When implementation begins, a dedicated migration branch such as `mach-girls-2.5d` may be used to keep the existing `main` recoverable while the new presentation is validated. This is a migration branch, not a second uncontrolled project.

The first required vertical slice remains intentionally small:

```
1 PLAYER
1 MOTORCYCLE
1 ENEMY
1 BACKGROUND
1 CAMERA
1 ATTACK
1 BREAK
1 BURST
```

Do not expand content until this slice demonstrates the intended game-like scene behavior.




## Phase 27 verification status — 2026-10-02

Phase 27 implementation status:

```text
SHOT DIRECTOR = VERIFIED BY STATIC / EXECUTABLE SMOKE TEST
ASSET STAGING METADATA = VERIFIED BY STATIC / EXECUTABLE SMOKE TEST
NO NEW GAMEPLAY = VERIFIED BY CHANGE SCOPE
BROWSER LIVE SHOT VISUALS = NOT VERIFIED
```

The single Browser/Fish pass confirmed live combat start, timer, cards, enemy presence, no JS exception and no freeze/stutter. It did not expose a usable API/control path for invoking the new cinematic shots, so those shot-specific visual behaviors remain NOT VERIFIED.

The live motorcycle rendering was UNKNOWN in that pass: the operator saw the placeholder label but did not receive evidence of the rendered motorcycle visual itself.

The phase remains a presentation migration only. Do not interpret this browser result as gameplay validation.

## Phase 28 — 2.5D foundation migration

Phase 28 starts the real presentation migration on the dedicated branch mach-girls-2.5d.

Foundation flow:

WORLD SPACE → SCENE → CAMERA → RENDERER → ACTORS → ANIMATION → PRESENTATION EVENTS → SHOT DIRECTOR

The gameplay brain remains the existing runtime. combat.js remains the integration controller and now owns one main requestAnimationFrame loop that advances the existing simulation and renders the presentation. The reward/progression polling in app.js remains a separate persistence timer, not a second game/render loop.

Foundation modules:
- js/scene/world_space.js
- js/scene/camera.js
- js/scene/scene.js
- js/scene/actor.js
- js/scene/animation.js
- js/scene/renderer.js
- js/scene/presentation_events.js

The existing Phase 27 Shot Director is reused, not duplicated.

Status:
2.5D FOUNDATION = CURRENT / VERIFIED BY EXECUTABLE SMOKE TEST

Live shot-by-shot Browser evidence remains separate and must not be inferred from static/runtime verification.


## Phase 29 — First cinematic vertical slice

Phase 29 advances the presentation migration from foundation to a single playable cinematic slice while preserving the existing gameplay brain.

The slice is intentionally constrained to:

```text
1 PLAYER
1 MOTORCYCLE
1 SHADOW
1 ENEMY
1 BACKGROUND
TECHNICAL COMPANION LEFT/RIGHT
```

Presentation flow:

```text
ESTABLISHING
→ PLAYER_FOCUS
→ ENEMY_FOCUS
→ ATTACK_APPROACH
→ IMPACT
→ BREAK
→ BURST
→ IMPACT
→ PLAYER_FOCUS RECOVERY
```

The attack is not a demo-only rule. The orchestrator uses the existing `yuri_break_drive` card through `GameActions` and `CombatEngine.resolveAction`, waits for the existing Energy/cooldown state, and lets the existing BREAK/BURST systems decide when those states become available.

The new presentation work is limited to:
- controlled actor motion tracks;
- presentation-only hit stop / recoil timing;
- real camera focus using world-space camera x/y;
- depth semantics where lower z is farther and higher z is closer;
- shared PLAYER → MOTORCYCLE + SHADOW composition;
- an explicit cinematic-slice control in the existing UI.

No new combat engine, card system, Energy system, AI, RNG, Save system, BREAK rule, BURST calculation or game loop was introduced.

Executable gameplay smoke verification on the branch reached BREAK and then BURST with the existing `iron_guard` enemy using real `yuri_break_drive` actions; the smoke route observed enemy HP remaining above zero and player HP remaining positive.

Live browser visual verification is tracked independently and must not be inferred from these executable checks.
