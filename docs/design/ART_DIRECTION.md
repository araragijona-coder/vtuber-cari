# Rocket Bunny Petty — 2D Art, Wardrobe & Presentation Direction

## Status

ART DIRECTION SPECIFICATION. No assets are implemented by this phase.

## Visual identity

AUTHOR DECISION:

Compact 2D cyberpunk bōsōzoku card battler, anime-styled character presentation, motorcycle identity, readable tactical UI and short-session clarity.

This is a design target, not evidence that the current repository contains this art.

## Mach-Girls 2.5D direction

PROPOSED CURRENT VISUAL DIRECTION:

```text
2.5D anime
+
cyberpunk
+
bōsōzoku
+
futuristic street racing
+
neon
+
aerodynamic design
+
dynamic combat camera
```

The target is spectacle through low-cost compositing rather than AAA 3D production.

Preferred building blocks:

- 2D character art;
- parallax backgrounds;
- sprite animation;
- layered FX;
- particles;
- lighting;
- camera movement;
- screen shake;
- motion trails;
- glow;
- impact frames;
- UI animation;
- depth simulation.

Future production should preserve compatibility with the current Canvas + DOM architecture.

## Art layers

BACKGROUND → ENVIRONMENT FX → CHARACTER/VEHICLE → COMBAT FX → UI → PORTRAIT/CUT-IN

Priority:
1. combat readability;
2. character silhouette;
3. card/UI clarity;
4. impact feedback;
5. narrative presentation;
6. decorative parallax.

## Asset classes

| Asset | Current state | Future requirement |
|---|---|---|
| Character portrait | MISSING | consistent face/bust framing |
| Full-body character | MISSING | readable faction silhouette |
| Combat character art | MISSING | stable combat anchor |
| Vehicle art | MISSING | recognizable motorcycle/vehicle silhouette |
| Card art | MISSING | card ID + faction/role identity |
| Backgrounds | MISSING | reusable 2D scene layers |
| VFX | MISSING | readable action feedback |
| UI icons | PARTIAL/text-driven | compact symbolic vocabulary |
| Cut-ins | MISSING | short authored emphasis |
| Parallax | MISSING | optional presentation |
| Screen shake | MISSING | limited impact feedback |

## Runtime constraint

Current combat uses HTML Canvas plus DOM controls.

AUTHOR DECISION: future art should remain compatible with the current browser/2D architecture unless a later technical decision explicitly replaces it.

No current resolution or production pixel density is claimed because the repository does not establish one.

## Camera / POV states

PLAYER POV — PROPOSED: default tactical view.

CHARACTER FOCUS — PROPOSED: brief dialogue/reaction/romance/drama beat.

PORTRAIT CUT-IN — PROPOSED: important action or story reveal.

ACTION SHOT — PROPOSED: short impact emphasis.

REDLINE SHOT — OPEN DESIGN QUESTION until Redline receives authorized gameplay specification.

Critical tactical information must never be hidden by presentation.

## Wardrobe taxonomy

Each future outfit record:
outfit_id, character_id, purpose, silhouette, materials, dominant_colors, secondary_colors, accessories, protective_elements, fashion_elements, faction_identity, seasonal_context, narrative_context, presentation_level

Outfit categories:
- BASE OUTFIT
- COMBAT OUTFIT
- CASUAL OUTFIT
- GARAGE OUTFIT
- EVENT OUTFIT
- SPECIAL / STORY OUTFIT

Presentation levels:
- STANDARD
- KAWAII
- ACTION
- FASHION
- FAN_SERVICE
- ERO_KAWAII

ERO_KAWAII is available only for characters with age_status=VERIFIED and age>=18.

No current runtime character satisfies that verified adult gate.

## Faction design language

BŌSŌZOKU — PROPOSED:
layered riding materials, patches, faction symbols, gloves/boots/protective details and motorcycle-linked accessories.

MONSTERS OF SPEED — PROPOSED:
aerodynamic lines, sport/racing details, technical/cyber materials and speed-oriented geometry.

No external franchise costume is reproduced literally.

## Presentation filter

Every effect must answer:
1. what gameplay fact does it communicate?
2. can it be understood at a glance?
3. does it obscure cards, Energy or enemy information?
4. can intensity be reduced for accessibility?
5. can it be triggered deterministically?

If not, classify it EXPLORATION rather than implementation-ready.
