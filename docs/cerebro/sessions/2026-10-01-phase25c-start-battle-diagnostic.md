# Phase 25-C — START BATTLE Gate Diagnostic

Date: 2026-10-01

## Purpose

Determine whether the failed Phase 25 Browser/Fish start interaction is caused by:

- a game bug;
- a browser automation/evidence issue;
- a deployment/page-flow issue.

This diagnostic does not change code or gameplay.

## HEAD

HEAD at diagnostic start:

`c7e5676ac8fcee9c78093154332cb2fb1e3f94fc`

Commit:

`docs: record phase25 live validation`

Known Phase 25 code commit:

`9e84f8a9b0e8511f3f39f51a6e526030dcd0ae47`

Comparison from the Phase 25 code commit to the diagnostic-start HEAD shows only documentation changes. No combat implementation file changed after `9e84f8a`.

## START BATTLE path

### HTML button

Verified in the deployed page and repository:

- id: `start-battle`
- class: `primary-action`
- type: `button`
- label: `START BATTLE`

### DOM lookup

`combat.js` performs:

`document.getElementById("start-battle")`

The resulting reference is stored in `startButton`.

### Event handler

Verified direct binding:

`startButton?.addEventListener("click", () => startBattle());`

This is a concrete, non-dead event path.

### Start function

`startBattle(config = null)`:

1. stops any previous simulation;
2. creates the battle configuration;
3. normalizes progression when present;
4. calls `window.GameState.startBattle(view.gameState, battleConfig)`;
5. records combat telemetry;
6. calls `presentation?.onCombatStart(combat)`;
7. renders UI;
8. calls `startSimulation()`.

### Initial game state

Verified at module bootstrap:

`initGameState()`

creates:

`window.GameState.createGameState({ playerId: "local-player" })`

and immediately renders the pre-combat UI.

### State transition

`GameState.startBattle()` explicitly changes:

`state.screen = "BATTLE"`

and creates:

`state.combat`

with:

`mode = "SEMI_REALTIME"`

`phase = "REAL_TIME"`

`outcome = "IN_PROGRESS"`

`elapsedMs = 0`

A `CombatClock` instance is created at battle initialization.

### Clock / render initialization

After state creation:

`startSimulation()`

sets:

`lastSimulationTime = performance.now()`

and schedules:

`requestAnimationFrame(frame)`

Each frame calls:

`CombatEngine.advanceTime(view.gameState, deltaMs)`

then renders UI and schedules the next frame while outcome remains `IN_PROGRESS`.

A separate render loop is initialized at bootstrap:

`requestAnimationFrame(drawFrame)`

which continuously invokes:

`presentation?.render(view.gameState?.combat || null, now)`

## Dependencies verified

The HTML loads the required combat dependencies before `combat.js`, including:

- `balance.js`
- `rng.js`
- `cards.js`
- `enemies.js`
- `energy.js`
- `status.js`
- `modifiers.js`
- `effects.js`
- `character_kits.js`
- `abilities.js`
- `combat_clock.js`
- `auto_attack.js`
- `break.js`
- `burst.js`
- `state.js`
- `actions.js`
- `skill_resolver.js`
- `enemy_behavior.js`
- `rules.js`
- `enemy.js`
- `rewards.js`
- progression/data/storage modules
- `combat_presentation.js`
- `combat.js`
- `app.js`

START BATTLE itself calls real implementations for EnemyCatalog, SaveManager, CharacterKitSystem, GameState and CombatEngine.

No speculative dependency was identified.

## Deployment check

Live GitHub Pages inspection of:

`https://araragijona-coder.github.io/vtuber-cari/`

verified that the served page contains the expected:

- combat section;
- `combat-canvas`;
- `combat-timer`;
- `combat-scene-state`;
- `combat-enemy-hp`;
- Energy UI;
- card hand;
- `START BATTLE` button with id `start-battle`.

Live fetch of:

`/js/combat.js`

also exposed the same START BATTLE lookup, `startBattle()` path, initialization and requestAnimationFrame logic as the main-branch Phase 25 code.

Therefore no deployment/page-flow discrepancy was found.

Exact deployed GitHub Pages commit metadata could not be read directly from the available deployment connector surface, but the current main branch contains no combat-code changes after the verified Phase 25 code commit.

## Browser/Fish evidence already obtained

No second Browser/Fish session was executed by Phase 25-C.

The single Phase 25-B Browser/Fish session reported:

- START BATTLE: visible/clickable;
- no JS exception observed;
- no freeze/stutter observed;
- END TURN not visible;
- step progression continued beyond the initial start step to later post-combat checks.

However, its returned structured object did not contain the requested individual visual checks or card interaction evidence, and the provider-reported duration was 155 seconds against a requested 120-second maximum.

The earlier Phase 25 Browser/Fish result had failed before successful combat interaction evidence was returned.

## Browser-free reproduction

A direct browser-free runtime reproduction was not executed because no repository-local browser harness capable of driving the real DOM event path was available through the current tool surface.

Static source inspection plus live served-asset inspection was performed instead.

## Diagnosis

### NO BUG FOUND

Evidence supports:

- START BATTLE exists in the real DOM;
- the exact DOM id is known;
- the click listener is attached directly;
- the handler calls the real `startBattle()` function;
- `startBattle()` performs the expected GameState transition;
- a real CombatClock is initialized;
- the simulation loop is scheduled with requestAnimationFrame;
- the live deployed page exposes the expected combat DOM;
- the live deployed `combat.js` contains the same start path;
- the existing Browser/Fish session itself reported START BATTLE as visible/clickable and progressed to later validation steps.

No concrete game defect, dead route, missing DOM target, or deployment mismatch was demonstrated.

The prior failure therefore does **not** justify a code fix.

The remaining issue is insufficient/unstable Browser evidence, not a demonstrated gameplay-start bug.

## Result

`PHASE 25-C = NO BUG FOUND / BROWSER VALIDATION PENDING`

No code changes were made.

No gameplay systems were changed.

No Master Brain verification state was promoted to VERIFIED.

## Recommended next action

Run one separate, extremely short Browser/Fish validation focused only on:

`LOAD → click #start-battle → confirm COMBAT/LIVE → wait briefly`

and stop immediately if the click cannot be demonstrated.

Do not expand the visual scope until successful start evidence is obtained.
