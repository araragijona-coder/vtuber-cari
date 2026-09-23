(() => {
  "use strict";

  const webApp = window.Telegram?.WebApp;

  if (!webApp) {
    console.warn("Telegram WebApp API is unavailable; running in local preview mode.");
    return;
  }

  webApp.ready();
  webApp.expand();

  if (typeof webApp.disableVerticalSwipes === "function") {
    webApp.disableVerticalSwipes();
  }
})();
