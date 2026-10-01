(() => {
  "use strict";

  // All numbers in this module are [PROTOTYPE BALANCE].
  const BALANCE = Object.freeze({
    timing: Object.freeze({
      fixedStepMs: 100
    }),
    energy: Object.freeze({
      maxEnergy: 100,
      regenPerSecond: 12
    }),
    break: Object.freeze({
      max: 100,
      windowMs: 2500
    }),
    burst: Object.freeze({
      damageMultiplier: 1.75
    }),
    playerAutoAttack: Object.freeze({
      intervalMs: 900,
      damage: 7,
      breakDamage: 5,
      target: "single_enemy"
    }),
    cards: Object.freeze({
      disparo_neon: Object.freeze({
        cost: 24, damage: 16, breakDamage: 10, cooldownMs: 500,
        type: "ATTACK", varianceMin: 0.95, varianceMax: 1.05,
        criticalChance: 0.12, criticalMultiplier: 1.50,
        targeting: "single_enemy"
      }),
      embestida_nitro: Object.freeze({
        cost: 40, damage: 28, breakDamage: 18, cooldownMs: 1000,
        type: "ATTACK", varianceMin: 0.90, varianceMax: 1.10,
        criticalChance: 0.18, criticalMultiplier: 1.50,
        targeting: "single_enemy"
      }),
      derrape_expuesto: Object.freeze({
        cost: 20, damage: 12, breakDamage: 22, cooldownMs: 700,
        type: "ATTACK", varianceMin: 0.95, varianceMax: 1.05,
        criticalChance: 0.10, criticalMultiplier: 1.50,
        conditionalBonus: 10, targeting: "single_enemy"
      }),
      escudo_dark: Object.freeze({
        cost: 18, damage: 0, breakDamage: 0, cooldownMs: 900,
        type: "DEFENSE", block: 18, durationMs: 1400, targeting: "self"
      }),
      barricada_neon: Object.freeze({
        cost: 32, damage: 0, breakDamage: 0, cooldownMs: 1200,
        type: "DEFENSE", block: 28, durationMs: 1800,
        energyGain: 10, targeting: "self"
      }),
      espejo_urbano: Object.freeze({
        cost: 20, damage: 0, breakDamage: 0, cooldownMs: 1000,
        type: "DEFENSE", block: 12, durationMs: 1200,
        applyStatus: "EXPOSED", statusDurationMs: 1500, targeting: "self"
      }),
      lectura_tactica: Object.freeze({
        cost: 22, damage: 0, breakDamage: 0, cooldownMs: 1300,
        type: "SKILL", draw: 2, targeting: "self"
      }),
      sobrecarga: Object.freeze({
        cost: 0, damage: 0, breakDamage: 0, cooldownMs: 1800,
        type: "SKILL", energyGain: 26, targeting: "self"
      }),
      pulso_debilitante: Object.freeze({
        cost: 24, damage: 0, breakDamage: 12, cooldownMs: 1200,
        type: "SKILL", applyStatus: "WEAK", statusDurationMs: 2200,
        targeting: "single_enemy"
      })
    }),
    enemies: Object.freeze({
      street_punk: Object.freeze({
        maxHp: 100, attack: 12, defense: 0, aiProfile: "AGGRESSIVE_ATTACK",
        autoAttack: Object.freeze({ intervalMs: 1400, damage: 8, breakDamage: 6 })
      }),
      iron_guard: Object.freeze({
        maxHp: 130, attack: 9, defense: 6, aiProfile: "DEFEND_LOW_HP",
        autoAttack: Object.freeze({ intervalMs: 1600, damage: 7, breakDamage: 5 })
      }),
      nitro_raider: Object.freeze({
        maxHp: 110, attack: 10, defense: 3, aiProfile: "ALTERNATE_TURN",
        autoAttack: Object.freeze({ intervalMs: 1250, damage: 8, breakDamage: 7 })
      }),
      banchou_rookie: Object.freeze({
        maxHp: 180, attack: 22, defense: 5, aiProfile: "ELITE_PRIORITY",
        autoAttack: Object.freeze({ intervalMs: 1500, damage: 10, breakDamage: 8 })
      })
    })
  });

  function card(id) {
    return BALANCE.cards[String(id)] || null;
  }

  function enemy(id) {
    return BALANCE.enemies[String(id)] || null;
  }

  window.CombatBalance = Object.freeze({ BALANCE, card, enemy });
})();