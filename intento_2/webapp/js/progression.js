(() => {
  "use strict";
  const PROTOTYPE_VALUE = 5;
  const OPTION_DEFINITIONS = Object.freeze([
    Object.freeze({ id: "upgrade_disparo_neon", cardId: "disparo_neon", label: "DISPARO NEÓN +5", description: "Mejora el daño base de DISPARO NEÓN.", effect: "card_damage", value: PROTOTYPE_VALUE }),
    Object.freeze({ id: "upgrade_embestida_nitro", cardId: "embestida_nitro", label: "EMBESTIDA NITRO +5", description: "Mejora el daño base de EMBESTIDA NITRO.", effect: "card_damage", value: PROTOTYPE_VALUE })
  ]);
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function createDefaultProgression() { return { cardDamageBonuses: {}, pendingDecision: null, lastChoice: null, nextObjective: null }; }
  function normalizeProgression(value) {
    const base = createDefaultProgression();
    if (!value || typeof value !== "object" || Array.isArray(value)) return base;
    const bonuses = value.cardDamageBonuses;
    if (bonuses && typeof bonuses === "object" && !Array.isArray(bonuses)) {
      for (const option of OPTION_DEFINITIONS) {
        const amount = Number(bonuses[option.cardId]);
        if (Number.isInteger(amount) && amount >= 0) base.cardDamageBonuses[option.cardId] = amount;
      }
    }
    base.pendingDecision = value.pendingDecision && typeof value.pendingDecision === "object" ? clone(value.pendingDecision) : null;
    base.lastChoice = value.lastChoice && typeof value.lastChoice === "object" ? clone(value.lastChoice) : null;
    base.nextObjective = value.nextObjective && typeof value.nextObjective === "object" ? clone(value.nextObjective) : null;
    return base;
  }
  function options() { return OPTION_DEFINITIONS.map(clone); }
  function optionForId(choiceId) { return OPTION_DEFINITIONS.find((option) => option.id === String(choiceId)) || null; }
  function prepareAfterReward(save, reward) {
    const next = clone(save), progression = normalizeProgression(next.progression), battleId = String(reward?.battleId || "").trim();
    if (!battleId) throw new Error("battleId requerido para preparar progreso.");
    progression.pendingDecision = { battleId, optionIds: OPTION_DEFINITIONS.map((option) => option.id) };
    progression.nextObjective = null; next.progression = progression; return next;
  }
  function pendingDecision(save) { return normalizeProgression(save?.progression).pendingDecision; }
  function findReward(save, battleId) {
    const rewards = Array.isArray(save?.rewardLedger) ? save.rewardLedger : [];
    return rewards.find((reward) => String(reward?.battleId) === String(battleId)) || null;
  }
  function applyChoice(save, choiceId) {
    const next = clone(save), progression = normalizeProgression(next.progression), option = optionForId(choiceId), pending = progression.pendingDecision;
    if (!option) return { success: false, error: "INVALID_PROGRESSION_CHOICE" };
    if (!pending || String(pending.battleId) === "") return { success: false, error: "NO_PENDING_PROGRESSION" };
    if (!pending.optionIds?.includes(option.id)) return { success: false, error: "CHOICE_NOT_AVAILABLE" };
    const current = Number(progression.cardDamageBonuses[option.cardId]) || 0;
    progression.cardDamageBonuses[option.cardId] = current + option.value;
    progression.lastChoice = { choiceId: option.id, cardId: option.cardId, value: option.value, battleId: String(pending.battleId) };
    progression.pendingDecision = null; progression.nextObjective = { type: "NEXT_BATTLE", label: "START NEXT COMBAT" };
    next.progression = progression;
    return { success: true, save: next, option: clone(option), reward: findReward(next, pending.battleId) };
  }
  function bonusForCard(progression, cardId) { return Number(normalizeProgression(progression).cardDamageBonuses[String(cardId)] || 0); }
  window.ProgressionSystem = Object.freeze({ PROTOTYPE_VALUE, createDefaultProgression, normalizeProgression, options, optionForId, prepareAfterReward, pendingDecision, applyChoice, bonusForCard, findReward });
})();