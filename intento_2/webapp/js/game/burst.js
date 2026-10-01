(() => {
  "use strict";

  const BREAK_DAMAGE_MULTIPLIER = 1.75;
  const BREAK_ENERGY_REGEN_MULTIPLIER = 1.25;

  function isActive(combat) {
    return Boolean(
      combat &&
      window.BreakSystem?.isBroken?.(combat.enemy.breakState)
    );
  }

  function multiplier(combat) {
    return isActive(combat) ? BREAK_DAMAGE_MULTIPLIER : 1;
  }

  function energyRegenMultiplier(combat) {
    return isActive(combat) ? BREAK_ENERGY_REGEN_MULTIPLIER : 1;
  }

  function label(combat) {
    return isActive(combat) ? "BURST WINDOW" : "—";
  }

  window.BurstSystem = Object.freeze({
    BREAK_DAMAGE_MULTIPLIER,
    BREAK_ENERGY_REGEN_MULTIPLIER,
    isActive,
    multiplier,
    energyRegenMultiplier,
    label
  });
})();