(() => {
  "use strict";

  const ARCHETYPES = Object.freeze({
    AGGRESSIVE: "AGGRESSIVE",
    DEFENSIVE: "DEFENSIVE",
    TACTICAL: "TACTICAL",
    ELITE: "ELITE"
  });

  const IDENTITY = Object.freeze({
    street_punk: Object.freeze({ visualProfile: "street-rider", combatProfile: "pressure", futurePlayableProfile: "aggressive-rider" }),
    iron_guard: Object.freeze({ visualProfile: "armored-guard", combatProfile: "fortress", futurePlayableProfile: "defensive-rider" }),
    nitro_raider: Object.freeze({ visualProfile: "nitro-raider", combatProfile: "tempo", futurePlayableProfile: "tactical-rider" }),
    banchou_rookie: Object.freeze({ visualProfile: "rookie-banchou", combatProfile: "elite", futurePlayableProfile: "elite-rider" })
  });

  const META = Object.freeze({
    street_punk: Object.freeze({ name: "STREET PUNK", archetype: ARCHETYPES.AGGRESSIVE, actions: Object.freeze(["ATTACK"]), aiProfile: "AGGRESSIVE_ATTACK" }),
    iron_guard: Object.freeze({ name: "IRON GUARD", archetype: ARCHETYPES.DEFENSIVE, actions: Object.freeze(["ATTACK", "DEFEND"]), aiProfile: "DEFEND_LOW_HP" }),
    nitro_raider: Object.freeze({ name: "NITRO RAIDER", archetype: ARCHETYPES.TACTICAL, actions: Object.freeze(["ATTACK", "DEFEND"]), aiProfile: "ALTERNATE_TURN" }),
    banchou_rookie: Object.freeze({ name: "BANCHOU ROOKIE", archetype: ARCHETYPES.ELITE, actions: Object.freeze(["ATTACK", "DEFEND"]), aiProfile: "ELITE_PRIORITY" })
  });

  const ENEMY_SEQUENCE = Object.freeze(Object.keys(META));

  function definitionFor(enemyId) {
    const id = String(enemyId);
    const balance = window.CombatBalance.enemy(id);
    const meta = META[id];
    if (!balance || !meta) return null;
    return Object.freeze({
      id,
      name: meta.name,
      archetype: meta.archetype,
      maxHp: balance.maxHp,
      attack: balance.attack,
      defense: balance.defense,
      actions: meta.actions,
      aiProfile: balance.aiProfile,
      identity: IDENTITY[id]
    });
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
      stats: { atk: definition.attack, def: definition.defense, skillDamage: definition.attack },
      attack: definition.attack,
      defense: definition.defense,
      actions: [...definition.actions],
      availableActions: [...definition.actions],
      aiProfile: definition.aiProfile,
      identity: { ...definition.identity },
      defending: false
    };
  }

  function sequenceAt(index) {
    const safeIndex = Math.max(0, Number(index) || 0);
    return ENEMY_SEQUENCE[safeIndex % ENEMY_SEQUENCE.length];
  }

  window.EnemyCatalog = Object.freeze({
    ARCHETYPES,
    ENEMY_SEQUENCE,
    definitionFor,
    createEnemy,
    sequenceAt
  });
})();