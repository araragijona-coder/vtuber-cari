(() => {
  "use strict";

  const DEFAULT_STEP_MS = 100;
  const MAX_STEPS_PER_ADVANCE = 20;
  const EPSILON_MS = 1e-7;
  const SNAP_EPSILON_MS = 1e-6;

  function create(stepMs = DEFAULT_STEP_MS) {
    const safeStep = Math.max(1, Math.floor(Number(stepMs) || DEFAULT_STEP_MS));
    const clock = {
      stepMs: safeStep,
      accumulatorMs: 0,
      simulationTick: 0,
      elapsedMs: 0
    };

    Object.defineProperty(clock, "observedMs", {
      value: 0,
      writable: true,
      enumerable: false,
      configurable: false
    });

    return clock;
  }

  function advance(clock, deltaMs, onStep) {
    if (!clock || typeof onStep !== "function") {
      throw new TypeError("CombatClock requiere clock y callback.");
    }

    const delta = Number(deltaMs);
    if (!Number.isFinite(delta) || delta < 0) {
      throw new TypeError("deltaMs inválido.");
    }

    clock.observedMs += delta;

    const targetTick = Math.max(
      clock.simulationTick,
      Math.floor(clock.observedMs / clock.stepMs + EPSILON_MS)
    );

    const availableSteps = targetTick - clock.simulationTick;
    const steps = Math.min(MAX_STEPS_PER_ADVANCE, availableSteps);

    for (let index = 0; index < steps; index += 1) {
      clock.simulationTick += 1;
      clock.elapsedMs = clock.simulationTick * clock.stepMs;
      onStep({
        tick: clock.simulationTick,
        elapsedMs: clock.elapsedMs,
        stepMs: clock.stepMs
      });
    }

    let remainder = clock.observedMs - clock.simulationTick * clock.stepMs;
    if (Math.abs(remainder) <= SNAP_EPSILON_MS) remainder = 0;

    clock.accumulatorMs = Math.max(0, remainder);

    if (steps === MAX_STEPS_PER_ADVANCE && availableSteps > steps) {
      clock.accumulatorMs = Math.min(
        clock.accumulatorMs,
        clock.stepMs - SNAP_EPSILON_MS
      );
    }

    return steps;
  }

  window.CombatClock = Object.freeze({
    DEFAULT_STEP_MS,
    create,
    advance
  });
})();
