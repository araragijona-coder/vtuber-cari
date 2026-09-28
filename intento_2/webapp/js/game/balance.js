(() => {
  "use strict";

  const BALANCE = Object.freeze({
    damage: Object.freeze({
      varianceMin: 0.90,
      varianceMax: 1.10,
      criticalChance: 0.12,
      criticalMultiplier: 1.50,
      minimumDamage: 1,
      defendingMultiplier: 0.50
    }),
    cards: Object.freeze({
      disparo_neon: Object.freeze({
        cost: 1, damage: 18, type: "ATTACK",
        varianceMin: 0.90, varianceMax: 1.10,
        criticalChance: 0.12, criticalMultiplier: 1.50
      }),
      embestida_nitro: Object.freeze({
        cost: 2, damage: 38, type: "ATTACK",
        varianceMin: 0.85, varianceMax: 1.15,
        criticalChance: 0.18, criticalMultiplier: 1.50
      }),
      escudo_dark: Object.freeze({
        cost: 1, damage: 0, type: "DEFEND",
        defenseMultiplier: 0.50,
        duration: 1
      })
    }),
    enemies: Object.freeze({
      street_punk: Object.freeze({ maxHp: 100, attack: 14, defense: 0, aiProfile: "AGGRESSIVE_ATTACK" }),
      iron_guard: Object.freeze({ maxHp: 130, attack: 10, defense: 6, aiProfile: "DEFEND_LOW_HP" }),
      nitro_raider: Object.freeze({ maxHp: 110, attack: 12, defense: 3, aiProfile: "ALTERNATE_TURN" }),
      banchou_rookie: Object.freeze({ maxHp: 180, attack: 18, defense: 5, aiProfile: "ELITE_PRIORITY" })
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