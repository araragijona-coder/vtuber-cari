(() => {
  "use strict";

  const DEFINITION = Object.freeze({
    id: "pulso_bosozoku",
    name: "PULSO BŌSŌZOKU",
    description: "Recupera hasta 2 Energy, aplica EXPOSED 2 y roba 1 carta.",
    condition: "Solo con 1 Energy o menos · 1 uso por combate"
  });

  function canUse(combat) {
    return Boolean(
      combat &&
      combat.outcome === window.GameState.OUTCOME.IN_PROGRESS &&
      combat.activeActor === "player" &&
      Number(combat.resources?.playerAbilityUses || 0) > 0 &&
      Number(combat.resources?.energy || 0) <= 1
    );
  }

  function apply(combat) {
    if (!canUse(combat)) {
      throw new Error("ABILITY_UNAVAILABLE");
    }

    combat.resources.playerAbilityUses -= 1;
    combat.resources.energy = Math.min(
      combat.resources.maxEnergy,
      combat.resources.energy + 2
    );
    window.StatusSystem.apply(combat.enemy, window.StatusSystem.STATUS_TYPES.EXPOSED, 2);
    window.CardSystem.drawCards(combat.cards, 1);

    return {
      abilityId: DEFINITION.id,
      energyAfter: combat.resources.energy,
      statusApplied: "EXPOSED",
      statusTurns: 2,
      cardsDrawn: 1
    };
  }

  window.CharacterAbilitySystem = Object.freeze({
    definition: () => DEFINITION,
    canUse,
    apply
  });
})();