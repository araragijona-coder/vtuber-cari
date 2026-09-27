(() => {
  "use strict";

  const REWARD_XP = 100;
  const REWARD_CURRENCY = 50;
  const XP_PER_LEVEL = 100;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function createReward({ battleId, xp = REWARD_XP, currency = REWARD_CURRENCY } = {}) {
    const safeBattleId = String(battleId || "").trim();
    if (!safeBattleId) throw new Error("battleId requerido.");

    const safeXp = Number(xp);
    const safeCurrency = Number(currency);

    if (!Number.isInteger(safeXp) || safeXp < 0) throw new Error("xp de recompensa inválido.");
    if (!Number.isInteger(safeCurrency) || safeCurrency < 0) throw new Error("currency de recompensa inválida.");

    return Object.freeze({
      rewardId: "reward-" + safeBattleId,
      battleId: safeBattleId,
      xp: safeXp,
      currency: safeCurrency
    });
  }

  function levelForXp(xp) {
    return Math.max(1, Math.floor(Math.max(0, Number(xp) || 0) / XP_PER_LEVEL) + 1);
  }

  function findReward(save, rewardId) {
    return Array.isArray(save?.rewardLedger)
      ? save.rewardLedger.find((entry) => entry && entry.rewardId === rewardId) || null
      : null;
  }

  function claimReward(save, reward, battle = {}) {
    if (!save || typeof save !== "object" || !save.player) {
      return { success: false, claimed: false, error: "SaveState inválido." };
    }
    if (!reward || typeof reward !== "object") {
      return { success: false, claimed: false, error: "Reward inválido." };
    }
    if (battle.outcome !== "VICTORY") {
      return { success: false, claimed: false, error: "Solo VICTORY puede reclamar recompensa." };
    }

    const battleId = String(reward.battleId);
    if (battleId !== String(battle.battleId || "")) {
      return { success: false, claimed: false, error: "battleId no coincide." };
    }

    const existing = findReward(save, reward.rewardId);
    const alreadyCompleted = Array.isArray(save.completedBattles) &&
      save.completedBattles.includes(battleId);

    if (existing || alreadyCompleted) {
      return {
        success: true,
        claimed: false,
        reward: existing || reward,
        save: clone(save),
        reason: "already_claimed"
      };
    }

    const next = clone(save);
    next.player.xp += reward.xp;
    next.player.currency += reward.currency;
    next.player.level = levelForXp(next.player.xp);
    next.player.wins += 1;

    if (!Array.isArray(next.rewardLedger)) next.rewardLedger = [];
    if (!Array.isArray(next.completedBattles)) next.completedBattles = [];

    next.rewardLedger.push(clone(reward));
    next.completedBattles.push(battleId);
    next.lastBattle = {
      battleId,
      outcome: "VICTORY",
      completedAt: new Date().toISOString()
    };

    return {
      success: true,
      claimed: true,
      reward: clone(reward),
      save: next,
      reason: "claimed"
    };
  }

  window.RewardSystem = Object.freeze({
    REWARD_XP,
    REWARD_CURRENCY,
    XP_PER_LEVEL,
    createReward,
    levelForXp,
    claimReward
  });
})();