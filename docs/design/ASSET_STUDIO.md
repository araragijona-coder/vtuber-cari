# Mach-Girls Asset Studio

## Status

CURRENT TOOLING DESIGN + IMPLEMENTATION.

The Asset Studio is an internal authoring/catalog page for visual asset integration. It is not part of the public player flow and does not modify combat rules.

## Route

Static GitHub Pages route:

`./asset-studio.html`

The deployed project route is therefore:

`https://araragijona-coder.github.io/vtuber-cari/asset-studio.html`

The route is intentionally a separate static document rather than a router entry in the combat page.

## Purpose

The studio separates:

`ART CREATION`

from:

`ART INTEGRATION`

The user can load a PNG, classify it, assign an existing formal entity, configure state/angle/facing/anchor/scale, preview it, test lightweight animation/VFX/camera, validate the metadata and then save a draft or explicitly approve the art.

The studio does not judge aesthetic quality.

## Asset types

The first supported types are:

- CHARACTER
- PORTRAIT
- MOTORCYCLE
- CARD_ART
- BACKGROUND
- VFX_REFERENCE
- STATUS_ICON

Character and motorcycle presentation defaults to a `FEET_CENTER` anchor. Other asset types default to `CENTER`.

## Character states

Character/portrait authoring supports:

- IDLE
- ATTACK
- HURT
- BREAK
- BURST
- VICTORY
- DEFEAT
- SKILL

## Angles and facing

Angles:

- FRONT
- THREE_QUARTER
- SIDE
- BACK

Facing:

- LEFT
- RIGHT
- FRONT

`flipX` is presentation metadata. The original PNG is never mutated.

## PNG rules

Canonical character shipping format:

`PNG + transparent background`

The studio validates:

- extension/name;
- `image/png` MIME type;
- PNG signature;
- file size;
- successful browser decoding;
- dimensions;
- transparency when the browser can inspect alpha.

Recommended character dimensions are 64–4096 px per axis. These are warnings rather than aesthetic rejection rules.

A white background can be selected only as a preview background. It is not the canonical character shipping format.

## Placeholder policy

The built-in character placeholder is:

`TECHNICAL PLACEHOLDER`

It is a technology fixture only. It exists to test:

- camera;
- scale;
- anchor;
- safe area;
- state switching;
- VFX;
- animation.

It does not represent Yuri, Maki Mach or any other character.

A placeholder cannot be promoted to `APPROVED`.

## Approval workflow

The intended human workflow is:

CONCEPT  
↓  
HUMAN APPROVAL  
↓  
PNG  
↓  
ASSET STUDIO  
↓  
VALIDATION  
↓  
SLOT  
↓  
PREVIEW  
↓  
GAMEPLAY

Statuses:

- `DRAFT` — uploaded or edited asset awaiting approval.
- `TECHNICAL_PLACEHOLDER` — generated technical fixture; never final art.
- `APPROVED` — only after explicit human action through the approval button.

The studio never automatically approves an image.

## Asset registry

The catalog schema is:

```js
{
  assetId,
  type,
  entityId,
  state,
  angle,
  facing,
  sourceType,
  source,
  status,
  scale,
  anchor,
  anchorX,
  anchorY,
  offsetX,
  offsetY,
  flipX,
  layer,
  width,
  height,
  sizeBytes,
  approvedByHuman,
  createdAt,
  updatedAt
}
```

The current registry is version 1 and uses the dedicated key:

`mach_girls_asset_catalog_v1`

It is deliberately separate from:

- `bosozoku_player_save`;
- `bosozoku_admin_db`.

## Static asset limitation

A browser page hosted by GitHub Pages cannot write a new PNG back into the Git repository.

Therefore the studio supports two source modes:

- `UPLOAD` — browser-local data URL used for preview and, when small enough, catalog persistence.
- `STATIC_PATH` — reference to a PNG already committed into the static project tree.

For uploaded binaries larger than 1.5 MB, inline localStorage persistence is blocked and the author is directed to use a static project path. This avoids silently pretending that browser storage is repository storage.

The catalog is therefore an authoring layer, not a cloud asset store.

## Preview stage

The preview stage is independent from live combat.

It supports:

- player/character placement simulation;
- camera zoom and offset;
- safe-area guide;
- anchor marker;
- background selection;
- lightweight state-dependent motion;
- `flipX`;
- VFX previews.

No preview operation mutates `CombatEngine`, `CombatClock` or any gameplay state.

## Camera presets

The first reusable visual presets are:

- DEFAULT
- ATTACK IMPACT
- BREAK
- BURST
- VICTORY
- DEFEAT

Presets are authoring values only. They are not combat rules.

## VFX preview

The studio can preview:

- FLASH
- GLOW
- MOTION TRAIL
- IMPACT
- SCREEN SHAKE
- DAMAGE NUMBER
- BREAK FX
- BURST FX
- TELEGRAPH PULSE

These previews are not a new gameplay VFX system.

## Prompt assistant

The prompt assistant produces technical guidance including:

- character/entity;
- state;
- angle;
- facing;
- framing;
- transparent background;
- pose guidance;
- silhouette/padding requirements.

It does not choose character beauty, identity, canon or final aesthetic approval.

## Yuri / Maki boundary

The current formal character ID available to the studio is:

`yuri`

`Maki Mach` is not a runtime character ID in this tool.

The studio does not:

- create `maki_mach`;
- merge Yuri and Maki Mach;
- split Yuri and Maki Mach;
- invent lore about their relationship.

This preserves the Phase 22 continuity decision.

## Accessibility

The UI uses native form controls, real HTML buttons, keyboard focus states and ARIA status updates. VFX buttons use `aria-pressed` rather than color alone.

## Performance

The preview uses one `requestAnimationFrame` loop, no per-frame DOM reconstruction and no per-frame event-listener creation.

The combat runtime is not loaded by this page.

## Future expansion

Possible future tooling may add:

- additional formally defined character IDs;
- contact sheets;
- asset export manifests;
- animation frame sequences;
- more sophisticated camera authoring;
- project-side static asset synchronization.

Those are future work, not current implementation.

## Epistemic labels

**VERIFIED:** the implemented tool and its current storage/validation behavior described above.

**CURRENT:** the route, registry key and asset workflow now present in the repository.

**PROPOSED:** future expansion ideas and any visual style decisions not established by current assets.

**OPEN DESIGN QUESTION:** final character art, final character roster, any new character IDs, and any choice to change the current static-storage architecture.
## Phase 25 — Combat Presentation Integration

The Asset Studio remains the authoring boundary for visual assets. Phase 25 adds a runtime consumption path without turning the studio into a cloud asset store.

### Combat slot mapping

Approved catalog records may map into combat presentation slots:

```text
CHARACTER / player entity / ATTACK
→ player.attack

CHARACTER / enemy entity / BREAK
→ enemy.break

PORTRAIT / player entity
→ player.portrait

MOTORCYCLE / player entity
→ player.motorcycle

MOTORCYCLE / enemy entity
→ enemy.motorcycle
```

Only records with `status = APPROVED` are consumed.

The catalog key remains:

`mach_girls_asset_catalog_v1`

### Placeholder gate

The combat scene provides:

`TECHNICAL CHARACTER PLACEHOLDER · NOT FINAL ART`

and

`TECHNICAL MOTORCYCLE PLACEHOLDER · NOT FINAL ART`

These are technology fixtures for scale, camera, motion and VFX validation. They cannot be interpreted as final character art or human approval.

### Replacement contract

A future approved PNG can replace the placeholder through its Asset Studio slot without changing the combat scene architecture. Yuri remains the currently available formal character ID; no `maki_mach` runtime identity is introduced.

### Scope boundary

Phase 25 does not modify combat rules, save/replay semantics, Energy rules, BREAK/BURST mechanics, RNG, telemetry semantics or the Asset Studio approval process.
