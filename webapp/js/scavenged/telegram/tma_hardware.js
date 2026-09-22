(() => {
  "use strict";

  const OUTCOME = Object.freeze({
    VICTORY: "VICTORY",
    DEFEAT: "DEFEAT"
  });

  const state = {
    combat: null,
    mainButton: null,
    mainButtonHandler: null,
    outcome: null,
    unsubscribers: new Set(),
    initialized: false
  };

  const config = {
    onVictory: null,
    onDefeat: null
  };

  function getWebApp() {
    return window.Telegram?.WebApp || null;
  }

  function getHapticFeedback() {
    const haptic = getWebApp()?.HapticFeedback;
    return haptic &&
      typeof haptic.impactOccurred === "function" &&
      typeof haptic.notificationOccurred === "function"
      ? haptic
      : null;
  }

  function triggerImpact(style) {
    try {
      getHapticFeedback()?.impactOccurred?.(style);
    } catch (_error) {
      // Telegram hardware APIs are optional in browser/local-preview mode.
    }
  }

  function triggerNotification(type) {
    try {
      getHapticFeedback()?.notificationOccurred?.(type);
    } catch (_error) {
      // Telegram hardware APIs are optional in browser/local-preview mode.
    }
  }

  function subscribeEvent(combat, eventName, handler) {
    if (!combat) return false;

    const wrapped = (...args) => {
      const first = args[0];
      const payload = first instanceof Event
        ? (first.detail ?? {})
        : (first && typeof first === "object" ? first : first ?? {});
      handler(payload);
    };

    if (typeof combat.on === "function") {
      const result = combat.on(eventName, wrapped);
      state.unsubscribers.add(() => {
        try {
          if (typeof combat.off === "function") {
            combat.off(eventName, wrapped);
          } else {
            combat.removeListener?.(eventName, wrapped);
          }
        } catch (_error) {
          // Best-effort cleanup.
        }
      });
      return result !== false;
    }

    if (typeof combat.addEventListener === "function") {
      combat.addEventListener(eventName, wrapped);
      state.unsubscribers.add(() => {
        try {
          combat.removeEventListener?.(eventName, wrapped);
        } catch (_error) {
          // Best-effort cleanup.
        }
      });
      return true;
    }

    return false;
  }

  function bindHapticEvents() {
    const combat = state.combat;
    if (!combat) return;

    subscribeEvent(combat, "damage_taken", () => {
      triggerImpact("medium");
    });

    subscribeEvent(combat, "critical_hit", () => {
      triggerImpact("heavy");
      triggerNotification("warning");
    });

    subscribeEvent(combat, "correction", () => {
      triggerNotification("error");
    });
  }

  function normalizeOutcome(value) {
    if (typeof value === "string") {
      return value.trim().toUpperCase();
    }

    if (!value || typeof value !== "object") {
      return "";
    }

    return normalizeOutcome(
      value.state ??
      value.status ??
      value.outcome ??
      value.event ??
      value.name ??
      value.to ??
      value.nextState ??
      value.next_state
    );
  }

  function outcomeFromDetail(detail, fallback) {
    const direct = normalizeOutcome(detail);
    if (direct === OUTCOME.VICTORY || direct === OUTCOME.DEFEAT) {
      return direct;
    }

    const nested = normalizeOutcome(detail?.state);
    if (nested === OUTCOME.VICTORY || nested === OUTCOME.DEFEAT) {
      return nested;
    }

    return fallback;
  }

  function dispatchOutcomeEvent(outcome) {
    try {
      window.dispatchEvent(new CustomEvent("cari:combat-outcome", {
        detail: {
          outcome,
          destination: outcome === OUTCOME.VICTORY ? "map" : "base"
        }
      }));
    } catch (_error) {
      // CustomEvent is not required for the core Telegram integration.
    }
  }

  function transitionAfterOutcome(outcome) {
    const destination = outcome === OUTCOME.VICTORY ? "map" : "base";
    const callback = outcome === OUTCOME.VICTORY
      ? config.onVictory
      : config.onDefeat;

    dispatchOutcomeEvent(outcome);

    try {
      if (typeof callback === "function") {
        callback({ outcome, destination });
        return;
      }

      const navigation = window.CariNavigation;
      if (navigation && typeof navigation.go === "function") {
        navigation.go(destination);
        return;
      }

      const app = window.CariApp;
      if (app && typeof app.navigateTo === "function") {
        app.navigateTo(destination);
      }
    } catch (error) {
      console.warn("[CariTmaHardware] Outcome transition failed:", error);
    }
  }

  function configureMainButton(outcome) {
    const webApp = getWebApp();
    const button = webApp?.MainButton || webApp?.BottomButton || null;

    if (!button ||
        typeof button.show !== "function" ||
        typeof button.onClick !== "function") {
      return false;
    }

    if (state.mainButton &&
        state.mainButtonHandler &&
        typeof state.mainButton.offClick === "function") {
      try {
        state.mainButton.offClick(state.mainButtonHandler);
      } catch (_error) {
        // Best-effort cleanup.
      }
    }

    const isVictory = outcome === OUTCOME.VICTORY;
    const params = {
      text: isVictory ? "RECOGER BOTÍN" : "REVIVIR EN BASE",
      color: isVictory ? "#39ff14" : "#ff1a1a",
      text_color: isVictory ? "#061006" : "#ffffff",
      is_active: true,
      has_shine_effect: true
    };

    try {
      if (typeof button.setParams === "function") {
        button.setParams(params);
      } else if (typeof button.setText === "function") {
        button.setText(params.text);
      }

      state.mainButton = button;
      state.mainButtonHandler = () => {
        transitionAfterOutcome(outcome);
        try {
          button.hide?.();
        } catch (_error) {
          // Best-effort cleanup.
        }
      };

      button.onClick(state.mainButtonHandler);
      button.show();
      state.outcome = outcome;
      return true;
    } catch (_error) {
      return false;
    }
  }

  function handleVictory(detail) {
    if (outcomeFromDetail(detail, OUTCOME.VICTORY) !== OUTCOME.VICTORY) return;
    configureMainButton(OUTCOME.VICTORY);
  }

  function handleDefeat(detail) {
    if (outcomeFromDetail(detail, OUTCOME.DEFEAT) !== OUTCOME.DEFEAT) return;
    configureMainButton(OUTCOME.DEFEAT);
  }

  function handleStateChange(detail) {
    const outcome = outcomeFromDetail(detail, "");
    if (outcome === OUTCOME.VICTORY) {
      handleVictory(detail);
    } else if (outcome === OUTCOME.DEFEAT) {
      handleDefeat(detail);
    }
  }

  function bindOutcomeEvents() {
    const combat = state.combat;
    if (!combat) return;

    subscribeEvent(combat, "VICTORY", handleVictory);
    subscribeEvent(combat, "DEFEAT", handleDefeat);
    subscribeEvent(combat, "victory", handleVictory);
    subscribeEvent(combat, "defeat", handleDefeat);

    subscribeEvent(combat, "state_change", handleStateChange);
    subscribeEvent(combat, "state_changed", handleStateChange);
    subscribeEvent(combat, "stateChanged", handleStateChange);
    subscribeEvent(combat, "state", handleStateChange);
    subscribeEvent(combat, "transition", handleStateChange);
  }

  function bindEvents() {
    state.unsubscribers.forEach((unsubscribe) => {
      try {
        unsubscribe();
      } catch (_error) {
        // Best-effort cleanup.
      }
    });
    state.unsubscribers.clear();

    bindHapticEvents();
    bindOutcomeEvents();
  }

  function setCombat(combat) {
    state.combat = combat || null;
    bindEvents();
    return state.combat;
  }

  function configure(options = {}) {
    if (typeof options.onVictory === "function") {
      config.onVictory = options.onVictory;
    } else if (options.onVictory === null) {
      config.onVictory = null;
    }

    if (typeof options.onDefeat === "function") {
      config.onDefeat = options.onDefeat;
    } else if (options.onDefeat === null) {
      config.onDefeat = null;
    }

    if (options.combat) {
      setCombat(options.combat);
    } else if (!state.combat) {
      const controllerCombat = window.CariCombatUI?.getState?.().combat;
      setCombat(
        controllerCombat ||
        window.combat ||
        window.CombatStateMachine?.instance ||
        null
      );
    }

    state.initialized = true;
    return api;
  }

  function getState() {
    return {
      combat: state.combat,
      outcome: state.outcome,
      initialized: state.initialized,
      telegramAvailable: Boolean(getWebApp()),
      hapticsAvailable: Boolean(getHapticFeedback()),
      mainButtonAvailable: Boolean(
        getWebApp()?.MainButton || getWebApp()?.BottomButton
      )
    };
  }

  const api = Object.freeze({
    configure,
    setCombat,
    getState,
    triggerImpact,
    triggerNotification
  });

  window.CariTmaHardware = api;

  function autoInit() {
    configure();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoInit, { once: true });
  } else {
    autoInit();
  }
})();