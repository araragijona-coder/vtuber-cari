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
  const state = window.GameState.createGameState({ playerId: "phase17a-test" });
  window.GameState.startBattle(state, {
    battleId: "phase17a-battle",
    seed: 424242,
    player: { id: "player", hp: 120, maxHp: 120, stats: { atk: 20, def: 5, skillDamage: 40 } },
    enemy: { id: "street_punk" },
    ...overrides
  });
  return state;
}

function cardAction(window, state, cardId) {
  const card = state.combat.cards.hand.find((entry) => entry.cardId === cardId);
  assert.ok(card, "card must be in hand: " + cardId);
  return window.GameActions.createPlayerCardAction(state, card.instanceId);
}

test("card catalog contains three functional cards per type", async () => {
  const w = await loadCore();
  const definitions = Object.values(w.CardSystem.CARD_DEFINITIONS);
  assert.equal(definitions.length, 9);
  assert.equal(definitions.filter((card) => card.type === "ATTACK").length, 3);
  assert.equal(definitions.filter((card) => card.type === "DEFENSE").length, 3);
  assert.equal(definitions.filter((card) => card.type === "SKILL").length, 3);
  for (const card of definitions) {
    assert.ok(card.cardId);
    assert.ok(card.name);
    assert.ok(Number.isInteger(card.cost) && card.cost >= 0);
    assert.ok(card.description);
    assert.ok(card.effects && typeof card.effects === "object");
  }
});

test("attack card causes damage and keeps player turn open", async () => {
  const w = await loadCore();
  const state = start(w);
  const resolution = w.CombatEngine.resolveAction(state, cardAction(w, state, "disparo_neon"));
  assert.ok(resolution.damage > 0);
  assert.equal(state.combat.activeActor, "player");
  assert.equal(state.combat.phase, "PLAYER_TURN");
  assert.equal(state.combat.resources.energy, 2);
});

test("defense card creates real block and excess damage reaches HP", async () => {
  const w = await loadCore();
  const state = start(w);
  const shield = cardAction(w, state, "escudo_dark");
  const defense = w.CombatEngine.resolveAction(state, shield);
  assert.equal(defense.damage, 0);
  assert.equal(state.combat.player.block, 8);
  assert.equal(state.combat.player.hp, 120);

  state.combat.player.block = 2;
  state.combat.player.defending = true;
  const endTurn = w.GameActions.createPlayerEndTurnAction(state);
  w.CombatEngine.resolveAction(state, endTurn);
  const before = state.combat.player.hp;
  const enemyAction = w.EnemyAI.decide(state);
  const incoming = w.CombatEngine.resolveAction(state, enemyAction);

  assert.equal(incoming.blockAbsorbed, 2);
  assert.ok(incoming.damage > 0);
  assert.equal(state.combat.player.block, 0);
  assert.ok(state.combat.player.hp < before);
});

test("skill card changes combat state without being an attack", async () => {
  const w = await loadCore();
  const state = start(w);
  state.combat.cards.hand[0] = { instanceId: "skill-pulse", cardId: "pulso_debilitante" };
  const beforeHp = state.combat.enemy.hp;
  const resolution = w.CombatEngine.resolveAction(
    state,
    w.GameActions.createPlayerCardAction(state, "skill-pulse")
  );
  assert.equal(resolution.damage, 0);
  assert.equal(state.combat.enemy.hp, beforeHp);
  assert.equal(w.StatusSystem.has(state.combat.enemy, "WEAK"), true);
  assert.equal(state.combat.activeActor, "player");
});

test("insufficient energy blocks a card without consuming it", async () => {
  const w = await loadCore();
  const state = start(w);
  const card = state.combat.cards.hand.find((entry) => entry.cardId === "embestida_nitro");
  state.combat.resources.energy = 1;
  assert.throws(
    () => w.CombatEngine.resolveAction(state, w.GameActions.createPlayerCardAction(state, card.instanceId)),
    /INSUFFICIENT_ENERGY/
  );
  assert.equal(state.combat.resources.energy, 1);
  assert.equal(w.CardSystem.cardInHand(state.combat.cards, card.instanceId).instanceId, card.instanceId);
});

test("WEAK reduces outgoing damage", async () => {
  const w = await loadCore();
  const normal = start(w);
  const weak = start(w);
  w.StatusSystem.apply(weak.combat.player, "WEAK", 2);

  const normalDamage = w.CombatEngine.resolveAction(normal, cardAction(w, normal, "disparo_neon")).damage;
  const weakDamage = w.CombatEngine.resolveAction(weak, cardAction(w, weak, "disparo_neon")).damage;

  assert.ok(weakDamage < normalDamage);
});

test("EXPOSED increases incoming damage and expires deterministically", async () => {
  const w = await loadCore();
  const normal = start(w);
  const exposed = start(w);
  w.StatusSystem.apply(exposed.combat.enemy, "EXPOSED", 2);

  const normalDamage = w.CombatEngine.resolveAction(normal, cardAction(w, normal, "disparo_neon")).damage;
  const exposedDamage = w.CombatEngine.resolveAction(exposed, cardAction(w, exposed, "disparo_neon")).damage;

  assert.ok(exposedDamage > normalDamage);

  const durationState = start(w);
  w.StatusSystem.apply(durationState.combat.enemy, "EXPOSED", 2);
  w.CombatEngine.resolveAction(durationState, w.GameActions.createPlayerEndTurnAction(durationState));
  w.CombatEngine.resolveAction(durationState, w.EnemyAI.decide(durationState));
  assert.equal(w.StatusSystem.get(durationState.combat.enemy, "EXPOSED").turns, 1);

  w.CombatEngine.resolveAction(durationState, w.GameActions.createPlayerEndTurnAction(durationState));
  w.CombatEngine.resolveAction(durationState, w.EnemyAI.decide(durationState));
  assert.equal(w.StatusSystem.has(durationState.combat.enemy, "EXPOSED"), false);
});

test("enemy intent is visible for ATTACK, DEFEND and DEBUFF archetype situations", async () => {
  const w = await loadCore();

  const attack = start(w, { enemy: { id: "street_punk" } });
  assert.equal(attack.combat.enemyIntent.type, "ATTACK");
  assert.ok(attack.combat.enemyIntent.value > 0);

  const defend = start(w, { enemy: { id: "iron_guard", hp: 40 } });
  assert.equal(defend.combat.enemyIntent.type, "DEFEND");
  assert.ok(defend.combat.enemyIntent.label.includes("BLOCK"));

  const debuff = start(w, { enemy: { id: "banchou_rookie" } });
  debuff.combat.turn = 4;
  const intent = w.EnemyAI.previewIntent(debuff.combat);
  assert.equal(intent.type, "DEBUFF");
  assert.equal(intent.label, "DEBUFF · WEAK 2");
});

test("turn flow allows multiple player decisions before END TURN", async () => {
  const w = await loadCore();
  const state = start(w);
  const first = cardAction(w, state, "disparo_neon");
  w.CombatEngine.resolveAction(state, first);
  assert.equal(state.combat.activeActor, "player");

  const defenseCard = state.combat.cards.hand.find((entry) => entry.cardId === "escudo_dark");
  assert.ok(defenseCard);
  w.CombatEngine.resolveAction(
    state,
    w.GameActions.createPlayerCardAction(state, defenseCard.instanceId)
  );
  assert.equal(state.combat.activeActor, "player");

  w.CombatEngine.resolveAction(
    state,
    w.GameActions.createPlayerEndTurnAction(state)
  );
  assert.equal(state.combat.activeActor, "enemy");
  assert.equal(state.combat.phase, "ENEMY_TURN");

  const enemyAction = w.EnemyAI.decide(state);
  assert.ok(enemyAction);
  w.CombatEngine.resolveAction(state, enemyAction);
  assert.equal(state.combat.turn, 2);
  assert.equal(state.combat.activeActor, "player");
  assert.equal(state.combat.phase, "PLAYER_TURN");
  assert.equal(state.combat.resources.energy, 3);
  assert.ok(state.combat.enemyIntent);
});

test("character ability has a real condition and effect", async () => {
  const w = await loadCore();
  const state = start(w);

  state.combat.resources.energy = 2;
  assert.equal(w.CharacterAbilitySystem.canUse(state.combat), false);

  state.combat.resources.energy = 1;
  assert.equal(w.CharacterAbilitySystem.canUse(state.combat), true);

  const resolution = w.CombatEngine.resolveAction(
    state,
    w.GameActions.createPlayerAbilityAction(state)
  );

  assert.equal(resolution.actionType, "ABILITY");
  assert.equal(state.combat.resources.playerAbilityUses, 0);
  assert.equal(state.combat.resources.energy, 3);
  assert.equal(w.StatusSystem.get(state.combat.enemy, "EXPOSED").turns, 2);
});

test("same seed plus same decisions produces deterministic replay", async () => {
  const w = await loadCore();
  const a = start(w);
  const b = start(w);

  for (const state of [a, b]) {
    const attack = cardAction(w, state, "disparo_neon");
    w.CombatEngine.resolveAction(state, attack);
    w.CombatEngine.resolveAction(state, w.GameActions.createPlayerEndTurnAction(state));
    w.CombatEngine.resolveAction(state, w.EnemyAI.decide(state));
  }

  assert.equal(
    JSON.stringify(w.GameState.snapshot(a)),
    JSON.stringify(w.GameState.snapshot(b))
  );
});

test("save version 1 data remains loadable without migration", async () => {
  const storageData = new Map();
  const localStorage = {
    getItem(key) { return storageData.has(key) ? storageData.get(key) : null; },
    setItem(key, value) { storageData.set(key, String(value)); },
    removeItem(key) { storageData.delete(key); }
  };
  const context = vm.createContext({
    window: { localStorage },
    JSON,
    Number,
    String,
    Object,
    Array,
    Set,
    Date,
    Error,
    TypeError,
    Infinity,
    NaN
  });
  vm.runInContext(
    await readFile("intento_2/webapp/js/storage/save_manager.js", "utf8"),
    context,
    { filename: "save_manager.js" }
  );

  const oldSave = context.window.SaveManager.createDefaultSave("legacy-player");
  oldSave.player.xp = 100;
  oldSave.player.wins = 1;
  oldSave.progression = {};
  storageData.set(
    context.window.SaveManager.STORAGE_KEY,
    JSON.stringify(oldSave)
  );

  const loaded = context.window.SaveManager.load();
  assert.equal(loaded.source, "localStorage");
  assert.equal(loaded.save.saveVersion, 1);
  assert.equal(loaded.save.player.id, "legacy-player");
  assert.equal(loaded.save.player.xp, 100);
});
