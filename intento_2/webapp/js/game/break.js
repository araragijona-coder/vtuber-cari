(() => {
  "use strict";

  const DEFAULT_MAX_BREAK = 100;
  const DEFAULT_BREAK_WINDOW_MS = 2500;

  function create(maxBreak = DEFAULT_MAX_BREAK, breakWindowMs = DEFAULT_BREAK_WINDOW_MS) {
    const safeMax = Math.max(1, Math.floor(Number(maxBreak) || DEFAULT_MAX_BREAK));
    return {
      current: safeMax,
      max: safeMax,
      windowMs: Math.max(1, Math.floor(Number(breakWindowMs) || DEFAULT_BREAK_WINDOW_MS)),
      remainingMs: 0,
      state: "READY",
      lastImpactTick: 0
    };
  }

  function isBroken(breakState) {
    return Number(breakState?.remainingMs || 0) > 0 && breakState?.state === "BROKEN";
  }

  function applyImpact(breakState, amount, tick = 0) {
    if (!breakState || isBroken(breakState)) {
      return { applied: 0, broke: false, remaining: Number(breakState?.current || 0) };
    }
    const safeAmount = Math.max(0, Number(amount) || 0);
    breakState.current = Math.max(0, breakState.current - safeAmount);
    breakState.lastImpactTick = tick;
    if (breakState.current <= 0) {
      breakState.current = 0;
      breakState.remainingMs = breakState.windowMs;
      breakState.state = "BROKEN";
      return { applied: safeAmount, broke: true, remaining: 0 };
    }
    return { applied: safeAmount, broke: false, remaining: breakState.current };
  }

  function advance(breakState, deltaMs) {
    if (!breakState || !isBroken(breakState)) return false;
    breakState.remainingMs = Math.max(
      0,
      Number(breakState.remainingMs || 0) - Math.max(0, Number(deltaMs) || 0)
    );
    if (breakState.remainingMs <= 0) {
      breakState.current = breakState.max;
      breakState.state = "READY";
      return true;
    }
    return false;
  }

  function reset(breakState) {
    if (!breakState) return;
    breakState.current = breakState.max;
    breakState.remainingMs = 0;
    breakState.state = "READY";
  }

  window.BreakSystem = Object.freeze({
    DEFAULT_MAX_BREAK,
    DEFAULT_BREAK_WINDOW_MS,
    create,
    isBroken,
    applyImpact,
    advance,
    reset
  });
})();