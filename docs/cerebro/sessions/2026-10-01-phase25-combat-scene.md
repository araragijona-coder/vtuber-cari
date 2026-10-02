# Phase 25 — 2.5D Combat Scene & Visual Reconstruction

Date: 2026-10-01

## Why this phase exists

The existing combat slice already contains semi-real-time mechanics, but its presentation must explicitly function as a 2.5D combat stage rather than a minimal HUD with sprites and cards.

## Target experience

The scene target is:

- 2.5D battlefield;
- character and motorcycle presence;
- enemies occupying the scene;
- depth and parallax;
- visible combat timer;
- enemy HP/status;
- telegraphs;
- damage feedback;
- cards and character ownership;
- Energy;
- BREAK;
- BURST;
- camera motion;
- impact effects;
- motion trails;
- particles and lighting;
- layered UI.

The target is an original Mach-Girls presentation and does not copy any external game's characters, story, assets, UI, code or exact balance.

## What changed in Phase 25

The current presentation layer now has:

- reusable camera presets: IDLE, APPROACH, ATTACK, IMPACT, BREAK, BURST, VICTORY, DEFEAT;
- interpolated camera state and limited deterministic shake;
- explicit visual-state vocabulary;
- character + motorcycle composition infrastructure;
- technical motorcycle placeholder with explicit non-final-art labeling;
- technical character placeholder with explicit non-final-art labeling;
- additional parallax, foreground motion and lighting layers;
- directional enemy telegraph cues;
- stronger impact spark feedback;
- motion-trail feedback for multi-hit actions;
- explicit approved Asset Studio catalog consumption;
- combat-facing timer and live scene-state HUD;
- visible card ownership metadata.

## What remained unchanged

Combat rules and semantics were not redesigned:

- CombatClock;
- Energy;
- auto attacks;
- enemy behavior;
- BREAK rules;
- BURST rules;
- card effects;
- save/replay;
- RNG;
- telemetry semantics;
- Yuri/Maki identity status;
- Nitro/Redline global status.

No END TURN or turn-based combat model was introduced.

## Asset / placeholder state

Final character art and final motorcycle art remain unavailable/approval-gated.

The combat scene uses technical placeholders only where approved static assets are not present.

The Asset Studio remains the human approval boundary. Approved assets can be mapped to combat slots without rebuilding scene architecture.

## Verification

Phase 25 verification must include:

- repository tests;
- remote CI against the real checkout;
- one structured Browser/Fish pass on the deployed combat page;
- final git comparison and HEAD check.

No visual claim here means final waifu/art quality approval.

## Next step

Human art/asset work through Asset Studio remains separate from the combat-scene architecture. Any unresolved Yuri/Maki continuity, new character IDs, final art direction details, Nitro/Redline global design, or other unimplemented future systems remain OPEN DESIGN QUESTION.


## Final verification snapshot

Final code HEAD for Phase 25: `9e84f8a9b0e8511f3f39f51a6e526030dcd0ae47`.

### VERIFIED

- Permanent GitHub Actions runtime workflow run 96 completed `success`.
- Full suite: 149/149 tests passed.
- Phase 25-specific contracts passed.
- No new END TURN primitive was introduced by Phase 25.
- GitHub Pages root serves the game-facing `COMBAT / LIVE` timer and `READY` scene-state HUD.
- Documentation records the 2.5D scene target, placeholder gate, camera/layer architecture and Asset Studio contract.

### NOT VERIFIED

- The single authorized Browser/Fish combat QA session failed before it could execute the requested start-battle interaction.
- No combat screenshot was captured by that session.
- Therefore live visual claims for character presence, motorcycle motion, telegraph timing, camera movement, skill interaction and post-skill effects are not declared browser-verified.
- Final art approval is not part of this phase.

### CURRENT PROPOSED

The implemented scene architecture remains the current proposed 2.5D presentation layer using technical placeholders and deterministic 2D effects.

### OPEN DESIGN QUESTION

`Yuri ↔ Maki Mach` remains unresolved.
Nitro / Redline global behavior remains outside the authorized Phase 25 runtime boundary.
