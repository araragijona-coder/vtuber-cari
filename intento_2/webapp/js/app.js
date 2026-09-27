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

  function initPlayerSave() {
    if (typeof window.SaveManager === "undefined" || typeof window.CariCombat === "undefined") {
      console.warn("[Player Save] SaveManager o CariCombat no está disponible.");
      return;
    }

    const gameState = window.CariCombat.getGameState();
    const loaded = window.SaveManager.load();

    gameState.player.id = loaded.save.player.id;
    gameState.player.level = loaded.save.player.level;
    gameState.player.xp = loaded.save.player.xp;
    gameState.player.currency = loaded.save.player.currency;
    gameState.player.wins = loaded.save.player.wins;
    gameState.player.losses = loaded.save.player.losses;

    let lastOutcome = gameState.combat?.outcome || null;

    if (loaded.reason && loaded.source === "defaults") {
      console.info("[Player Save] Recuperando defaults:", loaded.reason);
    }

    window.setInterval(() => {
      const current = window.CariCombat.getGameState();
      const outcome = current.combat?.outcome || null;

      if (outcome && outcome !== lastOutcome) {
        if (outcome === window.GameState.OUTCOME.VICTORY ||
            outcome === window.GameState.OUTCOME.DEFEAT) {
          const result = window.SaveManager.saveFromGameState(current, outcome);
          if (!result.success) {
            console.error("[Player Save] No se pudo guardar el resultado:", result.error);
          }
        }
      }

      lastOutcome = outcome;
    }, 100);
  }

  const webApp = window.Telegram?.WebApp;
  initStorage();
  initPlayerSave();
  initTelegram(webApp);
})();