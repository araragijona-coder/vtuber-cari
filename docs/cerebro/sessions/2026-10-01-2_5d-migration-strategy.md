# 2026-10-01 — 2.5D MIGRATION STRATEGY DECISION

## Status

CURRENT ARCHITECTURAL STRATEGY / PERSISTED

## Decision

Mach-Girls will not restart from zero and will not remain trapped in the existing presentation.

The selected strategy is:

> **PRESERVE THE BRAIN, RETIRE THE CURRENT SKIN, BUILD A NEW 2.5D PRESENTATION LAYER.**

## Preserve

Existing gameplay/data/AI foundations remain valuable:

- cards;
- Energy;
- BREAK;
- BURST;
- effects;
- abilities;
- character kits;
- enemies;
- enemy behavior;
- CombatClock;
- auto attack;
- status/modifiers;
- actions;
- skill resolver;
- state/rules/rewards;
- character/enemy data;
- balance/RNG;
- justified backend/API;
- Shot Director;
- useful presentation infrastructure.

## Retire progressively

The legacy visual path that behaves like a web interface should be removed from the active runtime only after its responsibilities are replaced and verified.

This includes the old simplistic scene/renderer, visible debug UI, and DOM-based physical actor representation.

Do not blindly delete legacy code.

## combat.js

Do not delete `combat.js` merely because it is large or mixed.

Use it first as a dependency map, then incrementally separate:

```
COMBAT
→ state / actions / resolver

PRESENTATION
→ scene / renderer / camera / animation / VFX / Shot Director

UI
→ HUD / cards / menus
```

## Migration

A dedicated migration branch such as `mach-girls-2.5d` is the preferred development safety boundary when implementation begins. It remains a migration branch, not a second uncontrolled project.

## First vertical slice

The migration starts with:

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

Target sequence:

```
PLAYER
→ MOVE / ACCELERATE
→ CAMERA FOCUS
→ ATTACK
→ IMPACT
→ ENEMY RECOIL
→ BREAK
→ BURST
→ CAMERA RECOVERY
```

Do not expand content before this slice is convincing.

## Guardrails

Do not create duplicate:

- card systems;
- Energy systems;
- combat engines;
- game loops;
- renderers;
- AI;
- save systems;
- RNG systems.

Do not resolve Yuri ↔ Maki Mach, add global Nitro/Redline, or rewrite historical Phase 14–16 evidence as part of this migration.

## Persistence

The strategy was added to the Master Brain and stored as the dedicated migration strategy document.
