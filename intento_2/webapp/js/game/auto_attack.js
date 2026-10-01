(() => {
  "use strict";

  function create({ intervalMs, damage, breakDamage, target = "single_enemy", varianceMin = 1, varianceMax = 1 }) {
    return {
      intervalMs: Math.max(1, Number(intervalMs) || 1000),
      damage: Math.max(0, Number(damage) || 0),
      breakDamage: Math.max(0, Number(breakDamage) || 0),
      target,
      varianceMin,
      varianceMax,
      cooldownMs: Math.max(1, Number(intervalMs) || 1000)
    };
  }

  function advance(attack, deltaMs, onAttack) {
    if (!attack || typeof onAttack !== "function") return 0;
    let cooldown = Math.max(0, Number(attack.cooldownMs) || 0) - Math.max(0, Number(deltaMs) || 0);
    let fired = 0;
    while (cooldown <= 0 && fired < 4) {
      onAttack({
        damage: attack.damage,
        breakDamage: attack.breakDamage,
        target: attack.target
      });
      cooldown += attack.intervalMs;
      fired += 1;
    }
    attack.cooldownMs = cooldown;
    return fired;
  }

  function reset(attack) {
    if (!attack) return;
    attack.cooldownMs = attack.intervalMs;
  }

  window.AutoAttackSystem = Object.freeze({ create, advance, reset });
})();