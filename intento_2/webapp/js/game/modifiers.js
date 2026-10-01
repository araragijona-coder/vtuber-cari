(() => {
  "use strict";

  const TYPES = Object.freeze({
    DAMAGE_OUT: "DAMAGE_OUT",
    DAMAGE_REDUCTION: "DAMAGE_REDUCTION"
  });

  function createModifiers() {
    return { damageOut: null, damageReduction: null };
  }

  function ensure(combatant) {
    if (!combatant || typeof combatant !== "object") return null;
    if (!combatant.modifiers || typeof combatant.modifiers !== "object") combatant.modifiers = createModifiers();
    if (!("damageOut" in combatant.modifiers)) combatant.modifiers.damageOut = null;
    if (!("damageReduction" in combatant.modifiers)) combatant.modifiers.damageReduction = null;
    return combatant.modifiers;
  }

  function applyDamageOut(combatant, amount, durationMs, sourceId = "buff", stacking = "replace") {
    const modifiers = ensure(combatant);
    if (!modifiers) return null;
    const value = Math.max(0, Math.min(2, Number(amount) || 0));
    const duration = Math.max(1, Math.floor(Number(durationMs) || 0));
    modifiers.damageOut = {
      type: TYPES.DAMAGE_OUT,
      amount: value,
      remainingMs: duration,
      durationMs: duration,
      sourceId: String(sourceId || "buff"),
      stacking: "replace"
    };
    return { ...modifiers.damageOut, stackingRuleRequested: String(stacking || "replace") };
  }

  function applyDamageReduction(combatant, amount, durationMs, sourceId = "damage-reduction", stacking = "replace") {
    const modifiers = ensure(combatant);
    if (!modifiers) return null;
    const value = Math.max(0, Math.min(0.9, Number(amount) || 0));
    const duration = Math.max(1, Math.floor(Number(durationMs) || 0));
    modifiers.damageReduction = {
      type: TYPES.DAMAGE_REDUCTION,
      amount: value,
      remainingMs: duration,
      durationMs: duration,
      sourceId: String(sourceId || "damage-reduction"),
      stacking: "replace"
    };
    return { ...modifiers.damageReduction, stackingRuleRequested: String(stacking || "replace") };
  }

  function advance(combatant, deltaMs) {
    const modifiers = ensure(combatant);
    if (!modifiers) return [];
    const delta = Math.max(0, Number(deltaMs) || 0);
    const expired = [];
    for (const key of ["damageOut", "damageReduction"]) {
      const modifier = modifiers[key];
      if (!modifier) continue;
      modifier.remainingMs = Math.max(0, Number(modifier.remainingMs || 0) - delta);
      if (modifier.remainingMs <= 0) {
        expired.push({ ...modifier });
        modifiers[key] = null;
      }
    }
    return expired;
  }

  function damageOutMultiplier(combatant) {
    const modifier = ensure(combatant)?.damageOut;
    if (!modifier || Number(modifier.remainingMs || 0) <= 0) return 1;
    return 1 + Math.max(0, Number(modifier.amount) || 0);
  }

  function damageReductionFraction(combatant) {
    const modifier = ensure(combatant)?.damageReduction;
    if (!modifier || Number(modifier.remainingMs || 0) <= 0) return 0;
    return Math.max(0, Math.min(0.9, Number(modifier.amount) || 0));
  }

  function entries(combatant) {
    const modifiers = ensure(combatant);
    if (!modifiers) return [];
    const out = [];
    if (modifiers.damageOut?.remainingMs > 0) {
      out.push({
        type: TYPES.DAMAGE_OUT,
        label: "POWER +" + Math.round(Number(modifiers.damageOut.amount || 0) * 100) + "%",
        remainingMs: Number(modifiers.damageOut.remainingMs)
      });
    }
    if (modifiers.damageReduction?.remainingMs > 0) {
      out.push({
        type: TYPES.DAMAGE_REDUCTION,
        label: "GUARD -" + Math.round(Number(modifiers.damageReduction.amount || 0) * 100) + "%",
        remainingMs: Number(modifiers.damageReduction.remainingMs)
      });
    }
    return out;
  }

  window.ModifierSystem = Object.freeze({
    TYPES,
    createModifiers,
    ensure,
    applyDamageOut,
    applyDamageReduction,
    advance,
    damageOutMultiplier,
    damageReductionFraction,
    entries
  });
})();