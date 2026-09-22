(() => {
  "use strict";

  function network() {
    if (!window.CariNetwork) {
      throw new Error("CariNetwork bridge is not loaded");
    }
    return window.CariNetwork;
  }

  async function getCombatState() {
    throw new Error(
      "getCombatState is not exposed by the current backend contract; use serverState from a combat action response"
    );
  }

  async function sendCombatAction(actionDto, options = {}) {
    return network().sendCombatAction(actionDto, options);
  }

  async function getPlayerState() {
    throw new Error(
      "getPlayerState is not exposed by the current backend contract"
    );
  }

  window.CariApi = Object.freeze({
    getCombatState,
    sendCombatAction,
    getPlayerState
  });
})();
