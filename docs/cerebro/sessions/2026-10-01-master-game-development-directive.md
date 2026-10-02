# 2026-10-01 — MASTER GAME DEVELOPMENT DIRECTIVE

## Status

MANDATORY / CURRENT / AUTHORITATIVE

## Decision

The project adopts `MACH_GIRLS_MASTER_GAME_DEVELOPMENT_DIRECTIVE.md` as the mandatory development contract for future Mach-Girls work.

The most important rule is:

> Build a game that uses the web as a platform, not a web interface that describes a game.

The player-facing priority is:

```
SCENE → CHARACTERS → MOVEMENT → CAMERA → ACTION → IMPACT
→ HUD → CARDS → STATS → BUTTONS
```

## Consequences

Mach-Girls is treated as a cinematic 2.5D game experience.

Future work must:

- design the experience as simplified 3D first and implement efficiently in 2.5D;
- model important actors conceptually in world space;
- keep gameplay separate from presentation;
- route cinematic presentation through camera / Shot Director / presentation-event systems;
- keep a single main loop and renderer;
- keep scene actors in the renderer rather than representing the battlefield through DOM;
- reuse existing systems before introducing replacements;
- prioritize the first convincing vertical slice before expanding content.

A technically functioning scene that still looks like a webpage is not considered an acceptable visual finish state.

## Protected boundaries

This directive does not authorize:

- new gameplay mechanics merely for presentation;
- global Nitro;
- global Redline;
- resolution of Yuri ↔ Maki Mach;
- replacement of existing combat systems without evidence that replacement is required.

## Persistence

The directive was persisted to the repository and linked from the Master Brain.

## Commits

Directive file:
`fd79c9d7a71ff487d6fca63c5ee02cb4a0491238`

Master Brain link:
`f404884cdb3f13aad10fd46790a3edafb8d6479c`
