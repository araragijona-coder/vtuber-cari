import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

const CORE_FILES = [
  "intento_2/webapp/js/game/balance.js",
  "intento_2/webapp/js/game/rng.js",
  "intento_2/webapp/js/game/cards.js",
  "intento_2/webapp/js/game/enemies.js",
  "intento_2/webapp/js/game/energy.js",
  "intento_2/webapp/js/game/status.js",
  "intento_2/webapp/js/game/abilities.js",
  "intento_2/webapp/js/game/combat_clock.js",
  "intento_2/webapp/js/game/auto_attack.js",
  "intento_2/webapp/js/game/break.js",
  "intento_2/webapp/js/game/burst.js",
  "intento_2/webapp/js/game/state.js",
  "intento_2/webapp/js/game/actions.js",
  "intento_2/webapp/js/game/skill_resolver.js",
  "intento_2/webapp/js/game/enemy_behavior.js",
  "intento_2/webapp/js/game/rules.js",
  "intento_2/webapp/js/game/enemy.js"
];

async function loadCore() {
  const context = vm.createContext({
    window: {},
    console,
    JSON,
    Math,
    Number,
    String,
    Object,
    Array,
    Set,
    Error,
    TypeError,
    Infinity,
    NaN
  });
  for (const path of CORE_FILES) {
    vm.runInContext(await readFile(path, "utf8"), context, { filename: path });
  }
  return context.window;
}

function start(window, overrides = {}) {
  const state = window.GameState.createGameState({ playerId: "phase18-test" });
  window.GameState.startBattle(state, {
    battleId: "phase18-battle",
    seed: 424242,
    player: {
      id: "player",
      hp: 120,
      maxHp: 120,
      stats: { atk: 20, def: 5, skillDamage: 40 }
    },
    enemy: { id: "street_punk" },
    ...overrides
  });
  return state;
}

function cardAction(window, state, cardId) {
  const card = state.combat.cards.hand.find((entry) => entry.cardId === cardId);
  assert.ok(card, "card must be in hand: " + cardId);
  return window.GameActions.createPlayerSkillAction(state, card.instanceId);
}

test("fixed-step clock is deterministic and advances logical ticks", async () => {
  const w = await loadCore();
  const clock = w.CombatClock.create(100);
  const seen = [];
  assert.equal(w.CombatClock.advance(clock, 99.9, info => seen.push(info)), 0);
  assert.equal(w.CombatClock.advance(clock, 0.1, info => seen.push(info)), 1);
  assert.equal(seen.length, 1);
  assert.equal(seen[0].tick, 1);
  assert.equal(seen[0].elapsedMs, 100);
  assert.equal(seen[0].stepMs, 100);
});

test("starts semi-real-time combat with continuous resources", async () => {
  const w = await loadCore();
  const state = start(w);
  const combat = state.combat;

  assert.equal(combat.phase, "REAL_TIME");
  assert.equal(combat.activeActor, "combat");
  assert.equal(combat.simulationTick, 0);
  assert.equal(combat.resources.currentEnergy, 35);
  assert.equal(combat.resources.energy, 35);
  assert.equal(combat.resources.maxEnergy, 100);
  assert.equal(combat.resources.energyRegen, 12);
  assert.ok(combat.player.autoAttack);
  assert.ok(combat.enemy.autoAttack);
  assert.equal(combat.cards.hand.length, 5);

  const roles = new Set(
    combat.cards.hand.map((entry) => w.CardSystem.definitionFor(entry.cardId).type)
  );
  assert.deepEqual(roles, new Set(["ATTACK", "DEFENSE", "SKILL"]));
  assert.ok(combat.enemyIntent);
  assert.ok(combat.enemyIntent.remainingMs > 0);
});

test("auto attacks continue without player input", async () => {
  const w = await loadCore();
  const state = start(w);
  const playerBefore = state.combat.player.hp;
  const enemyBefore = state.combat.enemy.hp;

  w.CombatEngine.advanceTime(state, 1500);

  assert.equal(state.combat.simulationTick, 15);
  assert.ok(state.combat.player.hp < playerBefore);
  assert.ok(state.combat.enemy.hp < enemyBefore);
});

test("skills can be used during combat without END TURN", async () => {
  const w = await loadCore();
  const state = start(w);
  const combat = state.combat;
  const tick = combat.simulationTick;
  const energyBefore = combat.resources.currentEnergy;
  const action = cardAction(w, state, "pulso_debilitante");
  const result = w.CombatEngine.resolveAction(state, action);

  assert.equal(result.actionType, "SKILL");
  assert.equal(combat.simulationTick, tick);
  assert.equal(combat.activeActor, "combat");
  assert.ok(combat.resources.currentEnergy < energyBefore);
  assert.equal(w.StatusSystem.has(combat.enemy, "WEAK"), true);
  assert.equal(w.CombatEngine.validateAction(state, w.GameActions.createPlayerEndTurnAction(state)).error, "LEGACY_TURN_FLOW_DISABLED");
});

test("same logical combat is render-rate independent", async () => {
  const w = await loadCore();

  const simulate = (frameMs, frames) => {
    const state = start(w);
    for (let index = 0; index < frames; index += 1) {
      w.CombatEngine.advanceTime(state, frameMs);
    }
    return {
      tick: state.combat.simulationTick,
      elapsedMs: state.combat.elapsedMs,
      playerHp: state.combat.player.hp,
      enemyHp: state.combat.enemy.hp,
      energy: state.combat.resources.currentEnergy,
      rng: state.combat.rng.state,
      break: state.combat.enemy.breakState.current
    };
  };

  assert.deepEqual(simulate(1000 / 30, 30), simulate(1000 / 60, 60));
  assert.deepEqual(simulate(1000 / 60, 60), simulate(1000 / 120, 120));
});


test("phase 18 exposes synchronized Energy and Burst resources", async () => {
  const w = await loadCore();
  const state = start(w);
  const combat = state.combat;

  assert.equal(combat.mode, "SEMI_REALTIME");
  assert.equal(combat.resources.currentEnergy, 35);
  assert.equal(combat.resources.energy, 35);
  assert.equal(combat.resources.maxEnergy, 100);
  assert.equal(combat.resources.energyRegen, 12);
  assert.equal(combat.resources.burstCharge, 0);
  assert.equal(combat.resources.burst, 0);
  assert.equal(combat.resources.burstMax, 100);
});

test("burst is a real chargeable action with BREAK payoff", async () => {
  const w = await loadCore();
  const state = start(w);
  const combat = state.combat;

  combat.resources.burstCharge = 100;
  combat.resources.burst = 100;
  combat.enemy.breakState.current = 0;
  combat.enemy.breakState.remainingMs = combat.enemy.breakState.windowMs;
  combat.enemy.breakState.state = "BROKEN";

  const beforeHp = combat.enemy.hp;
  const result = w.CombatEngine.activateBurst(state);

  assert.equal(result.actionType, "BURST");
  assert.ok(result.damage > 0);
  assert.ok(combat.enemy.hp < beforeHp);
  assert.equal(combat.resources.burstCharge, 0);
  assert.equal(combat.resources.burst, 0);
});

test("card cycling records recycle state without END TURN", async () => {
  const w = await loadCore();
  const state = start(w);
  const combat = state.combat;
  combat.resources.energy = 100;
  combat.resources.currentEnergy = 100;

  for (let index = 0; index < 9; index += 1) {
    const card = combat.cards.hand[0];
    if (!card) break;
    w.CombatEngine.resolveAction(
      state,
      w.GameActions.createPlayerSkillAction(state, card.instanceId)
    );
    combat.resources.energy = 100;
    combat.resources.currentEnergy = 100;
  }

  assert.ok(combat.cards.recycleCount >= 1);
  assert.ok(combat.events.some((event) => event.type === "deck_recycled"));
});

test("phase 18 telemetry exposes explicit combat lifecycle helpers", async () => {
  const source = await readFile("intento_2/webapp/js/telemetry.js", "utf8");
  for (const eventName of [
    "skill_used",
    "energy_spent",
    "enemy_telegraph",
    "enemy_attack_resolved",
    "break_started",
    "break_ended",
    "burst_used"
  ]) {
    assert.ok(source.includes('"event_name": "' + eventName + '"') || source.includes('"' + eventName + '"'), eventName);
  }
});

test("realtime telemetry hooks execute without interrupting fixed-step combat", async () => {
  const w = await loadCore();
  const telemetryContext = vm.createContext({
    window: {},
    document: {
      documentElement: { dataset: { gameVersion: "test" } },
      visibilityState: "visible",
      addEventListener() {}
    },
    sessionStorage: { setItem() {} },
    console,
    JSON,
    Math,
    Number,
    String,
    Object,
    Array,
    Date,
    Set,
    Error,
    TypeError,
    crypto: { randomUUID: () => "test-session" }
  });

  vm.runInContext(
    await readFile("intento_2/webapp/js/telemetry.js", "utf8"),
    telemetryContext,
    { filename: "intento_2/webapp/js/telemetry.js" }
  );
  w.RocketBunnyTelemetry = telemetryContext.window.RocketBunnyTelemetry;

  for (const hook of [
    "enemyTelegraph",
    "enemyAttackResolved",
    "breakStarted",
    "breakEnded",
    "burstUsed"
  ]) {
    assert.equal(typeof w.RocketBunnyTelemetry[hook], "function", hook + " must be public");
  }

  const state = start(w);
  const combat = state.combat;
  const initialEnergy = combat.resources.currentEnergy;
  const initialPlayerAuto = combat.player.autoAttack.cooldownMs;
  const initialEnemyAuto = combat.enemy.autoAttack.cooldownMs;

  assert.doesNotThrow(() => {
    w.CombatEngine.advanceTime(state, 100);
    w.RocketBunnyTelemetry.enemyTelegraph(combat, combat.enemyIntent);
  });

  assert.equal(combat.simulationTick, 1);
  assert.equal(combat.elapsedMs, 100);
  assert.ok(combat.resources.currentEnergy > initialEnergy);
  assert.ok(combat.player.autoAttack.cooldownMs < initialPlayerAuto);
  assert.ok(combat.enemy.autoAttack.cooldownMs < initialEnemyAuto);

  w.CombatEngine.advanceTime(state, 1200);

  const enemyAttackEvent = combat.events.find(
    (event) => event.type === "enemy_attack_resolved"
  );
  assert.ok(enemyAttackEvent, "enemy attack must resolve during fixed-step progression");

  assert.doesNotThrow(() => {
    w.RocketBunnyTelemetry.enemyAttackResolved(combat, enemyAttackEvent);
    w.RocketBunnyTelemetry.breakStarted(combat, {
      breakDamage: 1,
      simulationTick: combat.simulationTick
    });
    w.RocketBunnyTelemetry.breakEnded(combat);
    w.RocketBunnyTelemetry.burstUsed(combat, {
      damage: 1,
      brokenPayoff: false,
      simulationTick: combat.simulationTick
    });
  });

  const events = w.RocketBunnyTelemetry.peek().map((event) => event.event_name);
  assert.ok(events.includes("enemy_telegraph"));
  assert.ok(events.includes("enemy_attack_resolved"));
  assert.ok(events.includes("break_started"));
  assert.ok(events.includes("break_ended"));
  assert.ok(events.includes("burst_used"));
});
