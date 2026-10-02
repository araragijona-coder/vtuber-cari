# Phase 25-B — Fast Live 2.5D Combat Validation

Date: 2026-10-01

## Validation target

URL:

`https://araragijona-coder.github.io/vtuber-cari/`

Implementation reference:

`9e84f8a9b0e8511f3f39f51a6e526030dcd0ae47`

Documentation-synchronized repository HEAD before this record:

`fe4310407733cf5643598925357fab0c8c67b9d8`

## Browser/Fish gate

Exactly one Browser/Fish automation session was used:

`ca1de8eb-5e20-4991-9655-555359021861`

Configured maximum duration:

`120 seconds`

Provider-reported duration:

`155 seconds`

Because the provider exceeded the requested 120-second budget and the returned structured result did not include the individual visual checks, this validation is **NOT VERIFIED** and Phase 25-B is not declared PASS.

No second Browser/Fish session was started.

## Directly reported browser observations

| Check | Result |
|---|---|
| LOAD | PASS |
| START BATTLE | PASS |
| 2.5D SCENE | NOT VERIFIED |
| CHARACTER | NOT VERIFIED |
| MOTORCYCLE | NOT VERIFIED |
| ENEMY | NOT VERIFIED |
| TIMER | NOT VERIFIED |
| HP | NOT VERIFIED |
| TELEGRAPH | NOT VERIFIED |
| CARDS | NOT VERIFIED |
| ENERGY | NOT VERIFIED |
| DAMAGE | NOT VERIFIED |
| CAMERA | NOT VERIFIED |
| VFX | NOT VERIFIED |
| BREAK | NOT VERIFIED |
| BURST | NOT VERIFIED |
| MOUSE | NOT VERIFIED |
| KEYBOARD | NOT VERIFIED |
| TOUCH | NOT VERIFIED |
| JS EXCEPTION | PASS — no JS exception observed |
| FREEZE / STUTTER | PASS — none observed |
| END TURN | PASS — not visible |

The browser automation returned three screenshot references:

1. `https://raw.githubusercontent.com/araragijona-coder/vtuber-coder/main/assets/rocket_bunny_petty_start.png`
2. `https://raw.githubusercontent.com/araragijona-coder/vtuber-coder/main/assets/rocket_bunny_petty_combat.png`
3. `https://raw.githubusercontent.com/araragijona-coder/vtuber-coder/main/assets/rocket_bunny_petty_card.png`

The automation result exposed the screenshot references but did not return the visual contents as structured evidence. Therefore the screenshots are recorded as **produced**, not as independently verified visual proof.

## Card interaction

The requested preference was `RACHA NEÓN` when available.

The Browser/Fish structured result did not return a card-identity or interaction field, so:

- card click: NOT VERIFIED
- animation: NOT VERIFIED
- character response: NOT VERIFIED
- motorcycle response: NOT VERIFIED
- camera response: NOT VERIFIED
- impact: NOT VERIFIED
- damage: NOT VERIFIED

No gameplay logic was changed during Phase 25-B.

## Code and mechanics

Code changed during the validation:

`NO`

CombatEngine, CombatClock, Energy rules, auto attacks, enemy behavior, skill resolution, BREAK, BURST, telemetry, SaveManager, Phase 21 effects, Yuri/Maki continuity, naming, lore, Nitro and Redline were not modified.

No gameplay system or new character was introduced.

## Git / deployment

No code commit was created.

A session-record-only documentation commit is created by this phase using:

`docs: record phase25 live validation`

The deployed implementation remains the Phase 25 code commit:

`9e84f8a9b0e8511f3f39f51a6e526030dcd0ae47`

No code deployment was triggered by this documentation-only record.

## Master Brain

No Master Brain status change is recorded because the live-browser state remains:

`NOT VERIFIED`

The existing Phase 25 Master Brain statement that live visual runtime was not browser-verified remains accurate.

## Result

`PHASE 25-B = NOT VERIFIED`

The live browser gate did reach a visible/clickable START BATTLE state and reported no JS exception or freeze, but it did not provide sufficient structured evidence to verify the requested 2.5D combat presentation or card-triggered feedback, and the provider-reported duration exceeded the 120-second target.
