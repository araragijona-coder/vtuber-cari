(() => {
  "use strict";

  function normalizeConfig(input) {
    if (typeof input === "number") {
      const maxEnergy = Math.max(0, Number(input) || 0);
      return { maxEnergy, energy: maxEnergy, energyRegen: 0 };
    }

    const options = input && typeof input === "object" ? input : {};
    const maxEnergy = Math.max(0, Number(options.maxEnergy ?? 100) || 0);
    const energy = Math.min(
      maxEnergy,
      Math.max(0, Number(options.currentEnergy ?? options.energy ?? maxEnergy) || 0)
    );
    const energyRegen = Math.max(0, Number(options.energyRegen ?? 12) || 0);

    return { maxEnergy, energy, energyRegen };
  }

  function sync(resources) {
    if (!resources || typeof resources !== "object") return resources;
    resources.maxEnergy = Math.max(0, Number(resources.maxEnergy) || 0);
    resources.energy = Math.min(
      resources.maxEnergy,
      Math.max(0, Number(resources.energy) || 0)
    );
    if ("currentEnergy" in resources) {
      resources.currentEnergy = resources.energy;
    }
    return resources;
  }

  function createEnergy(input = 3) {
    const normalized = normalizeConfig(input);
    return {
      energy: normalized.energy,
      maxEnergy: normalized.maxEnergy,
      energyRegen: normalized.energyRegen
    };
  }

  function createRealtimeEnergy(options = {}) {
    const normalized = normalizeConfig({
      maxEnergy: 100,
      currentEnergy: 35,
      energyRegen: 12,
      ...options
    });
    return {
      energy: normalized.energy,
      maxEnergy: normalized.maxEnergy,
      energyRegen: normalized.energyRegen
    };
  }

  function regenerate(resources, deltaMs) {
    if (!resources || !Number.isFinite(Number(deltaMs))) return 0;

    const delta = Math.max(0, Number(deltaMs));
    const before = Number(resources.energy) || 0;
    const maxEnergy = Math.max(0, Number(resources.maxEnergy) || 0);
    const regenPerSecond = Math.max(0, Number(resources.energyRegen) || 0);

    resources.energy = Math.min(
      maxEnergy,
      Math.max(0, before + (regenPerSecond * delta) / 1000)
    );
    sync(resources);
    return resources.energy - before;
  }

  function gain(resources, amount) {
    if (!resources) return 0;
    const safeAmount = Math.max(0, Number(amount) || 0);
    resources.energy = Math.min(
      Math.max(0, Number(resources.maxEnergy) || 0),
      Math.max(0, (Number(resources.energy) || 0) + safeAmount)
    );
    sync(resources);
    return resources.energy;
  }

  function refill(resources) {
    resources.energy = Math.max(0, Number(resources.maxEnergy) || 0);
    sync(resources);
    return resources.energy;
  }

  function canSpend(resources, cost) {
    const safeCost = Number(cost);
    return Boolean(
      resources &&
      Number.isFinite(safeCost) &&
      safeCost >= 0 &&
      safeCost <= Number(resources.energy)
    );
  }

  function spend(resources, cost) {
    const safeCost = Number(cost);
    if (!canSpend(resources, safeCost)) return false;
    resources.energy = Math.max(0, Number(resources.energy) - safeCost);
    sync(resources);
    return true;
  }

  window.EnergySystem = Object.freeze({
    createEnergy,
    createRealtimeEnergy,
    regenerate,
    gain,
    refill,
    sync,
    canSpend,
    spend
  });
})();
