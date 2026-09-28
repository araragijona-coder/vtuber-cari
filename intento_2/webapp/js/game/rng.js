(() => {
  "use strict";

  function normalizeSeed(seed) {
    if (typeof seed === "number" && Number.isFinite(seed)) {
      const value = seed >>> 0;
      return value === 0 ? 0x6d2b79f5 : value;
    }
    const text = String(seed ?? "rocket-bunny-petty");
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0 || 0x6d2b79f5;
  }

  function create(seed) {
    const normalized = normalizeSeed(seed);
    return Object.freeze({ seed: normalized, state: normalized });
  }

  function next(rng) {
    if (!rng || typeof rng.state !== "number") throw new TypeError("RNG inválido.");
    let state = rng.state >>> 0;
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return {
      value: state / 4294967296,
      rng: Object.freeze({ seed: rng.seed >>> 0, state })
    };
  }

  function float(rng, min = 0, max = 1) {
    const low = Number(min);
    const high = Number(max);
    if (!Number.isFinite(low) || !Number.isFinite(high) || high < low) {
      throw new RangeError("Rango RNG inválido.");
    }
    const result = next(rng);
    return {
      value: low + (high - low) * result.value,
      rng: result.rng
    };
  }

  function chance(rng, probability) {
    const p = Math.min(1, Math.max(0, Number(probability) || 0));
    const result = next(rng);
    return { value: result.value < p, roll: result.value, rng: result.rng };
  }

  function int(rng, min, max) {
    const low = Math.ceil(Number(min));
    const high = Math.floor(Number(max));
    if (high < low) throw new RangeError("Rango entero RNG inválido.");
    const result = next(rng);
    return {
      value: low + Math.floor(result.value * (high - low + 1)),
      rng: result.rng
    };
  }

  window.CombatRNG = Object.freeze({
    normalizeSeed,
    create,
    next,
    float,
    chance,
    int
  });
})();