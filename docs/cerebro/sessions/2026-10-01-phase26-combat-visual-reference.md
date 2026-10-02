# Phase 26 — Combat Visual Reference

Date: 2026-10-01

## Why this exists

Phase 25 established the technical 2.5D presentation architecture, but its live Browser/Fish visual validation did not return usable screenshot evidence.

Phase 26 converts the intended experience into a durable, authoritative visual design contract so future AI sessions cannot simplify the product to:

`two sprites + cards`.

## Visual target

Mach-Girls combat is intended as a complete 2.5D anime/cyberpunk/bōsōzoku combat scene containing:

`battlefield + character + motorcycle + enemies + depth + timer + telegraph + cards + Energy + BREAK + BURST + camera + VFX + parallax + lighting + layered UI`.

The battlefield is the dominant visual stage.

## Major decisions

### Scene layers

`BACKGROUND → FAR PARALLAX → MIDGROUND → ENEMY → COMBAT FX → CHARACTER + MOTORCYCLE → FOREGROUND FX → HUD → CARDS`

### Rider unit

Character, motorcycle, shadow and identity effects are treated as one logical visual entity with shared anchor, relative scale and relative offset.

### Enemy presence

Enemies must occupy real scene positions with depth/scale, HP/status, telegraph and damage/BREAK response.

### HUD

Primary hierarchy:

`Combat state/timer → threat → enemy HP/status → player identity → cards → Energy → BREAK → BURST`.

### Action presentation

Damage, telegraph, BREAK and BURST are represented as visual events rather than only changing numeric values.

### Camera

Canonical presets:

`IDLE / APPROACH / ATTACK / IMPACT / BREAK / BURST / VICTORY / DEFEAT`.

### Production boundary

The design remains compatible with 2D character/motorcycle/enemy art, Canvas scene/VFX, DOM HUD/cards, parallax and camera transforms.

No full 3D engine is introduced.

## Visual reference artifact

Primary reference:

[docs/cerebro/visual-references/mach-girls-combat-visual-reference.svg](../visual-references/mach-girls-combat-visual-reference.svg)

Status:

`CONCEPTUAL DESIGN REFERENCE`

`NOT FINAL ART`

`NOT GAME ASSET`

The reference is an authored SVG fallback. The native image-generation tool was unavailable in this session because its rate limit was reached. Krea was checked as an alternative and the selected generation attempts were blocked by insufficient account balance. No generated image result was falsely claimed.

## What is proposed

- final visual treatment and art style details;
- exact final character and motorcycle appearance;
- future authored backgrounds/VFX;
- final production UI polish.

These remain subject to design iteration and human review.

## What is verified

- Phase 25 runtime architecture already exists in the repository;
- the visual contract is now persisted;
- the reference image exists as a repository artifact;
- the Master Brain links to the new authoritative contract;
- no runtime/gameplay code was changed in Phase 26.

## What remains open

`Yuri ↔ Maki Mach = OPEN DESIGN QUESTION`

Nitro and Redline remain outside the authorized runtime boundary.

Final character/motorcycle art remains human-approval gated.

Phase 25 live visual runtime remains `NOT VERIFIED`.

## Next phase

Use the authoritative visual contract as the source for future visual implementation and human design review. Do not promote the reference from `PROPOSED` to approved without explicit human approval.
