import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

const FILES = [
  "intento_2/webapp/js/scene/world_space.js",
  "intento_2/webapp/js/scene/camera.js",
  "intento_2/webapp/js/scene/animation.js",
  "intento_2/webapp/js/scene/presentation_events.js",
  "intento_2/webapp/js/scene/actor.js",
  "intento_2/webapp/js/scene/scene.js",
  "intento_2/webapp/js/scene/renderer.js",
  "intento_2/webapp/js/combat_shot_director.js",
  "intento_2/webapp/js/combat_presentation.js"
];

async function loadPresentation() {
  let now = 0;
  const gradient = { addColorStop() {} };
  const context = {
    save() {},
    restore() {},
    translate() {},
    scale() {},
    rotate() {},
    setTransform() {},
    clearRect() {},
    fillRect() {},
    strokeRect() {},
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    fill() {},
    arc() {},
    ellipse() {},
    arcTo() {},
    drawImage() {},
    fillText() {},
    strokeText() {},
    setLineDash() {},
    createLinearGradient() { return gradient; },
    createRadialGradient() { return gradient; },
    measureText() { return { width: 0 }; }
  };
  const canvas = { getBoundingClientRect: () => ({ width: 1000, height: 600 }) };

  const window = {
    BreakSystem: { isBroken: () => false },
    BurstSystem: { canUse: () => false, chargeOf: () => 0, maxChargeOf: () => 100 }
  };

  const contextVm = vm.createContext({
    window,
    performance: { now: () => now },
    Math, Number, String, Object, Map, JSON,
    console
  });

  for (const file of FILES) {
    const source = await readFile(file, "utf8");
    vm.runInContext(source, contextVm, { filename: file });
  }

  return {
    presentation: contextVm.window.CombatPresentation.create(canvas, context),
    setNow(value) { now = value; }
  };
}

function actorFrom(snapshot, id) {
  return snapshot.layers.ACTORS.find((actor) => actor.id === id);
}

const REAL_GAME_FILES = [
  "intento_2/webapp/js/game/balance.js",
  "intento_2/webapp/js/game/rng.js",
  "intento_2/webapp/js/game/status.js",
  "intento_2/webapp/js/game/modifiers.js",
  "intento_2/webapp/js/game/energy.js",
  "intento_2/webapp/js/game/effects.js",
  "intento_2/webapp/js/game/cards.js",
  "intento_2/webapp/js/game/character_kits.js",
  "intento_2/webapp/js/game/abilities.js",
  "intento_2/webapp/js/game/combat_clock.js",
  "intento_2/webapp/js/game/auto_attack.js",
  "intento_2/webapp/js/game/break.js",
  "intento_2/webapp/js/game/burst.js",
  "intento_2/webapp/js/game/enemies.js",
  "intento_2/webapp/js/game/enemy_behavior.js",
  "intento_2/webapp/js/game/state.js",
  "intento_2/webapp/js/game/actions.js",
  "intento_2/webapp/js/game/skill_resolver.js",
  "intento_2/webapp/js/game/rules.js",
  "intento_2/webapp/js/scene/mesh_deformation.js",
  "intento_2/webapp/js/scene/procedural_motion.js",
  "intento_2/webapp/js/scene/lighting.js",
  ...FILES
];

async function loadRealCombatPresentation() {
  let now = 0;
  const drawnTexts = [];
  const gradient = { addColorStop() {} };
  const context = {
    save() {},
    restore() {},
    translate() {},
    scale() {},
    rotate() {},
    setTransform() {},
    clearRect() {},
    fillRect() {},
    strokeRect() {},
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    fill() {},
    arc() {},
    ellipse() {},
    arcTo() {},
    drawImage() {},
    fillText(text) { drawnTexts.push(String(text)); },
    strokeText() {},
    setLineDash() {},
    createLinearGradient() { return gradient; },
    createRadialGradient() { return gradient; },
    measureText() { return { width: 0 }; }
  };
  const canvas = { getBoundingClientRect: () => ({ width: 1000, height: 600 }) };
  const window = {
    MachGirlsPresentationEvents: { create: () => ({ fromAction: () => null }) }
  };
  const contextVm = vm.createContext({
    window,
    performance: { now: () => now },
    Math, Number, String, Object, Map, JSON,
    console
  });

  for (const file of REAL_GAME_FILES) {
    const source = await readFile(file, "utf8");
    vm.runInContext(source, contextVm, { filename: file });
  }

  return {
    window: contextVm.window,
    presentation: contextVm.window.CombatPresentation.create(canvas, context),
    setNow(value) { now = value; },
    drawnTexts,
    clearDrawnTexts() { drawnTexts.length = 0; }
  };
}

function runFrame(presentation, setNow, combat, now) {
  setNow(now);
  presentation.render(combat, now);
  return presentation.getSceneFoundation();
}



async function createCombatEntrypointHarness(search = "?phase29=impulso") {
  let now = 0;
  const elements = new Map();

  function makeElement(id = "") {
    const listeners = new Map();
    const element = {
      id,
      children: [],
      parentElement: null,
      dataset: {},
      style: {},
      hidden: false,
      disabled: false,
      textContent: "",
      innerHTML: "",
      className: "",
      setAttribute(name, value) {
        this[name] = String(value);
      },
      addEventListener(type, listener) {
        const list = listeners.get(type) || [];
        list.push(listener);
        listeners.set(type, list);
      },
      dispatch(type) {
        for (const listener of listeners.get(type) || []) {
          listener({ currentTarget: this, target: this });
        }
      },
      appendChild(child) {
        if (child.parentElement) {
          child.parentElement.children = child.parentElement.children.filter((entry) => entry !== child);
        }
        child.parentElement = this;
        this.children.push(child);
        return child;
      },
      insertBefore(child, reference) {
        if (child.parentElement) {
          child.parentElement.children = child.parentElement.children.filter((entry) => entry !== child);
        }
        child.parentElement = this;
        if (!reference) {
          this.children.push(child);
          return child;
        }
        const index = this.children.indexOf(reference);
        if (index < 0) this.children.push(child);
        else this.children.splice(index, 0, child);
        return child;
      },
      replaceChildren(...children) {
        for (const child of this.children) child.parentElement = null;
        this.children = [];
        for (const child of children) this.appendChild(child);
      },
      remove() {
        if (this.parentElement) {
          this.parentElement.children = this.parentElement.children.filter((entry) => entry !== this);
          this.parentElement = null;
        }
      }
    };
    return element;
  }

  const gradient = { addColorStop() {} };
  const context = {
    save() {},
    restore() {},
    translate() {},
    scale() {},
    rotate() {},
    setTransform() {},
    clearRect() {},
    fillRect() {},
    strokeRect() {},
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    fill() {},
    arc() {},
    ellipse() {},
    arcTo() {},
    drawImage() {},
    fillText() {},
    strokeText() {},
    setLineDash() {},
    createLinearGradient() { return gradient; },
    createRadialGradient() { return gradient; },
    measureText() { return { width: 0 }; }
  };

  const canvas = makeElement("combat-canvas");
  canvas.getContext = () => context;
  canvas.getBoundingClientRect = () => ({ width: 1000, height: 600 });

  const document = {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, id === "combat-canvas" ? canvas : makeElement(id));
      return elements.get(id);
    },
    createElement(tagName) {
      const element = makeElement();
      element.tagName = String(tagName).toUpperCase();
      return element;
    }
  };

  const window = {
    location: { search },
    document,
    devicePixelRatio: 1,
    MachGirlsPresentationEvents: {
      create: () => ({
        fromAction: () => null,
        fromCombatEvent: (event) => ({
          type: { ATTACK_START: "ATTACK", DAMAGE_APPLIED: "IMPACT", BREAK_TRIGGER: "BREAK", BURST_START: "BURST" }[event.type] || null,
          action: {
            actionId: event.actionId,
            actionType: event.actionType,
            actorId: event.sourceRole,
            targetId: event.targetRole,
            source: event.sourceRole,
            cardId: event.cardId || "",
            damage: event.damage || 0,
            breakDamage: event.breakDamage || 0,
            hitCount: event.hitCount
          }
        })
      })
    },
    requestAnimationFrame: () => 1,
    addEventListener() {},
    setTimeout() {}
  };

  const contextVm = vm.createContext({
    window,
    document,
    performance: { now: () => now },
    Math, Number, String, Object, Map, JSON, Date, Promise, console
  });

  for (const file of REAL_GAME_FILES) {
    const source = await readFile(file, "utf8");
    vm.runInContext(source, contextVm, { filename: file });
  }

  const combatSource = await readFile("intento_2/webapp/js/combat.js", "utf8");
  vm.runInContext(combatSource, contextVm, { filename: "intento_2/webapp/js/combat.js" });

  return {
    window: contextVm.window,
    document,
    hand: document.getElementById("combat-hand"),
    setNow(value) { now = Number(value) || 0; }
  };
}

test("resolved attack produces ATTACK state, world movement, distinct contact recoil and recovery", async () => {
  const { presentation, setNow } = await loadPresentation();
  const combat = {
    battleId: "test-battle",
    outcome: "IN_PROGRESS",
    player: { id: "player-1", hp: 100, maxHp: 100, identity: { characterId: "yuri" } },
    enemy: { id: "iron_guard", hp: 100, maxHp: 100, breakState: { current: 0, max: 100 } }
  };

  presentation.onCombatStart(combat);
  const actionAt = 1000;
  setNow(actionAt);
  presentation.onCombatEvent(combat, {
    type: "ATTACK_START",
    actionId: "attack-1",
    actionType: "CARD",
    sourceRole: "PLAYER",
    targetRole: "ENEMY_PRIMARY",
    characterId: "yuri",
    cardId: "",
    hitCount: 1,
    simulationTick: 1,
    elapsedMs: 0
  });

  const start = runFrame(presentation, setNow, combat, actionAt);
  const playerStart = actorFrom(start, "scene:PLAYER");
  const enemyStart = actorFrom(start, "scene:ENEMY_PRIMARY");

  assert.equal(playerStart.transform.state, "ATTACK");
  assert.equal(enemyStart.transform.x, 690);

  const move = runFrame(presentation, setNow, combat, 1050);
  const playerMove = actorFrom(move, "scene:PLAYER");
  assert.notEqual(playerMove.transform.x, playerStart.transform.x);
  assert.equal(playerMove.transform.state, "ATTACK");

  setNow(1050);
  presentation.onCombatEvent(combat, {
    type: "DAMAGE_APPLIED",
    actionId: "attack-1",
    actionType: "CARD",
    sourceRole: "PLAYER",
    targetRole: "ENEMY_PRIMARY",
    characterId: "yuri",
    cardId: "",
    damage: 12,
    breakDamage: 0,
    hitIndex: 0,
    hitCount: 1,
    simulationTick: 2,
    elapsedMs: 100
  });

  const preContact = runFrame(presentation, setNow, combat, 1090);
  assert.equal(actorFrom(preContact, "scene:ENEMY_PRIMARY").transform.x, 690);

  const hitStop = runFrame(presentation, setNow, combat, 1160);
  assert.equal(actorFrom(hitStop, "scene:ENEMY_PRIMARY").transform.x, 690);

  const postContact = runFrame(presentation, setNow, combat, 1330);
  const enemyPostContact = actorFrom(postContact, "scene:ENEMY_PRIMARY");
  assert.notEqual(enemyPostContact.transform.x, 690);
  assert.equal(enemyPostContact.transform.state, "HIT");

  const recovery = runFrame(presentation, setNow, combat, 2000);
  const playerRecovery = actorFrom(recovery, "scene:PLAYER");
  const enemyRecovery = actorFrom(recovery, "scene:ENEMY_PRIMARY");
  assert.equal(playerRecovery.transform.x, 310);
  assert.ok(Math.abs(playerRecovery.transform.y - 336) < 1e-9);
  assert.equal(enemyRecovery.transform.x, 690);
  assert.ok(Math.abs(enemyRecovery.transform.y - 336) < 1e-9);
  assert.equal(playerRecovery.transform.state, "IDLE");
  assert.equal(enemyRecovery.transform.state, "IDLE");
  assert.equal(presentation.getAttackStyleState(), null);
  assert.equal(presentation.getShotState(2000).name, "PLAYER_FOCUS");
});

test("explicit presentation recovery returns BREAK and BURST to a stable player focus shot", async () => {
  for (const action of [
    {
      actionId: "break-recovery-1",
      actionType: "CARD",
      source: "PLAYER",
      targetId: "iron_guard",
      broke: true,
      damage: 0,
      breakDamage: 0,
      blockAbsorbed: 0
    },
    {
      actionId: "burst-recovery-1",
      actionType: "BURST",
      source: "PLAYER",
      targetId: "iron_guard",
      damage: 20,
      breakDamage: 0,
      blockAbsorbed: 0
    }
  ]) {
    const { presentation, setNow } = await loadPresentation();
    const combat = {
      battleId: action.actionId,
      outcome: "IN_PROGRESS",
      player: { id: "player-1", hp: 100, maxHp: 100, identity: { characterId: "yuri" } },
      enemy: { id: "iron_guard", hp: 100, maxHp: 100, breakState: { current: 0, max: 100 } }
    };

    presentation.onCombatStart(combat);
    setNow(1000);
    presentation.onAction(combat, action);
    assert.ok(["BREAK", "BURST"].includes(presentation.getShotState(1000).name));

    setNow(2000);
    presentation.render(combat, 2000);
    assert.equal(presentation.getShotState(2000).name, "PLAYER_FOCUS");
    assert.equal(presentation.getAttackStyleState(), null);

    const foundation = presentation.getSceneFoundation();
    assert.equal(actorFrom(foundation, "scene:PLAYER").transform.state, "IDLE");
    assert.equal(actorFrom(foundation, "scene:ENEMY_PRIMARY").transform.state, "IDLE");
  }
});


test("animation state names used by presentation map to the real animation machine", async () => {
  const { presentation, setNow } = await loadPresentation();
  const combat = {
    battleId: "test-battle-2",
    outcome: "IN_PROGRESS",
    player: { id: "player-1", hp: 100, maxHp: 100, identity: { characterId: "yuri" } },
    enemy: { id: "iron_guard", hp: 100, maxHp: 100, breakState: { current: 0, max: 100 } }
  };

  presentation.onCombatStart(combat);
  setNow(1000);
  presentation.onAction(combat, {
    actionId: "attack-2",
    actionType: "CARD",
    source: "PLAYER",
    targetId: "iron_guard",
    damage: 10
  });

  const foundation = runFrame(presentation, setNow, combat, 1200);
  assert.equal(actorFrom(foundation, "scene:PLAYER").transform.state, "ATTACK");
  assert.equal(actorFrom(foundation, "scene:ENEMY_PRIMARY").transform.state, "HIT");

  setNow(2000);
  runFrame(presentation, setNow, combat, 2000);
  assert.equal(actorFrom(presentation.getSceneFoundation(), "scene:PLAYER").transform.state, "IDLE");
  assert.equal(actorFrom(presentation.getSceneFoundation(), "scene:ENEMY_PRIMARY").transform.state, "IDLE");
});


test("Yuri Racha Neon preserves ability identity and applies its character-specific attack style", async () => {
  const { presentation, setNow } = await loadPresentation();
  const combat = {
    battleId: "yuri-racha-neon-style",
    outcome: "IN_PROGRESS",
    player: {
      id: "yuri-1",
      hp: 100,
      maxHp: 100,
      identity: { characterId: "yuri" }
    },
    enemy: {
      id: "iron_guard",
      hp: 100,
      maxHp: 100,
      breakState: { current: 0, max: 100 }
    }
  };

  presentation.onCombatStart(combat);
  setNow(1000);
  presentation.onCombatEvent(combat, {
    type: "ATTACK_START",
    actionId: "yuri-racha-neon-1",
    actionType: "CARD",
    sourceRole: "PLAYER",
    targetRole: "ENEMY_PRIMARY",
    characterId: "yuri",
    cardId: "yuri_racha_neon",
    hitCount: 3,
    simulationTick: 1,
    elapsedMs: 0
  });
  presentation.onCombatEvent(combat, {
    type: "DAMAGE_APPLIED",
    actionId: "yuri-racha-neon-1",
    actionType: "CARD",
    sourceRole: "PLAYER",
    targetRole: "ENEMY_PRIMARY",
    characterId: "yuri",
    cardId: "yuri_racha_neon",
    damage: 21,
    breakDamage: 12,
    hitIndex: 0,
    hitCount: 3,
    simulationTick: 2,
    elapsedMs: 100
  });

  const style = presentation.getAttackStyleState();
  assert.equal(style.styleId, "YURI_RACHA_NEON");
  assert.equal(style.characterId, "yuri");
  assert.equal(style.abilityId, "yuri_racha_neon");
  assert.equal(style.actionId, "yuri-racha-neon-1");
  assert.equal(style.attackState, "ATTACK");
  assert.equal(style.hitCount, 3);
  assert.equal(style.contactCount, 3);
  assert.equal(style.cameraShot, "ATTACK_APPROACH");

  const attackFrame = runFrame(presentation, setNow, combat, 1060);
  const player = actorFrom(attackFrame, "scene:PLAYER");
  assert.equal(player.transform.state, "ATTACK");
  assert.ok(player.transform.x > 320);
  assert.ok(player.transform.scale > 1);
  assert.ok(player.transform.rotation > 0);

  const contactFrame = runFrame(presentation, setNow, combat, 1110);
  assert.equal(actorFrom(contactFrame, "scene:ENEMY_PRIMARY").transform.state, "HIT");

  const recovery = runFrame(presentation, setNow, combat, 2000);
  assert.equal(actorFrom(recovery, "scene:PLAYER").transform.state, "IDLE");
  assert.equal(actorFrom(recovery, "scene:ENEMY_PRIMARY").transform.state, "IDLE");
});




test("Yuri Impulso Mach uses non-attack buff presentation and never enters contact presentation", async () => {
  const { window, presentation, setNow, drawnTexts, clearDrawnTexts } = await loadRealCombatPresentation();
  const state = window.GameState.createGameState({ playerId: "yuri-player" });
  const character = window.CharacterKitSystem.definitionFor("yuri");
  const enemy = window.EnemyCatalog.createEnemy("iron_guard");

  window.GameState.startBattle(state, {
    battleId: "yuri-impulso-mach-presentation",
    seed: 290902,
    player: {
      id: "yuri-player",
      hp: 120,
      maxHp: 120,
      stats: { atk: 20, def: 5, skillDamage: 40 }
    },
    enemy,
    characterId: "yuri",
    character,
    cardIds: window.CharacterKitSystem.cardIdsFor("yuri")
  });

  presentation.onCombatStart(state.combat);

  const definition = window.CardSystem.definitionFor("yuri_impulso_mach");
  assert.ok(definition);
  assert.equal(definition.characterId, "yuri");
  assert.equal(definition.type, window.CardSystem.CARD_TYPES.SKILL);
  assert.equal(definition.targeting, "self");
  assert.equal(definition.damage, 0);
  assert.equal(definition.breakDamage, 0);
  assert.equal(definition.effects.buff.type, "DAMAGE_OUT");
  assert.equal(definition.effects.buff.amount, 0.25);
  assert.equal(definition.effects.buff.durationMs, 2200);
  assert.equal(definition.effects.buff.stacking, "replace");

  const card = state.combat.cards.hand.find((entry) => entry.cardId === "yuri_impulso_mach");
  assert.ok(card, "Impulso Mach must be present in the real Yuri deck");

  const enemyHpBefore = state.combat.enemy.hp;
  const enemyBreakBefore = state.combat.enemy.breakState.current;

  setNow(1000);
  const action = window.GameActions.createPlayerSkillAction(state, card.instanceId);
  assert.equal(action.type, "SKILL");
  assert.equal(action.source, "PLAYER_SKILL");
  assert.equal(action.actorId, "yuri-player");
  assert.equal(action.cardId, "yuri_impulso_mach");

  const resolution = window.CombatEngine.resolveAction(state, action);
  assert.equal(resolution.actionType, "SKILL");
  assert.equal(resolution.cardId, "yuri_impulso_mach");
  assert.equal(resolution.damage, 0);
  assert.equal(resolution.breakDamage, 0);
  assert.equal(resolution.hitCount, 0);
  assert.equal(resolution.hits, null);
  assert.equal(resolution.buffApplied.type, "DAMAGE_OUT");
  assert.equal(resolution.buffApplied.amount, 0.25);
  assert.equal(resolution.buffApplied.durationMs, 2200);
  assert.equal(state.combat.enemy.hp, enemyHpBefore);
  assert.equal(state.combat.enemy.breakState.current, enemyBreakBefore);

  presentation.onAction(state.combat, resolution);

  const style = presentation.getPresentationStyleState();
  assert.equal(style.styleId, "YURI_IMPULSO_MACH");
  assert.equal(style.characterId, "yuri");
  assert.equal(style.abilityId, "yuri_impulso_mach");
  assert.equal(style.actionId, resolution.actionId);
  assert.equal(style.presentationType, "BUFF");
  assert.equal(style.cameraShot, "PLAYER_FOCUS");
  assert.equal(presentation.getAttackStyleState(), null);

  const frame = runFrame(presentation, setNow, state.combat, 1060);
  const player = actorFrom(frame, "scene:PLAYER");
  const enemyAtBuff = actorFrom(frame, "scene:ENEMY_PRIMARY");
  assert.equal(player.transform.state, "IDLE");
  assert.equal(enemyAtBuff.transform.state, "IDLE");
  assert.equal(enemyAtBuff.transform.x, 690);
  assert.ok(drawnTexts.some((value) => value === "POWER +25%"));
  assert.equal(drawnTexts.some((value) => value.includes("YURI_RACHA_NEON")), false);
  assert.equal(drawnTexts.some((value) => value.includes("YURI_BREAK_DRIVE")), false);

  clearDrawnTexts();
  const recovery = runFrame(presentation, setNow, state.combat, 1900);
  assert.equal(actorFrom(recovery, "scene:PLAYER").transform.state, "IDLE");
  assert.equal(actorFrom(recovery, "scene:ENEMY_PRIMARY").transform.state, "IDLE");
  assert.equal(actorFrom(recovery, "scene:ENEMY_PRIMARY").transform.x, 690);
  assert.equal(drawnTexts.some((value) => value === "POWER +25%"), false);
});

test("Yuri Break Drive preserves real ability identity with a distinct single-hit presentation", async () => {
  const { window, presentation, setNow } = await loadRealCombatPresentation();
  const state = window.GameState.createGameState({ playerId: "yuri-player" });
  const character = window.CharacterKitSystem.definitionFor("yuri");
  const enemy = window.EnemyCatalog.createEnemy("iron_guard");

  window.GameState.startBattle(state, {
    battleId: "yuri-break-drive-style",
    seed: 290901,
    player: {
      id: "yuri-player",
      hp: 120,
      maxHp: 120,
      stats: { atk: 20, def: 5, skillDamage: 40 }
    },
    enemy,
    characterId: "yuri",
    character,
    cardIds: window.CharacterKitSystem.cardIdsFor("yuri")
  });

  presentation.onCombatStart(state.combat);

  const definition = window.CardSystem.definitionFor("yuri_break_drive");
  assert.ok(definition);
  assert.equal(definition.characterId, "yuri");
  assert.equal(definition.type, window.CardSystem.CARD_TYPES.ATTACK);
  assert.equal(definition.targeting, "single_enemy");

  const card = state.combat.cards.hand.find((entry) => entry.cardId === "yuri_break_drive");
  assert.ok(card, "real Yuri card must be present in the real character deck");

  setNow(1000);
  const action = window.GameActions.createPlayerSkillAction(state, card.instanceId);
  assert.equal(action.type, "SKILL");
  assert.equal(action.source, "PLAYER_SKILL");
  assert.equal(action.actorId, "yuri-player");
  assert.equal(action.targetId, "iron_guard");
  assert.equal(action.cardId, "yuri_break_drive");

  const resolution = window.CombatEngine.resolveAction(state, action);
  assert.equal(resolution.actionType, "SKILL");
  assert.equal(resolution.cardId, "yuri_break_drive");
  assert.equal(resolution.actorId, "yuri-player");
  assert.equal(resolution.targetId, "iron_guard");
  assert.ok(resolution.damage > 0);
  assert.equal(resolution.hitCount, 1);
  assert.equal(resolution.hits, null);
  assert.equal(state.combat.events.some((event) => event.type === "multi_hit"), false);

  presentation.onCombatEvent(state.combat, {
    type: "ATTACK_START",
    actionId: resolution.actionId,
    actionType: resolution.actionType || resolution.type,
    sourceRole: "PLAYER",
    targetRole: "ENEMY_PRIMARY",
    characterId: "yuri",
    cardId: "yuri_break_drive",
    hitCount: 1,
    simulationTick: 1,
    elapsedMs: 0
  });

  presentation.onCombatEvent(state.combat, {
    type: "DAMAGE_APPLIED",
    actionId: resolution.actionId,
    actionType: resolution.actionType || resolution.type,
    sourceRole: "PLAYER",
    targetRole: "ENEMY_PRIMARY",
    characterId: "yuri",
    cardId: "yuri_break_drive",
    damage: Number(resolution.damage || 0),
    breakDamage: Number(resolution.breakDamage || 0),
    hitIndex: 0,
    hitCount: 1,
    simulationTick: 2,
    elapsedMs: 100
  });

  const style = presentation.getAttackStyleState();
  assert.equal(style.styleId, "YURI_BREAK_DRIVE");
  assert.equal(style.characterId, "yuri");
  assert.equal(style.abilityId, "yuri_break_drive");
  assert.equal(style.actionId, resolution.actionId);
  assert.equal(style.attackState, "ATTACK");
  assert.equal(style.hitCount, 1);
  assert.equal(style.contactCount, 1);
  assert.equal(style.cameraShot, "ATTACK_APPROACH");
  assert.notEqual(style.styleId, "YURI_RACHA_NEON");
  assert.notEqual(style.abilityId, "yuri_racha_neon");

  const startFrame = runFrame(presentation, setNow, state.combat, 1000);
  const playerStart = actorFrom(startFrame, "scene:PLAYER");

  const attackFrame = runFrame(presentation, setNow, state.combat, 1060);
  const player = actorFrom(attackFrame, "scene:PLAYER");
  assert.equal(player.transform.state, "ATTACK");
  assert.notEqual(player.transform.x, playerStart.transform.x);
  assert.ok(player.transform.y < 336);
  assert.ok(player.transform.rotation < 0);
  assert.ok(player.transform.scale > 1);

  const contactFrame = runFrame(presentation, setNow, state.combat, 1110);
  const enemyAtContact = actorFrom(contactFrame, "scene:ENEMY_PRIMARY");
  assert.equal(enemyAtContact.transform.state, "HIT");

  const recovery = runFrame(presentation, setNow, state.combat, 2000);
  assert.equal(actorFrom(recovery, "scene:PLAYER").transform.state, "IDLE");
  assert.equal(actorFrom(recovery, "scene:ENEMY_PRIMARY").transform.state, "IDLE");
});


test("phase29=impulso auto-starts real Yuri combat with Impulso Mach ready in the real hand", async () => {
  const { window, hand } = await createCombatEntrypointHarness();

  const state = window.CariCombat.getGameState();
  assert.ok(state);
  assert.ok(state.combat);
  assert.equal(state.combat.outcome, window.GameState.OUTCOME.IN_PROGRESS);
  assert.equal(state.combat.player.identity.characterId, "yuri");
  assert.notEqual(state.combat.player.identity.characterId, "test_support");

  const definition = window.CardSystem.definitionFor("yuri_impulso_mach");
  assert.ok(definition);
  assert.equal(definition.type, window.CardSystem.CARD_TYPES.SKILL);
  assert.equal(definition.characterId, "yuri");
  assert.equal(definition.targeting, "self");
  assert.equal(definition.damage, 0);
  assert.equal(definition.breakDamage, 0);

  const card = state.combat.cards.hand.find((entry) => entry.cardId === "yuri_impulso_mach");
  assert.ok(card, "Impulso Mach must be available in the real Yuri hand");

  const button = hand.children.find((entry) => entry.dataset.cardInstanceId === card.instanceId);
  assert.ok(button, "Impulso Mach must have a real hand button");
  assert.equal(button.disabled, false);
  assert.match(button.innerText || button.textContent || button.innerHTML, /IMPULSO MACH/);

  assert.equal(state.combat.enemy.hp, state.combat.enemy.maxHp);
  assert.equal(
    state.combat.enemy.breakState.current,
    state.combat.enemy.breakState.max
  );

  button.dispatch("click");

  const combat = window.CariCombat.getGameState().combat;
  const resolution = combat.lastAction;
  assert.equal(resolution.actionType, "SKILL");
  assert.equal(resolution.source, "PLAYER_SKILL");
  assert.equal(resolution.actorId, "player-demo");
  assert.equal(resolution.cardId, "yuri_impulso_mach");
  assert.equal(resolution.damage, 0);
  assert.equal(resolution.breakDamage, 0);
  assert.equal(resolution.hitCount, 0);
  assert.equal(resolution.hits, null);
  assert.equal(resolution.buffApplied.type, "DAMAGE_OUT");
  assert.equal(resolution.buffApplied.amount, 0.25);
  assert.equal(resolution.buffApplied.durationMs, 2200);
  assert.equal(combat.enemy.hp, combat.enemy.maxHp);
  assert.equal(combat.enemy.breakState.current, 0);

  const presentation = window.CariCombat.getPresentation();
  const style = presentation.getPresentationStyleState();
  assert.equal(style.styleId, "YURI_IMPULSO_MACH");
  assert.equal(style.characterId, "yuri");
  assert.equal(style.abilityId, "yuri_impulso_mach");
  assert.equal(style.actionId, resolution.actionId);
  assert.equal(style.presentationType, "BUFF");
  assert.equal(style.cameraShot, "PLAYER_FOCUS");
  assert.equal(presentation.getAttackStyleState(), null);

  presentation.render(combat, 1060);
  const foundation = presentation.getSceneFoundation();
  assert.equal(actorFrom(foundation, "scene:PLAYER").transform.state, "IDLE");
  const enemy = actorFrom(foundation, "scene:ENEMY_PRIMARY");
  assert.equal(enemy.transform.state, "IDLE");
  assert.equal(enemy.transform.x, 690);
});


test("BONE-001 locks rapid player combat input during active presentation and reopens after recovery", async () => {
  const { window, hand, setNow } = await createCombatEntrypointHarness();
  const state = window.CariCombat.getGameState();
  const presentation = window.CariCombat.getPresentation();
  const breakCard = state.combat.cards.hand.find((entry) => entry.cardId === "yuri_break_drive");
  const impulseCard = state.combat.cards.hand.find((entry) => entry.cardId === "yuri_impulso_mach");
  assert.ok(breakCard, "Break Drive must be available in the real Yuri hand");
  assert.ok(impulseCard, "Impulso Mach must be available in the real Yuri hand");

  const breakButton = hand.children.find((entry) => entry.dataset.cardInstanceId === breakCard.instanceId);
  const impulseButton = hand.children.find((entry) => entry.dataset.cardInstanceId === impulseCard.instanceId);
  assert.ok(breakButton, "Break Drive must have a real hand button");
  assert.ok(impulseButton, "Impulso Mach must have a real hand button");

  window.EnergySystem.add(state.combat.resources, 20);

  let actionFactoryCalls = 0;
  const gameActions = window.GameActions;
  window.GameActions = new Proxy(gameActions, {
    get(target, property, receiver) {
      if (property === "createPlayerSkillAction") {
        return (...args) => {
          actionFactoryCalls += 1;
          return target.createPlayerSkillAction(...args);
        };
      }
      return Reflect.get(target, property, receiver);
    }
  });

  let resolveCalls = 0;
  const combatEngine = window.CombatEngine;
  window.CombatEngine = new Proxy(combatEngine, {
    get(target, property, receiver) {
      if (property === "resolveAction") {
        return (...args) => {
          resolveCalls += 1;
          return target.resolveAction(...args);
        };
      }
      return Reflect.get(target, property, receiver);
    }
  });

  let telemetryActionCalls = 0;
  const telemetry = window.RocketBunnyTelemetry;
  if (telemetry && (typeof telemetry === "object" || typeof telemetry === "function")) {
    window.RocketBunnyTelemetry = new Proxy(telemetry, {
      get(target, property, receiver) {
        if (property === "recordCombatAction") {
          return (...args) => {
            telemetryActionCalls += 1;
            return target.recordCombatAction(...args);
          };
        }
        return Reflect.get(target, property, receiver);
      }
    });
  }

  setNow(1000);
  const firstResolution = window.CariCombat.actionButton(breakCard.instanceId);
  assert.ok(firstResolution);
  assert.equal(actionFactoryCalls, 1);
  assert.equal(resolveCalls, 1);
  const telemetryAfterFirst = telemetryActionCalls;

  const combatAfterFirst = window.CariCombat.getGameState().combat;
  const firstActionId = combatAfterFirst.lastAction.actionId;
  const lockedEnergy = combatAfterFirst.resources.energy;
  const lockedHand = combatAfterFirst.cards.hand.map((entry) => entry.instanceId);
  const lockedInputLog = combatAfterFirst.inputLog.length;
  const lockedEvents = combatAfterFirst.events.length;

  const activePresentation = window.CariCombat.getPresentation();
  activePresentation.render(combatAfterFirst, 1000);
  assert.equal(activePresentation.isBusy(1000), true);
  assert.equal(impulseButton.disabled, true);

  impulseButton.dispatch("click");
  impulseButton.dispatch("click");

  const afterRapidInput = window.CariCombat.getGameState().combat;
  assert.equal(actionFactoryCalls, 1);
  assert.equal(resolveCalls, 1);
  assert.equal(telemetryActionCalls, telemetryAfterFirst);
  assert.equal(afterRapidInput.lastAction.actionId, firstActionId);
  assert.equal(afterRapidInput.resources.energy, lockedEnergy);
  assert.deepEqual(afterRapidInput.cards.hand.map((entry) => entry.instanceId), lockedHand);
  assert.equal(afterRapidInput.inputLog.length, lockedInputLog);
  assert.equal(afterRapidInput.events.length, lockedEvents);

  setNow(2000);
  activePresentation.render(afterRapidInput, 2000);
  assert.equal(activePresentation.isBusy(2000), false);

  const acceptedAfterRecovery = window.CariCombat.actionButton(impulseCard.instanceId);
  assert.ok(acceptedAfterRecovery);
  assert.equal(actionFactoryCalls, 2);
  assert.equal(resolveCalls, 2);
  assert.equal(telemetryActionCalls, telemetryAfterFirst + 1);
  const afterRecovery = window.CariCombat.getGameState().combat;
  assert.notEqual(afterRecovery.lastAction.actionId, firstActionId);
  assert.equal(afterRecovery.lastAction.cardId, "yuri_impulso_mach");
  assert.ok(afterRecovery.resources.energy < lockedEnergy);
});

test("Phase 29-W emits ATTACK_START, DAMAGE_APPLIED and BREAK_TRIGGER only for real offensive results", async () => {
  const { window } = await loadRealCombatPresentation();
  const state = window.GameState.createGameState({ playerId: "phase29w-player" });
  const character = window.CharacterKitSystem.definitionFor("yuri");
  const enemy = window.EnemyCatalog.createEnemy("iron_guard");
  window.GameState.startBattle(state, {
    battleId: "phase29w-events",
    seed: 291007,
    player: { id: "phase29w-player", hp: 120, maxHp: 120, stats: { atk: 20, def: 5, skillDamage: 40 } },
    enemy, characterId: "yuri", character, cardIds: window.CharacterKitSystem.cardIdsFor("yuri")
  });

  const attackCard = state.combat.cards.hand.find((entry) =>
    entry.cardId === "yuri_racha_neon" || entry.cardId === "yuri_break_drive"
  );
  assert.ok(attackCard);
  const attackAction = window.GameActions.createPlayerSkillAction(state, attackCard.instanceId);
  window.CombatEngine.resolveAction(state, attackAction);
  const attackEvents = state.combat.events.filter((event) => event.actionId === attackAction.id);
  assert.equal(attackEvents.some((event) => event.type === "ATTACK_START"), true);
  assert.equal(attackEvents.some((event) => event.type === "DAMAGE_APPLIED"), true);

  const before = state.combat.events.length;
  const support = state.combat.cards.hand.find((entry) => entry.cardId === "yuri_impulso_mach");
  if (support && window.EnergySystem.canSpend(state.combat.resources, 20)) {
    const supportAction = window.GameActions.createPlayerSkillAction(state, support.instanceId);
    window.CombatEngine.resolveAction(state, supportAction);
    const supportEvents = state.combat.events.slice(before).filter((event) => event.actionId === supportAction.id);
    assert.equal(supportEvents.some((event) => event.type === "ATTACK_START"), false);
    assert.equal(supportEvents.some((event) => event.type === "DAMAGE_APPLIED"), false);
    assert.equal(supportEvents.some((event) => event.type === "BREAK_TRIGGER"), false);
  }
});

test("Phase 29-W presentation consumes BREAK over IMPACT and records BURST_FINISH on recovery", async () => {
  const { presentation, setNow } = await loadPresentation();
  const combat = {
    battleId: "phase29w-break",
    outcome: "IN_PROGRESS",
    player: { id: "player-1", hp: 100, maxHp: 100, identity: { characterId: "yuri" } },
    enemy: { id: "iron_guard", hp: 100, maxHp: 100, breakState: { current: 0, max: 100 } },
    events: [
      { type: "ATTACK_START", actionId: "break-1", actionType: "CARD", sourceRole: "PLAYER", targetRole: "ENEMY_PRIMARY", characterId: "yuri", cardId: "yuri_break_drive" },
      { type: "DAMAGE_APPLIED", actionId: "break-1", actionType: "CARD", sourceRole: "PLAYER", targetRole: "ENEMY_PRIMARY", characterId: "yuri", cardId: "yuri_break_drive", damage: 12, breakDamage: 12 },
      { type: "BREAK_TRIGGER", actionId: "break-1", actionType: "CARD", sourceRole: "PLAYER", targetRole: "ENEMY_PRIMARY", characterId: "yuri", cardId: "yuri_break_drive", damage: 12, breakDamage: 12 }
    ]
  };
  presentation.onCombatStart(combat);
  setNow(1000);
  presentation.consumeCombatEvents(combat);
  assert.equal(presentation.getShotState(1000).name, "BREAK");
  assert.equal(actorFrom(presentation.getSceneFoundation(), "scene:ENEMY_PRIMARY").transform.state, "BREAK");

  const burst = {
    battleId: "phase29w-burst",
    outcome: "IN_PROGRESS",
    player: { id: "player-1", hp: 100, maxHp: 100, identity: { characterId: "yuri" } },
    enemy: { id: "iron_guard", hp: 100, maxHp: 100, breakState: { current: 0, max: 100 } },
    events: [
      { type: "BURST_START", actionId: "burst-1", actionType: "BURST", sourceRole: "PLAYER", targetRole: "ENEMY_PRIMARY", characterId: "yuri" },
      { type: "DAMAGE_APPLIED", actionId: "burst-1", actionType: "BURST", sourceRole: "PLAYER", targetRole: "ENEMY_PRIMARY", characterId: "yuri", damage: 24, breakDamage: 0 }
    ]
  };
  const second = await loadPresentation();
  second.presentation.onCombatStart(burst);
  second.presentation.consumeCombatEvents(burst);
  assert.equal(second.presentation.getShotState(0).name, "BURST");
  second.setNow(2200);
  second.presentation.render(burst, 2200);
  assert.equal(second.presentation.getLastPresentationEvent().type, "BURST_FINISH");
  assert.equal(second.presentation.getShotState(2200).name, "PLAYER_FOCUS");
});
