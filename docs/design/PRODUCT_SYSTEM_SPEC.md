# Post-Phase 16 — Player Retention & Game Longevity — Product System Specification

**Status:** SPECIFICATION COMPLETE  
**Base SHA:** \`adfe5f766fb648776aa0728cccbf68cb5b023248\`  
**Runtime gameplay changes:** NONE  
**Telemetry implementation:** LIMITED TO INSTRUMENTATION  
**Economy implementation:** NONE  
**New modes implemented:** NONE

## 0. Epistemic boundary

This document is a product/design specification. It does not reinterpret or overwrite the Phase 14–16 research record.

The repository currently records Phase 16 as a repaired statistical specification whose first execution attempt was blocked before population generation; the repair explicitly states that it did not authorize execution. Therefore this document does **not** claim that a completed Phase 16 gameplay experiment occurred. Any later Phase 16 evidence must remain separately identifiable from this product specification.

Historical chain:

\`Phase 14-A → Phase 14-B → Phase 14-C → Phase 14-D → Phase 14-E → Phase 15-B → Phase 16\`

Evidence labels remain:

- \`HISTORICAL\`
- \`AUTHENTIC\`
- \`EXPERIMENTAL\`
- \`RECONSTRUCTED\`
- \`VERIFIED\`
- \`UNKNOWN\`
- \`PROPOSED\`
- \`OPEN DESIGN QUESTION\`

Product proposals in this document are never experimental results.

---

## 1. What must remain intact

### [EVIDENCE HISTÓRICA] Combat identity

The current MVP already exposes a compact turn/card combat loop with:

- player/enemy state;
- cards;
- Energy;
- enemy intent/action;
- seeded RNG infrastructure;
- battle IDs;
- victory/defeat outcomes;
- player save/reward plumbing.

The research record separately establishes that Nitro and Redline are not integrated and remain \`OPEN DESIGN QUESTION\`.

### [DECISIÓN DE AUTOR] Product boundary

The following remain outside this phase:

- retroactive changes to Phase 14–16 evidence;
- automatic adoption of Nitro/Redline parameters;
- balance changes;
- new playable mechanics;
- full economy;
- monetization;
- social backend;
- new game modes.

The core combat engine remains the producer of combat facts. Meta systems consume those facts.

---

# 2. Product System Map

\`\`\`
                         STORY / EVENTS
                              │
                              ▼
                       PROGRESSION
                              │
                              ▼
                       DECK / GARAGE
                              │
                              ▼
     ┌───────────────────────────────────────────────┐
     │                  CORE COMBAT                  │
     │ Energy / Cards / Enemy Intent / RNG           │
     │ Nitro / Redline = OPEN DESIGN QUESTION        │
     └──────────────────────┬────────────────────────┘
                            │
                            ▼
                    COMBAT OUTPUT / RESULT
                            │
                            ▼
                     REWARD PIPELINE
                            │
                            ▼
                         RESOURCES
                            │
                            ▼
                     NEXT SESSION

TELEMETRY ───────────────────────────────────────────────────────►
  app/session → battle → rewards → meta → story/events → returns
\`\`\`

### Dependency rule

Each layer may consume outputs from the layer below, but the combat engine must not calculate:

- BTP;
- narrative rewards;
- upgrade prices;
- mission completion;
- retention;
- event eligibility.

---

# 3. Core Loop Specification

## 3.1 Combat output contract

The combat producer should expose a serializable result equivalent to:

\`\`\`json
{
  "result": "VICTORY|DEFEAT|ABANDONED",
  "turns_elapsed": null,
  "damage_taken": null,
  "hp_remaining_pct": null,
  "nitro_spent": null,
  "redline_turns_active": null,
  "redline_max_level": null,
  "cards_played_distribution": {},
  "seed": null,
  "combat_id": "uuid",
  "combat_rules_version": null,
  "deck_version": null
}
\`\`\`

\`null\` is preferable to inventing a value when the current runtime does not expose that concept.

### [PROPUESTA DE DISEÑO] Result normalization

A later gameplay phase may define exact calculations for the fields above. This phase only defines the data contract.

---

# 4. Reward Pipeline / Meta Loop

\`\`\`
COMBAT OUTPUT
     ↓
REWARD PIPELINE
     ↓
RESOURCE TRANSFORMATION
     ↓
PLAYER PROGRESSION
     ↓
NEXT DECISION
\`\`\`

### [HIPÓTESIS DE PRODUCTO] Separation

The reward pipeline should be a consumer of combat output rather than a responsibility of \`CombatEngine\`.

### BTP

**Status:** \`HIPÓTESIS NO VALIDADA\`

BTP may be useful as a progression resource, but no formula, amount, sink, cap, or pacing is selected here.

Validation required before production adoption:

- observed player acquisition;
- observed spend;
- resource starvation/excess;
- progression completion rate;
- whether BTP changes meaningful decisions.

---

# 5. Resource & Economy Ledger

| resource_id | purpose | sources | sinks | storage | expiration | reversibility | visibility | telemetry |
|---|---|---|---|---|---|---|---|---|
| XP | [PROPUESTA] account progression | combat/reward pipeline | level thresholds | player save | none proposed | no | visible | reward_received |
| BTP | [HIPÓTESIS NO VALIDADA] progression currency | reward pipeline | upgrades/unlocks if later approved | player save | TBD | TBD | visible | reward_received |
| Cards | [PROPUESTA] deck variety | unlock/reward/content | deck composition | player save | none | deck choice reversible | visible | deck_viewed/deck_modified |
| Garage modules | [EXPLORACIÓN] build expression | future content | loadout/build slots | future save | TBD | TBD | visible | garage_open/upgrade_* |
| Cosmetics | [EXPLORACIÓN] non-power expression | future rewards/events | collection/equip | future save | none proposed | equip reversible | visible | future cosmetic event |
| Event token | [EXPLORACIÓN] event-specific participation | future event | event shop/entry | future save | event-defined | usually no | visible | weekly_event_* |

**Rule:** no additional currency should be added without a concrete decision it enables and a documented sink.

---

# 6. Progression Architecture

## D0 — first session

### [PROPUESTA DE DISEÑO]

Goal:

\`\`\`
START → TUTORIAL → FIRST BATTLE → FIRST REWARD → NEXT BATTLE
\`\`\`

Required feeling to test later:

- understand the combat decision;
- understand why the next battle exists;
- receive a concrete next goal.

No claim is made that these outcomes currently occur.

## D1

### [HIPÓTESIS DE PRODUCTO]

Possible return reasons:

- unfinished immediate goal;
- first progression threshold;
- newly available card/deck decision;
- story continuation;
- a short challenge.

No Daily Mission is required by this phase.

## D7

### [PROPUESTA DE DISEÑO]

Potential medium-term reasons:

- deck refinement;
- first meaningful challenge milestone;
- weekly seed/challenge;
- story milestone;
- first build specialization.

## D30

### [EXPLORACIÓN]

Potential long-term reasons:

- broader collection;
- challenge mastery;
- alternate builds;
- narrative completion;
- recurring event participation.

D30 content should not be created merely to fill a calendar. It requires evidence that the preceding loops generate voluntary return.

---

# 7. Retention / Event Loop

The generic event grammar is:

\`\`\`
TRIGGER
  ↓
PLAYER ACTION
  ↓
REWARD
  ↓
PROGRESSION
  ↓
NEW DECISION
  ↓
RETURN REASON
\`\`\`

| System | Category | Trigger | Action | Reward | New decision | Return reason |
|---|---|---|---|---|---|---|
| Daily Route | [PROPUESTA] | daily availability | complete short route | progression/event reward | choose route/build | next daily route |
| Weekly Seed | [PROPUESTA] | weekly seed rotation | play fixed seed | score/reward | optimize decisions | new seed |
| Story milestone | [PROPUESTA] | story condition | complete battle/event | narrative unlock | choose/inspect consequence | next chapter |
| Limited event | [EXPLORACIÓN] | scheduled event | event-specific run | event reward | spend/keep reward | event conclusion |
| New enemy/card | [PROPUESTA] | content unlock | encounter/use | variety | adapt deck | test new interaction |
| Telegram re-entry | [EXPLORACIÓN] | external reminder/link | reopen game | no automatic reward assumed | resume goal | unfinished objective |

No system above is approved for production.

---

# 8. Telemetry & Funnel

## 8.1 Event envelope

Every event should follow:

\`\`\`json
{
  "event_name": "battle_completed",
  "event_version": 1,
  "game_version": null,
  "rules_version": null,
  "deck_version": null,
  "session_id": "uuid",
  "user_id": null,
  "timestamp_utc": "ISO-8601",
  "combat_id": null,
  "seed": null,
  "payload": {}
}
\`\`\`

\`user_id\` remains nullable. The current implementation does not automatically transmit a Telegram account identifier.

## 8.2 Required event taxonomy

### Acquisition/session

- \`app_open\`
- \`session_start\`
- \`session_end\`

### Tutorial

- \`tutorial_started\`
- \`tutorial_completed\`

### Combat

- \`battle_started\`
- \`battle_action\`
- \`redline_activated\`
- \`battle_completed\`
- \`battle_abandoned\`

### Reward/meta

- \`reward_received\`
- \`garage_open\`
- \`deck_viewed\`
- \`deck_modified\`
- \`upgrade_started\`
- \`upgrade_completed\`

### Narrative/events

- \`story_started\`
- \`story_completed\`
- \`daily_mission_started\`
- \`daily_mission_completed\`
- \`weekly_event_started\`
- \`weekly_event_completed\`

### Return cohorts

- \`return_d1\`
- \`return_d3\`
- \`return_d7\`
- \`return_d14\`
- \`return_d30\`

Return events should be derived by an analytics layer from prior session timestamps. The current client does not fabricate historical return events.

## 8.3 Funnel

\`\`\`
APP_OPEN
  ↓
SESSION_START
  ↓
TUTORIAL / FIRST ACTION
  ↓
BATTLE_STARTED
  ↓
BATTLE_ACTION
  ↓
BATTLE_COMPLETED
  ↓
REWARD_RECEIVED
  ↓
META ACTION
  ↓
SESSION_END
  ↓
RETURN_D1 / D3 / D7 / D14 / D30
\`\`\`

### [EVIDENCIA / MÉTODO]

Session lifecycle instrumentation uses the Page Visibility API for the client-side end-of-session boundary; \`visibilitychange\` is preferred to unreliable unload handlers. MDN documents this pattern for analytics, with \`pagehide\` as a fallback. Source: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon

---

# 9. Gameplay Variety Exploration

## V-01 — Conditional card effects

- **Category:** [PROPUESTA DE DISEÑO]
- **Problem:** combat actions may become repetitive as the content set grows.
- **Reuse:** current card/deck/action systems.
- **New rule:** cards may react to a clearly defined combat state.
- **Expected impact:** more decision branches without a new combat genre.
- **Risk:** hidden complexity and balance surface.
- **Complexity:** medium.
- **Telemetry:** \`battle_action\`, card ID, action result.

## V-02 — Enemy intent variants

- **Category:** [PROPUESTA DE DISEÑO]
- **Problem:** repeated enemy turns can reduce anticipation value.
- **Reuse:** current enemy AI/intention vocabulary.
- **New rule:** conditional or telegraphed intent patterns.
- **Expected impact:** more planning decisions.
- **Risk:** readability.
- **Complexity:** low–medium.
- **Telemetry:** \`battle_action\`, enemy intent ID.

## V-03 — Scenario mutators

- **Category:** [EXPLORACIÓN]
- **Problem:** identical rules across repeated runs.
- **Reuse:** combat rules layer.
- **New rule:** temporary run modifier.
- **Expected impact:** controlled variety.
- **Risk:** modifier interactions multiply testing cost.
- **Complexity:** medium–high.
- **Telemetry:** rules version + mutator ID.

## V-04 — Objective variants

- **Category:** [PROPUESTA DE DISEÑO]
- **Problem:** victory alone may not create varied goals.
- **Reuse:** battle completion.
- **New rule:** optional objectives such as survive, conserve resource, or execute a condition.
- **Expected impact:** alternative decision priorities.
- **Risk:** rewards may distort optimal play.
- **Complexity:** medium.
- **Telemetry:** objective started/completed and result.

## V-05 — Nitro / Redline variants

- **Category:** [OPEN DESIGN QUESTION]
- **Problem:** current research leaves Nitro/Redline design unresolved.
- **Reuse:** historical terminology and research vocabulary.
- **New rule:** not specified.
- **Expected impact:** unknown.
- **Risk:** changing the research question into an implementation decision.
- **Complexity:** unknown.
- **Telemetry:** only after an explicit gameplay specification.

---

# 10. New Mode Exploration

| Mode ID | Purpose | Reused systems | New systems | Match length | Reward | Retention role | Technical cost | Status |
|---|---|---|---|---|---|---|---|---|
| CHALLENGE_RUN | repeatable constraint | combat, deck, RNG | challenge rules | short–medium | progression/event | D1/D7 | medium | [PROPUESTA] |
| WEEKLY_SEED | repeatability/comparison | seeded combat | seed rotation + result identity | short–medium | weekly reward | D7 | medium | [PROPUESTA] |
| BOSS_RUSH | concentrated mastery | combat, enemies | sequence controller | medium | milestone | D7/D30 | medium | [EXPLORACIÓN] |
| ENDURANCE | long-form survival | combat, enemy sequence | persistence/scoring | medium–long | milestone | D7/D30 | medium | [EXPLORACIÓN] |
| MUTATOR_RUN | variety | combat rules | mutator registry | short–medium | event reward | D7 | medium–high | [EXPLORACIÓN] |
| DRAFT_RUN | deck decisions | cards/deck | draft selection layer | medium | collection/progression | D7/D30 | high | [EXPLORACIÓN] |

### Mode rule

A mode is only technically justified if most of its loop reuses the existing combat engine. A mode that requires a second combat architecture should be treated as a separate product proposal.

---

# 11. Narrative / Gameplay Coupling

| Concept | Category | Gameplay effect | Power effect | Validation |
|---|---|---|---|---|
| Faction choice | [EXPLORACIÓN] | route/rule variation | none required | story comprehension + behavior |
| Story modifier | [PROPUESTA] | temporary combat rule | possibly neutral | battle telemetry |
| Card evolution | [EXPLORACIÓN] | changes card identity | potentially yes | progression + usage |
| Boss unlock | [PROPUESTA] | unlocks encounter | no direct power | completion funnel |
| Route unlock | [PROPUESTA] | changes available content | no direct power | route choice telemetry |
| Permanent rule | [EXPLORACIÓN] | changes future runs | potentially yes | explicit prototype experiment |

Narrative consequence and numerical player power must remain separate concepts. A story choice may change what the player sees or which rules/content are available without becoming an automatic stat increase.

---

# 12. External Research / Inspiration Matrix

External research is used only as inspiration/comparison. It is not evidence that Cari should adopt a system.

| Game | System observed | Why relevant | What Cari could learn | What should not be copied | Potential adaptation |
|---|---|---|---|---|---|
| Slay the Spire | dynamic deckbuilding, changing routes, Daily Climbs, Custom mode | combines combat decisions with run variety | variety can come from route/deck decisions around one combat core | its content volume and exact progression | Weekly Seed / limited challenge using Cari combat |
| Balatro | seeded runs, challenges, collection, stats | demonstrates multiple repeatable run structures around a compact ruleset | fixed seeds and constrained runs can create repeatability | poker-specific systems and its exact economy | Weekly Seed + challenge rules |
| Hades | Pact conditions, bounties, permanent progression, narrative between runs | shows how modifiers and progression can coexist with a repeated run loop | optional challenge modifiers can extend mastery without replacing the core | exact Heat/Pact/weapon systems | Cari Mutator Run or challenge contract |
| Marvel Snap | fast matches, daily/weekly missions, Conquest, event rewards | demonstrates short sessions with layered return goals | event modes can reuse the same battle vocabulary | live-service economy and competitive structure | short weekly event around existing combat |

### Sources

- Slay the Spire — Steam / developer-published product information: https://store.steampowered.com/app/646570/Slay_the_Spire/
- Balatro — Steam / developer-published product information: https://store.steampowered.com/app/2379780/Balatro/
- Hades — Supergiant Games FAQ: https://www.supergiantgames.com/blog/hades-faq/
- Hades — Supergiant Games Superstar Update: https://www.supergiantgames.com/blog/rock-out-in-the-superstar-update/
- Marvel Snap — official site: https://marvelsnap.com/
- Marvel Snap — official Conquest / mission patch notes: https://marvelsnap.com/patch-notes-jun-13-2023/

---

# 13. Open Design Register

| question | current_state | evidence | hypothesis | unknown | next_validation |
|---|---|---|---|---|---|
| How many currencies are necessary? | no final product economy | current MVP save/reward infrastructure | fewer is easier to understand | actual player preference | prototype one-resource economy |
| Should BTP exist? | [HIPÓTESIS NO VALIDADA] | none about real retention | may create medium-term goal | whether it enables useful decisions | controlled progression prototype |
| Is maintenance needed? | absent | no player evidence | may add risk/decision | whether it creates friction | prototype only if a concrete decision requires it |
| Are Daily Missions needed? | absent | no retention evidence | short goals may support return | whether they become chores | human playtest + telemetry |
| Does Weekly Seed add variety? | proposed | external pattern only | fixed seed can create mastery/comparison | actual Cari engagement | prototype |
| Are clans needed? | absent | no social evidence | social systems may create return loops | whether scale justifies cost | do not implement until evidence |
| How strong should story/gameplay coupling be? | open | narrative design docs | contextual rules may increase meaning | player comprehension | narrative prototype |
| How much content before events? | open | no retention population | event systems need stable core | minimum viable content set | observe core funnel first |
| What makes voluntary return? | unknown | human playtesting not established | meaningful unfinished goals may help | actual player motivation | instrumented playtest |
| Which variety system minimizes complexity? | unknown | no comparative product test | constrained modifiers may be cheaper than many new systems | maintenance burden | prototype candidates separately |

---

# 14. Product decision filter

Every future feature must answer:

1. What player problem does it solve?
2. Which loop does it strengthen?
3. Which existing system does it reuse?
4. What new complexity does it introduce?
5. How will we know later whether it worked?

If one cannot answer all five, classification remains:

\`[EXPLORACIÓN]\`

---

# 15. Telemetry implementation boundary

### Implemented in this phase

- event envelope;
- session ID;
- timestamp;
- optional identifiers;
- event queue;
- battle lifecycle instrumentation;
- session lifecycle instrumentation;
- local testable collector;
- optional transport hook, disabled by default.

### Not implemented

- remote analytics provider;
- backend database;
- economy;
- garage;
- missions;
- weekly events;
- narrative systems;
- new modes;
- combat balance;
- Nitro/Redline changes.

The transport hook exists only as an integration boundary. No endpoint is configured in this phase.

For browser lifecycle delivery, a later backend integration may use \`navigator.sendBeacon()\`; MDN documents it specifically for analytics POST delivery and recommends \`visibilitychange\` for end-of-session handling. This phase does not enable a network destination.

---

# 16. Risks

- Instrumentation can create false confidence if event semantics are not versioned.
- Client-only telemetry can lose data.
- A session boundary is an analytical convention, not direct evidence of player intent.
- Retention events require server-side cohort logic once real player data exists.
- Too many event types can become maintenance overhead.
- Product hypotheses can be mistaken for evidence if labels are removed.
- External references can encourage accidental copying.
- New modes can fragment content if introduced before the core loop is stable.

---

# 17. Dependencies

1. Stable combat result contract.
2. Stable game/rules version identifiers.
3. Future backend or analytics sink if real population measurement is required.
4. Human playtesting before claims about fun, usability, retention, or voluntary return.
5. Controlled gameplay prototyping before any new mechanic becomes production behavior.

---

# 18. Next Phase Boundary

**[DECISIÓN DE PROCESO]** The next implementation phase should be a controlled gameplay prototyping phase only after explicit selection of a small subset of proposals.

It must:

- select hypotheses explicitly;
- define controls/comparators;
- avoid rewriting Phase 14–16 evidence;
- measure gameplay separately from retention;
- preserve the epistemic labels in this document;
- avoid implementing a full economy or social system by default.

No single mode is ranked or selected as "best" by this specification.

---

# 19. Final Phase Report

- **PHASE STATUS:** SPECIFICATION COMPLETE
- **BASE SHA:** \`adfe5f766fb648776aa0728cccbf68cb5b023248\`
- **IMPLEMENTED FILES:** telemetry instrumentation only
- **PRODUCT SYSTEM MAP:** defined
- **CORE LOOP:** defined
- **META LOOP:** defined
- **RESOURCE / ECONOMY LEDGER:** defined, not implemented
- **PROGRESSION MODEL:** D0/D1/D7/D30 defined as hypotheses/proposals
- **RETENTION MODEL:** defined as hypotheses, not measured
- **TELEMETRY MODEL:** defined and instrumented
- **GAMEPLAY VARIETY PROPOSALS:** documented
- **NEW MODE PROPOSALS:** documented
- **NARRATIVE COUPLING:** documented
- **EXTERNAL RESEARCH:** documented with primary/official sources
- **OPEN DESIGN QUESTIONS:** registered
- **RISKS:** documented
- **DEPENDENCIES:** documented
- **NEXT PHASE:** controlled gameplay prototyping, after explicit selection
- **EPISTEMIC CLASSIFICATION:** explicit per proposal
- **GAMEPLAY CHANGES:** NONE

