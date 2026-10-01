(() => {
  "use strict";

  const CHARACTER_DEFINITIONS = Object.freeze({
    yuri: Object.freeze({
      characterId: "yuri",
      displayName: "YURI",
      class: "STRIKER",
      subrole: "SPEED / BREAK",
      status: "CURRENT PROPOSED PLAYABLE KIT",
      testOnly: false,
      cardIds: Object.freeze([
        "yuri_racha_neon",
        "yuri_impulso_mach",
        "yuri_derrape_expuesto",
        "yuri_break_drive"
      ])
    }),
    test_support: Object.freeze({
      characterId: "test_support",
      displayName: "TEST SUPPORT",
      class: "SUPPORT",
      subrole: "HYBRID SUPPORT",
      status: "TEST-ONLY CHARACTER",
      testOnly: true,
      cardIds: Object.freeze([
        "support_repair_burst",
        "support_sync",
        "support_clean_slate",
        "support_safety_field"
      ])
    })
  });

  function definitionFor(characterId) {
    return CHARACTER_DEFINITIONS[String(characterId)] || null;
  }

  function cardIdsFor(characterId) {
    const definition = definitionFor(characterId);
    return definition ? [...definition.cardIds] : [];
  }

  function isTestOnly(characterId) {
    return Boolean(definitionFor(characterId)?.testOnly);
  }

  window.CharacterKitSystem = Object.freeze({
    CHARACTER_DEFINITIONS,
    definitionFor,
    cardIdsFor,
    isTestOnly
  });
})();