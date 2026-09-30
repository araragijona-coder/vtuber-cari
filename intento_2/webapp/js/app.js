(() => {
  "use strict";

  function initTelegram(webApp) {
    if (!webApp) {
      console.warn("Telegram WebApp API is unavailable; running in local preview mode.");
      return;
    }

    try {
      webApp.ready();
      webApp.expand();

      if (typeof webApp.disableVerticalSwipes === "function") {
        webApp.disableVerticalSwipes();
      }
    } catch (error) {
      console.warn("Telegram WebApp initialization warning:", error);
    }
  }

  function initStorage() {
    if (
      typeof window.DatabaseManager === "undefined" ||
      typeof window.SchemaValidator === "undefined"
    ) {
      console.warn("[Bosozoku Storage] Módulos de almacenamiento no cargados.");
      return null;
    }

    const defaultData = typeof window.DefaultDatabase !== "undefined"
      ? window.DefaultDatabase
      : null;

    const result = window.DatabaseManager.init(defaultData);

    console.log(
      "[Bosozoku Storage] v" + window.DatabaseManager.db.schemaVersion +
      " | Waifus: " + window.DatabaseManager.db.waifus.length +
      " | Cartas: " + window.DatabaseManager.db.cards.length +
      " | Origen: " + (result?.source || "desconocido")
    );

    return result;
  }

  function syncPlayerFromSave(save, gameState) {
    gameState.player.id = save.player.id;
    gameState.player.level = save.player.level;
    gameState.player.xp = save.player.xp;
    gameState.player.currency = save.player.currency;
    gameState.player.wins = save.player.wins;
    gameState.player.losses = save.player.losses;
  }

  function initPlayerSave() {
    if (
      typeof window.SaveManager === "undefined" ||
      typeof window.RewardSystem === "undefined" ||
      typeof window.CariCombat === "undefined"
    ) {
      console.warn("[Player Save] Módulos de progresión no disponibles.");
      return;
    }

    const gameState = window.CariCombat.getGameState();
    const loaded = window.SaveManager.load();
    syncPlayerFromSave(loaded.save, gameState);

    const rewardPanel = document.getElementById("reward-panel");
    const rewardXpEl = document.getElementById("reward-xp");
    const rewardCurrencyEl = document.getElementById("reward-currency");
    const nextBattleButton = document.getElementById("next-battle");

    function hideReward() {
      if (rewardPanel) rewardPanel.hidden = true;
    }

    function showReward(reward) {
      if (!rewardPanel) return;
      rewardPanel.hidden = false;
      if (rewardXpEl) rewardXpEl.textContent = String(reward.xp);
      if (rewardCurrencyEl) rewardCurrencyEl.textContent = String(reward.currency);
    }

    nextBattleButton?.addEventListener("click", () => {
      hideReward();
      window.CariCombat.nextBattle();
    });

    let lastOutcome = gameState.combat?.outcome || null;

    if (loaded.reason && loaded.source === "defaults") {
      console.info("[Player Save] Recuperando defaults:", loaded.reason);
    }

    window.setInterval(() => {
      const current = window.CariCombat.getGameState();
      const outcome = current.combat?.outcome || null;

      if (outcome === window.GameState.OUTCOME.VICTORY && outcome !== lastOutcome) {
        const reward = window.RewardSystem.createReward({
          battleId: current.combat.battleId
        });
        const claimed = window.RewardSystem.claimReward(
          window.SaveManager.load().save,
          reward,
          {
            battleId: current.combat.battleId,
            outcome
          }
        );

        if (!claimed.success) {
          console.error("[Reward] No se pudo reclamar:", claimed.error);
        } else {
          const saved = window.SaveManager.save(claimed.save);
          if (!saved.success) {
            console.error("[Player Save] No se pudo guardar la recompensa:", saved.error);
          } else {
            syncPlayerFromSave(saved.save, current);
            showReward(claimed.reward);
            window.RocketBunnyTelemetry?.rewardReceived(claimed.reward, {
              combat_id: current.combat.battleId
            });
          }
        }
      } else if (outcome === window.GameState.OUTCOME.DEFEAT && outcome !== lastOutcome) {
        const saved = window.SaveManager.saveFromGameState(current, outcome);
        if (!saved.success) {
          console.error("[Player Save] No se pudo guardar la derrota:", saved.error);
        } else {
          syncPlayerFromSave(saved.save, current);
        }
        hideReward();
      } else if (outcome === window.GameState.OUTCOME.IN_PROGRESS) {
        hideReward();
      }

      lastOutcome = outcome;
    }, 100);
  }

  const webApp = window.Telegram?.WebApp;
  initStorage();
  initPlayerSave();
  initTelegram(webApp);
})();