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
      typeof window.DatabaseManager === "undefined"
      || typeof window.SchemaValidator === "undefined"
    ) {
      console.warn("[Bosozoku Storage] Módulos de almacenamiento no cargados.");
      return null;
    }

    const defaultData = typeof window.DefaultDatabase !== "undefined"
      ? window.DefaultDatabase
      : null;

    const result = window.DatabaseManager.init(defaultData);

    console.log(
      `[Bosozoku Storage] v${window.DatabaseManager.db.schemaVersion} | ` +
      `Waifus: ${window.DatabaseManager.db.waifus.length} | ` +
      `Cartas: ${window.DatabaseManager.db.cards.length} | ` +
      `Origen: ${result?.source || "desconocido"}`
    );

    return result;
  }

  const webApp = window.Telegram?.WebApp;

  // El almacenamiento se inicializa sin alterar el runtime de combate existente.
  initStorage();
  initTelegram(webApp);
})();
