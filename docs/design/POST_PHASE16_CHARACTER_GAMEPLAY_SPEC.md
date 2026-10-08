# Post-Phase 16 — Character Art, Wardrobe & Gameplay Completion Specification

## Status

**SPECIFICATION COMPLETE**

**CURRENT HEAD:** 88fccdd5109bff5c8257c5492b4e0ee9606c63a9  
**IMPLEMENTATION:** NONE  
**HISTORICAL DATA MODIFIED:** NO  
**PHASE 14–16 EVIDENCE MODIFIED:** NO

This phase audits the repository and defines the product boundary required for later implementation. It does not claim that documented systems are already playable.

## 1. Product identity

AUTHOR DECISION:

DETERMINISTIC YURI CYBERPUNK BŌSŌZOKU CARD BATTLER
+
RPG DE GARAJE
+
CONSTRUCCIÓN DE MAZOS
+
NARRATIVA INTERACTIVA
+
RELACIONES ENTRE PERSONAJES
+
POV DEL PROTAGONISTA
+
PRESENTACIÓN 2D DINÁMICA
+
SESIONES CORTAS

This is a target identity. The audit below determines what currently exists.

## 2. Current gameplay

The current player-facing slice is:
START BATTLE → REAL-TIME / SEMI-REALTIME COMBAT → CARD / ENERGY ACTIONS → AUTOMATIC ENEMY BEHAVIOR → SEEDED RESOLUTION → VICTORY / DEFEAT → REWARD / PROGRESSION → SAVE → NEXT BATTLE.

Current runtime systems verified in code:
- combat state and resolution;
- Energy; maximum 100; start 35;
- current player-facing hand capacity: 5;
- current generic fallback deck: 9 cards;
- current Yuri character kit: 4 cards, with effective initial hand 4 when Yuri is selected;
- four enemy definitions;
- enemy AI;
- deterministic seeded RNG;
- rewards;
- save/load;
- Telegram initialization;
- telemetry instrumentation;
- simple canvas/DOM presentation.

HISTORICAL / PRE-CURRENT RUNTIME:
The earlier product specification used the wording "fixed deck/hand/discard" and "three cards". Those statements are preserved as historical context and do not describe the current runtime contract.

Not current player-facing systems:
- Nitro;
- Redline;
- persistent deckbuilding;
- Garage gameplay;
- narrative flow;
- relationship progression;
- routes;
- Daily/Weekly gameplay;
- challenge modes;
- boss framework;
- character art;
- wardrobe;
- authored camera/POV state machine.

## 3. Core gameplay completion model

START → ONBOARDING → PREPARATION → COMBAT → RESULT → REWARD → PROGRESSION → NEW DECISION → NEXT COMBAT

| Transition | Current | Required | Optional |
|---|---|---|---|
| START → ONBOARDING | partial | explain identity + first objective | story vignette |
| ONBOARDING → PREPARATION | missing | first deck/build state | cosmetics |
| PREPARATION → COMBAT | implemented | deterministic launch | route choice |
| COMBAT → RESULT | implemented | readable outcome | cut-in |
| RESULT → REWARD | implemented | visible claim | bonus objective |
| REWARD → PROGRESSION | partial | one meaningful persistent decision | collection scene |
| PROGRESSION → NEW DECISION | missing | concrete next goal | relationship choice |
| NEW DECISION → NEXT COMBAT | partial | explicit next encounter | route map |

## 4. Gameplay variety

All are future design.

| ID | Problem | Reuse | New rule | Player decision | Complexity | Classification |
|---|---|---|---|---|---|---|
| VAR-01 | repeated card value | cards/rules | conditional card effects | hold/play timing | medium | PROPOSED |
| VAR-02 | predictable enemy turns | enemy AI | telegraphed conditional intent | defend/attack/resource timing | low-medium | PROPOSED |
| VAR-03 | repeated battle rules | rules engine | bounded combat mutator | accept/reject constraint | medium | EXPLORATION |
| VAR-04 | victory-only goals | combat result | optional objective | optimize secondary condition | medium | PROPOSED |
| VAR-05 | unresolved Nitro/Redline | historical vocabulary | no rule selected | TBD | unknown | OPEN DESIGN QUESTION |

## 5. New modes exploration

| Mode | Purpose | Reused systems | New systems | Length | Reward role | Narrative role | Retention role | Status |
|---|---|---|---|---|---|---|---|---|
| Daily Route | recurring short content | combat/save | date/route selector | short | progression | route vignette | D1 | PROPOSED |
| Weekly Seed | repeatable mastery | seeded combat | weekly seed identity | short-medium | milestone | optional rival context | D7 | PROPOSED |
| Challenge Run | constrained mastery | combat/deck | challenge rule | short-medium | milestone | challenge framing | D1/D7 | PROPOSED |
| Boss Rush | concentrated mastery | enemies/combat | sequence controller | medium | milestone | boss sequence | D7/D30 | EXPLORATION |
| Endurance | survival | enemies/combat | score/persistence | medium-long | milestone | optional | D7/D30 | EXPLORATION |
| Time Attack | speed expression | combat | timer/scoring | short | score reward | low | D1/D7 | EXPLORATION |
| Mutator Run | rule variety | rules/combat | mutator registry | short-medium | event reward | strong potential | D7 | EXPLORATION |
| Draft/Limited Deck | deck decisions | cards | selection layer | medium | collection/progression | faction framing | D7/D30 | EXPLORATION |

Mode filter: prefer modes that reuse CombatEngine rather than creating a second combat architecture.

## 6. Character, wardrobe and art

The formal character schema is in CHARACTER_BIBLE.md. Current runtime enemy records have UNKNOWN age. No character receives ERO_KAWAII presentation from this phase.

Wardrobe categories are BASE, COMBAT, CASUAL, GARAGE, EVENT and SPECIAL/STORY. Presentation levels are STANDARD, KAWAII, ACTION, FASHION, FAN_SERVICE and ERO_KAWAII, with the explicit verified-adult gate.

The formal 2D presentation rules, asset classes and camera vocabulary are in ART_DIRECTION.md.

## 7. Yuri / relationship gameplay

PROPOSED/HYPOTHESIS:

Relationship progression should primarily create new possibilities:
- dialogue;
- events;
- route access;
- character reactions;
- special encounters;
- card variants;
- story consequences.

Numerical power effects require a later balance specification and validation.

No relationship system is implemented by this phase.

## 8. Narrative/gameplay coupling

| ID | Concept | Classification | Potential consequence |
|---|---|---|---|
| NG-01 | faction choice → route | PROPOSED | different content |
| NG-02 | relationship milestone → event | PROPOSED | new scene/encounter |
| NG-03 | story boss → unique behavior | HYPOTHESIS | authored combat identity |
| NG-04 | character event → card variant | EXPLORATION | content variation |
| NG-05 | story outcome → future presentation | AUTHOR DECISION | visual/dialogue state |

None is runtime behavior.

## 9. Session experience

First session:
- entry friction: TARGET;
- preparation: TARGET;
- combat duration: CURRENT UNKNOWN;
- reward time: CURRENT/implemented, duration unmeasured;
- story time: future target;
- exit point: target after a concrete next goal;
- return reason: HYPOTHESIS.

Normal session:
- short entry;
- short combat;
- concise reward/progression;
- clear exit decision.

Long session:
- optional chaining of short combats or a future mode.

These are targets, not measured player behavior.

## 10. MVP / post-MVP / future

### MVP necessary
- onboarding;
- combat;
- readable result;
- reward;
- persistent save;
- one meaningful progression choice;
- next goal;
- basic telemetry.

### Post-MVP
- persistent deckbuilding;
- Garage;
- authored character roster;
- story/events;
- relationship state;
- boss framework;
- richer 2D presentation.

### Optional / exploratory
- Daily Route;
- Weekly Seed;
- Challenge Run;
- Boss Rush;
- Endurance;
- Time Attack;
- Mutator Run;
- Draft/Limited Deck;
- social systems if later justified.

## 11. Design filter

Every new mechanic must answer:
1. Does it reinforce the core?
2. Does it create a meaningful decision?
3. Does it fit short sessions?
4. Does it add progression or variety?
5. Does it reinforce character/narrative identity?
6. Does it present well in 2D?
7. Does it reuse existing systems?
8. What complexity does it introduce?
9. How will it be validated?

Result: PASS, REDESIGN, REJECT or EXPLORATION.

## 12. External research

External games are inspiration only.

Slay the Spire: route/deck variety and repeatable challenge structures are relevant as abstract patterns.

Balatro: seeded/challenge runs, collection and statistics show how a compact ruleset can support repeatable structures.

Hades: optional difficulty conditions, permanent progression and narrative between runs show a repeated-run pattern with additional goals.

Marvel Snap: Conquest and limited-time modes show how a shared battle vocabulary can support additional modes and reward loops.

Do not copy external cards, economies, maps, progression systems or live-service structures literally. The existing PRODUCT_SYSTEM_SPEC.md records the comparative source matrix.

## 13. Completion boundary

This phase is complete when:
- implementation is distinguished from documentation;
- character age data has an explicit adult gate;
- wardrobe taxonomy exists;
- 2D presentation language exists;
- gameplay gaps are enumerated;
- MVP/post-MVP/future are separated;
- later tasks have dependencies and validation gates.

It does not claim the game is finished.

## 14. Next phase

CONTROLLED GAMEPLAY PROTOTYPING.

The next phase should select one bounded gameplay gap and write its own implementation/validation specification before runtime changes. Nitro/Redline requires separate explicit authorization and validation.
