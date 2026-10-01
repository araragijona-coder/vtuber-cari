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
  "intento_2/webapp/js/game/simulation.js",
  "intento_2/webapp/js/game/state.js",
  "intento_2/webapp/js/game/actions.js",
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

test("starts semi-real-time combat with continuous resources", async () => {
  const w = await loadCore();
  const state = start(w);
  const combat = state.combat;

  assert.equal(combat.mode, "SEMI_REALTIME");
  assert.equal(combat.simulationTick, 0);
  assert.equal(combat.resources.currentEnergy, 35);
  assert.equal(combat.resources.maxEnergy, 100);
  assert.equal(combat.resources.energyRegen, 2);
  assert.ok(combat.player.autoAttack);
  assert.ok(combat.enemy.autoAttack);
  assert.equal(combat.cards.hand.length, 5);

  const roles = new Set(
    combat.cards.hand.map((entry) => w.CardSystem.definitionFor(entry.cardId).type)
  );
  assert.deepEqual(roles, new Set(["ATTACK", "DEFENSE", "SKILL"]));
  assert.equal(combat.phase, "REALTIME");
  assert.equal(combat.activeActor, "simulation");
});

test("auto attacks and telegraphs resolve on logical ticks", async () => {
  const w = await loadCore();
  const state = start(w);
  const combat = state.combat;
  const enemyBefore = combat.enemy.hp;

  assert.equal(combat.enemyIntent.type, "ATTACK");
  assert.equal(combat.enemyIntent.remainingTicks, 12);

  w.RealtimeCombat.step(combat, 11);
  assert.equal(combat.simulationTick, 11);
  assert.equal(combat.enemy.hp, enemyBefore);
  assert.equal(combat.enemyIntent.remainingTicks, 1);

  w.RealtimeCombat.step(combat, 1);
  assert.equal(combat.simulationTick, 12);
  assert.ok(combat.enemy.hp < enemyBefore);
  assert.equal(combat.enemyIntent, null);
  assert.equal(combat.player.hp < combat.player.maxHp, true);
});

test("skill input works without a player turn", async () => {
  const w = await loadCore();
  const state = start(w);
  const combat = state.combat;

  const card = combat.cards.hand.find((entry) => entry.cardId === "pulso_debilitante");
  assert.ok(card);

  const result = w.RealtimeCombat.useCard(combat, card.instanceId);
  assert.equal(result.success, true);
  assert.equal(combat.activeActor, "simulation");
  assert.equal(combat.resources.currentEnergy, 10);
  assert.equal(w.StatusSystem.has(combat.enemy, "WEAK"), true);
  assert.equal(combat.inputLog.length, 1);
  assert.equal(combat.inputLog[0].tick, 0);
});

test("same seed plus same logical inputs is render-rate independent", async () => {
  const w = await loadCore();

  const make = () => start(w);

  const fine = make();
  const coarse = make();
  const scheduled = new Map([
    [5, "pulso_debilitante"],
    [16, "escudo_dark"],
    [31, "embestida_nitro"]
  ]);

  function inputAt(combat, tick) {
    const cardId = scheduled.get(tick);
    if (!cardId) return;
    const card = combat.cards.hand.find((entry) => entry.cardId === cardId);
    if (card) w.RealtimeCombat.useCard(combat, card.instanceId);
  }

  for (let tick = 1; tick <= 60; tick += 1) {
    inputAt(fine, tick);
    w.RealtimeCombat.step(fine, 1);
  }

  let tick = 0;
  while (tick < 60) {
    const nextTick = Math.min(60, tick + 5);
    for (let logical = tick + 1; logical <= nextTick; logical += 1) {
      inputAt(coarse, logical);
    }
    w.RealtimeCombat.step(coarse, nextTick - tick);
    tick = nextTick;
  }

  assert.deepEqual(
    w.RealtimeCombat.snapshot(fine),
    w.RealtimeCombat.snapshot(coarse)
  );
});
