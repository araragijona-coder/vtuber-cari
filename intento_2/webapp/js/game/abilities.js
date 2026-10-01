(() => {
  "use strict";

  const DEFINITION = Object.freeze({
    id: "pulso_bosozoku",
    name: "PULSO BŌSŌZOKU",
    description: "Recupera 30 Energy, aplica EXPOSED 2.2 s y roba 1 skill.",
    condition: "Solo con 20 Energy o menos · 1 uso por combate"
  });

  function energyOf(combat) {
    return Number(combat?.resources?.currentEnergy ?? combat?.resources?.energy ?? 0);
  }

  function canUse(combat) {
    return Boolean(
      combat &&
      combat.outcome === window.GameState.OUTCOME.IN_PROGRESS &&
      Number(combat.resources?.playerAbilityUses || 0) > 0 &&
      energyOf(combat) <= 20
    );
  }

  function apply(combat) {
    if (!canUse(combat)) throw new Error("ABILITY_UNAVAILABLE");

    combat.resources.playerAbilityUses -= 1;
    window.EnergySystem.gain(combat.resources, 30);
    window.StatusSystem.applyTimedMs(
      combat.enemy,
      window.StatusSystem.STATUS_TYPES.EXPOSED,
      2200
    );
    window.CardSystem.drawCards(combat.cards, 1);
    window.EnergySystem.sync(combat.resources);

    return {
      abilityId: DEFINITION.id,
      energyAfter: energyOf(combat),
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
