(() => {
  "use strict";

  const PROTOTYPE_VALUE = 5;
  const YURI_DERRAPE_BREAK_PAYOFF_VALUE = 6;

  const LEGACY_OPTION_DEFINITIONS = Object.freeze([
    Object.freeze({
      id: "upgrade_disparo_neon",
      cardId: "disparo_neon",
      label: "DISPARO NEÓN +5",
      description: "Mejora el daño base de DISPARO NEÓN.",
      effect: "card_damage",
      value: PROTOTYPE_VALUE
    }),
    Object.freeze({
      id: "upgrade_embestida_nitro",
      cardId: "embestida_nitro",
      label: "EMBESTIDA NITRO +5",
      description: "Mejora el daño base de EMBESTIDA NITRO.",
      effect: "card_damage",
      value: PROTOTYPE_VALUE
    })
  ]);

  const CHARACTER_OPTION_DEFINITIONS = Object.freeze({
    yuri: Object.freeze([
      Object.freeze({
        id: "yuri_derrape_break_payoff",
        characterId: "yuri",
        cardId: "yuri_derrape_expuesto",
        label: "DERRAPE + EXPOSED → +6 BREAK",
        description: "DERRAPE YURI contra EXPOSED añade +6 BREAK adicional. TEST-ONLY / PROVISIONAL.",
        effect: "break_payoff",
        value: YURI_DERRAPE_BREAK_PAYOFF_VALUE,
        breakBonus: YURI_DERRAPE_BREAK_PAYOFF_VALUE
      })
    ])
  });

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function createDefaultProgression() {
    return {
      cardDamageBonuses: {},
      characterUpgrades: {},
      pendingDecision: null,
      lastChoice: null,
      nextObjective: null
    };
  }

  function normalizeProgression(value) {
    const base = createDefaultProgression();
    if (!value || typeof value !== "object" || Array.isArray(value)) return base;

    const bonuses = value.cardDamageBonuses;
    if (bonuses && typeof bonuses === "object" && !Array.isArray(bonuses)) {
      for (const option of LEGACY_OPTION_DEFINITIONS) {
        const amount = Number(bonuses[option.cardId]);
        if (Number.isInteger(amount) && amount >= 0) {
          base.cardDamageBonuses[option.cardId] = amount;
        }
      }
    }

    const upgrades = value.characterUpgrades;
    if (upgrades && typeof upgrades === "object" && !Array.isArray(upgrades)) {
      for (const [characterId, upgradeIds] of Object.entries(upgrades)) {
        if (!characterId || !Array.isArray(upgradeIds)) continue;
        const normalizedIds = [...new Set(
          upgradeIds
            .filter((upgradeId) => typeof upgradeId === "string")
            .map((upgradeId) => upgradeId.trim())
            .filter(Boolean)
        )];
        if (normalizedIds.length > 0) base.characterUpgrades[characterId] = normalizedIds;
      }
    }

    base.pendingDecision =
      value.pendingDecision && typeof value.pendingDecision === "object"
        ? clone(value.pendingDecision)
        : null;
    base.lastChoice =
      value.lastChoice && typeof value.lastChoice === "object"
        ? clone(value.lastChoice)
        : null;
    base.nextObjective =
      value.nextObjective && typeof value.nextObjective === "object"
        ? clone(value.nextObjective)
        : null;
    return base;
  }

  function hasCharacterUpgrade(progression, characterId, upgradeId) {
    const normalized = normalizeProgression(progression);
    const upgrades = normalized.characterUpgrades[String(characterId || "")];
    return Array.isArray(upgrades) && upgrades.includes(String(upgradeId || ""));
  }

  function optionsForCharacter(characterId, progression = null) {
    const id = String(characterId || "").trim();
    const definitions = CHARACTER_OPTION_DEFINITIONS[id] || LEGACY_OPTION_DEFINITIONS;
    return definitions
      .filter((option) => !option.characterId || !hasCharacterUpgrade(
        progression,
        option.characterId,
        option.id
      ))
      .map(clone);
  }

  function options(characterId = null, progression = null) {
    return characterId
      ? optionsForCharacter(characterId, progression)
      : LEGACY_OPTION_DEFINITIONS.map(clone);
  }

  function optionForId(choiceId) {
    const requested = String(choiceId || "");
    for (const option of LEGACY_OPTION_DEFINITIONS) {
      if (option.id === requested) return clone(option);
    }
    for (const definitions of Object.values(CHARACTER_OPTION_DEFINITIONS)) {
      for (const option of definitions) {
        if (option.id === requested) return clone(option);
      }
    }
    return null;
  }

  function prepareAfterReward(save, reward, characterId = null) {
    const next = clone(save);
    const progression = normalizeProgression(next.progression);
    const battleId = String(reward?.battleId || "").trim();
    const normalizedCharacterId = String(characterId || "").trim();

    if (!battleId) throw new Error("battleId requerido para preparar progreso.");

    const available = normalizedCharacterId
      ? optionsForCharacter(normalizedCharacterId, progression)
      : LEGACY_OPTION_DEFINITIONS.map(clone);

    if (available.length === 0) {
      progression.pendingDecision = null;
      progression.nextObjective = {
        type: "NEXT_BATTLE",
        label: "START NEXT COMBAT"
      };
    } else {
      progression.pendingDecision = {
        battleId,
        characterId: normalizedCharacterId || null,
        optionIds: available.map((option) => option.id)
      };
      progression.nextObjective = null;
    }

    next.progression = progression;
    return next;
  }

  function pendingDecision(save) {
    return normalizeProgression(save?.progression).pendingDecision;
  }

  function findReward(save, battleId) {
    const rewards = Array.isArray(save?.rewardLedger) ? save.rewardLedger : [];
    return rewards.find((reward) => String(reward?.battleId) === String(battleId)) || null;
  }

  function applyChoice(save, choiceId) {
    const next = clone(save);
    const progression = normalizeProgression(next.progression);
    const option = optionForId(choiceId);
    const pending = progression.pendingDecision;

    if (!option) return { success: false, error: "INVALID_PROGRESSION_CHOICE" };
    if (!pending || String(pending.battleId || "") === "") {
      return { success: false, error: "NO_PENDING_PROGRESSION" };
    }
    if (!pending.optionIds?.includes(option.id)) {
      return { success: false, error: "CHOICE_NOT_AVAILABLE" };
    }

    const pendingCharacterId = String(pending.characterId || "");
    if (option.characterId && pendingCharacterId !== option.characterId) {
      return { success: false, error: "CHOICE_NOT_AVAILABLE" };
    }

    if (option.effect === "card_damage") {
      const current = Number(progression.cardDamageBonuses[option.cardId]) || 0;
      progression.cardDamageBonuses[option.cardId] = current + option.value;
    } else if (option.effect === "break_payoff") {
      if (hasCharacterUpgrade(progression, option.characterId, option.id)) {
        return { success: false, error: "UPGRADE_ALREADY_OWNED" };
      }
      if (!progression.characterUpgrades[option.characterId]) {
        progression.characterUpgrades[option.characterId] = [];
      }
      progression.characterUpgrades[option.characterId].push(option.id);
    } else {
      return { success: false, error: "UNSUPPORTED_PROGRESSION_EFFECT" };
    }

    progression.lastChoice = {
      choiceId: option.id,
      cardId: option.cardId || null,
      value: option.value,
      effect: option.effect,
      characterId: option.characterId || null,
      breakBonus: Number(option.breakBonus || 0),
      battleId: String(pending.battleId)
    };
    progression.pendingDecision = null;
    progression.nextObjective = {
      type: "NEXT_BATTLE",
      label: "START NEXT COMBAT"
    };

    next.progression = progression;
    return {
      success: true,
      save: next,
      option: clone(option),
      reward: findReward(next, pending.battleId)
    };
  }

  function bonusForCard(progression, cardId) {
    return Number(
      normalizeProgression(progression).cardDamageBonuses[String(cardId)] || 0
    );
  }

  function breakBonusForCard(progression, characterId, cardId, conditionTriggered = false) {
    if (!conditionTriggered) return 0;
    if (String(characterId || "") !== "yuri") return 0;
    if (String(cardId || "") !== "yuri_derrape_expuesto") return 0;
    if (!hasCharacterUpgrade(progression, "yuri", "yuri_derrape_break_payoff")) return 0;
    return YURI_DERRAPE_BREAK_PAYOFF_VALUE;
  }

  window.ProgressionSystem = Object.freeze({
    PROTOTYPE_VALUE,
    YURI_DERRAPE_BREAK_PAYOFF_VALUE,
    createDefaultProgression,
    normalizeProgression,
    hasCharacterUpgrade,
    options,
    optionsForCharacter,
    optionForId,
    prepareAfterReward,
    pendingDecision,
    applyChoice,
    bonusForCard,
    breakBonusForCard,
    findReward
  });
})();