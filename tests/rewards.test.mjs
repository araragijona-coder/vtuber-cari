import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

async function loadRewardSystem() {
  const context = vm.createContext({
    window: {},
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
  vm.runInContext(
    await readFile("intento_2/webapp/js/game/rewards.js", "utf8"),
    context,
    { filename: "rewards.js" }
  );
  return context.window.RewardSystem;
}

function baseSave() {
  return {
    saveVersion: 1,
    player: { id: "player-test", level: 1, xp: 0, currency: 0, wins: 0, losses: 0 },
    progression: {},
    lastBattle: null,
    completedBattles: [],
    rewardLedger: []
  };
}

test("victory generates a real reward with rewardId and battleId", async () => {
  const rewards = await loadRewardSystem();
  const reward = rewards.createReward({ battleId: "battle-1" });

  assert.equal(reward.rewardId, "reward-battle-1");
  assert.equal(reward.battleId, "battle-1");
  assert.equal(reward.xp, 100);
  assert.equal(reward.currency, 50);
});

test("defeat cannot claim a reward", async () => {
  const rewards = await loadRewardSystem();
  const result = rewards.claimReward(
    baseSave(),
    rewards.createReward({ battleId: "battle-2" }),
    { battleId: "battle-2", outcome: "DEFEAT" }
  );

  assert.equal(result.success, false);
  assert.equal(result.claimed, false);
});

test("claiming twice does not duplicate XP, currency or ledger", async () => {
  const rewards = await loadRewardSystem();
  const reward = rewards.createReward({ battleId: "battle-3" });
  const first = rewards.claimReward(baseSave(), reward, { battleId: "battle-3", outcome: "VICTORY" });
  const second = rewards.claimReward(first.save, reward, { battleId: "battle-3", outcome: "VICTORY" });

  assert.equal(first.claimed, true);
  assert.equal(second.claimed, false);
  assert.equal(second.save.player.xp, 100);
  assert.equal(second.save.player.currency, 50);
  assert.equal(second.save.player.wins, 1);
  assert.equal(second.save.rewardLedger.length, 1);
  assert.deepEqual(second.save.completedBattles, ["battle-3"]);
});

test("XP threshold increases level", async () => {
  const rewards = await loadRewardSystem();
  const save = baseSave();
  save.player.xp = 99;
  save.player.level = 1;

  const result = rewards.claimReward(
    save,
    rewards.createReward({ battleId: "battle-4" }),
    { battleId: "battle-4", outcome: "VICTORY" }
  );

  assert.equal(result.save.player.xp, 199);
  assert.equal(result.save.player.level, 2);
});

test("existing XP progresses to the corresponding level", async () => {
  const rewards = await loadRewardSystem();
  const save = baseSave();
  save.player.xp = 200;
  save.player.level = 3;

  const result = rewards.claimReward(
    save,
    rewards.createReward({ battleId: "battle-5" }),
    { battleId: "battle-5", outcome: "VICTORY" }
  );

  assert.equal(result.save.player.xp, 300);
  assert.equal(result.save.player.level, 4);
});