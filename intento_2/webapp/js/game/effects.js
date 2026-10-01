(() => {
  "use strict";

  function applyHeal(target, amount) {
    if (!target) return { amount: 0, requested: 0, hpBefore: 0, hpAfter: 0 };
    const hpBefore = Math.max(0, Number(target.hp) || 0);
    const maxHp = Math.max(1, Number(target.maxHp) || 1);
    const requested = Math.max(0, Number(amount) || 0);
    const hpAfter = Math.min(maxHp, hpBefore + requested);
    target.hp = hpAfter;
    return { amount: hpAfter - hpBefore, requested, hpBefore, hpAfter };
  }

  function applyBuff(target, spec = {}) {
    if (!target) return null;
    return window.ModifierSystem.applyDamageOut(
      target,
      Number(spec.amount || 0),
      Number(spec.durationMs || 1000),
      spec.sourceId || "buff",
      spec.stacking || "replace"
    );
  }

  function applyCleanse(target, types = []) {
    if (!target) return [];
    const requested = Array.isArray(types) && types.length
      ? types.map(String)
      : [window.StatusSystem.STATUS_TYPES.WEAK, window.StatusSystem.STATUS_TYPES.EXPOSED];
    return requested.filter((type) => window.StatusSystem.remove(target, type));
  }

  function applyDamageReduction(target, spec = {}) {
    if (!target) return null;
    return window.ModifierSystem.applyDamageReduction(
      target,
      Number(spec.amount || 0),
      Number(spec.durationMs || 1000),
      spec.sourceId || "damage-reduction",
      spec.stacking || "replace"
    );
  }

  window.CombatEffects = Object.freeze({
    applyHeal,
    applyBuff,
    applyCleanse,
    applyDamageReduction
  });
})();