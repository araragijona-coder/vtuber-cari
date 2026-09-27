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
    window: { localStorage },
    JSON,
    Number,
    String,
    Object,
    Array,
    Date,
    Error,
    TypeError,
    Infinity,
    NaN
  });

  for (const path of [
    "intento_2/webapp/js/game/rewards.js",
    "intento_2/webapp/js/storage/save_manager.js"
  ]) {
    vm.runInContext(
      await readFile(path, "utf8"),
      context,
      { filename: path }
    );
  }

  return { context, storageData };
}

function battle(id, outcome) {
  return {
    player: { id: "player-test" },
    combat: {
      battleId: id,
      turn: 3,
      outcome,
      player: { hp: outcome === "DEFEAT" ? 0 : 60 },
      enemy: { hp: outcome === "VICTORY" ? 0 : 12 }
    }
  };
}

test("victory -> reward -> save -> next battle preserves progression", async () => {
  const { context } = await loadModules();
  const reward = context.window.RewardSystem.createReward({ battleId: "battle-1" });
  const claimed = context.window.RewardSystem.claimReward(
    context.window.SaveManager.load().save,
    reward,
    { battleId: "battle-1", outcome: "VICTORY" }
  );

  assert.equal(claimed.success, true);
  assert.equal(claimed.claimed, true);
  assert.equal(context.window.SaveManager.save(claimed.save).success, true);

  const saved = context.window.SaveManager.load().save;
  assert.equal(saved.player.xp, 100);
  assert.equal(saved.player.currency, 50);
  assert.equal(saved.player.wins, 1);
  assert.equal(saved.completedBattles.includes("battle-1"), true);

  const nextState = battle("battle-2", "VICTORY");
  const nextReward = context.window.RewardSystem.createReward({ battleId: nextState.combat.battleId });
  const nextClaim = context.window.RewardSystem.claimReward(
    saved,
    nextReward,
    { battleId: nextState.combat.battleId, outcome: nextState.combat.outcome }
  );
  assert.equal(nextClaim.save.player.xp, 200);
  assert.equal(nextClaim.save.player.currency, 100);
  assert.equal(nextClaim.save.player.wins, 2);
});

test("defeat -> save -> restart preserves progression and records loss once", async () => {
  const { context } = await loadModules();
  const state = battle("battle-loss", "DEFEAT");

  assert.equal(context.window.SaveManager.saveFromGameState(state, "DEFEAT").success, true);
  assert.equal(context.window.SaveManager.saveFromGameState(state, "DEFEAT").success, true);

  const saved = context.window.SaveManager.load().save;
  assert.equal(saved.player.xp, 0);
  assert.equal(saved.player.currency, 0);
  assert.equal(saved.player.wins, 0);
  assert.equal(saved.player.losses, 1);
  assert.equal(saved.lastBattle.battleId, "battle-loss");
  assert.equal(saved.lastBattle.outcome, "DEFEAT");
  assert.equal(saved.completedBattles.length, 0);
});