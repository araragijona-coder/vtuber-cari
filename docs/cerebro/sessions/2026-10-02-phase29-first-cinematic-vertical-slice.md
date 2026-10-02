# MACH-GIRLS — Phase 29 First Cinematic Vertical Slice

## Phase

```text
PHASE 29 — MACH-GIRLS FIRST CINEMATIC VERTICAL SLICE
```

## HEAD / BRANCH / PR

```text
HEAD BEFORE:
37904d1f080ba5246b88853e0dc506922929b6b5

BRANCH:
mach-girls-2.5d

PR:
#14 — Phase 28 — Mach-Girls 2.5D foundation migration

BASE:
main

BASE SHA AT CURRENT PR STATE:
cdd123bee4fdbec7d0341572d2106e01d8825a73

HEAD AT DOCUMENTATION START:
fd85946fa681030fcfe035cd71dd18f2f24875ac

DRAFT:
true

MERGED:
false
```

Phase 29 began from the exact Phase 28 branch head and remained isolated from `main`. No merge to `main` was performed.

## Existing systems reused

```text
GameState
CombatEngine
CombatClock
GameActions
CardSystem
EnergySystem
CharacterKitSystem
EnemyCatalog
BreakSystem
BurstSystem
existing AI / enemy behavior
existing Save / Telemetry
Phase 27 MachGirlsShotDirector
mach_girls_asset_catalog_v1
Phase 28 WorldSpace / Scene / Camera / Actor / Animation / Renderer / PresentationEvents
single combat main loop in combat.js
```

No second combat engine, card system, Energy system, AI, BREAK/BURST rules, RNG, Save system, renderer, camera, Shot Director or game loop was introduced.

## New presentation components

Phase 29 adds only the minimum integration needed for one cinematic scene:

- controlled presentation-only actor motion tracks;
- short visual freeze timing for impact / break;
- real camera x/y centering for world-space focus;
- depth semantics where lower z is farther and higher z is closer;
- PLAYER actor composition through MOTORCYCLE + SHADOW children;
- ENEMY_PRIMARY shadow composition;
- a controlled `PLAY CINEMATIC SLICE` trigger;
- a scripted presentation orchestrator that invokes the existing gameplay action path.

## Vertical slice elements

```text
PLAYER:
  existing yuri character identity
  world-space actor

MOTORCYCLE:
  technical composition child of PLAYER
  existing asset slot / Asset Studio-compatible reference

SHADOW:
  PLAYER child
  ENEMY_PRIMARY child

ENEMY:
  existing iron_guard catalog enemy
  independent world-space actor
  deeper z plane than PLAYER

BACKGROUND:
  existing staged environment and parallax layers
  independent of battlefield actors

COMPANIONS:
  COMPANION_LEFT / COMPANION_RIGHT
  technical neutral staging only
  enabled only during the cinematic slice
```

No new roster member was added. No `maki_mach` runtime identity was introduced.

## Cinematic sequence

```text
ESTABLISHING
→ PLAYER_FOCUS
→ PLAYER APPROACH
→ ENEMY_FOCUS
→ ATTACK_APPROACH
→ IMPACT
→ BREAK
→ BURST
→ IMPACT
→ PLAYER_FOCUS RECOVERY
```

The sequence is reproducible from the existing UI and consumes the actual `yuri_break_drive` card.

## Attack / Break / Burst

The cinematic uses the real gameplay route:

```text
GameActions.createPlayerSkillAction()
→ CombatEngine.resolveAction()
→ existing Energy / cooldown validation
→ existing damage + BREAK calculation
→ presentation event
→ actor/camera/VFX response
```

The orchestration waits for the real Energy/cooldown state rather than fabricating a gameplay-ready resource state.

Direct executable gameplay smoke verification on the branch reached BREAK against the existing `iron_guard` enemy and then reached BURST readiness. The smoke observed the enemy still alive and the player still alive, so the slice path does not require a forced victory.

## Implementation checks

Verified directly against the branch source:

```text
single main RAF owner = PASS
combat.js requestAnimationFrame call sites = 2 (schedule + recursive schedule)
combat.js cancelAnimationFrame = absent
combat.js render setInterval = absent
renderer uses real camera x/y = PASS
world-space projection = PASS
player motorcycle/shadow composition = PASS
enemy deeper z = PASS
presentation motion tracks = PASS
visual freeze boundary = PASS
cinematic trigger = PASS
real yuri_break_drive route = PASS
real BREAK route = PASS
real BURST route = PASS
```

The repository container cannot clone GitHub because outbound GitHub DNS/network is unavailable; these runtime checks were therefore executed from the exact remote branch source through the GitHub connector. They are not described as a local full `npm test` run.

## CI

Current Phase 29 branch CI remains:

```text
CI = NOT VERIFIED
```

The existing `.github/workflows/rocket-bunny-runtime-tests.yml` is present and targets `pull_request` to `main`, but the GitHub connector did not produce a new run for the current Phase 29 SHA after the branch ref update / PR reopen.

The previous real runtime-test run was:

```text
run 113
head 37904d1f080ba5246b88853e0dc506922929b6b5
result FAILURE
```

That run reported 14 failing tests; several are historical presentation-contract mismatches and Phase 28 VM cross-realm assertions. It is not used as a Phase 29 result.

No test disabling or CI bypass was performed.

## Browser / Visual QA

A live TinyFish browser session was started against the exact branch commit through a CDN preview, avoiding GitHub Pages `main`.

```text
browser session:
001624e7-163e-43f1-af5b-dd678b3714c3

tested commit:
3a72fca68a87f6fb23d42d7e3787004c490fb60c
```

At the time of this documentation write, the session had not yet returned terminal evidence. Therefore:

```text
BROWSER QA = NOT VERIFIED
SCREENSHOT EVIDENCE = NOT VERIFIED
```

The Browser result will be recorded only after the automation returns observable evidence.

## Performance

Static architecture checks confirm one RAF chain and bounded presentation effect structures.

```text
60 FPS = NOT VERIFIED
PERFORMANCE = NOT VERIFIED
```

No live frame-time profiler was used.

## Gameplay / Runtime / Legacy

```text
RUNTIME CHANGED:
YES

GAMEPLAY CHANGED:
NO

LEGACY RETIRED:
NO

DUPLICATED SYSTEMS:
NO
```

The legacy presentation path remains recoverable. Phase 29 retires no legacy responsibility solely because the new slice exists; retirement remains gated by replacement + test + verification.

## Documentation

Updated:

```text
docs/cerebro/MACH_GIRLS_GAME_BRAIN.md
docs/cerebro/MACH_GIRLS_2_5D_MIGRATION_STRATEGY.md
docs/design/MACH_GIRLS_COMBAT_VISUAL_REFERENCE.md
```

Created:

```text
docs/cerebro/sessions/2026-10-02-phase29-first-cinematic-vertical-slice.md
```

## Open questions

- Final player / motorcycle / enemy / companion art remains human-approved.
- Live Browser/Fish shot evidence is still pending while the current session is active.
- A measured 60 FPS result is still pending.
- Mobile-specific visual validation is pending.
- Yuri ↔ Maki Mach remains OPEN DESIGN QUESTION.
- Global Nitro / Redline remains outside the authorized production boundary.
- Legacy presentation retirement remains pending evidence.
- PR #14 remains draft and unmerged.
