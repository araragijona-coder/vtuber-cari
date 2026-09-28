(() => {
  "use strict";

  const CARD_TYPES = Object.freeze({
    ATTACK: "ATTACK",
    DEFEND: "DEFEND",
    SKILL: "SKILL"
  });

  const CARD_DEFINITIONS = Object.freeze({
    disparo_neon: Object.freeze({
      id: "disparo_neon",
      name: "DISPARO NEÓN",
      type: CARD_TYPES.ATTACK,
      cost: window.CombatBalance.card("disparo_neon").cost,
      damage: window.CombatBalance.card("disparo_neon").damage,
      description: "Ataque fiable: daño moderado con variación y crítico controlados."
    }),
    embestida_nitro: Object.freeze({
      id: "embestida_nitro",
      name: "EMBESTIDA NITRO",
      type: CARD_TYPES.ATTACK,
      cost: window.CombatBalance.card("embestida_nitro").cost,
      damage: window.CombatBalance.card("embestida_nitro").damage,
      description: "Golpe pesado: mayor riesgo de variación, pero más daño y crítico."
    }),
    escudo_dark: Object.freeze({
      id: "escudo_dark",
      name: "ESCUDO DARK",
      type: CARD_TYPES.DEFEND,
      cost: window.CombatBalance.card("escudo_dark").cost,
      damage: window.CombatBalance.card("escudo_dark").damage,
      description: "Reduce a la mitad el próximo daño recibido. Consume una acción."
    })
  });

  const INITIAL_DECK = Object.freeze([
    "disparo_neon", "disparo_neon", "disparo_neon",
    "embestida_nitro", "embestida_nitro",
    "escudo_dark", "escudo_dark"
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