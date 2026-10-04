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
    gameState.progression = window.ProgressionSystem?.normalizeProgression(save.progression) || {};
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
    const progressionOptionsEl = document.getElementById("progression-options");
    const progressionChangeEl = document.getElementById("progression-change");
    const progressionConfirmButton = document.getElementById("progression-confirm");
    const nextObjectiveEl = document.getElementById("next-objective");
    const nextBattleButton = document.getElementById("next-battle");
    let selectedChoiceId = null;

    function hideReward() {
      if (rewardPanel) rewardPanel.hidden = true;
      selectedChoiceId = null;
    }

    function renderProgressionChoices(save) {
      if (!progressionOptionsEl || !window.ProgressionSystem) return;
      progressionOptionsEl.replaceChildren();
      selectedChoiceId = null;
      if (progressionConfirmButton) {
        progressionConfirmButton.hidden = false;
        progressionConfirmButton.disabled = true;
      }
      if (progressionChangeEl) progressionChangeEl.textContent = "Elegí una mejora para tu próximo combate.";
      const characterId = save?.progression?.pendingDecision?.characterId || null;
      for (const option of window.ProgressionSystem.optionsForCharacter(characterId, save?.progression)) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "progression-choice";
        button.dataset.choiceId = option.id;
        button.innerHTML = "<strong>" + option.label + "</strong><small>" + option.description + "</small>";
        button.addEventListener("click", () => {
          selectedChoiceId = option.id;
          for (const sibling of progressionOptionsEl.querySelectorAll("button")) sibling.setAttribute("aria-pressed", String(sibling === button));
          const valueLabel = option.effect === "break_payoff"
            ? "+" + option.value + " BREAK"
            : "+" + option.value + " damage";
          if (progressionChangeEl) {
            progressionChangeEl.textContent =
              option.description + " [TEST-ONLY / PROVISIONAL: " + valueLabel + "].";
          }
          if (progressionConfirmButton) progressionConfirmButton.disabled = false;
          window.RocketBunnyTelemetry?.progressionSelected(option, { combat_id: save?.progression?.pendingDecision?.battleId ?? null });
        });
        button.setAttribute("aria-pressed", "false");
        progressionOptionsEl.appendChild(button);
      }
    }

    function showProgression(save, reward) {
      if (!rewardPanel || !window.ProgressionSystem) return;
      rewardPanel.hidden = false;
      if (rewardXpEl) rewardXpEl.textContent = String(reward?.xp ?? 0);
      if (rewardCurrencyEl) rewardCurrencyEl.textContent = String(reward?.currency ?? 0);
      if (nextObjectiveEl) nextObjectiveEl.hidden = true;
      if (nextBattleButton) nextBattleButton.hidden = true;
      renderProgressionChoices(save);
      window.RocketBunnyTelemetry?.progressionViewed({ battle_id: save?.progression?.pendingDecision?.battleId ?? reward?.battleId ?? null });
    }

    function showNextObjective(save) {
      if (!rewardPanel || !window.ProgressionSystem) return;
      rewardPanel.hidden = false;
      if (progressionOptionsEl) progressionOptionsEl.replaceChildren();
      if (progressionConfirmButton) progressionConfirmButton.hidden = true;
      if (progressionChangeEl) {
        const choice = save?.progression?.lastChoice;
        if (choice?.effect === "break_payoff") {
          progressionChangeEl.textContent =
            "PROGRESSION SELECTED · DERRAPE YURI + EXPOSED → +" + choice.value + " BREAK · TEST-ONLY / PROVISIONAL.";
        } else {
          progressionChangeEl.textContent =
            choice ? "PROGRESSION SELECTED · " + choice.cardId + " +" + choice.value + " damage." : "PROGRESSION SELECTED";
        }
      }
      if (nextObjectiveEl) nextObjectiveEl.hidden = false;
      if (nextBattleButton) nextBattleButton.hidden = false;
      window.RocketBunnyTelemetry?.nextObjectiveViewed({ objective: "NEXT_BATTLE", battle_id: save?.lastBattle?.battleId ?? null });
    }

    progressionConfirmButton?.addEventListener("click", () => {
      if (!selectedChoiceId) return;
      const currentSave = window.SaveManager.load().save;
      const result = window.ProgressionSystem.applyChoice(currentSave, selectedChoiceId);
      if (!result.success) {
        if (progressionChangeEl) progressionChangeEl.textContent = "No se pudo guardar la elección · " + result.error;
        return;
      }
      const saved = window.SaveManager.save(result.save);
      if (!saved.success) {
        if (progressionChangeEl) progressionChangeEl.textContent = "No se pudo guardar la progresión · " + saved.error;
        return;
      }
      syncPlayerFromSave(saved.save, window.CariCombat.getGameState());
      window.RocketBunnyTelemetry?.progressionSaved(result.option, { combat_id: result.save.progression.lastChoice?.battleId ?? null });
      showNextObjective(saved.save);
    });

    nextBattleButton?.addEventListener("click", () => {
      hideReward();
      window.CariCombat.nextBattle();
    });

    let lastOutcome = gameState.combat?.outcome || null;

    if (loaded.reason && loaded.source === "defaults") {
      console.info("[Player Save] Recuperando defaults:", loaded.reason);
    }

    const pending = window.ProgressionSystem?.pendingDecision(loaded.save);
    if (pending) {
      const pendingReward = window.ProgressionSystem.findReward(loaded.save, pending.battleId);
      if (pendingReward) showProgression(loaded.save, pendingReward);
    } else if (loaded.save?.progression?.nextObjective) {
      showNextObjective(loaded.save);
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
          const progressionReady = window.ProgressionSystem.prepareAfterReward(
            claimed.save,
            claimed.reward,
            current.combat?.characterId
          );
          const saved = window.SaveManager.save(progressionReady);
          if (!saved.success) {
            console.error("[Player Save] No se pudo guardar recompensa + progresión:", saved.error);
          } else {
            syncPlayerFromSave(saved.save, current);
            if (saved.save.progression?.pendingDecision) {
              showProgression(saved.save, claimed.reward);
            } else {
              showNextObjective(saved.save);
            }
            window.RocketBunnyTelemetry?.rewardReceived(claimed.reward, { combat_id: current.combat.battleId });
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