(() => {
  "use strict";

  const DEFAULT_STEP_MS = 100;
  const MAX_STEPS_PER_ADVANCE = 20;

  function create(stepMs = DEFAULT_STEP_MS) {
    const safeStep = Math.max(1, Math.floor(Number(stepMs) || DEFAULT_STEP_MS));
    return {
      stepMs: safeStep,
      accumulatorMs: 0,
      simulationTick: 0,
      elapsedMs: 0
    };
  }

  function advance(clock, deltaMs, onStep) {
    if (!clock || typeof onStep !== "function") throw new TypeError("CombatClock requiere clock y callback.");
    const delta = Number(deltaMs);
    if (!Number.isFinite(delta) || delta < 0) throw new TypeError("deltaMs inválido.");

    clock.accumulatorMs += delta;
    let steps = 0;
    while (clock.accumulatorMs + 1e-9 >= clock.stepMs && steps < MAX_STEPS_PER_ADVANCE) {
      clock.accumulatorMs -= clock.stepMs;
      clock.simulationTick += 1;
      clock.elapsedMs += clock.stepMs;
      onStep({
        tick: clock.simulationTick,
        elapsedMs: clock.elapsedMs,
        stepMs: clock.stepMs
      });
      steps += 1;
    }

    if (steps === MAX_STEPS_PER_ADVANCE && clock.accumulatorMs >= clock.stepMs) {
      clock.accumulatorMs = clock.stepMs - 1e-9;
    }

    return steps;
  }

  window.CombatClock = Object.freeze({
    DEFAULT_STEP_MS,
    create,
    advance
  });
})();