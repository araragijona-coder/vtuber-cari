(() => {
  "use strict";

  const DEFAULT_MAX_ENERGY = 100;
  const DEFAULT_REGEN_PER_SECOND = 12;

  function createEnergy(options = {}) {
    if (typeof options === "number") {
      const legacyMax = Math.max(0, Number(options) || 0);
      return {
        energy: legacyMax,
        maxEnergy: legacyMax,
        energyRegen: 0
      };
    }
    const maxEnergy = Math.max(
      0,
      Number(options.maxEnergy ?? DEFAULT_MAX_ENERGY) || DEFAULT_MAX_ENERGY
    );
    const energyRegen = Math.max(
      0,
      Number(options.energyRegen ?? DEFAULT_REGEN_PER_SECOND) || 0
    );
    return { energy: maxEnergy, maxEnergy, energyRegen };
  }

  function regenerate(resources, deltaMs) {
    if (!resources) return 0;
    const delta = Math.max(0, Number(deltaMs) || 0);
    resources.energy = Math.min(
      resources.maxEnergy,
      Math.max(0, Number(resources.energy) + Number(resources.energyRegen || 0) * delta / 1000)
    );
    return resources.energy;
  }

  function gain(resources, amount) {
    if (!resources) return 0;
    resources.energy = Math.min(
      resources.maxEnergy,
      Math.max(0, Number(resources.energy) + Math.max(0, Number(amount) || 0))
    );
    return resources.energy;
  }

  function canSpend(resources, cost) {
    const safeCost = Number(cost);
    return Boolean(
      resources &&
      Number.isFinite(safeCost) &&
      safeCost >= 0 &&
      safeCost <= Number(resources.energy) + 1e-9
    );
  }

  function spend(resources, cost) {
    const safeCost = Number(cost);
    if (!canSpend(resources, safeCost)) return false;
    resources.energy = Math.max(0, Number(resources.energy) - safeCost);
    return true;
  }

  function refill(resources) {
    if (!resources) return 0;
    resources.energy = Math.max(0, Number(resources.maxEnergy) || 0);
    return resources.energy;
  }

  window.EnergySystem = Object.freeze({
    DEFAULT_MAX_ENERGY,
    DEFAULT_REGEN_PER_SECOND,
    createEnergy,
    regenerate,
    gain,
    canSpend,
    spend,
    refill
  });
})();