(() => {
  "use strict";

  const DEFINITION = Object.freeze({
    id: "pulso_bosozoku",
    name: "PULSO BŌSŌZOKU",
    description: "Recupera 30 Energy, aplica EXPOSED 2.2 s y roba 1 skill.",
    condition: "Solo con 20 Energy o menos · 1 uso por combate"
  });

  function canUse(combat) {
    return Boolean(
      combat &&
      combat.outcome === window.GameState.OUTCOME.IN_PROGRESS &&
      Number(combat.resources?.playerAbilityUses || 0) > 0 &&
      Number(combat.resources?.energy || 0) <= 20
    );
  }

  function apply(combat) {
    if (!canUse(combat)) throw new Error("ABILITY_UNAVAILABLE");
    combat.resources.playerAbilityUses -= 1;
    window.EnergySystem.gain(combat.resources, 30);
    window.StatusSystem.apply(
      combat.enemy,
      window.StatusSystem.STATUS_TYPES.EXPOSED,
      2200
    );
    window.CardSystem.drawCards(combat.cards, 1);
    return {
      abilityId: DEFINITION.id,
      energyAfter: combat.resources.energy,
      statusApplied: "EXPOSED",
      statusDurationMs: 2200,
      cardsDrawn: 1
    };
  }

  window.CharacterAbilitySystem = Object.freeze({
    definition: () => DEFINITION,
    canUse,
    apply
  });
})();