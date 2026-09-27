(() => {
  "use strict";

  const ARCHETYPES = Object.freeze({
    AGGRESSIVE: "AGGRESSIVE",
    DEFENSIVE: "DEFENSIVE",
    TACTICAL: "TACTICAL",
    ELITE: "ELITE"
  });

  const ENEMY_DEFINITIONS = Object.freeze({
    street_punk: Object.freeze({
      id: "street_punk",
      name: "STREET PUNK",
      archetype: ARCHETYPES.AGGRESSIVE,
      maxHp: 100,
      attack: 14,
      defense: 0,
      actions: Object.freeze(["ATTACK"]),
      aiProfile: "AGGRESSIVE_ATTACK"
    }),
    iron_guard: Object.freeze({
      id: "iron_guard",
      name: "IRON GUARD",
      archetype: ARCHETYPES.DEFENSIVE,
      maxHp: 130,
      attack: 10,
      defense: 6,
      actions: Object.freeze(["ATTACK", "DEFEND"]),
      aiProfile: "DEFEND_LOW_HP"
    }),
    nitro_raider: Object.freeze({
      id: "nitro_raider",
      name: "NITRO RAIDER",
      archetype: ARCHETYPES.TACTICAL,
      maxHp: 110,
      attack: 12,
      defense: 3,
      actions: Object.freeze(["ATTACK", "DEFEND"]),
      aiProfile: "ALTERNATE_TURN"
    }),
    banchou_rookie: Object.freeze({
      id: "banchou_rookie",
      name: "BANCHOU ROOKIE",
      archetype: ARCHETYPES.ELITE,
      maxHp: 180,
      attack: 18,
      defense: 5,
      actions: Object.freeze(["ATTACK", "DEFEND"]),
      aiProfile: "ELITE_PRIORITY"
    })
  });

  const ENEMY_SEQUENCE = Object.freeze([
    "street_punk",
    "iron_guard",
    "nitro_raider",
    "banchou_rookie"
  ]);

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function definitionFor(enemyId) {
    return ENEMY_DEFINITIONS[String(enemyId)] || null;
  }

  function createEnemy(enemyId) {
    const definition = definitionFor(enemyId);
    if (!definition) throw new Error("UNKNOWN_ENEMY:" + String(enemyId));

    return {
      id: definition.id,
      name: definition.name,
      archetype: definition.archetype,
      hp: definition.maxHp,
      maxHp: definition.maxHp,
      stats: {
        atk: definition.attack,
        def: definition.defense,
        skillDamage: definition.attack
      },
      attack: definition.attack,
      defense: definition.defense,
      actions: [...definition.actions],
      availableActions: [...definition.actions],
      aiProfile: definition.aiProfile,
      defending: false
    };
  }

  function sequenceAt(index) {
    const safeIndex = Math.max(0, Number(index) || 0);
    return ENEMY_SEQUENCE[safeIndex % ENEMY_SEQUENCE.length];
  }

  window.EnemyCatalog = Object.freeze({
    ARCHETYPES,
    ENEMY_DEFINITIONS,
    ENEMY_SEQUENCE,
    definitionFor,
    createEnemy,
    sequenceAt,
    clone
  });
})();