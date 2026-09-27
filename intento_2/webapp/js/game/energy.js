(() => {
  "use strict";

  function createEnergy(maxEnergy = 3) {
    const safeMax = Math.max(0, Number(maxEnergy) || 0);
    return { energy: safeMax, maxEnergy: safeMax };
  }

  function refill(resources) {
    resources.energy = Math.max(0, Number(resources.maxEnergy) || 0);
    return resources.energy;
  }

  function canSpend(resources, cost) {
    const safeCost = Number(cost);
    return Number.isFinite(safeCost) && safeCost >= 0 && safeCost <= resources.energy;
  }

  function spend(resources, cost) {
    const safeCost = Number(cost);
    if (!canSpend(resources, safeCost)) return false;
    resources.energy -= safeCost;
    resources.energy = Math.max(0, resources.energy);
    return true;
  }

  window.EnergySystem = Object.freeze({ createEnergy, refill, canSpend, spend });
})();