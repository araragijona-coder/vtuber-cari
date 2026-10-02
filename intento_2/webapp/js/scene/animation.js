(() => {
  "use strict";

  const STATES = Object.freeze([
    "IDLE",
    "MOVE",
    "WINDUP",
    "ATTACK",
    "HIT",
    "STAGGER",
    "BREAK",
    "BURST",
    "VICTORY",
    "DEFEAT"
  ]);

  const DEFAULT_TRANSITIONS = Object.freeze({
    IDLE: ["MOVE", "WINDUP", "ATTACK", "HIT", "VICTORY", "DEFEAT"],
    MOVE: ["IDLE", "WINDUP", "ATTACK", "HIT", "STAGGER"],
    WINDUP: ["ATTACK", "IDLE", "HIT", "STAGGER"],
    ATTACK: ["IDLE", "HIT", "STAGGER", "BREAK", "BURST"],
    HIT: ["IDLE", "STAGGER", "BREAK"],
    STAGGER: ["IDLE", "ATTACK", "BREAK", "DEFEAT"],
    BREAK: ["IDLE", "BURST", "DEFEAT"],
    BURST: ["IDLE", "ATTACK", "VICTORY", "DEFEAT"],
    VICTORY: ["IDLE"],
    DEFEAT: ["IDLE"]
  });

  function create(initial = "IDLE", transitions = DEFAULT_TRANSITIONS) {
    let current = STATES.includes(initial) ? initial : "IDLE";
    let changedAt = typeof performance !== "undefined" ? performance.now() : 0;

    function setState(next, now = typeof performance !== "undefined" ? performance.now() : 0) {
      const target = String(next || "IDLE").toUpperCase();
      if (!STATES.includes(target)) return { changed: false, state: current, reason: "UNKNOWN_STATE" };
      if (target === current) return { changed: false, state: current, reason: "NO_CHANGE" };
      const allowed = transitions[current] || [];
      if (!allowed.includes(target)) return { changed: false, state: current, reason: "TRANSITION_NOT_ALLOWED" };
      current = target;
      changedAt = Number(now) || 0;
      return { changed: true, state: current, changedAt };
    }

    function forceState(next, now = typeof performance !== "undefined" ? performance.now() : 0) {
      const target = STATES.includes(String(next || "").toUpperCase()) ? String(next).toUpperCase() : "IDLE";
      current = target;
      changedAt = Number(now) || 0;
      return { changed: true, state: current, changedAt };
    }

    return Object.freeze({
      get state() { return current; },
      get changedAt() { return changedAt; },
      setState,
      forceState,
      canTransitionTo: (next) => (transitions[current] || []).includes(String(next || "").toUpperCase())
    });
  }

  window.MachGirlsAnimationStateMachine = Object.freeze({ STATES, DEFAULT_TRANSITIONS, create });
})();