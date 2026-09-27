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
      cost: 1,
      damage: 18,
      description: "Ataque directo que inflige 18 de daño."
    }),
    embestida_nitro: Object.freeze({
      id: "embestida_nitro",
      name: "EMBESTIDA NITRO",
      type: CARD_TYPES.ATTACK,
      cost: 2,
      damage: 38,
      description: "Ataque pesado que inflige 38 de daño."
    }),
    escudo_dark: Object.freeze({
      id: "escudo_dark",
      name: "ESCUDO DARK",
      type: CARD_TYPES.DEFEND,
      cost: 1,
      damage: 0,
      description: "Activa defensa simple y reduce a la mitad el próximo daño recibido."
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

  function createDeck() {
    return INITIAL_DECK.map((cardId, index) => ({
      instanceId: "card-" + String(index + 1),
      cardId
    }));
  }

  function createCombatDeckState(handLimit = 4) {
    const drawPile = createDeck();
    return {
      handLimit: Math.max(1, Number(handLimit) || 4),
      drawPile,
      hand: [],
      discardPile: []
    };
  }

  function drawCards(combat, count = 1) {
    const drawn = [];
    const amount = Math.max(0, Number(count) || 0);

    for (let i = 0; i < amount; i += 1) {
      if (combat.hand.length >= combat.handLimit) break;

      if (combat.drawPile.length === 0 && combat.discardPile.length > 0) {
        combat.drawPile = combat.discardPile.splice(0);
      }

      if (combat.drawPile.length === 0) break;

      const card = combat.drawPile.shift();
      combat.hand.push(card);
      drawn.push(clone(card));
    }

    return drawn;
  }

  function cardInHand(combat, cardInstanceId) {
    return combat.hand.find((card) => card.instanceId === String(cardInstanceId)) || null;
  }

  function playCard(combat, cardInstanceId) {
    const index = combat.hand.findIndex((card) => card.instanceId === String(cardInstanceId));
    if (index < 0) return null;

    const [card] = combat.hand.splice(index, 1);
    combat.discardPile.push(card);
    return clone(card);
  }

  function discardCard(combat, cardInstanceId) {
    return playCard(combat, cardInstanceId);
  }

  function hydrateCard(card) {
    const definition = definitionFor(card?.cardId);
    return definition ? { ...clone(definition), instanceId: card.instanceId } : null;
  }

  window.CardSystem = Object.freeze({
    CARD_TYPES,
    CARD_DEFINITIONS,
    INITIAL_DECK,
    createDeck,
    createCombatDeckState,
    drawCards,
    cardInHand,
    playCard,
    discardCard,
    definitionFor,
    hydrateCard
  });
})();