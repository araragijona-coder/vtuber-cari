(() => {
  "use strict";

  const DEFAULT_HEADER_COLOR = "#0f0f13";
  const OUTCOMES = Object.freeze({
    VICTORY: "VICTORY",
    DEFEAT: "DEFEAT"
  });

  const SELECTORS = Object.freeze({
    coins: [
      "[data-profile-coins]",
      "#player-coins",
      "#coins",
      ".player-coins"
    ].join(","),
    xp: [
      "[data-profile-xp]",
      "#player-xp",
      "#xp",
      ".player-xp"
    ].join(","),
    streak: [
      "[data-profile-streak]",
      "#player-streak",
      "#daily-streak",
      ".player-streak"
    ].join(","),
    level: [
      "[data-profile-level]",
      "#player-level",
      "#level",
      ".player-level"
    ].join(",")
  });

  const state = {
    telegram: null,
    localDevelopment: false,
    profile: null,
    lastCombatResponse: null,
    processedResultKeys: new Set(),
    processingResultKeys: new Set(),
    initialized: false,
    busy: false
  };

  function isObject(value) {
    return value !== null &&
      typeof value === "object" &&
      !Array.isArray(value);
  }

  function finiteNonNegativeInteger(value, fallback = 0) {
    return Number.isInteger(value) && value >= 0 ? value : fallback;
  }

  function stringOrNull(value) {
    if (typeof value !== "string") return null;
    const normalized = value.trim();
    return normalized || null;
  }

  function clone(value) {
    try {
      return structuredClone(value);
    } catch (_error) {
      return JSON.parse(JSON.stringify(value));
    }
  }

  function getWebApp() {
    return window.Telegram?.WebApp || null;
  }

  function normalizeOutcome(value) {
    if (typeof value === "string") {
      const normalized = value.trim().toUpperCase();
      return normalized === OUTCOMES.VICTORY || normalized === OUTCOMES.DEFEAT
        ? normalized
        : "";
    }

    if (!isObject(value)) return "";

    return normalizeOutcome(
      value.outcome ??
      value.state ??
      value.status ??
      value.event ??
      value.name ??
      value.to ??
      value.nextState ??
      value.next_state ??
      value.result
    );
  }

  function normalizeProfile(raw) {
    const source = isObject(raw) ? clone(raw) : {};

    return {
      ...source,
      xp: finiteNonNegativeInteger(source.xp, 0),
      coins: finiteNonNegativeInteger(source.coins, 0),
      dailyStreak: finiteNonNegativeInteger(
        source.dailyStreak,
        finiteNonNegativeInteger(source.daily_streak, 0)
      ),
      level: finiteNonNegativeInteger(source.level, 1) || 1,
      loot: Array.isArray(source.loot) ? source.loot : []
    };
  }

  function createTemporaryProfile() {
    return {
      xp: 0,
      coins: 100,
      dailyStreak: 0,
      level: 1,
      loot: [],
      temporary: true
    };
  }

  function injectStyles() {
    if (document.getElementById("cari-app-bootstrap-styles")) return;

    const style = document.createElement("style");
    style.id = "cari-app-bootstrap-styles";
    style.textContent = [
      ".cari-profile-pulse{animation:cari-profile-pulse .28s ease-out}",
      "@keyframes cari-profile-pulse{0%{transform:scale(1);filter:brightness(1)}45%{transform:scale(1.12);filter:brightness(1.55)}100%{transform:scale(1);filter:brightness(1)}}"
    ].join("");
    document.head.appendChild(style);
  }

  function animateProfileSelectors(selectors) {
    document.querySelectorAll(selectors).forEach((element) => {
      element.classList.remove("cari-profile-pulse");
      void element.offsetWidth;
      element.classList.add("cari-profile-pulse");
      window.setTimeout(
        () => element.classList.remove("cari-profile-pulse"),
        320
      );
    });
  }

  function writeProfileValue(selectors, value) {
    document.querySelectorAll(selectors).forEach((element) => {
      element.textContent = String(value);
    });
  }

  function syncProfileToDom(profile, animate = false) {
    if (!isObject(profile)) return;

    writeProfileValue(SELECTORS.coins, profile.coins);
    writeProfileValue(SELECTORS.xp, profile.xp);
    writeProfileValue(SELECTORS.streak, profile.dailyStreak);
    writeProfileValue(SELECTORS.level, profile.level);

    if (animate) {
      animateProfileSelectors(
        [
          SELECTORS.coins,
          SELECTORS.xp,
          SELECTORS.streak,
          SELECTORS.level
        ].join(",")
      );
    }
  }

  function dispatchProfileUpdated(reason, rewards = null) {
    try {
      window.dispatchEvent(new CustomEvent("cari:profile-updated", {
        detail: {
          profile: clone(state.profile),
          rewards: rewards ? clone(rewards) : null,
          reason
        }
      }));
    } catch (_error) {
      // DOM event dispatch is optional for standalone previews.
    }
  }

  function safeTelegramInit() {
    const webApp = getWebApp();
    state.telegram = webApp;

    if (!webApp) {
      state.localDevelopment = true;
      console.warn(
        "[CariBootstrap] Telegram.WebApp unavailable; running local development mode."
      );
      return;
    }

    state.localDevelopment = !stringOrNull(webApp.initData);

    try {
      webApp.ready?.();
    } catch (error) {
      console.warn("[CariBootstrap] Telegram ready() failed:", error);
    }

    try {
      webApp.expand?.();
    } catch (error) {
      console.warn("[CariBootstrap] Telegram expand() failed:", error);
    }

    try {
      webApp.setHeaderColor?.(DEFAULT_HEADER_COLOR);
    } catch (error) {
      console.warn("[CariBootstrap] setHeaderColor() failed:", error);
    }

    try {
      webApp.enableClosingConfirmation?.();
    } catch (error) {
      console.warn(
        "[CariBootstrap] enableClosingConfirmation() failed:",
        error
      );
    }

    if (state.localDevelopment) {
      console.warn(
        "[CariBootstrap] Telegram initData is empty; using a temporary local test profile."
      );
    }
  }

  async function loadInitialProfile() {
    const manager = window.CariSaveManager;

    try {
      const loaded = await manager?.loadProfile?.();
      if (isObject(loaded)) {
        state.profile = normalizeProfile(loaded);
        syncProfileToDom(state.profile);
        dispatchProfileUpdated("load");
        return state.profile;
      }
    } catch (error) {
      console.warn("[CariBootstrap] Profile load failed:", error);
    }

    state.profile = state.localDevelopment
      ? createTemporaryProfile()
      : normalizeProfile(null);

    syncProfileToDom(state.profile);
    dispatchProfileUpdated("default");
    return state.profile;
  }

  function getResponseFromDetail(detail) {
    if (!isObject(detail)) return null;

    return (
      (isObject(detail.response) && detail.response) ||
      (isObject(detail.result) && detail.result) ||
      (isObject(detail.backendResponse) && detail.backendResponse) ||
      (isObject(detail.data) && detail.data) ||
      (isObject(detail.resolution) && detail.resolution.outcome ? detail : null)
    );
  }

  function resultKey(response, detail, outcome) {
    const combatId =
      stringOrNull(response?.combatId) ||
      stringOrNull(detail?.combatId);

    const actionId =
      stringOrNull(response?.actionId) ||
      stringOrNull(detail?.actionId) ||
      stringOrNull(detail?.action?.actionId);

    if (combatId && actionId) {
      return combatId + ":" + actionId;
    }

    if (combatId) {
      return combatId + ":" + outcome;
    }

    return null;
  }

  function applyBackendRewards(rewards) {
    if (!isObject(rewards)) return false;
    if (!state.profile) state.profile = normalizeProfile(null);

    const xpAwarded = finiteNonNegativeInteger(rewards.xpAwarded, 0);
    const coinsAwarded = finiteNonNegativeInteger(rewards.coinsAwarded, 0);

    state.profile.xp += xpAwarded;
    state.profile.coins += coinsAwarded;

    if (Number.isInteger(rewards.dailyStreak) && rewards.dailyStreak >= 0) {
      state.profile.dailyStreak = rewards.dailyStreak;
    }

    if (Array.isArray(rewards.lootAwarded)) {
      state.profile.loot.push(...clone(rewards.lootAwarded));
    }

    return xpAwarded > 0 ||
      coinsAwarded > 0 ||
      Number.isInteger(rewards.dailyStreak) ||
      Array.isArray(rewards.lootAwarded);
  }

  async function persistProfile() {
    const manager = window.CariSaveManager;

    if (!manager || typeof manager.saveProfile !== "function") {
      console.warn("[CariBootstrap] SaveManager is unavailable; profile stays in memory.");
      return false;
    }

    try {
      const saved = await manager.saveProfile(clone(state.profile));
      if (!saved) {
        console.warn("[CariBootstrap] SaveManager could not persist the profile.");
      }
      return Boolean(saved);
    } catch (error) {
      console.warn("[CariBootstrap] Profile save failed:", error);
      return false;
    }
  }

  function resetCombatToBase() {
    const combat = window.CariCombatUI?.getState?.().combat || null;

    const candidates = [
      combat?.resetToBase,
      combat?.returnToBase,
      combat?.resetCombat
    ];

    for (const method of candidates) {
      if (typeof method !== "function") continue;

      try {
        method.call(combat);
        break;
      } catch (error) {
        console.warn("[CariBootstrap] Combat base reset hook failed:", error);
      }
    }

    try {
      window.dispatchEvent(new CustomEvent("cari:combat-reset-to-base", {
        detail: {
          outcome: OUTCOMES.DEFEAT,
          profile: clone(state.profile)
        }
      }));
    } catch (_error) {
      // Optional DOM integration.
    }
  }

  async function processVictory(response, detail) {
    const rewards = response?.rewards;

    if (!isObject(rewards)) {
      console.warn(
        "[CariBootstrap] VICTORY received without backend rewards; local profile was not modified."
      );
      return false;
    }

    if (!state.profile) state.profile = normalizeProfile(null);

    applyBackendRewards(rewards);
    syncProfileToDom(state.profile, true);

    const saved = await persistProfile();
    dispatchProfileUpdated("victory", rewards);

    if (!saved) {
      console.warn(
        "[CariBootstrap] Victory rewards applied in memory, but persistence was not confirmed."
      );
    }

    try {
      window.dispatchEvent(new CustomEvent("cari:loot-collected", {
        detail: {
          profile: clone(state.profile),
          rewards: clone(rewards),
          response: response ? clone(response) : null,
          source: detail ? clone(detail) : null
        }
      }));
    } catch (_error) {
      // Optional UI integration.
    }

    return saved;
  }

  async function processOutcome(outcome, detail = {}) {
    if (outcome !== OUTCOMES.VICTORY && outcome !== OUTCOMES.DEFEAT) {
      return false;
    }

    const response = getResponseFromDetail(detail) || state.lastCombatResponse;

    if (outcome === OUTCOMES.VICTORY) {
      const key = resultKey(response, detail, outcome);
      if (key) {
        if (state.processedResultKeys.has(key) ||
            state.processingResultKeys.has(key)) {
          return true;
        }
        state.processingResultKeys.add(key);
      }

      try {
        const processed = await processVictory(response, detail);
        if (key) state.processedResultKeys.add(key);
        return processed;
      } finally {
        if (key) state.processingResultKeys.delete(key);
      }
    }

    resetCombatToBase();
    dispatchProfileUpdated("defeat");
    return true;
  }

  function handleCombatResult(event) {
    const detail = isObject(event?.detail) ? event.detail : {};
    const response = getResponseFromDetail(detail);

    if (response) {
      state.lastCombatResponse = clone(response);
    }

    const outcome = normalizeOutcome(
      response?.resolution?.outcome ??
      detail.outcome ??
      detail.result
    );

    if (!outcome) return;

    void processOutcome(outcome, {
      ...detail,
      response
    }).catch((error) => {
      console.warn("[CariBootstrap] Combat result handling failed:", error);
    });
  }

  function handleCombatOutcome(event) {
    const detail = isObject(event?.detail) ? event.detail : {};
    const outcome = normalizeOutcome(detail);

    if (!outcome) return;

    void processOutcome(outcome, detail).catch((error) => {
      console.warn("[CariBootstrap] Combat outcome handling failed:", error);
    });
  }

  function attachCombatResultBridge() {
    window.addEventListener?.("cari:combat-result", handleCombatResult);
    window.addEventListener?.("cari:combat-outcome", handleCombatOutcome);
  }

  function configure() {
    if (state.initialized) return api;

    injectStyles();
    safeTelegramInit();
    attachCombatResultBridge();

    void loadInitialProfile().finally(() => {
      state.initialized = true;
      try {
        window.dispatchEvent(new CustomEvent("cari:app-ready", {
          detail: {
            localDevelopment: state.localDevelopment,
            profile: clone(state.profile)
          }
        }));
      } catch (_error) {
        // Optional DOM integration.
      }
    });

    return api;
  }

  const api = Object.freeze({
    configure,
    loadProfile: loadInitialProfile,
    getProfile: () => state.profile ? clone(state.profile) : null,
    getState: () => ({
      initialized: state.initialized,
      localDevelopment: state.localDevelopment,
      busy: state.busy,
      profile: state.profile ? clone(state.profile) : null,
      hasTelegram: Boolean(state.telegram)
    }),
    processOutcome
  });

  window.CariAppBootstrap = api;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", configure, { once: true });
  } else {
    configure();
  }
})();