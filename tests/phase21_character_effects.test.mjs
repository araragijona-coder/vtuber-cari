import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

const CORE_FILES = [
  "intento_2/webapp/js/game/balance.js",
  "intento_2/webapp/js/game/rng.js",
  "intento_2/webapp/js/game/cards.js",
  "intento_2/webapp/js/game/character_kits.js",
  "intento_2/webapp/js/game/enemies.js",
  "intento_2/webapp/js/game/energy.js",
  "intento_2/webapp/js/game/status.js",
  "intento_2/webapp/js/game/modifiers.js",
  "intento_2/webapp/js/game/effects.js",
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

async function loadCore(withTelemetry = false) {
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
    Map,
    Error,
    TypeError,
    Infinity,
    NaN
  });
  for (const path of CORE_FILES) {
    vm.runInContext(await readFile(path, "utf8"), context, { filename: path });
  }
  if (withTelemetry) {
    const telemetryContext = vm.createContext({
      window: { addEventListener() {} },
      document: {
        documentElement: { dataset: { gameVersion: "test" } },
        visibilityState: "visible",
        addEventListener() {}
      },
      sessionStorage: { setItem() {} },
      console,
      JSON,
      Date,
      Math,
      Number,
      String,
      Object,
      Array,
      Set,
      Error,
      TypeError
    });
    vm.runInContext(await readFile("intento_2/webapp/js/telemetry.js", "utf8"), telemetryContext, {
      filename: "telemetry.js"
    });
    context.window.RocketBunnyTelemetry = telemetryContext.window.RocketBunnyTelemetry;
  }
  return context.window;
}

function start(w, characterId = "legacy") {
  const state = w.GameState.createGameState({ playerId: "phase21-test" });
  const character = w.CharacterKitSystem.definitionFor(characterId);
  w.GameState.startBattle(state, {
    battleId: "phase21-" + characterId,
    seed: 424242,
    characterId: characterId === "legacy" ? null : characterId,
    character: characterId === "legacy" ? null : character,
    cardIds: characterId === "legacy" ? null : character.cardIds,
    player: {
      id: "player",
      hp: 120,
      maxHp: 120,
      stats: { atk: 20, def: 5, skillDamage: 40 }
    },
    enemy: { id: "street_punk", hp: 240, maxHp: 240 }
  });
  return state;
}

function useCard(w, state, cardId) {
  const card = state.combat.cards.hand.find((entry) => entry.cardId === cardId);
  assert.ok(card, "card must be in hand: " + cardId);
  state.combat.resources.energy = 100;
  state.combat.resources.currentEnergy = 100;
  return w.CombatEngine.resolveAction(
    state,
    w.GameActions.createPlayerSkillAction(state, card.instanceId)
  );
}

test("heal clamps at max HP and records an effect event", async () => {
  const w = await loadCore();
  const state = start(w, "test_support");
  state.combat.player.hp = 70;
  const result = useCard(w, state, "support_repair_burst");
  assert.equal(result.healAmount, 32);
  assert.equal(state.combat.player.hp, 102);
  assert.ok(state.combat.events.some((event) => event.type === "heal_applied"));

  const clamped = start(w, "test_support");
  clamped.combat.player.hp = 119;
  useCard(w, clamped, "support_repair_burst");
  assert.equal(clamped.combat.player.hp, 120);
});

test("temporary buff applies with replace stacking and expires", async () => {
  const w = await loadCore();
  const state = start(w, "test_support");
  const result = useCard(w, state, "support_sync");
  assert.equal(result.buffApplied.amount, 0.15);
  assert.equal(w.ModifierSystem.damageOutMultiplier(state.combat.player), 1.15);
  w.CombatEngine.advanceTime(state, 2500);
  assert.equal(w.ModifierSystem.damageOutMultiplier(state.combat.player), 1);
  assert.ok(state.combat.events.some((event) => event.type === "modifier_expired"));
});

test("cleanse removes WEAK and EXPOSED but preserves unrelated state", async () => {
  const w = await loadCore();
  const state = start(w, "test_support");
  w.StatusSystem.applyTimedMs(state.combat.player, "WEAK", 2200);
  w.StatusSystem.applyTimedMs(state.combat.player, "EXPOSED", 2200);
  state.combat.player.block = 7;
  const result = useCard(w, state, "support_clean_slate");
  assert.deepEqual([...result.cleanseRemoved].sort(), ["EXPOSED", "WEAK"]);
  assert.equal(w.StatusSystem.has(state.combat.player, "WEAK"), false);
  assert.equal(w.StatusSystem.has(state.combat.player, "EXPOSED"), false);
  assert.equal(state.combat.player.block, 7);
});

test("multi-hit resolves three deterministic impacts and BREAK per hit", async () => {
  const w = await loadCore();
  const state = start(w, "yuri");
  const beforeHp = state.combat.enemy.hp;
  const result = useCard(w, state, "yuri_racha_neon");
  assert.equal(result.hitCount, 3);
  assert.equal(result.hits.length, 3);
  assert.equal(result.breakDamage, 12);
  assert.equal(result.damage, result.hits.reduce((sum, hit) => sum + hit.damage, 0));
  assert.ok(state.combat.enemy.hp < beforeHp);
  assert.equal(result.hits[0].breakDamage, 4);
  assert.equal(result.hits[2].breakDamage, 4);
});

test("multi-hit replay is deterministic", async () => {
  const w = await loadCore();
  const a = start(w, "yuri");
  const b = start(w, "yuri");
  const ra = useCard(w, a, "yuri_racha_neon");
  const rb = useCard(w, b, "yuri_racha_neon");
  assert.deepEqual(
    {
      damage: ra.damage,
      rawDamage: ra.rawDamage,
      breakDamage: ra.breakDamage,
      hits: ra.hits,
      rng: [ra.rngStateBefore, ra.rngStateAfter]
    },
    {
      damage: rb.damage,
      rawDamage: rb.rawDamage,
      breakDamage: rb.breakDamage,
      hits: rb.hits,
      rng: [rb.rngStateBefore, rb.rngStateAfter]
    }
  );
});

test("damage reduction modifies incoming HP damage and expires", async () => {
  const w = await loadCore();
  const guarded = start(w, "test_support");
  const baseline = start(w, "test_support");
  useCard(w, guarded, "support_safety_field");

  const actionA = w.GameActions.createAction({
    id: "enemy-a",
    type: "AUTO_ATTACK",
    actorId: guarded.combat.enemy.id,
    targetId: guarded.combat.player.id,
    simulationTick: guarded.combat.simulationTick,
    source: "ENEMY_AUTO_ATTACK"
  });
  const actionB = w.GameActions.createAction({
    id: "enemy-b",
    type: "AUTO_ATTACK",
    actorId: baseline.combat.enemy.id,
    targetId: baseline.combat.player.id,
    simulationTick: baseline.combat.simulationTick,
    source: "ENEMY_AUTO_ATTACK"
  });

  const reduced = w.CombatEngine.resolveEnemyAttack(guarded.combat, actionA, 20);
  const normal = w.CombatEngine.resolveEnemyAttack(baseline.combat, actionB, 20);

  assert.ok(reduced.damage < normal.damage);
  assert.ok(reduced.damageReductionApplied > 0);
  w.CombatEngine.advanceTime(1800);
  assert.equal(w.ModifierSystem.damageReductionFraction(guarded.combat.player), 0);
});

test("role integrity keeps Yuri striker-oriented and support support-oriented", async () => {
  const w = await loadCore();
  const yuri = w.CharacterKitSystem.definitionFor("yuri");
  const support = w.CharacterKitSystem.definitionFor("test_support");
  const yuriDefs = yuri.cardIds.map((id) => w.CardSystem.definitionFor(id));
  const supportDefs = support.cardIds.map((id) => w.CardSystem.definitionFor(id));

  assert.ok(yuriDefs.some((def) => def.class === "STRIKER" && def.type === "ATTACK"));
  assert.ok(yuriDefs.some((def) => def.effects?.multiHit));
  assert.ok(yuriDefs.some((def) => def.effects?.buff));

  assert.equal(
    supportDefs.filter((def) => def.class === "SUPPORT" && def.type === "ATTACK").length,
    0
  );
  assert.ok(supportDefs.some((def) => def.effects?.heal));
  assert.ok(supportDefs.some((def) => def.effects?.buff));
  assert.ok(supportDefs.some((def) => def.effects?.cleanse));
  assert.ok(supportDefs.some((def) => def.effects?.damageReduction));
});

test("semi-realtime loop remains active during effect usage", async () => {
  const w = await loadCore();
  const state = start(w, "test_support");
  const tickBefore = state.combat.simulationTick;
  useCard(w, state, "support_safety_field");
  w.CombatEngine.advanceTime(state, 1000);
  assert.ok(state.combat.simulationTick > tickBefore);
  assert.ok(state.combat.player.autoAttack.cooldownMs < 1400);
  assert.equal(state.combat.phase, "REAL_TIME");
  assert.ok(state.combat.enemyIntent);
  assert.ok(state.combat.resources.energy > 35 - 20);
});

test("effect telemetry uses the existing telemetry infrastructure", async () => {
  const w = await loadCore(true);
  const state = start(w, "test_support");
  state.combat.player.hp = 80;
  useCard(w, state, "support_repair_burst");
  const effectEvents = w.RocketBunnyTelemetry.peek().filter(
    (event) => event.event_name === "combat_effect"
  );
  assert.ok(effectEvents.some((event) => event.payload.effect_type === "heal_applied"));
});

test("save schema remains version 1 and state snapshots preserve modifiers", async () => {
  const w = await loadCore();
  const state = start(w, "test_support");
  useCard(w, state, "support_sync");
  const snapshot = w.GameState.snapshot(state);
  assert.equal(snapshot.combat.player.modifiers.damageOut.amount, 0.15);
  const saveSource = await readFile("intento_2/webapp/js/storage/save_manager.js", "utf8");
  assert.match(saveSource, /CURRENT_SAVE_VERSION = 1/);
  assert.doesNotMatch(saveSource, /CURRENT_SAVE_VERSION = 2/);
});

test("presentation exposes feedback contracts for all Phase 21 effects", async () => {
  const source = await readFile("intento_2/webapp/js/combat_presentation.js", "utf8");
  for (const marker of ["drawHeal", "drawBuff", "drawCleanse", "drawDamageReduction", "action.hits"]) {
    assert.ok(source.includes(marker), marker);
  }
});
