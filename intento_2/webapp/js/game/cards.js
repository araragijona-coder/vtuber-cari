(() => {
  "use strict";

  const CARD_TYPES = Object.freeze({
    ATTACK: "ATTACK",
    DEFENSE: "DEFENSE",
    DEFEND: "DEFENSE",
    SKILL: "SKILL"
  });

  const CARD_DEFINITIONS = Object.freeze({
    disparo_neon: Object.freeze({
      id: "disparo_neon",
      cardId: "disparo_neon",
      name: "DISPARO NEÓN",
      type: CARD_TYPES.ATTACK,
      cost: window.CombatBalance.card("disparo_neon").cost,
      damage: window.CombatBalance.card("disparo_neon").damage,
      description: "Ataque estable: daño moderado con variación y crítico.",
      effects: Object.freeze({ damage: 18 })
    }),
    embestida_nitro: Object.freeze({
      id: "embestida_nitro",
      cardId: "embestida_nitro",
      name: "EMBESTIDA NITRO",
      type: CARD_TYPES.ATTACK,
      cost: window.CombatBalance.card("embestida_nitro").cost,
      damage: window.CombatBalance.card("embestida_nitro").damage,
      description: "Golpe pesado: más daño, mayor coste y variación.",
      effects: Object.freeze({ damage: 38 })
    }),
    derrape_expuesto: Object.freeze({
      id: "derrape_expuesto",
      cardId: "derrape_expuesto",
      name: "DERRAPE EXPUESTO",
      type: CARD_TYPES.ATTACK,
      cost: window.CombatBalance.card("derrape_expuesto").cost,
      damage: window.CombatBalance.card("derrape_expuesto").damage,
      description: "Si el enemigo está EXPOSED, añade +9 daño.",
      effects: Object.freeze({ damage: 13, conditional: "TARGET_EXPOSED", bonus: 9 })
    }),
    escudo_dark: Object.freeze({
      id: "escudo_dark",
      cardId: "escudo_dark",
      name: "ESCUDO DARK",
      type: CARD_TYPES.DEFENSE,
      cost: window.CombatBalance.card("escudo_dark").cost,
      damage: 0,
      description: "Genera 8 BLOCK para absorber daño futuro.",
      effects: Object.freeze({ block: 8 })
    }),
    barricada_neon: Object.freeze({
      id: "barricada_neon",
      cardId: "barricada_neon",
      name: "BARRICADA NEÓN",
      type: CARD_TYPES.DEFENSE,
      cost: window.CombatBalance.card("barricada_neon").cost,
      damage: 0,
      description: "Genera 11 BLOCK y recupera 1 Energy.",
      effects: Object.freeze({ block: 11, energyGain: 1 })
    }),
    espejo_urbano: Object.freeze({
      id: "espejo_urbano",
      cardId: "espejo_urbano",
      name: "ESPEJO URBANO",
      type: CARD_TYPES.DEFENSE,
      cost: window.CombatBalance.card("espejo_urbano").cost,
      damage: 0,
      description: "Genera 6 BLOCK y deja EXPOSED al enemigo 1 turno.",
      effects: Object.freeze({ block: 6, applyStatus: "EXPOSED", statusTurns: 1 })
    }),
    lectura_tactica: Object.freeze({
      id: "lectura_tactica",
      cardId: "lectura_tactica",
      name: "LECTURA TÁCTICA",
      type: CARD_TYPES.SKILL,
      cost: window.CombatBalance.card("lectura_tactica").cost,
      damage: 0,
      description: "Roba 2 cartas sin infligir daño.",
      effects: Object.freeze({ draw: 2 })
    }),
    sobrecarga: Object.freeze({
      id: "sobrecarga",
      cardId: "sobrecarga",
      name: "SOBRECARGA",
      type: CARD_TYPES.SKILL,
      cost: window.CombatBalance.card("sobrecarga").cost,
      damage: 0,
      description: "Recupera 2 Energy hasta el máximo.",
      effects: Object.freeze({ energyGain: 2 })
    }),
    pulso_debilitante: Object.freeze({
      id: "pulso_debilitante",
      cardId: "pulso_debilitante",
      name: "PULSO DEBILITANTE",
      type: CARD_TYPES.SKILL,
      cost: window.CombatBalance.card("pulso_debilitante").cost,
      damage: 0,
      description: "Aplica WEAK al enemigo durante 2 turnos.",
      effects: Object.freeze({ applyStatus: "WEAK", statusTurns: 2 })
    })
  });

  // The opening hand intentionally exposes all three tactical roles.
  const INITIAL_DECK = Object.freeze([
    "disparo_neon",
    "escudo_dark",
    "pulso_debilitante",
    "embestida_nitro",
    "derrape_expuesto",
    "barricada_neon",
    "espejo_urbano",
    "lectura_tactica",
    "sobrecarga"
  ]);

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function definitionFor(cardId) {
    return CARD_DEFINITIONS[String(cardId)] || null;
  }

  function createPhysicalCard(cardId, index) {
    const definition = definitionFor(cardId);
    if (!definition) throw new Error("UNKNOWN_CARD:" + String(cardId));
    return { instanceId: cardId + "-" + index, cardId };
  }

  function createCombatDeckState(handLimit = 4) {
    return {
      handLimit: Math.max(1, Number(handLimit) || 4),
      drawPile: INITIAL_DECK.map(createPhysicalCard),
      hand: [],
      discardPile: []
    };
  }

  function drawCard(state) {
    if (!state || state.hand.length >= state.handLimit) return null;
    if (state.drawPile.length === 0 && state.discardPile.length > 0) {
      state.drawPile = state.discardPile.splice(0);
    }
    const card = state.drawPile.shift() || null;
    if (card) state.hand.push(card);
    return card;
  }

  function drawCards(state, count) {
    const drawn = [];
    for (let index = 0; index < Number(count); index += 1) {
      const card = drawCard(state);
      if (!card) break;
      drawn.push(card);
    }
    return drawn;
  }

  function cardInHand(state, instanceId) {
    return state?.hand?.find((card) => card.instanceId === String(instanceId)) || null;
  }

  function playCard(state, instanceId) {
    const index = state.hand.findIndex((card) => card.instanceId === String(instanceId));
    if (index < 0) return null;
    const [card] = state.hand.splice(index, 1);
    state.discardPile.push(card);
    return card;
  }

  function hydrateCard(card) {
    const definition = definitionFor(card?.cardId);
    return definition ? { ...clone(definition), instanceId: card.instanceId } : null;
  }

  window.CardSystem = Object.freeze({
    CARD_TYPES,
    CARD_DEFINITIONS,
    INITIAL_DECK,
    definitionFor,
    createCombatDeckState,
    drawCard,
    drawCards,
    cardInHand,
    playCard,
    hydrateCard
  });
})();
