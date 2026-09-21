(() => {
  "use strict";

  const MOCK_DELAY_MS = 0;

  function mockResponse(data) {
    return new Promise((resolve) => {
      window.setTimeout(() => resolve(data), MOCK_DELAY_MS);
    });
  }

  async function getCombatState() {
    return mockResponse({
      ok: true,
      dto: null
    });
  }

  async function sendCombatAction(_actionDto) {
    return mockResponse({
      ok: true,
      dto: null
    });
  }

  async function getPlayerState() {
    return mockResponse({
      ok: true,
      dto: null
    });
  }

  window.CariApi = Object.freeze({
    getCombatState,
    sendCombatAction,
    getPlayerState
  });
})();
