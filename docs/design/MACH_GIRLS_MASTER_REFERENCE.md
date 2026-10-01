# Mach-Girls Master Reference

## 1. Master role

**CURRENT MASTER DESIGN REFERENCE**

`MACH_GIRLS_MASTER_REFERENCE.md` is the master index for the project's current design state. It does not replace specialist documents.

When a subject has a detailed source, read that source rather than assuming this index contains every detail.

## 2. Source of truth / conflict resolution

When documents differ:

1. Do not assume both versions are correct.
2. Do not invent a compromise.
3. Record the contradiction.
4. Identify CURRENT versus HISTORICAL/OUTDATED when repository evidence supports that distinction.
5. Otherwise mark the issue **OPEN DESIGN QUESTION**.
6. Never promote an old proposal to canon merely because it appears in an older document.

Phase evidence and historical artifacts retain their original epistemic labels.

## 3. Epistemic states

- **HISTORICAL** — preserved project/history material.
- **AUTHENTIC** — evidence reproduced from an authentic historical source.
- **CURRENT** — presently active project state.
- **VERIFIED** — directly checked in current code/artifacts/tests.
- **CURRENT PROPOSED** — current direction not yet declared narrative canon.
- **PROPOSED DESIGN** — future design proposal.
- **TEST-ONLY** — implementation fixture, not roster/canon.
- **UNKNOWN** — not established by available evidence.
- **OPEN DESIGN QUESTION** — unresolved and intentionally not invented.

## 4. Project identity

### CURRENT PROJECT DIRECTION

**Mach-Girls**

Status: **PROPOSED CURRENT FRANCHISE / DESIGN DIRECTION**

This is not a final commercial/legal rename.

### HISTORICAL / ORIGINAL WORKING TITLE

**Rocket Bunny Petty**

Historical names, paths, URLs and evidence must remain recoverable.

## 5. World calendar

**CURRENT PROPOSED**

`2030 D.S.`

D.S. = Después del STOP.

STOP is retained as the foundational world event. The exact chronology/scientific description remains source-dependent and must not be invented.

## 6. Force of Speed

**CURRENT PROPOSED WORLD ELEMENT**

The universe's central thematic vocabulary includes:

- speed
- velocity
- G-Force
- Mach
- Inertia
- Apex
- Vector

Earlier lore already contains speed/velocity concepts, the Index of Speed and regulation technology. This master reference does not impose a new scientific explanation.

A **CURRENT PROPOSED** narrative concept holds that prior generations/families were connected to the discovery or development of knowledge related to the Force of Speed.

Exact researchers, institutions, dates, discoveries and genealogy remain **OPEN DESIGN QUESTION**.

## 7. Current proposed character concepts

| Character | Status | Established concept |
|---|---|---|
| **Maki Mach** | CURRENT PROPOSED CHARACTER CONCEPT | Central/protagonist concept; speed/Mach focus; ambition to surpass the sound barrier. |
| **Gia G.F.** | CURRENT PROPOSED CHARACTER CONCEPT | Rival of Maki; wealthy family; daughter of a cold millionaire; privileged upbringing; family associated with speed history. |
| **Hōka V.** | CURRENT PROPOSED CHARACTER CONCEPT | School president; best student; granddaughter of school director; wealthy/good family; institutional privilege; forceful authority over intruders; popular among female students. |
| **Takane Apex** | CURRENT PROPOSED CHARACTER CONCEPT | Cold, calculating, precise, perfectionist; apex / ideal racing line. |
| **Kanase Inertia** | CURRENT PROPOSED CHARACTER CONCEPT | Rebellious; difficult to stop once moving; momentum / inertia concept. |

These names do not automatically create runtime character IDs.

## 7A. Yuri / Maki continuity

**OPEN DESIGN QUESTION**

Yuri remains the existing formal character/runtime reference. Maki Mach remains a separate current-proposed concept. No merge, split, alias or rename is implied.

See [DECISION_LOG.md](DECISION_LOG.md) and [CHARACTER_BIBLE.md](CHARACTER_BIBLE.md) for the continuity resolution.

## 8. Characters are not classes

Characters and engine roles are separate layers.

Engine roles:

- STRIKER / DPS
- DEFENDER / TANK
- SUPPORT / HEALER
- DEBUFFER / CONTROL

World-facing Mach-Girls specializations remain proposals:

- MACHs / SUPERSONIC STRIKERS
- G-FORCERS
- OVERCLOCKERS
- FRICTION HACKERS / VECTORS
- PIT MECHANICS / BIO-REGEN DRIVERS

A character is not assigned automatically from its surname.

## 9. Current combat state

**VERIFIED FROM CURRENT CODE**

The semi-real-time combat slice contains:

- Energy regeneration
- auto attacks
- enemy telegraphs
- BREAK
- BURST
- cooldowns
- skills/cards

Phase 21 verified primitives include:

- HEAL
- DAMAGE OUT BUFF
- CLEANSE
- MULTI-HIT
- DAMAGE REDUCTION

Phase 19 remains the current combat-presentation layer.

## 10. Current verified effect vocabulary

DAMAGE; CONDITIONAL DAMAGE; SINGLE TARGET; SHIELD/BLOCK; ENERGY; ENERGY REGEN; COOLDOWN TRACKING; DRAW; WEAK; EXPOSED; BREAK DAMAGE; BREAK WINDOW; BURST; BURST BREAK PAYOFF; TELEGRAPH; HEAL; DAMAGE OUT BUFF; CLEANSE; MULTI-HIT; DAMAGE REDUCTION.

See [CARD_EFFECT_CATALOG.md](CARD_EFFECT_CATALOG.md).

## 11. Current proposed Yuri state

**CURRENT PROPOSED PLAYABLE KIT**

characterId = `yuri`

Yuri remains the existing technical identity for the Phase 21 vertical slice. This does not declare final narrative canon.

Adult presentation remains separately gated by explicit verified adult status.

## 12. Existing nine MVP cards

**CURRENT / LEGACY VOCABULARY**

- DISPARO NEÓN
- EMBESTIDA NITRO
- DERRAPE EXPUESTO
- ESCUDO DARK
- BARRICADA NEÓN
- ESPEJO URBANO
- LECTURA TÁCTICA
- SOBRECARGA
- PULSO DEBILITANTE

characterId = null.

EMBESTIDA NITRO is a card identity, not a global Nitro resource system.

## 13. Visual identity

**CURRENT PROPOSED**

2.5D anime; cyberpunk; bōsōzoku; futuristic street racing; neon; aerodynamic design; dynamic combat camera.

System/environment art can be developed/generated as tooling permits. Final character art requires explicit human approval.

## 14. Asset Studio

**CURRENT TOOLING / VERIFIED**

Phase 23 adds an internal static route for authoring and cataloging visual assets:

[ASSET_STUDIO.md](ASSET_STUDIO.md)

The Asset Studio is separate from the player flow and maintains its own `mach_girls_asset_catalog_v1` namespace.

It supports:

- PNG input and validation;
- CHARACTER/PORTRAIT/MOTORCYCLE/CARD_ART/BACKGROUND/VFX_REFERENCE/STATUS_ICON classification;
- formal entity assignment with current `yuri` boundary;
- state, angle, facing, flipX, scale, anchor and offsets;
- preview backgrounds and safe-area guidance;
- camera presets;
- lightweight animation and VFX previews;
- DRAFT versus explicit APPROVED workflow;
- prompt guidance for external art generation;
- metadata persistence in the dedicated catalog namespace.

It does not write assets to GitHub, does not load the combat engine, and does not create `maki_mach`.

## 15. Historical continuity

**HISTORICAL / PROTECTED**

Phase 14–16 evidence, provenance, AUTHENTIC/RECONSTRUCTED distinctions and the original Rocket Bunny Petty working-title history remain protected.

No historical evidence is rewritten by the Asset Studio.

## 16. Open Design Questions

- STOP exact lore/chronology
- exact nature of the Force of Speed
- family genealogy
- final roster and classes
- Yuri ↔ Maki Mach relationship beyond the current continuity boundary
- final character art
- final commercial naming
- advanced gameplay effects
- future asset storage/export architecture
- whether any future character receives a formally defined runtime ID

## 17. Source index

- [WORLD_AND_IDENTITY.md](WORLD_AND_IDENTITY.md) — world/identity bridge.
- [DESIGN_BIBLE.md](DESIGN_BIBLE.md) — current product/design baseline.
- [CHARACTER_BIBLE.md](CHARACTER_BIBLE.md) — character schema and presentation gates.
- [ART_DIRECTION.md](ART_DIRECTION.md) — 2.5D art direction.
- [MACH_GIRLS_CREATIVE_DIRECTION.md](MACH_GIRLS_CREATIVE_DIRECTION.md) — creative pivot.
- [CHARACTER_CLASS_CARD_EFFECT_SYSTEM.md](CHARACTER_CLASS_CARD_EFFECT_SYSTEM.md) — role and kit design.
- [CARD_EFFECT_CATALOG.md](CARD_EFFECT_CATALOG.md) — effect support matrix and card audit.
- [ASSET_STUDIO.md](ASSET_STUDIO.md) — Asset Studio manual.
- [DECISION_LOG.md](DECISION_LOG.md) — durable decisions.
- [LORE_Y_DISENO.md](../../LORE_Y_DISENO.md) — historical lore and STOP foundations.

## 18. Update policy

Major design or tooling changes must update this reference in the same phase or in an explicit synchronization phase.

Never silently change the meaning of a concept. Preserve historical source material when a decision changes.

## 19. Anti-drift

- Proposed names are not automatic runtime IDs.
- Surnames are not classes.
- Test fixtures are not canon.
- Technical placeholders are not final art.
- Current gameplay proposals are not historical lore.
- Missing facts remain UNKNOWN or OPEN DESIGN QUESTION.
- A browser-local catalog is not repository storage.
