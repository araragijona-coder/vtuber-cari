# MACH-GIRLS — 2.5D MIGRATION STRATEGY

## STATUS

CURRENT ARCHITECTURAL STRATEGY / MANDATORY FOR VISUAL MIGRATION

## CORE DECISION

Mach-Girls will **not** restart from zero and will **not** continue indefinitely patching the existing presentation.

The selected strategy is:

> **PRESERVE THE BRAIN, RETIRE THE CURRENT SKIN, BUILD A NEW 2.5D PRESENTATION LAYER.**

Conceptually:

```
EXISTING PROJECT
        │
        ├── GAMEPLAY ──────── CONSERVE
        ├── DATA ──────────── CONSERVE
        ├── AI ────────────── CONSERVE
        ├── BALANCE / RNG ─── CONSERVE
        │
        └── OLD PRESENTATION ── RETIRE PROGRESSIVELY
                                      │
                                      ↓
                              NEW 2.5D GAME LAYER
```

## PRESERVE

The following systems are valuable foundations and must not be discarded merely because the presentation changes:

- `game/cards.js`
- `game/energy.js`
- `game/break.js`
- `game/burst.js`
- `game/effects.js`
- `game/abilities.js`
- `game/character_kits.js`
- `game/enemies.js`
- `game/enemy.js`
- `game/enemy_behavior.js`
- `game/combat_clock.js`
- `game/auto_attack.js`
- `game/status.js`
- `game/modifiers.js`
- `game/actions.js`
- `game/skill_resolver.js`
- `game/state.js`
- `game/rules.js`
- `game/rewards.js`

Also preserve:

- character and enemy data;
- cards;
- Energy;
- cooldowns;
- BREAK;
- BURST;
- AI;
- balance;
- RNG;
- any backend/API already justified by the product;
- `combat_shot_director.js`;
- the useful parts of `combat_presentation.js`.

These files are **not automatically approved as perfect architecture**. They are the existing source of truth to inspect, reuse, isolate, or incrementally refactor.

## RETIRE PROGRESSIVELY

The following presentation patterns should leave the main execution path:

- old renderer/scene that behaves like image + HP + button;
- old `game.js` presentation built around simplistic scenery and geometric player representation;
- visible debug data;
- DOM-based physical representation of combat actors.

Retiring means **remove from the runtime path after replacement is verified**, not blindly delete.

Where appropriate, old presentation files may move to `legacy/` or remain unused until the migration is proven safe.

## combat.js RULE

Do **not** delete `combat.js` merely because it is large or mixed.

First use it as a dependency map.

Then incrementally extract responsibilities such as:

```
COMBAT CONTROLLER
    │
    ├── STATE
    ├── ACTIONS
    └── RESOLVER

PRESENTATION
    │
    ├── CAMERA
    ├── ANIMATION
    ├── VFX
    └── SCENE
```

No blind rewrite.

## TARGET PRESENTATION ARCHITECTURE

The new presentation should move toward:

```
webapp/
│
├── assets/
│   ├── characters/
│   ├── motorcycles/
│   ├── enemies/
│   ├── backgrounds/
│   ├── foreground/
│   └── vfx/
│
├── js/
│   ├── engine/
│   │   ├── game-loop
│   │   ├── scene
│   │   ├── renderer
│   │   ├── camera
│   │   ├── actor
│   │   ├── animation
│   │   └── assets
│   │
│   ├── presentation/
│   │   ├── shot-director
│   │   ├── combat-presentation
│   │   ├── vfx
│   │   └── hit-stop
│   │
│   ├── combat/
│   │   ├── controller
│   │   ├── state
│   │   └── events
│   │
│   ├── game/
│   │   └── existing gameplay systems
│   │
│   └── ui/
│       ├── hud
│       ├── cards
│       └── menus
│
└── legacy/
    └── retired presentation
```

This is a target architecture, not permission to create duplicate files for every existing system.

## WORLD-FIRST RULE

Before implementing new UI, first ask whether the information/action belongs physically in the scene.

Examples:

```
CHARACTER ATTACK
→ actor movement + animation + camera + VFX

ENEMY HIT
→ recoil + impact + damage presentation

BREAK
→ stagger + camera emphasis + VFX

BURST
→ cinematic shot + actor movement + VFX

HP / Energy / cards
→ HUD overlay
```

The scene remains primary.

## FIRST VERTICAL SLICE

Do not rebuild the entire game at once.

The first target is:

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

The critical test is:

```
PLAYER
 ↓
MOVE / ACCELERATE
 ↓
CAMERA FOCUS
 ↓
ATTACK
 ↓
IMPACT
 ↓
ENEMY RECOIL
 ↓
BREAK
 ↓
BURST
 ↓
CAMERA RECOVERY
```

If this scene is not convincing, do not expand content.

## BRANCH / SAFETY STRATEGY

A dedicated migration branch is appropriate when implementation begins so the existing `main` remains recoverable while the new scene architecture is developed.

Recommended shape:

```
main
  │
  └── mach-girls-2.5d
          │
          ├── foundation
          ├── first battle
          ├── movement
          ├── attack
          ├── camera
          ├── vfx
          ├── break
          ├── burst
          └── vertical slice validation
```

The branch must not become a second uncontrolled project. It remains a migration branch derived from the existing source of truth.

Any eventual integration back to `main` must be evidence-based and preserve existing gameplay systems.

## DO NOT

Do not instruct an implementation agent to:

```
"build Mach-Girls from scratch"
```

Do not request:

- a new card system;
- a new Energy system;
- a duplicate combat engine;
- a duplicate game loop;
- a second renderer;
- a second AI;
- a second save system;
- a new random system.

The agent must inspect existing systems first.

## MIGRATION LAW

For every existing system:

```
SEARCH
→ READ
→ UNDERSTAND DEPENDENCIES
→ REUSE OR EXTRACT
→ TEST REPLACEMENT
→ SWITCH RUNTIME
→ ONLY THEN RETIRE OLD PATH
```

Never:

```
DELETE
→ HOPE
→ REBUILD
```

## RELATION TO MASTER DIRECTIVE

This strategy implements the master development directive:

> Build a game that uses the web as a platform, not a web interface that describes a game.

Therefore, a technically functional old UI is not protected merely because it works.

What is protected is the **useful game brain and data**, while the **presentation layer may be replaced** when the new 2.5D layer proves equivalent or better for the required responsibilities.

## HUMAN ART BOUNDARY

The migration architecture must support user-created assets.

Final character/waifu art remains human-approval gated.

Technical placeholders may be used for staging, camera, movement and VFX validation.

## NON-GAMEPLAY BOUNDARIES

This strategy does not authorize:

- new gameplay mechanics merely to support presentation;
- global Nitro;
- global Redline;
- resolution of Yuri ↔ Maki Mach;
- rewriting historical Phase 14–16 evidence.

## SUCCESS CONDITION

The migration is successful when the first vertical slice behaves and reads as a game scene:

```
SCENE
→ CHARACTERS
→ MOVEMENT
→ CAMERA
→ ACTION
→ IMPACT
→ HUD
```

rather than:

```
HTML
→ PANELS
→ CARDS
→ BUTTONS
→ IMAGE
→ HP
```


## Phase 28 — foundation migration checkpoint

Phase 28 implements the first safe migration layer on mach-girls-2.5d.

Reused systems:
GAMEPLAY → existing GameState / CombatEngine / CombatClock / cards / Energy / AI / BREAK / BURST / Save / Telemetry
PRESENTATION CONTRACT → Phase 27 Shot Director + existing Asset Studio catalog

New foundation:
WORLD SPACE → x / y / z / scale / rotation / state
SCENE → independent actors + render layers + effects + camera
CAMERA → x / y / zoom / target / offsets + interpolation
RENDERER → camera application + world-to-screen projection + depth/layer ordering
ACTOR → reusable PLAYER / ENEMY / ALLY representation
ANIMATION → presentation-only state transitions
PRESENTATION EVENTS → gameplay action → visual event boundary

Loop consolidation:
The pre-migration combat runtime had two RAF chains: simulation and presentation. They are now consolidated into one main runtime loop in combat.js:
ONE MAIN LOOP → advance existing gameplay → capture action/event → update HUD → render presentation

No combat rule was moved into the new foundation.

Legacy status:
LEGACY != DELETE. The existing combat presentation has not been deleted. Responsibilities are extracted only when the replacement exists and has executable verification.

Phase 28 limits:
No complete vertical slice, final art, new gameplay, new roster, global Nitro/Redline or second engine.


## PHASE 29 — FIRST CINEMATIC VERTICAL SLICE

Phase 29 is the first integration checkpoint after the foundation. It does not add gameplay systems; it proves that the foundation can stage a small combat scene.

Required scene:

```text
BACKGROUND
   ↓
ENEMY (deeper z plane)

PLAYER + MOTORCYCLE + SHADOW
   ↓
foreground / midground
```

The live presentation path now has a controlled cinematic sequence:

```text
ESTABLISHING
→ PLAYER_FOCUS
→ ENEMY_FOCUS
→ ATTACK_APPROACH
→ IMPACT
→ BREAK
→ BURST
→ IMPACT
→ PLAYER_FOCUS
```

The sequence is orchestrated from the existing combat controller but delegates all game decisions to the existing gameplay stack. The demo uses the existing `yuri_break_drive` card and the existing `iron_guard` enemy; it does not add a demo-only skill, enemy, damage rule or Burst calculation.

### Phase 29 presentation additions

```text
WORLD SPACE
  ├── depth-correct projection
  ├── controlled actor motion
  └── PLAYER composition children
        ├── MOTORCYCLE
        └── SHADOW

SCENE / CAMERA
  ├── real camera x/y focus
  ├── shot interpolation
  ├── attack / impact / break / burst response
  └── camera recovery

UI
  └── PLAY CINEMATIC SLICE trigger
```

The battle renderer remains singular. DOM remains limited to HUD/cards/menus/debug controls.

### Gameplay proof boundary

Executable smoke verification may prove that the existing card path can reach BREAK and make BURST available. It does not prove live visual quality. Browser/Fish evidence is therefore a separate gate.

### Legacy rule

Phase 29 does not delete the previous presentation implementation. The legacy path remains recoverable until each responsibility has a replacement plus verification.
