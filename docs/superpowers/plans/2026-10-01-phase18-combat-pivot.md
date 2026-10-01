# Phase 18 — Combat Model Pivot & Semi-Real-Time Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the production combat runtime from turn-gated card actions into deterministic fixed-step semi-real-time skill combat.

**Architecture:** Keep GameState, CardSystem, StatusSystem, enemy catalog, RNG, SaveManager, progression, telemetry, and Canvas/DOM. Add a focused RealtimeCombat simulation boundary that owns logical ticks, automatic attacks, telegraphs, Energy regeneration, skill inputs, BREAK, BURST, timed statuses, cooldowns, and replay state; combat.js becomes a renderer/input adapter instead of a turn controller.

**Tech Stack:** Vanilla JavaScript, HTML, CSS, Canvas 2D, Telegram WebApp SDK, localStorage, Node test runner, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-01-phase18-combat-pivot-design.md`

## Global Constraints

- Production runtime remains HTML/CSS/Vanilla JavaScript + Telegram WebApp SDK + localStorage + GitHub Pages.
- Phase 17A remains a technically validated prototype, not the production interaction model.
- Production combat must not depend on END TURN.
- Gameplay randomness remains seeded; no Math.random() in gameplay paths.
- Prototype Energy uses currentEnergy/maxEnergy/energyRegen with a 0–100 scale.
- Nitro and Redline remain unchanged/open; no global Nitro or Redline mechanics.
- SaveManager remains saveVersion = 1 unless migration is proven necessary.
- No backend is introduced.
- Human playtest is separate from technical verification and remains the final product-sensation gate.

## Review Focus

- A dropped render frame or different RAF cadence must not change the simulation result; covered by the render-rate independence test in Task 1.
- A skill click during an enemy telegraph must resolve as a player intervention without pausing enemy timing; covered by the temporal input test in Task 2.
- BLOCK must absorb real incoming damage and expire by ticks rather than turns; covered by the defense timing test in Task 2.
- BREAK must create a real vulnerability window and suspend the telegraphed enemy action; covered by the BREAK lifecycle test in Task 2.
- A recycled card must respect its cooldown and remain within the compact hand size; covered by the card-cycle test in Task 2.

### Task 1: Fixed-Step Simulation Core

**Files:**
- Create: `intento_2/webapp/js/game/simulation.js`
- Create: `tests/phase18_realtime_combat.test.mjs`
- Create: `.github/workflows/rocket-bunny-runtime-tests.yml`
- Modify: `intento_2/webapp/js/game/balance.js`
- Modify: `intento_2/webapp/js/game/state.js`
- Modify: `intento_2/webapp/index.html`

**Interfaces:**
- Produces `window.RealtimeCombat.initialize(combat)`, `step(combat, ticks = 1)`, `useCard(combat, cardInstanceId)`, `activateBurst(combat)`, `activateAbility(combat)`, `canUseCard(combat, cardInstanceId)`, `snapshot(combat)`, and `replay(combatFactory, seed, inputs)`.
- `GameState.startBattle()` initializes the semi-real-time mode when `window.RealtimeCombat` is loaded.

- [ ] **Step 1: Write the failing simulation tests**

Create tests named `starts semi-real-time combat with continuous resources`, `auto attacks and telegraphs resolve on logical ticks`, `skill input works without a player turn`, and `same seed plus same logical inputs is render-rate independent`. The assertions must require `mode=SEMI_REALTIME`, `simulationTick`, `currentEnergy/maxEnergy/energyRegen`, `autoAttack`, an initial enemy telegraph, and identical snapshots from different tick batching.

- [ ] **Step 2: Run the tests to verify they fail for the missing simulation boundary**

Run: `node --test tests/phase18_realtime_combat.test.mjs` in the runtime-test workflow.
Expected: FAIL because `intento_2/webapp/js/game/simulation.js` and `window.RealtimeCombat` do not yet exist.

- [ ] **Step 3: Implement the fixed-step simulation boundary**

Implement `RealtimeCombat` with 100 ms logical ticks, Energy starting at 35 and regenerating by 2 per tick toward 100, player auto-attack every 12 ticks, deterministic enemy telegraph lead of 12 ticks, and deterministic enemy intent scheduling. Use the existing RNG object and mutate only simulation state; render timing must never enter the rules.

- [ ] **Step 4: Connect GameState and load order**

Load `simulation.js` before `state.js` and have `GameState.startBattle()` initialize `mode=SEMI_REALTIME` when available while preserving the old structure for existing non-production tests.

- [ ] **Step 5: Run the task suite**

Run: `node --test tests/phase18_realtime_combat.test.mjs`.
Expected: all Task 1 tests PASS.

- [ ] **Step 6: Commit**

`feat: add deterministic semi-realtime combat simulation`

### Task 2: Skills, Temporal Defense, Status, BREAK and BURST

**Files:**
- Modify: `intento_2/webapp/js/game/balance.js`
- Modify: `intento_2/webapp/js/game/cards.js`
- Modify: `intento_2/webapp/js/game/status.js`
- Modify: `intento_2/webapp/js/game/abilities.js`
- Modify: `intento_2/webapp/js/game/enemy.js`
- Modify: `intento_2/webapp/js/game/simulation.js`
- Modify: `tests/phase18_realtime_combat.test.mjs`

**Interfaces:**
- `StatusSystem.applyTimed(combatant, type, durationTicks)` and `StatusSystem.tickTimed(combatant, ticks)` provide the authoritative time-based status contract.
- `RealtimeCombat.useCard()` applies a card immediately at the current simulation tick and records its cooldown.
- `RealtimeCombat.activateBurst()` consumes full BURST charge and resolves a deterministic burst action.

- [ ] **Step 1: Add failing mechanics tests**

Add tests named `energy cost and regeneration`, `block absorbs and expires by ticks`, `status durations use durationTicks`, `enemy telegraph delays and resolves`, `break enters vulnerability and exits deterministically`, `burst charges and pays off during break`, `card recycle respects cooldown`, and `active ability uses live combat state`.

- [ ] **Step 2: Run the tests to verify the new cases fail**

Run: `node --test tests/phase18_realtime_combat.test.mjs`.
Expected: FAIL on the new mechanics that have no implementation yet.

- [ ] **Step 3: Implement minimal temporal mechanics**

Add prototype balance fields for Energy, auto-attacks, telegraph timing, block duration, BREAK and BURST. Convert WEAK/EXPOSED to tick-aware state without removing the legacy `turns` fields used by Phase 17A tests.

Implement BREAK with max 60, a 20-tick broken window, suspended enemy intent resolution, and a deterministic post-break reset. Implement BURST at 100 charge; activation deals meaningful HP and BREAK damage, with an additional payoff while the enemy is broken.

Adapt PULSO BŌSŌZOKU to semi-real-time live Energy state and keep one use per combat.

- [ ] **Step 4: Run the mechanics suite**

Run: `node --test tests/phase18_realtime_combat.test.mjs`.
Expected: all Task 2 tests PASS.

- [ ] **Step 5: Commit**

`feat: add temporal skills break and burst mechanics`

### Task 3: Production Combat UI Pivot

**Files:**
- Modify: `intento_2/webapp/index.html`
- Modify: `intento_2/webapp/css/style.css`
- Modify: `intento_2/webapp/js/combat.js`

**Interfaces:**
- UI consumes only `RealtimeCombat`/`GameState` state and dispatches `useCard`, `activateBurst`, and `activateAbility` inputs.
- UI must not call or render `END TURN`.

- [ ] **Step 1: Write failing runtime contract tests**

Add a test that reads `index.html` and requires `simulation.js`, `BURST`, `ABILITY`, BREAK HUD elements, and no production `end-turn` button. Add assertions that `combat.js` contains a fixed-step simulation driver and card input path rather than an enemy-turn timeout.

- [ ] **Step 2: Run the contract tests to verify failure**

Run: `node --test tests/phase18_ui_contract.test.mjs`.
Expected: FAIL against the current 17A markup/controller.

- [ ] **Step 3: Replace the production turn controller with the simulation driver**

Start combat automatically after START BATTLE, accumulate wall-clock delta into 100 ms simulation ticks, call `RealtimeCombat.step()` for each logical tick, and render after simulation updates. Remove `END TURN` from production markup and controller paths.

Render a compact five-card hand, Energy `current/max`, BREAK, BURST, enemy telegraph countdown, timed statuses, and action feedback. Keep Canvas/DOM effects cosmetic.

- [ ] **Step 4: Run UI contract tests**

Run: `node --test tests/phase18_ui_contract.test.mjs`.
Expected: PASS.

- [ ] **Step 5: Commit**

`feat: pivot production combat ui to semi-realtime flow`

### Task 4: Telemetry, Save Compatibility, Remote CI and Browser QA Hook

**Files:**
- Modify: `intento_2/webapp/js/telemetry.js`
- Modify: `intento_2/webapp/js/combat.js`
- Modify: `tests/phase18_realtime_combat.test.mjs`
- Modify: `tests/phase18_ui_contract.test.mjs`
- Modify: `intento_2/webapp/js/storage/save_manager.js` only if a test proves a compatibility gap.

**Interfaces:**
- Telemetry emits `skill_used`, `energy_spent`, `enemy_telegraph`, `enemy_attack_resolved`, `break_started`, `break_ended`, and `burst_used` through the existing local event buffer.
- Existing SaveManager fields and `saveVersion=1` remain valid.

- [ ] **Step 1: Write failing telemetry/save regression tests**

Require the new event names, require saveVersion 1 to load unchanged, and require a deterministic full replay snapshot after mixed auto-actions and player skill inputs.

- [ ] **Step 2: Run the tests to verify failure**

Run: `node --test tests/phase18_realtime_combat.test.mjs tests/phase18_ui_contract.test.mjs`.
Expected: FAIL on new telemetry event helpers before implementation.

- [ ] **Step 3: Implement telemetry adapters without a backend**

Add the event helpers to `RocketBunnyTelemetry` and record them from the simulation/controller at the moment the gameplay event resolves.

- [ ] **Step 4: Run the full repository test suite**

Run: `node --test tests/*.test.mjs`.
Expected: PASS with zero failures; existing Phase 17A tests remain green unless a test is explicitly reclassified as obsolete by the new production contract.

- [ ] **Step 5: Commit**

`feat: instrument semi-realtime combat lifecycle`

- [ ] **Step 6: Browser QA**

Use the deployed GitHub Pages runtime to verify: combat starts without END TURN, auto-attacks occur without clicks, Energy changes continuously, enemy telegraph counts down and resolves, cards can be used during the ongoing fight, BREAK and BURST can be observed, and no runtime error prevents the loop.

- [ ] **Step 7: Human playtest gate**

Run a new human session against the deployed build. Record separately whether the player reports the intended sensation: `the fight is happening and I am controlling it`. Do not label automated QA as human validation.

- [ ] **Step 8: Final verification**

Verify `git rev-parse HEAD`, `git log --oneline --decorate -15`, changed files, full test output, deployment run, browser QA result, and any remaining design questions before calling the phase complete.
