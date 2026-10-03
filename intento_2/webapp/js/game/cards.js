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
      id: "disparo_neon", cardId: "disparo_neon", name: "DISPARO NEÓN",
      type: CARD_TYPES.ATTACK, characterId: null, class: "STRIKER", subrole: "PRESSURE",
      cost: window.CombatBalance.card("disparo_neon").cost,
      damage: window.CombatBalance.card("disparo_neon").damage,
      breakDamage: window.CombatBalance.card("disparo_neon").breakDamage,
      cooldownMs: window.CombatBalance.card("disparo_neon").cooldownMs,
      targeting: "single_enemy",
      description: "Skill ofensiva rápida: daño y presión de BREAK.",
      effects: Object.freeze({ damage: 16, breakDamage: 10 })
    }),
    embestida_nitro: Object.freeze({
      id: "embestida_nitro", cardId: "embestida_nitro", name: "EMBESTIDA NITRO",
      type: CARD_TYPES.ATTACK, characterId: null, class: "STRIKER", subrole: "IMPACT",
      cost: window.CombatBalance.card("embestida_nitro").cost,
      damage: window.CombatBalance.card("embestida_nitro").damage,
      breakDamage: window.CombatBalance.card("embestida_nitro").breakDamage,
      cooldownMs: window.CombatBalance.card("embestida_nitro").cooldownMs,
      targeting: "single_enemy",
      description: "Skill pesada: gran daño, gran presión de BREAK.",
      effects: Object.freeze({ damage: 28, breakDamage: 18 })
    }),
    derrape_expuesto: Object.freeze({
      id: "derrape_expuesto", cardId: "derrape_expuesto", name: "DERRAPE EXPUESTO",
      type: CARD_TYPES.ATTACK, characterId: null, class: "STRIKER", subrole: "SETUP",
      cost: window.CombatBalance.card("derrape_expuesto").cost,
      damage: window.CombatBalance.card("derrape_expuesto").damage,
      breakDamage: window.CombatBalance.card("derrape_expuesto").breakDamage,
      cooldownMs: window.CombatBalance.card("derrape_expuesto").cooldownMs,
      targeting: "single_enemy",
      description: "Si el enemigo está EXPOSED, añade daño y prepara el BREAK.",
      effects: Object.freeze({ damage: 12, breakDamage: 22, conditional: "TARGET_EXPOSED", bonus: 10 })
    }),
    escudo_dark: Object.freeze({
      id: "escudo_dark", cardId: "escudo_dark", name: "ESCUDO DARK",
      type: CARD_TYPES.DEFENSE, characterId: null, class: "DEFENDER", subrole: "STABILITY",
      cost: window.CombatBalance.card("escudo_dark").cost,
      damage: 0, breakDamage: 0, cooldownMs: window.CombatBalance.card("escudo_dark").cooldownMs,
      targeting: "self",
      description: "Shield temporal que absorbe daño durante 1.4 s.",
      effects: Object.freeze({ block: 18, durationMs: 1400 })
    }),
    barricada_neon: Object.freeze({
      id: "barricada_neon", cardId: "barricada_neon", name: "BARRICADA NEÓN",
      type: CARD_TYPES.DEFENSE, characterId: null, class: "DEFENDER / SUPPORT", subrole: "SUSTAIN",
      cost: window.CombatBalance.card("barricada_neon").cost,
      damage: 0, breakDamage: 0, cooldownMs: window.CombatBalance.card("barricada_neon").cooldownMs,
      targeting: "self",
      description: "Shield fuerte + recupera 10 Energy.",
      effects: Object.freeze({ block: 28, durationMs: 1800, energyGain: 10 })
    }),
    espejo_urbano: Object.freeze({
      id: "espejo_urbano", cardId: "espejo_urbano", name: "ESPEJO URBANO",
      type: CARD_TYPES.DEFENSE, characterId: null, class: "DEFENDER / DEBUFFER", subrole: "SETUP",
      cost: window.CombatBalance.card("espejo_urbano").cost,
      damage: 0, breakDamage: 0, cooldownMs: window.CombatBalance.card("espejo_urbano").cooldownMs,
      targeting: "self",
      description: "Shield corto; deja al enemigo EXPOSED.",
      effects: Object.freeze({ block: 12, durationMs: 1200, applyStatus: "EXPOSED", statusDurationMs: 1500, statusTarget: "enemy" })
    }),
    lectura_tactica: Object.freeze({
      id: "lectura_tactica", cardId: "lectura_tactica", name: "LECTURA TÁCTICA",
      type: CARD_TYPES.SKILL, characterId: null, class: "SUPPORT", subrole: "TEMPO",
      cost: window.CombatBalance.card("lectura_tactica").cost,
      damage: 0, breakDamage: 0, cooldownMs: window.CombatBalance.card("lectura_tactica").cooldownMs,
      targeting: "self",
      description: "Roba 2 skills sin detener la pelea.",
      effects: Object.freeze({ draw: 2 })
    }),
    sobrecarga: Object.freeze({
      id: "sobrecarga", cardId: "sobrecarga", name: "SOBRECARGA",
      type: CARD_TYPES.SKILL, characterId: null, class: "SUPPORT", subrole: "ENERGY SUPPORT",
      cost: window.CombatBalance.card("sobrecarga").cost,
      damage: 0, breakDamage: 0, cooldownMs: window.CombatBalance.card("sobrecarga").cooldownMs,
      targeting: "self",
      description: "Convierte un hueco de tiempo en +26 Energy.",
      effects: Object.freeze({ energyGain: 26 })
    }),
    pulso_debilitante: Object.freeze({
      id: "pulso_debilitante", cardId: "pulso_debilitante", name: "PULSO DEBILITANTE",
      type: CARD_TYPES.SKILL, characterId: null, class: "DEBUFFER", subrole: "SETUP",
      cost: window.CombatBalance.card("pulso_debilitante").cost,
      damage: 0, breakDamage: 12, cooldownMs: window.CombatBalance.card("pulso_debilitante").cooldownMs,
      targeting: "single_enemy",
      description: "Skill de setup: WEAK + presión de BREAK.",
      effects: Object.freeze({ applyStatus: "WEAK", statusDurationMs: 2200, breakDamage: 12 })
    }),
    yuri_racha_neon: Object.freeze({
      id: "yuri_racha_neon", cardId: "yuri_racha_neon", name: "RACHA NEÓN",
      type: CARD_TYPES.ATTACK, characterId: "yuri", class: "STRIKER", subrole: "SPEED",
      cost: 22, damage: 7, breakDamage: 4, cooldownMs: 900,
      targeting: "single_enemy",
      description: "Tres impactos rápidos que acumulan presión de BREAK.",
      effects: Object.freeze({ multiHit: { hits: 3, damagePerHit: 7, breakDamagePerHit: 4 } })
    }),
    yuri_impulso_mach: Object.freeze({
      id: "yuri_impulso_mach", cardId: "yuri_impulso_mach", name: "IMPULSO MACH",
      type: CARD_TYPES.SKILL, characterId: "yuri", class: "STRIKER", subrole: "TEMPO",
      cost: 20, damage: 0, breakDamage: 0, cooldownMs: 1800,
      targeting: "self",
      description: "Aumenta temporalmente el daño infligido para encadenar el siguiente pico.",
      effects: Object.freeze({ buff: { type: "DAMAGE_OUT", amount: 0.25, durationMs: 2200, stacking: "replace" } })
    }),
    yuri_derrape_expuesto: Object.freeze({
      id: "yuri_derrape_expuesto", cardId: "yuri_derrape_expuesto", name: "DERRAPE YURI",
      type: CARD_TYPES.ATTACK, characterId: "yuri", class: "STRIKER", subrole: "SETUP PAYOFF",
      cost: 20, damage: 12, breakDamage: 18, cooldownMs: 1100,
      targeting: "single_enemy",
      description: "Castiga un enemigo EXPOSED y convierte la apertura en BREAK.",
      effects: Object.freeze({ conditional: "TARGET_EXPOSED", bonus: 10 })
    }),
    yuri_break_drive: Object.freeze({
      id: "yuri_break_drive", cardId: "yuri_break_drive", name: "LÍNEA DE RUPTURA",
      type: CARD_TYPES.ATTACK, characterId: "yuri", class: "STRIKER", subrole: "BREAK",
      cost: 24, damage: 14, breakDamage: 20, cooldownMs: 1400,
      targeting: "single_enemy",
      description: "Golpe comprometido para forzar la ventana BREAK.",
      effects: Object.freeze({ damage: 14, breakDamage: 20 })
    }),
    support_repair_burst: Object.freeze({
      id: "support_repair_burst", cardId: "support_repair_burst", name: "REPARACIÓN DE PIT",
      type: CARD_TYPES.SKILL, characterId: "test_support", class: "SUPPORT", subrole: "HEALER",
      cost: 18, damage: 0, breakDamage: 0, cooldownMs: 1200,
      targeting: "self",
      description: "Recupera HP sin superar el máximo.",
      effects: Object.freeze({ heal: 32 })
    }),
    support_sync: Object.freeze({
      id: "support_sync", cardId: "support_sync", name: "SYNC DE EQUIPO",
      type: CARD_TYPES.SKILL, characterId: "test_support", class: "SUPPORT", subrole: "BUFFER",
      cost: 18, damage: 0, breakDamage: 0, cooldownMs: 1800,
      targeting: "self",
      description: "Aumenta el daño infligido durante 2.5 s. No acumula.",
      effects: Object.freeze({ buff: { type: "DAMAGE_OUT", amount: 0.15, durationMs: 2500, stacking: "replace" } })
    }),
    support_clean_slate: Object.freeze({
      id: "support_clean_slate", cardId: "support_clean_slate", name: "LIMPIEZA CLARA",
      type: CARD_TYPES.SKILL, characterId: "test_support", class: "SUPPORT", subrole: "CLEANSE",
      cost: 14, damage: 0, breakDamage: 0, cooldownMs: 1400,
      targeting: "self",
      description: "Elimina WEAK y EXPOSED del objetivo.",
      effects: Object.freeze({ cleanse: ["WEAK", "EXPOSED"] })
    }),
    support_safety_field: Object.freeze({
      id: "support_safety_field", cardId: "support_safety_field", name: "CAMPO DE SEGURIDAD",
      type: CARD_TYPES.SKILL, characterId: "test_support", class: "SUPPORT", subrole: "PROTECTION",
      cost: 20, damage: 0, breakDamage: 0, cooldownMs: 2000,
      targeting: "self",
      description: "Reduce el daño de HP recibido durante 1.8 s. No es Shield.",
      effects: Object.freeze({ damageReduction: { amount: 0.4, durationMs: 1800, stacking: "replace" } })
    })
  });

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

  function clone(value) { return JSON.parse(JSON.stringify(value)); }

  function definitionFor(cardId) {
    return CARD_DEFINITIONS[String(cardId)] || null;
  }

  function createPhysicalCard(cardId, index) {
    const definition = definitionFor(cardId);
    if (!definition) throw new Error("UNKNOWN_CARD:" + String(cardId));
    return { instanceId: cardId + "-" + index, cardId };
  }

  // Low-level factory default; player-facing capacity is owned by GameState.
  const FACTORY_DEFAULT_HAND_LIMIT = 4;

  function createCombatDeckState(handLimit = FACTORY_DEFAULT_HAND_LIMIT, cardIds = INITIAL_DECK) {
    const ids = Array.isArray(cardIds) && cardIds.length
      ? cardIds.map(String)
      : [...INITIAL_DECK];
    return {
      handLimit: Math.max(1, Number(handLimit) || 5),
      drawPile: ids.map(createPhysicalCard),
      hand: [],
      discardPile: [],
      recycleCount: 0,
      events: []
    };
  }

  function drawCard(state) {
    if (!state || state.hand.length >= state.handLimit) return null;
    if (state.drawPile.length === 0 && state.discardPile.length > 0) {
      state.drawPile = state.discardPile.splice(0);
      state.recycleCount = Math.max(0, Number(state.recycleCount) || 0) + 1;
      if (Array.isArray(state.events)) {
        state.events.push({
          type: "deck_recycled",
          recycleCount: state.recycleCount
        });
      }
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

  function refillHand(state) {
    while (state?.hand?.length < state?.handLimit) {
      const before = state.drawPile.length + state.discardPile.length;
      if (!drawCard(state)) break;
      if (state.drawPile.length + state.discardPile.length >= before && !state.drawPile.length && !state.discardPile.length) break;
    }
    return state?.hand || [];
  }

  function hydrateCard(card) {
    const definition = definitionFor(card?.cardId);
    return definition ? { ...clone(definition), instanceId: card.instanceId } : null;
  }

  window.CardSystem = Object.freeze({
    CARD_TYPES, CARD_DEFINITIONS, INITIAL_DECK,
    definitionFor, createCombatDeckState, drawCard, drawCards,
    cardInHand, playCard, refillHand, hydrateCard
  });
})();