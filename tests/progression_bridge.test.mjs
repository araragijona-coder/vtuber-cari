import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

async function loadModules() {
  const storageData = new Map();
  const localStorage = {
    getItem(key) { return storageData.has(key) ? storageData.get(key) : null; },
    setItem(key, value) { storageData.set(key, String(value)); },
    removeItem(key) { storageData.delete(key); }
  };
  const context = vm.createContext({
    window: { localStorage }, JSON, Number, String, Object, Array, Date, Error, TypeError, Infinity, NaN
  });
  for (const path of ["intento_2/webapp/js/progression.js", "intento_2/webapp/js/storage/save_manager.js"]) {
    vm.runInContext(await readFile(path, "utf8"), context, { filename: path });
  }
  return context;
}

function victorySave(manager) {
  const save = manager.createDefaultSave("player-test");
  save.player.xp = 100; save.player.currency = 50; save.player.level = 2; save.player.wins = 1;
  save.completedBattles.push("battle-1");
  save.rewardLedger.push({ rewardId: "reward-battle-1", battleId: "battle-1", xp: 100, currency: 50 });
  save.lastBattle = { battleId: "battle-1", outcome: "VICTORY" };
  return save;
}

test("progression starts empty and exposes exactly two valid choices", async () => {
  const context = await loadModules();
  const save = context.window.SaveManager.createDefaultSave();
  assert.deepEqual(save.progression, {});
  const options = context.window.ProgressionSystem.options();
  assert.equal(options.length, 2);
  assert.ok(options.every((option) => option.effect === "card_damage"));
});

test("reward creates a pending progression decision in the existing save", async () => {
  const context = await loadModules();
  const save = victorySave(context.window.SaveManager);
  const prepared = context.window.ProgressionSystem.prepareAfterReward(save, save.rewardLedger[0]);
  assert.equal(prepared.progression.pendingDecision.battleId, "battle-1");
  assert.deepEqual(prepared.progression.cardDamageBonuses, {});
});

test("selected progression persists through save and reload", async () => {
  const context = await loadModules();
  const save = victorySave(context.window.SaveManager);
  const prepared = context.window.ProgressionSystem.prepareAfterReward(save, save.rewardLedger[0]);
  const result = context.window.ProgressionSystem.applyChoice(prepared, "upgrade_disparo_neon");
  assert.equal(result.success, true);
  assert.equal(result.save.progression.cardDamageBonuses.disparo_neon, 5);
  assert.equal(result.save.progression.pendingDecision, null);
  assert.equal(result.save.progression.nextObjective.type, "NEXT_BATTLE");
  assert.equal(context.window.SaveManager.save(result.save).success, true);
  const reloaded = context.window.SaveManager.load().save;
  assert.equal(reloaded.progression.cardDamageBonuses.disparo_neon, 5);
  assert.equal(reloaded.progression.nextObjective.type, "NEXT_BATTLE");
});

test("new combat can read the persisted card bonus dimension", async () => {
  const context = await loadModules();
  const progression = context.window.ProgressionSystem.createDefaultProgression();
  progression.cardDamageBonuses.embestida_nitro = 10;
  assert.equal(context.window.ProgressionSystem.bonusForCard(progression, "embestida_nitro"), 10);
  assert.equal(context.window.ProgressionSystem.bonusForCard(progression, "escudo_dark"), 0);
});

test("invalid choice cannot mutate progression", async () => {
  const context = await loadModules();
  const save = victorySave(context.window.SaveManager);
  const prepared = context.window.ProgressionSystem.prepareAfterReward(save, save.rewardLedger[0]);
  const result = context.window.ProgressionSystem.applyChoice(prepared, "not-a-real-choice");
  assert.equal(result.success, false);
  assert.equal(result.error, "INVALID_PROGRESSION_CHOICE");
  assert.deepEqual(prepared.progression.cardDamageBonuses, {});
});
