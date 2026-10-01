(() => {
  "use strict";

  const BREAK_DAMAGE_MULTIPLIER = 1.75;
  const BREAK_ENERGY_REGEN_MULTIPLIER = 1.25;

  function chargeOf(combat) {
    return Math.max(0, Number(combat?.resources?.burstCharge || 0));
  }

  function maxChargeOf(combat) {
    return Math.max(
      1,
      Number(combat?.resources?.burstMax || window.CombatBalance.BALANCE.burst.maxCharge)
    );
  }

  function sync(combat) {
    if (!combat?.resources) return combat;
    const max = maxChargeOf(combat);
    const charge = Math.min(max, Math.max(0, Number(combat.resources.burstCharge ?? combat.resources.burst) || 0));
    combat.resources.burstCharge = charge;
    combat.resources.burst = charge;
    return combat;
  }

  function gain(combat, amount) {
    if (!combat?.resources) return 0;
    sync(combat);
    const max = maxChargeOf(combat);
    combat.resources.burstCharge = Math.min(
      max,
      chargeOf(combat) + Math.max(0, Number(amount) || 0)
    );
    sync(combat);
    return combat.resources.burstCharge;
  }

  function canUse(combat) {
    sync(combat);
    return Boolean(
      combat &&
      combat.outcome === window.GameState.OUTCOME.IN_PROGRESS &&
      chargeOf(combat) >= maxChargeOf(combat)
    );
  }

  function activate(combat) {
    if (!canUse(combat)) throw new Error("BURST_UNAVAILABLE");
    const chargeBefore = chargeOf(combat);
    combat.resources.burstCharge = 0;
    sync(combat);
    return {
      chargeBefore,
      chargeAfter: 0
    };
  }

  function isActive(combat) {
    return Boolean(
      combat &&
      window.BreakSystem?.isBroken?.(combat.enemy.breakState)
    );
  }

  function multiplier(combat) {
    return isActive(combat)
      ? Number(window.CombatBalance.BALANCE.break.vulnerabilityMultiplier || BREAK_DAMAGE_MULTIPLIER)
      : 1;
  }

  function energyRegenMultiplier(combat) {
    return isActive(combat) ? BREAK_ENERGY_REGEN_MULTIPLIER : 1;
  }

  function label(combat) {
    if (!combat) return "—";
    if (isActive(combat)) return "BURST WINDOW";
    return canUse(combat) ? "BURST READY" : "CHARGING " + chargeOf(combat) + " / " + maxChargeOf(combat);
  }

  window.BurstSystem = Object.freeze({
    BREAK_DAMAGE_MULTIPLIER,
    BREAK_ENERGY_REGEN_MULTIPLIER,
    chargeOf,
    maxChargeOf,
    gain,
    canUse,
    activate,
    isActive,
    multiplier,
    energyRegenMultiplier,
    label
  });
})();
