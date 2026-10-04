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
  "intento_2/webapp/js/progression.js",
  "intento_2/webapp/js/game/enemy_behavior.js",
  "intento_2/webapp/js/game/rules.js",
  "intento_2/webapp/js/game/enemy.js",
  "intento_2/webapp/js/game/rewards.js",
  "intento_2/webapp/js/storage/save_manager.js"
];

async function loadRuntime() {
  const storageData = new Map();
  const localStorage = {
    getItem(key) { return storageData.has(key) ? storageData.get(key) : null; },
    setItem(key, value) { storageData.set(key, String(value)); },
    removeItem(key) { storageData.delete(key); }
  };
  const context = vm.createContext({
    window: { localStorage },
    console,
    JSON,
    Math,
    Number,
    String,
    Object,
    Array,
    Set,
    Map,
    Date,
    Error,
    TypeError,
    Infinity,
    NaN
  });

  for (const path of CORE_FILES) {
    vm.runInContext(await readFile(path, "utf8"), context, { filename: path });
  }

  return { window: context.window, storageData };
}

function startYuri(window, progression = {}, battleId = "yuri-progression-test") {
  const state = window.GameState.createGameState({ playerId: "yuri-test" });
  const character = window.CharacterKitSystem.definitionFor("yuri");
  const normalized = window.ProgressionSystem.normalizeProgression(progression);
  state.progression = normalized;

  window.GameState.startBattle(state, {
    battleId,
    seed: 44001,
    player: {
      id: "yuri-player",
      hp: 120,
      maxHp: 120,
      stats: { atk: 20, def: 0, skillDamage: 40 }
    },
    enemy: {
      id: "iron_guard",
      hp: 1000,
      maxHp: 1000,
      stats: { atk: 1, def: 0, skillDamage: 1 }
    },
    characterId: "yuri",
    character,
    cardIds: character.cardIds
  });

  state.combat.progression = normalized;
  state.combat.player.autoAttack.cooldownMs = 999999;
  state.combat.enemy.autoAttack.cooldownMs = 999999;
  state.combat.resources.energy = 100;
  state.combat.resources.currentEnergy = 100;
  return state;
}

function useDerrape(window, state) {
  const card = state.combat.cards.hand.find((entry) => entry.cardId === "yuri_derrape_expuesto");
  assert.ok(card, "DERRAPE YURI must be available in the Yuri deck");
  return window.CombatEngine.resolveAction(
    state,
    window.GameActions.createPlayerSkillAction(state, card.instanceId)
  );
}

function ownedYuriUpgrade(window) {
  const progression = window.ProgressionSystem.createDefaultProgression();
  progression.characterUpgrades.yuri = ["yuri_derrape_break_payoff"];
  return progression;
}

test("DERRAPE YURI without EXPOSED keeps baseline BREAK under the provisional payoff", async () => {
  const { window } = await loadRuntime();
  const state = startYuri(window, ownedYuriUpgrade(window));

  const before = state.combat.enemy.breakState.current;
  const resolution = useDerrape(window, state);

  assert.equal(resolution.breakDamage, 18);
  assert.equal(before - state.combat.enemy.breakState.current, 18);
  assert.equal(resolution.conditionalTriggered, false);
});

test("DERRAPE YURI with EXPOSED adds exactly +6 BREAK under the provisional payoff", async () => {
  const { window } = await loadRuntime();

  const baseline = startYuri(window, {}, "yuri-break-baseline");
  window.StatusSystem.applyTimedMs(
    baseline.combat.enemy,
    window.StatusSystem.STATUS_TYPES.EXPOSED,
    1500
  );
  const baselineResolution = useDerrape(window, baseline);
  assert.equal(baselineResolution.breakDamage, 18);

  const upgraded = startYuri(window, ownedYuriUpgrade(window), "yuri-break-upgraded");
  window.StatusSystem.applyTimedMs(
    upgraded.combat.enemy,
    window.StatusSystem.STATUS_TYPES.EXPOSED,
    1500
  );
  const upgradedResolution = useDerrape(window, upgraded);

  assert.equal(upgradedResolution.breakDamage, 24);
  assert.equal(upgradedResolution.breakDamage - baselineResolution.breakDamage, 6);
  assert.equal(upgradedResolution.conditionalTriggered, true);
});

test("Yuri reward exposes the character-bound provisional upgrade, choice and save/load round trip", async () => {
  const { window } = await loadRuntime();
  const save = window.SaveManager.createDefaultSave("yuri-player");
  const reward = window.RewardSystem.createReward({ battleId: "victory-33-yuri" });

  const prepared = window.ProgressionSystem.prepareAfterReward(save, reward, "yuri");
  assert.equal(prepared.saveVersion, 1);
  assert.equal(prepared.progression.pendingDecision.characterId, "yuri");
  assert.deepEqual(
    Array.from(prepared.progression.pendingDecision.optionIds),
    ["yuri_derrape_break_payoff"]
  );

  const options = window.ProgressionSystem.optionsForCharacter("yuri", prepared.progression);
  assert.equal(options.length, 1);
  assert.equal(options[0].id, "yuri_derrape_break_payoff");
  assert.equal(options[0].characterId, "yuri");
  assert.equal(options[0].cardId, "yuri_derrape_expuesto");
  assert.equal(options[0].effect, "break_payoff");
  assert.equal(options[0].value, 6);
  assert.equal(options[0].breakBonus, 6);
  assert.match(options[0].label, /DERRAPE \+ EXPOSED → \+6 BREAK/);

  const applied = window.ProgressionSystem.applyChoice(prepared, "yuri_derrape_break_payoff");
  assert.equal(applied.success, true);
  assert.equal(
    window.ProgressionSystem.hasCharacterUpgrade(
      applied.save.progression,
      "yuri",
      "yuri_derrape_break_payoff"
    ),
    true
  );
  assert.equal(applied.save.progression.pendingDecision, null);

  assert.equal(window.SaveManager.save(applied.save).success, true);
  const loaded = window.SaveManager.load();
  const normalized = window.ProgressionSystem.normalizeProgression(loaded.save.progression);

  assert.equal(
    window.ProgressionSystem.hasCharacterUpgrade(
      normalized,
      "yuri",
      "yuri_derrape_break_payoff"
    ),
    true
  );

  const nextBattle = startYuri(window, normalized, "yuri-after-reload");
  window.StatusSystem.applyTimedMs(
    nextBattle.combat.enemy,
    window.StatusSystem.STATUS_TYPES.EXPOSED,
    1500
  );
  assert.equal(useDerrape(window, nextBattle).breakDamage, 24);
});

test("legacy cardDamageBonuses survive normalize and save/load unchanged", async () => {
  const { window } = await loadRuntime();
  const save = window.SaveManager.createDefaultSave("legacy-player");
  save.progression = {
    cardDamageBonuses: {
      disparo_neon: 15,
      embestida_nitro: 10
    }
  };

  assert.equal(window.SaveManager.save(save).success, true);
  const loaded = window.SaveManager.load();
  const normalized = window.ProgressionSystem.normalizeProgression(loaded.save.progression);

  assert.equal(normalized.cardDamageBonuses.disparo_neon, 15);
  assert.equal(normalized.cardDamageBonuses.embestida_nitro, 10);
});

test("Yuri upgrade is character-bound and never appears for other character reward choices", async () => {
  const { window } = await loadRuntime();
  const save = window.SaveManager.createDefaultSave("support-player");
  const reward = window.RewardSystem.createReward({ battleId: "victory-33-support" });

  const supportPrepared = window.ProgressionSystem.prepareAfterReward(save, reward, "test_support");
  assert.equal(
    supportPrepared.progression.pendingDecision.optionIds.includes("yuri_derrape_break_payoff"),
    false
  );

  assert.equal(
    window.ProgressionSystem.breakBonusForCard(
      supportPrepared.progression,
      "test_support",
      "yuri_derrape_expuesto",
      true
    ),
    0
  );

  const yuriOptions = window.ProgressionSystem.optionsForCharacter("yuri", save.progression);
  const supportOptions = window.ProgressionSystem.optionsForCharacter("test_support", save.progression);
  assert.equal(yuriOptions.some((option) => option.id === "yuri_derrape_break_payoff"), true);
  assert.equal(supportOptions.some((option) => option.id === "yuri_derrape_break_payoff"), false);
});

test("GP-004 remains separate: DERRAPE bonus:10 stays declared while the new BREAK payoff is independent", async () => {
  const { window } = await loadRuntime();
  const definition = window.CardSystem.definitionFor("yuri_derrape_expuesto");
  assert.equal(definition.effects.bonus, 10);

  const progression = ownedYuriUpgrade(window);
  assert.equal(
    window.ProgressionSystem.bonusForCard(progression, "yuri_derrape_expuesto"),
    0
  );
  assert.equal(
    window.ProgressionSystem.breakBonusForCard(
      progression,
      "yuri",
      "yuri_derrape_expuesto",
      false
    ),
    0
  );
  assert.equal(
    window.ProgressionSystem.breakBonusForCard(
      progression,
      "yuri",
      "yuri_derrape_expuesto",
      true
    ),
    6
  );
});

test("reward UI wiring uses the active combat character for progression choices", async () => {
  const source = await readFile("intento_2/webapp/js/app.js", "utf8");
  assert.match(source, /optionsForCharacter\(characterId, save\?\.progression\)/);
  assert.match(
    source,
    /prepareAfterReward\(\s*claimed\.save,\s*claimed\.reward,\s*current\.combat\?\.characterId\s*\)/
  );
});
