(() => {
  "use strict";

  const EVENT_VERSION = 1;
  const GAME_VERSION = document.documentElement?.dataset?.gameVersion || "mvp";
  const SESSION_KEY = "rocket_bunny_telemetry_session_v1";

  function makeId(prefix) {
    if (typeof window.crypto?.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return prefix + "-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  }

  const sessionId = makeId("session");
  const events = [];
  let sessionEnded = false;

  function utcNow() {
    return new Date().toISOString();
  }

  function safePayload(payload) {
    if (!payload || typeof payload !== "object") return {};
    try {
      return JSON.parse(JSON.stringify(payload));
    } catch {
      return {};
    }
  }

  function envelope(eventName, payload = {}, context = {}) {
    return Object.freeze({
      event_name: String(eventName),
      event_version: EVENT_VERSION,
      game_version: GAME_VERSION,
      rules_version: context.rules_version ?? null,
      deck_version: context.deck_version ?? null,
      session_id: sessionId,
      user_id: context.user_id ?? null,
      timestamp_utc: utcNow(),
      combat_id: context.combat_id ?? null,
      seed: context.seed ?? null,
      payload: safePayload(payload)
    });
  }

  function track(eventName, payload = {}, context = {}) {
    const event = envelope(eventName, payload, context);
    events.push(event);
    return event;
  }

  function flush() {
    const batch = events.splice(0, events.length);
    if (!batch.length) return [];
    return batch;
  }

  function peek() {
    return events.slice();
  }

  function beginSession() {
    track("app_open", { visibility_state: document.visibilityState });
    track("session_start", { session_id: sessionId });
    try {
      sessionStorage.setItem(SESSION_KEY, sessionId);
    } catch {
      // Storage is optional; telemetry must not break gameplay.
    }
  }

  function endSession(reason = "visibility_hidden") {
    if (sessionEnded) return;
    sessionEnded = true;
    track("session_end", { reason });
  }

  function beginCombat(combat) {
    if (!combat) return;
    track("battle_started", {
      turns_elapsed: 0,
      enemy_id: combat.enemy?.id ?? null
    }, {
      combat_id: combat.battleId ?? null,
      seed: combat.seed ?? combat.rngSeed ?? null,
      rules_version: combat.rulesVersion ?? null,
      deck_version: combat.deckVersion ?? null
    });
  }

  function recordCombatAction(combat, action) {
    if (!combat || !action) return;
    track("battle_action", {
      actor_id: action.actorId ?? null,
      action_type: action.actionType ?? action.type ?? null,
      card_id: action.cardId ?? null,
      turn: combat.turn ?? null,
      energy_remaining: combat.resources?.energy ?? null,
      nitro_remaining: combat.resources?.nitro ?? null
    }, {
      combat_id: combat.battleId ?? null,
      seed: combat.seed ?? combat.rngSeed ?? null,
      rules_version: combat.rulesVersion ?? null,
      deck_version: combat.deckVersion ?? null
    });
  }

  function completeCombat(combat, result, metrics = {}) {
    if (!combat) return;
    const normalizedResult = result ?? combat.outcome ?? "UNKNOWN";
    track("battle_completed", {
      result: normalizedResult,
      turns_elapsed: metrics.turns_elapsed ?? combat.turn ?? null,
      damage_taken: metrics.damage_taken ?? null,
      hp_remaining_pct: metrics.hp_remaining_pct ?? null,
      nitro_spent: metrics.nitro_spent ?? null,
      redline_turns_active: metrics.redline_turns_active ?? null,
      redline_max_level: metrics.redline_max_level ?? null,
      cards_played_distribution: metrics.cards_played_distribution ?? {},
      combat_rules_version: combat.rulesVersion ?? null,
      deck_version: combat.deckVersion ?? null
    }, {
      combat_id: combat.battleId ?? null,
      seed: combat.seed ?? combat.rngSeed ?? null,
      rules_version: combat.rulesVersion ?? null,
      deck_version: combat.deckVersion ?? null
    });
  }

  function rewardReceived(reward, context = {}) {
    track("reward_received", safePayload(reward), context);
  }

  function progressionViewed(context = {}) { track("progression_viewed", safePayload(context), context); }
  function progressionSelected(option, context = {}) { track("progression_selected", safePayload(option), context); }
  function progressionSaved(option, context = {}) { track("progression_saved", safePayload(option), context); }
  function nextObjectiveViewed(objective, context = {}) { track("next_objective_viewed", safePayload(objective), context); }

  window.RocketBunnyTelemetry = Object.freeze({
    EVENT_VERSION,
    sessionId,
    track,
    flush,
    peek,
    beginSession,
    endSession,
    beginCombat,
    recordCombatAction,
    completeCombat,
    rewardReceived,
    progressionViewed,
    progressionSelected,
    progressionSaved,
    nextObjectiveViewed
  });

  if (typeof document !== "undefined") {
    beginSession();

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        endSession("visibility_hidden");
      }
    });

    window.addEventListener("pagehide", () => {
      endSession("pagehide");
    }, { passive: true });
  }
})();