# Rocket Bunny Petty — Gameplay Gap Analysis

## Phase
POST-PHASE 16 — CHARACTER ART, WARDROBE & GAMEPLAY COMPLETION SPECIFICATION

**STATUS:** SPECIFICATION COMPLETE · POST-COMBAT PROGRESSION BRIDGE PROTOTYPE IMPLEMENTED  
**BASE SHA:** 88fccdd5109bff5c8257c5492b4e0ee9606c63a9  
**RUNTIME GAMEPLAY CHANGES:** NONE  
**PHASE 14–16 EVIDENCE MODIFIED:** NO

## Epistemic rule
IMPLEMENTED/VERIFIED means directly evidenced in runtime code. DOCUMENTED_ONLY means design text without current player-facing implementation. PROTOTYPE means preserved research material. UNKNOWN means not established. MISSING means no current implementation identified. PROPOSED/HYPOTHESIS/EXPLORATION are future design only.

## Repository audit

| System | Current state | Evidence | Player-facing? | Missing pieces | Priority | Status |
|---|---|---|---|---|---|---|
| Combat | IMPLEMENTED | combat.js, GameState, CombatEngine | YES | richer content and presentation | P0 | VERIFIED |
| Energy | IMPLEMENTED | energy.js | YES | future Nitro interaction | P0 | VERIFIED |
| Cards | IMPLEMENTED | cards.js, actions, rules | YES | persistent collection/deck editing | P0 | VERIFIED |
| Deck/hand/discard | IMPLEMENTED as fixed combat deck | cards.js | YES | player deck construction/persistence | P0 | VERIFIED |
| Nitro | not runtime-integrated | Mechanics Ledger + historical prototypes | NO | authorized gameplay specification | P1 | OPEN DESIGN QUESTION |
| Redline | not runtime-integrated | Mechanics Ledger + historical prototypes | NO | authorized gameplay specification | P1 | OPEN DESIGN QUESTION |
| Enemies | IMPLEMENTED | enemies.js | YES | more content and boss framework | P0 | VERIFIED |
| Enemy intentions | PARTIAL | enemy actions/AI exist; rich intent UI not established | INDIRECT | telegraph/presentation | P1 | PARTIAL |
| RNG | IMPLEMENTED | seeded RNG | INDIRECT | explicit rules/deck version metadata | P0 | VERIFIED |
| Rewards | IMPLEMENTED | rewards.js + app.js | YES | broader reward choices/sinks | P0 | VERIFIED |
| BTP | DOCUMENTED_ONLY | Product System Spec | NO | product decision and implementation | P2 | HYPOTHESIS |
| Garage | DOCUMENTED_ONLY | design/product docs | NO | UI, build data, progression | P1 | PROPOSED |
| Progression | PROTOTYPE | XP, level, currency, save, one persistent card-damage choice | YES | broader progression system | P0 | PROTOTYPE |
| Collection | PARTIAL infrastructure | database schema; default arrays empty | NO meaningful collection UX | content and UI | P1 | PARTIAL |
| Story | MISSING | no runtime story flow identified | NO | scene/event system | P1 | MISSING |
| Relationships | DOCUMENTED_ONLY | design/player-behavior docs | NO | relationship state/events | P2 | PROPOSED |
| Routes | MISSING | no route controller identified | NO | route model | P2 | MISSING |
| Daily content | MISSING | product proposal only | NO | scheduling/content rules | P2 | PROPOSED |
| Weekly content | MISSING | product proposal only | NO | seed rotation/result identity | P2 | PROPOSED |
| Bosses | PARTIAL | Banchou Rookie is ELITE enemy; no boss controller | YES as enemy | phases/controller/rewards | P1 | PARTIAL |
| Challenge modes | MISSING | product proposal only | NO | mode controller/modifiers | P2 | EXPLORATION |
| Save/Load | IMPLEMENTED | save_manager.js/localStorage | YES indirectly | richer progression schema | P0 | VERIFIED |
| Session flow | PARTIAL | start/restart/next battle/reward | YES | onboarding and explicit next goal | P0 | PARTIAL |
| Tutorial | MISSING | no tutorial flow identified | NO | deterministic onboarding | P0 | MISSING |
| Onboarding | PARTIAL | start screen/combat entry | YES | explanation + first goal | P0 | PARTIAL |
| Telemetry | IMPLEMENTED instrumentation | telemetry.js | NO | analytics backend not present | P1 | VERIFIED |
| Telegram | IMPLEMENTED initialization | index.html/app.js | YES in Telegram | production account/service integration | P1 | VERIFIED |
| Character data | PARTIAL | enemy identity metadata; empty default waifus | INDIRECT | authored roster | P1 | PARTIAL |
| Art assets | MISSING | repository tree has no matching art/image asset paths | NO | asset set + manifest | P1 | MISSING |
| Wardrobe | MISSING | no wardrobe data/runtime | NO | outfit registry | P2 | MISSING |
| Camera/POV | PARTIAL | single canvas combat presentation | YES | authored presentation state machine | P2 | PARTIAL |

## Current playable gameplay

The actual runtime is a compact semi-real-time loop:

START BATTLE → REAL-TIME / SEMI-REALTIME COMBAT → CARD / ENERGY ACTIONS → AUTOMATIC ENEMY BEHAVIOR → SEEDED RESOLUTION → VICTORY / DEFEAT → REWARD / PROGRESSION → SAVE → NEXT BATTLE.

Verified runtime content includes:
- Energy maximum 100 in the current combat state;
- player-facing hand capacity 5;
- generic fallback initial deck 9 cards;
- Yuri uses a separate 4-card character kit, producing an effective initial hand of 4 when that kit is selected;
- DISPARO NEÓN, EMBESTIDA NITRO and ESCUDO DARK;
- STREET PUNK, IRON GUARD, NITRO RAIDER and BANCHOU ROOKIE;
- seeded deterministic RNG;
- victory/defeat;
- XP/currency rewards and level calculation;
- localStorage save version 1;
- canvas + DOM combat presentation;
- Telegram WebApp initialization;
- client telemetry instrumentation.

This is an MVP combat demonstration, not the complete RPG/garage/narrative product.

HISTORICAL / OUTDATED BASELINE PRESERVED:
Earlier gameplay-gap documentation described a hand limit of 4 and a fixed seven-card initial deck. Those values are historical documentation context, not the current runtime contract.


## Documented but not current gameplay

Nitro/Redline runtime use, Garage gameplay, BTP economy, narrative routes, relationship progression, Daily/Weekly content, challenge/mutator modes, boss framework, persistent deckbuilding, character art, wardrobe and authored camera/POV are not current player-facing systems.

## Core completion model

START → ONBOARDING → PREPARATION → COMBAT → RESULT → REWARD → PROGRESSION → NEW DECISION → NEXT COMBAT

Required for a coherent minimum product slice:
1. deterministic onboarding;
2. preparation state;
3. reliable combat;
4. readable result;
5. reward claim;
6. one meaningful persistent progression choice;
7. explicit next goal;
8. persistent save;
9. telemetry for the funnel.

The controlled prototype now implements items 5–9 for the bounded post-combat bridge; onboarding and broader preparation remain future gaps.

## Backlog

| ID | System | Task | Dependencies | Spec | Complexity | Validation | Target |
|---|---|---|---|---|---|---|---|
| GP-01 | Onboarding | first-session flow | UI/save/telemetry | YES | low | human playtest | controlled gameplay |
| GP-02 | Deck | persistent deck choice | cards/save/data | YES architecture | medium | functional + playtest | controlled gameplay |
| GP-03 | Garage | build/loadout screen | save/character data | NO | medium | design gate | future spec |
| GP-04 | Story | authored scene/event flow | character/save | NO | medium | narrative prototype | future spec |
| GP-05 | Character | authored roster/relationships | Character Bible | schema YES | medium | content review | content phase |
| GP-06 | Art | asset manifest + 2D presentation | Art Direction | YES policy | medium | visual review | art phase |
| GP-07 | Variety | one bounded combat-variety prototype | rules/cards | NO | medium | controlled test | gameplay prototype |
| GP-08 | Mode | Weekly Seed or Challenge prototype | RNG/result identity | NO | medium | controlled test | gameplay prototype |
| GP-09 | Nitro/Redline | separate runtime specification | historical evidence + validation | NO | high | explicit gate | separate phase |
| GP-10 | Relationships | deterministic authored events | story/save | NO | medium | human playtest | narrative prototype |

The separate controlled prototype implements the bounded post-combat progression bridge; it does not implement GP-02 or the broader backlog.
