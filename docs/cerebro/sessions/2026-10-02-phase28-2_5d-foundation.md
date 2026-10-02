# Phase 28 — Mach-Girls 2.5D Foundation Migration

Date: 2026-10-02

## HEAD / branch

HEAD BEFORE:
30e8653cb61058a38cb34ec50821b32ef805d001

BASE:
main

MIGRATION BRANCH:
mach-girls-2.5d

The migration branch was created directly from the verified main HEAD. main was not rewritten or merged.

## Audit

### Authoritative documents consulted

- docs/cerebro/MACH_GIRLS_MASTER_GAME_DEVELOPMENT_DIRECTIVE.md
- docs/cerebro/MACH_GIRLS_GAME_BRAIN.md
- docs/cerebro/MACH_GIRLS_2_5D_MIGRATION_STRATEGY.md
- docs/design/MACH_GIRLS_MASTER_REFERENCE.md
- docs/design/MACH_GIRLS_COMBAT_VISUAL_REFERENCE.md
- docs/design/ASSET_STUDIO.md

### Existing system map

Gameplay remains owned by the existing runtime:

- GameState
- CombatEngine
- CombatClock
- cards
- Energy
- enemy behavior
- BREAK
- BURST
- status/modifiers
- effects
- abilities
- save/replay
- telemetry

Existing presentation infrastructure reused:

- combat_presentation.js
- combat_shot_director.js
- mach_girls_asset_catalog_v1

The audit found two RAF chains in combat.js before migration: one simulation loop and one presentation loop. This was treated as an architecture issue and resolved before continuing.

app.js contains a 100 ms reward/progression setInterval. It is persistence/UI polling, not a game/render loop.

## New foundation

Created:

- js/scene/world_space.js
- js/scene/camera.js
- js/scene/actor.js
- js/scene/animation.js
- js/scene/scene.js
- js/scene/renderer.js
- js/scene/presentation_events.js

The resulting target is:

WORLD SPACE
→ SCENE
→ CAMERA
→ RENDERER
→ ACTORS
→ ANIMATION
→ PRESENTATION EVENTS
→ SHOT DIRECTOR

### World space

Actor transforms support:

- x
- y
- z
- scale
- rotation
- state
- visibility
- anchor
- asset reference

World-to-screen projection is implemented as a foundation utility.

### Scene

Independent actors are registered into semantic render layers:

- BACKGROUND
- FAR
- MID
- GROUND
- ACTORS
- FX
- FOREGROUND

Depth ordering is deterministic.

### Camera

A single scene camera now owns:

- x
- y
- zoom
- target
- offsets
- interpolation
- shake state

The runtime presentation delegates the camera transform to the scene renderer.

### Renderer

MachGirlsSceneRenderer is the scene renderer facade.

It provides:

- camera application
- world-to-screen projection
- renderable ordering
- balanced Canvas context lifecycle
- renderFrame() for the main presentation frame

combat_presentation.js supplies drawing passes to this renderer rather than owning a second camera/frame lifecycle.

### Actors

A reusable actor abstraction is used for PLAYER / ENEMY / ALLY roles.

PLAYER composition supports attached child fixtures for:

- MOTORCYCLE
- SHADOW

This is structural foundation data, not final art.

### Animation

A presentation-only state machine supports:

IDLE / MOVE / WINDUP / ATTACK / HIT / STAGGER / BREAK / BURST / VICTORY / DEFEAT

No combat rule is owned by the animation system.

### Presentation events

Gameplay actions are normalized into visual events such as:

ATTACK / IMPACT / BREAK / BURST / TELEGRAPH / VICTORY / DEFEAT

The event bridge does not calculate damage, Energy, cooldowns or combat outcomes.

### Shot Director

The existing Phase 27 Shot Director was reused.

No second Shot Director was created.

The Shot Director remains responsible for semantic shot profiles and target resolution while the scene camera owns the actual camera state/interpolation.

## Loop consolidation

combat.js was refactored from two RAF chains into one main game/render loop:

ONE MAIN LOOP
→ advance existing gameplay
→ capture action/event
→ update DOM HUD
→ render presentation

The old separate simulation RAF was removed.

No cancelAnimationFrame path remains in combat.js.

No gameplay algorithm was moved into the new scene foundation.

## Gameplay safety

No new:

- combat engine
- card system
- Energy system
- AI
- Save system
- RNG system
- global Nitro
- global Redline

No Yuri ↔ Maki Mach resolution.

Historical Phase 14–16 evidence was not rewritten.

## Tests

Created:

tests/phase28_2_5d_foundation.test.mjs

Coverage includes:

- world-space transforms and projection;
- scene registration;
- depth ordering;
- actor animation transitions;
- camera interpolation;
- renderer lifecycle;
- renderFrame();
- player motorcycle/shadow composition;
- presentation event mapping;
- single main RAF ownership;
- foundation integration with combat presentation.

The contracts were also executed directly against the actual branch source through the GitHub connector because the container cannot reach github.com.

Executable result:

PASS

Verified:
- world-space projection;
- actor composition;
- depth ordering;
- animation transitions;
- camera interpolation;
- renderer lifecycle;
- presentation event bridge;
- single main loop;
- script dependency order;
- syntax parsing of the modified runtime scripts.

The container-level git/npm route was unavailable because github.com DNS/network access is blocked in the container; this is not presented as a local full-suite PASS.

## CI

A draft pull request was opened to main:

PR #14
https://github.com/araragijona-coder/vtuber-cari/pull/14

Purpose: allow the repository's existing pull_request runtime workflow to validate the migration branch without merging it.

Current combined status for the PR head returns no published checks.

CI status:
NOT VERIFIED

No test was disabled.

## Browser QA

No browser session against the migration branch was accepted as valid runtime evidence.

Reason: GitHub Pages is deployed from main, while Phase 28 work is isolated on mach-girls-2.5d. Running Browser/Fish against main would test a different commit and therefore would not verify the migration branch.

Status:
NOT VERIFIED

The prior Phase 27 Browser result remains historical and does not prove Phase 28.

## Runtime changes

RUNTIME CHANGED:
YES

The change is presentation architecture plus loop consolidation.

GAMEPLAY CHANGED:
NO

## Legacy

LEGACY PATH RETIRED:
NO

The previous presentation path remains recoverable. Phase 28 only extracts/consolidates the minimum foundation.

## Remote persistence

The migration branch and all Phase 28 files are present remotely.

The PR head references the current migration branch.

MAIN remains unchanged by merge.

## Open questions

- Final player/motorcycle/enemy/ally art remains human-approved.
- Live cinematic shot-by-shot Browser verification remains NOT VERIFIED.
- Mobile-specific visual QA remains pending.
- Yuri ↔ Maki Mach remains OPEN DESIGN QUESTION.
- Global Nitro / Redline remain outside the authorized boundary.
- The full vertical slice is intentionally deferred.

## Phase result

Foundation status:

WORLD SPACE = VERIFIED
SCENE = VERIFIED
CAMERA = VERIFIED
RENDERER = VERIFIED
ACTOR = VERIFIED
ANIMATION = VERIFIED
PARALLAX-READY LAYERS = VERIFIED
PRESENTATION EVENTS = VERIFIED
SHOT DIRECTOR REUSED = VERIFIED
SINGLE MAIN LOOP = VERIFIED
GAMEPLAY DUPLICATION = NO
LEGACY PATH = RETAINED
CI = NOT VERIFIED
BROWSER QA = NOT VERIFIED
