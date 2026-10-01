(() => {
  "use strict";

  const CARD_TYPES = window.CardSystem.CARD_TYPES;

  function resolve({
    combat,
    actor,
    target,
    definition
  }) {
    const effects = definition.effects || {};
    const result = {
      damage: 0,
      breakDamage: Number(effects.breakDamage || definition.breakDamage || 0),
      blockGained: 0,
      blockDurationMs: 0,
      energyGain: 0,
      drawCount: 0,
      statusApplied: null,
      statusDurationMs: 0,
      targeting: definition.targeting,
      conditionalTriggered: false,
      healAmount: Number(effects.heal || 0),
      buff: effects.buff ? { ...effects.buff } : null,
      cleanseTypes: Array.isArray(effects.cleanse) ? effects.cleanse.map(String) : [],
      damageReduction: effects.damageReduction ? { ...effects.damageReduction } : null,
      multiHit: effects.multiHit ? { ...effects.multiHit } : null
    };

    if (definition.type === CARD_TYPES.DEFENSE) {
      result.blockGained = Number(effects.block || 0);
      result.blockDurationMs = Number(effects.durationMs || 1000);
      result.statusApplied = effects.applyStatus || null;
      result.statusDurationMs = Number(effects.statusDurationMs || 0);
      result.energyGain = Number(effects.energyGain || 0);
      return result;
    }

    if (definition.type === CARD_TYPES.SKILL) {
      result.drawCount = Number(effects.draw || 0);
      result.energyGain = Number(effects.energyGain || 0);
      result.statusApplied = effects.applyStatus || null;
      result.statusDurationMs = Number(effects.statusDurationMs || 0);
      return result;
    }

    if (definition.type === CARD_TYPES.ATTACK) {
      result.conditionalTriggered =
        effects.conditional === "TARGET_EXPOSED" &&
        window.StatusSystem.has(target, window.StatusSystem.STATUS_TYPES.EXPOSED);
      return result;
    }

    void combat;
    void actor;
    return result;
  }

  window.SkillResolver = Object.freeze({ resolve });
})();