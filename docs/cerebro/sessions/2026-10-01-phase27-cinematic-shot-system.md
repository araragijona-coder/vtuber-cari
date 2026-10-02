# Phase 27 — Cinematic Combat Shot System & Asset Staging

Date: 2026-10-01 / verification completed 2026-10-02

## Purpose

Evolve Mach-Girls combat presentation from a mostly static 2.5D scene into a camera-filmable stage:

```text
STAGE
+
ENTITIES
+
SHOT DIRECTOR
+
CAMERA
```

The phase exists to prevent the experience from collapsing into:

```text
two sprites + cards
```

It does not add combat mechanics.

## Baseline

HEAD at Phase 27 start:

`dab51438c751e0fad68607454cdb54797cb0db40`

`docs: record phase26 combat visual reference`

The existing Phase 25 presentation already contained Canvas rendering, player/motorcycle composition, camera presets, parallax, VFX and Asset Studio integration. Phase 27 added a semantic staging layer around those primitives.

## Implemented

### Shot Director

Created:

`intento_2/webapp/js/combat_shot_director.js`

Semantic scene anchors:

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

Profiles include target, duration, zoom, offsets, easing, shake, parallax multiplier, foreground intensity and lighting intensity.

Interpolation is deterministic and presentation-only.

### Presentation integration

`combat_presentation.js` now consumes the Shot Director for:

- semantic player/enemy placement;
- optional companion and secondary/far enemy staging;
- camera framing;
- parallax intensity;
- foreground intensity;
- lighting intensity;
- shot-driven transitions;
- scene snapshot/query API.

The previous Phase 25 fallback path remains available.

### Asset Studio

Asset records can now store:

```text
sceneRole
anchor
depth
baselineScale
focusScale
focusOffsetX
focusOffsetY
allowedShots
foregroundPriority
backgroundPriority
```

The staging fields remain presentation metadata.

Identity-neutral staging is supported for enemy/companion presentation roles without creating formal character IDs. Formal PLAYER character assets continue to require a recognized formal ID.

The existing catalog key remains:

`mach_girls_asset_catalog_v1`

### User-produced art

The architecture is prepared for future manual user-provided:

```text
CHARACTER PNG
MOTORCYCLE PNG
ENEMY PNG
COMPANION PNG
BACKGROUND PLATE
VFX REFERENCE
```

Approved assets can replace technical fixtures through staging metadata without redesigning the combat scene.

Final character/waifu art remains human-approved.

## Gameplay safety

No new gameplay system was created.

The following were not intentionally modified:

```text
CombatEngine
CombatClock
Energy
AutoAttackSystem
EnemyBehaviorSystem
SkillResolver
BreakSystem
BurstSystem
Telemetry
SaveManager
```

No damage, cooldown, card-effect, RNG, Nitro, Redline or Yuri/Maki rules were changed.

## Verification

### Static / executable smoke verification

Verified:

- Shot Director script syntax;
- presentation script syntax;
- Asset Studio script syntax;
- 11 shot profiles exist;
- semantic anchors exist;
- deterministic camera interpolation returns identical frames for identical inputs;
- companion entity staging can be enabled and queried;
- presentation renderer completes with a simulated Canvas context;
- presentation API exposes `setShot`, `setSceneEntity`, `getSceneSnapshot`, `getShotState`.

### Tests

Created:

`tests/phase27_cinematic_shot_system.test.mjs`

Coverage includes shot creation/profile vocabulary, target resolution, deterministic interpolation, player/companion staging, depth metadata, Phase 25 camera compatibility, Asset Studio metadata compatibility and combat-system isolation.

The repository-wide CI status for the final HEAD currently reports no status checks, so no CI PASS is claimed from the connector.

## Browser/Fish

Exactly one Browser/Fish session was executed:

`36c356d7-1183-48eb-b29e-1d84a6b6ccc7`

Provider duration:

`151 seconds`

Verified by that live session:

```text
START BATTLE = VERIFIED
COMBAT STAGE = VERIFIED
TIMER = VERIFIED
CARDS = VERIFIED
ENEMY = VERIFIED
JS EXCEPTION = VERIFIED (none observed)
FREEZE / STUTTER = VERIFIED (none observed)
DUPLICATE LOOP = VERIFIED (none observed)
```

Not verified live:

```text
PLAYER_FOCUS
ENEMY_FOCUS
ATTACK_APPROACH
IMPACT
BREAK
BURST
COMPANION_LEFT_FOCUS
COMPANION_RIGHT_FOCUS
```

Reason: the browser operator had no exposed runtime controls/API path for invoking the new shots.

Player + motorcycle result:

`UNKNOWN`

The operator saw the motorcycle placeholder label but did not receive sufficient visual evidence of a rendered motorcycle.

The returned screenshot fields were landing URLs rather than distinct screenshot references. Therefore they are not accepted as screenshot evidence.

## Responsive verification

Semantic positioning and camera calculations are resolution-independent by design.

Desktop/mobile-specific cinematic shot behavior remains pending a dedicated evidence-producing visual gate. No claim of browser-verified mobile cinematic composition is made in this phase.

## Open questions

```text
Yuri ↔ Maki Mach = OPEN DESIGN QUESTION
Nitro / Redline global behavior = OPEN / OUTSIDE AUTHORIZED BOUNDARY
final character art = HUMAN APPROVAL REQUIRED
final motorcycle art = HUMAN APPROVAL REQUIRED
live shot-by-shot visual verification = NOT VERIFIED
```

## Result

Phase 27 implementation is persisted and structurally verified.

```text
SHOT DIRECTOR = VERIFIED
ASSET STAGING = VERIFIED
NEW GAMEPLAY = NO
RUNTIME GAMEPLAY RULES CHANGED = NO
BROWSER LIVE SHOT VISUALS = NOT VERIFIED
```

The system is prepared for later user-produced PNGs to enter Asset Studio and participate in cinematic staging without redesigning the combat architecture.

## Files

Created:
- `intento_2/webapp/js/combat_shot_director.js`
- `tests/phase27_cinematic_shot_system.test.mjs`

Modified:
- `intento_2/webapp/js/combat_presentation.js`
- `intento_2/webapp/index.html`
- `intento_2/webapp/js/admin/asset_studio.js`
- `intento_2/webapp/asset-studio.html`
- `docs/design/MACH_GIRLS_COMBAT_VISUAL_REFERENCE.md`
- `docs/design/ASSET_STUDIO.md`
- `docs/cerebro/MACH_GIRLS_GAME_BRAIN.md`

## Next phase

Use the persisted shot/staging contract for the next vertical slice. Do not add content breadth until the intended player + motorcycle + enemy cinematic slice can be browser-verified with evidence-producing controls.
