import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";
import { createScenePresentationHarness, makeCombatFixture } from "./shared_scene_presentation_harness.mjs";

function makeCanvas() {
  const calls = [];
  const context = {
    calls,
    globalAlpha: 1,
    lineWidth: 1,
    font: "",
    textAlign: "left",
    textBaseline: "middle",
    fillStyle: "",
    strokeStyle: "",
    setLineDash() {},
    clearRect() {},
    fillRect() {},
    strokeRect() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    arc() {},
    ellipse() {},
    arcTo() {},
    closePath() {},
    fill() {},
    stroke() {},
    save() {},
    restore() {},
    translate() {},
    createLinearGradient() {
      return { addColorStop() {} };
    },
    drawImage() {},
    fillText(text) {
      calls.push(String(text));
    }
  };
  return {
    context,
    canvas: {
      getBoundingClientRect: () => ({ width: 720, height: 520 })
    }
  };
}



async function loadPresentationWithImageTracking(source) {
  const fake = makeCanvas();
  const imageSources = [];
  const window = {
    BreakSystem: { isBroken: (state) => state?.state === "BROKEN" && Number(state?.remainingMs) > 0 },
    StatusSystem: {
      entries: (fighter) => Object.entries(fighter?.statuses || {}).map(([type, value]) => ({
        type,
        label: type,
        remainingMs: Number(value?.remainingMs || 0)
      }))
    },
    CombatEngine: {
      cardDefinitionFor: (_combat, cardId) => ({
        cardId,
        name: "TEST SKILL",
        type: "ATTACK",
        effects: {}
      })
    },
    CardSystem: { definitionFor: () => null }
  };
  class FakeImage {
    constructor() {
      this.complete = true;
      this.naturalWidth = 128;
      this._src = "";
    }
    set src(value) {
      this._src = String(value);
      imageSources.push(this._src);
    }
    get src() {
      return this._src;
    }
  }
  const context = vm.createContext({
    window,
    performance: { now: () => 1000 },
    Image: FakeImage,
    console,
    Math,
    Number,
    String,
    Object,
    Array,
    Set,
    Map,
    JSON
  });
  vm.runInContext(source, context, { filename: "combat_presentation.js" });
  return { api: context.window.CombatPresentation, fake, imageSources };
}

async function loadPresentation() {
  const source = await readFile("intento_2/webapp/js/combat_presentation.js", "utf8");
  const fake = makeCanvas();
  const window = {
    BreakSystem: { isBroken: (state) => state?.state === "BROKEN" && Number(state?.remainingMs) > 0 },
    StatusSystem: {
      entries: (fighter) => Object.entries(fighter?.statuses || {}).map(([type, value]) => ({
        type,
        label: type,
        remainingMs: Number(value?.remainingMs || 0)
      }))
    },
    CombatEngine: {
      cardDefinitionFor: (_combat, cardId) => ({
        cardId,
        name: "TEST SKILL",
        type: "ATTACK",
        effects: {}
      })
    },
    CardSystem: { definitionFor: () => null }
  };
  const context = vm.createContext({
    window,
    performance: { now: () => 1000 },
    Image: undefined,
    console,
    Math,
    Number,
    String,
    Object,
    Array,
    Set,
    Map,
    JSON
  });
  vm.runInContext(source, context, { filename: "combat_presentation.js" });
  return { api: context.window.CombatPresentation, fake };
}

function combatFixture() {
  return {
    battleId: "phase19-test",
    player: {
      id: "player",
      hp: 100,
      maxHp: 120,
      block: 14,
      statuses: {}
    },
    enemy: {
      id: "enemy",
      name: "STREET PUNK",
      hp: 72,
      maxHp: 100,
      block: 0,
      statuses: {},
      breakState: { state: "READY", current: 64, max: 100, remainingMs: 0 }
    },
    enemyIntent: {
      type: "ATTACK",
      label: "ATTACK 7",
      remainingMs: 900
    },
    enemyBehavior: { telegraphMs: 1200 },
    resources: { energy: 50, maxEnergy: 100 }
  };
}

test("presentation renderer is isolated from authoritative combat state", async () => {
  const loaded = await loadPresentation();
  const presentation = loaded.api.create(loaded.fake.canvas, loaded.fake.context);
  const combat = combatFixture();
  const before = JSON.stringify(combat);
  presentation.onCombatStart(combat);
  presentation.onAction(combat, {
    actionId: "action-1",
    actionType: "AUTO_ATTACK",
    source: "PLAYER_AUTO_ATTACK",
    actorId: "player",
    targetId: "enemy",
    damage: 7,
    breakDamage: 5
  });
  presentation.render(combat, 1100);
  assert.equal(JSON.stringify(combat), before);
});

test("telegraph presentation reflects the live enemy intent", async () => {
  const harness = await createScenePresentationHarness();
  const intents = [
    { type: "ATTACK", label: "ATTACK 7", expected: "!" },
    { type: "DEFEND", label: "DEFEND", expected: "◆" }
  ];
  const observedTelegraphs = [];

  for (const intent of intents) {
    const combat = makeCombatFixture({
      battleId: "phase19-intent-" + intent.type.toLowerCase(),
      enemyIntent: {
        type: intent.type,
        label: intent.label,
        remainingMs: 900
      }
    });
    const before = JSON.stringify(combat);
    harness.canvas.reset();
    harness.presentation.onCombatStart(combat);
    const foundation = harness.render(combat, 1200);

    assert.ok(foundation.layers.ACTORS.some((actor) => actor.id === "scene:PLAYER"));
    assert.ok(foundation.layers.ACTORS.some((actor) => actor.id === "scene:ENEMY_PRIMARY"));
    assert.ok(harness.canvas.textCalls.includes(intent.expected));
    observedTelegraphs.push(
      harness.canvas.textCalls.find((value) => ["!", "◆", "☄"].includes(value))
    );
    assert.equal(JSON.stringify(combat), before);
  }

  assert.deepEqual(observedTelegraphs, ["!", "◆"]);
});

test("BREAK presentation reflects BreakSystem state", async () => {
  const loaded = await loadPresentation();
  const presentation = loaded.api.create(loaded.fake.canvas, loaded.fake.context);
  const combat = combatFixture();
  combat.enemy.breakState.current = 0;
  combat.enemy.breakState.remainingMs = 1800;
  combat.enemy.breakState.state = "BROKEN";
  presentation.render(combat, 1200);
  presentation.onAction(combat, { actionId: "break-1", actionType: "SKILL", targetId: "enemy", broke: true });
  presentation.render(combat, 1300);
  assert.ok(loaded.fake.context.calls.includes("BREAK!"));
});

test("BURST presentation is triggered by the BURST action", async () => {
  const harness = await createScenePresentationHarness();
  const combat = makeCombatFixture();
  const before = JSON.stringify(combat);

  harness.presentation.onCombatStart(combat);
  harness.setNow(1000);
  assert.equal(harness.presentation.onCombatEvent(combat, {
    type: "BURST_START",
    actionId: "burst-1",
    actionType: "BURST",
    sourceRole: "PLAYER",
    targetRole: "ENEMY_PRIMARY",
    characterId: "yuri",
    damage: 32,
    breakDamage: 0
  }), true);

  const foundation = harness.render(combat, 1060);
  const player = foundation.layers.ACTORS.find((actor) => actor.id === "scene:PLAYER");

  assert.equal(harness.presentation.getShotState(1060).name, "BURST");
  assert.equal(player.transform.state, "BURST");
  assert.ok(foundation.effects.some((effect) => effect.type === "BURST"));
  assert.ok(harness.canvas.textCalls.includes("BURST!"));
  assert.equal(harness.presentation.isBusy(1060), true);
  assert.equal(JSON.stringify(combat), before);
});

test("skill feedback produces impact and does not replace DOM concerns", async () => {
  const harness = await createScenePresentationHarness();
  const combat = makeCombatFixture();
  const hand = harness.dom.createElement("div");
  hand.id = "combat-hand";
  const button = harness.dom.createElement("button");
  button.dataset.cardInstanceId = "card-skill-feedback";
  hand.appendChild(button);
  harness.dom.body.appendChild(hand);

  const domBefore = harness.dom.snapshot();
  const combatBefore = JSON.stringify(combat);

  harness.presentation.onCombatStart(combat);
  harness.setNow(1000);
  assert.equal(harness.presentation.onCombatEvent(combat, {
    type: "DAMAGE_APPLIED",
    actionId: "skill-feedback-1",
    actionType: "SKILL",
    sourceRole: "PLAYER",
    targetRole: "ENEMY_PRIMARY",
    characterId: "yuri",
    cardId: "test_skill",
    damage: 12,
    breakDamage: 0,
    hitIndex: 0,
    hitCount: 1
  }), true);

  harness.render(combat, 1150);

  assert.ok(harness.canvas.textCalls.includes("-12"));
  assert.equal(button.dataset.cardInstanceId, "card-skill-feedback");
  assert.deepEqual(harness.dom.snapshot(), domBefore);
  assert.equal(JSON.stringify(combat), combatBefore);
});

test("card interaction remains a real HTML button while realtime render continues", async () => {
  const harness = await createScenePresentationHarness();
  const combat = makeCombatFixture();
  const hand = harness.dom.createElement("div");
  hand.id = "combat-hand";
  const button = harness.dom.createElement("button");
  button.dataset.cardInstanceId = "card-001";
  hand.appendChild(button);
  harness.dom.body.appendChild(hand);

  let interactions = 0;
  button.addEventListener("click", () => {
    interactions += 1;
    harness.presentation.onAction(combat, {
      actionId: "button-action-1",
      actionType: "AUTO_ATTACK",
      source: "PLAYER_AUTO_ATTACK",
      actorId: "player",
      targetId: "enemy"
    });
    harness.window.requestAnimationFrame((timestamp) => {
      harness.render(combat, timestamp);
    });
  });

  const domBefore = harness.dom.snapshot();
  assert.equal(button.tagName, "BUTTON");
  assert.equal(button.dataset.cardInstanceId, "card-001");

  button.dispatch("click");

  assert.equal(interactions, 1);
  assert.equal(button.dataset.cardInstanceId, "card-001");
  assert.equal(harness.raf.pending(), 1);
  assert.equal(harness.raf.step(1060), true);
  assert.equal(harness.raf.pending(), 0);
  assert.ok(harness.canvas.clearCount > 0);

  const foundation = harness.presentation.getSceneFoundation();
  const player = foundation.layers.ACTORS.find((actor) => actor.id === "scene:PLAYER");
  const enemy = foundation.layers.ACTORS.find((actor) => actor.id === "scene:ENEMY_PRIMARY");
  assert.ok(player);
  assert.ok(enemy);
  assert.equal(player.transform.state, "ATTACK");
  assert.deepEqual(harness.dom.snapshot(), domBefore);
});

test("BREAK and BURST presentation hooks are additive to existing fixed-step systems", async () => {
  const [combat, presentation, clock] = await Promise.all([
    readFile("intento_2/webapp/js/combat.js", "utf8"),
    readFile("intento_2/webapp/js/combat_presentation.js", "utf8"),
    readFile("intento_2/webapp/js/game/combat_clock.js", "utf8")
  ]);
  assert.match(combat, /CombatEngine\.advanceTime\(view\.gameState, deltaMs\)/);
  assert.match(presentation, /if \(action\.broke\)/);
  assert.match(presentation, /actionType === "BURST"/);
  assert.match(clock, /DEFAULT_STEP_MS/);
});

test("visual asset and audio hooks exist without introducing gameplay dependencies", async () => {
  const harness = await createScenePresentationHarness();
  const combat = makeCombatFixture();
  const before = JSON.stringify(combat);
  const audioEvents = [];

  assert.equal(harness.presentation.setAsset("player.attack", "player-attack.png"), true);
  assert.equal(harness.presentation.getAsset("player.attack"), "player-attack.png");
  harness.presentation.setAudioHooks({
    impact: (payload) => audioEvents.push(payload.actionId)
  });

  harness.presentation.onCombatStart(combat);
  harness.setNow(1000);
  assert.equal(harness.presentation.onCombatEvent(combat, {
    type: "DAMAGE_APPLIED",
    actionId: "asset-audio-1",
    actionType: "SKILL",
    sourceRole: "PLAYER",
    targetRole: "ENEMY_PRIMARY",
    characterId: "yuri",
    cardId: "test_skill",
    damage: 5,
    breakDamage: 0,
    hitIndex: 0,
    hitCount: 1
  }), true);

  assert.deepEqual(audioEvents, ["asset-audio-1"]);
  assert.equal(harness.presentation.getAsset("player.attack"), "player-attack.png");
  assert.equal(JSON.stringify(combat), before);
});


test("state-specific fighter assets override the generic sprite slot", async () => {
  const harness = await createScenePresentationHarness({ fakeImage: true });
  const combat = makeCombatFixture();

  assert.equal(harness.presentation.setAsset("player.sprite", "player-sprite.png"), true);
  assert.equal(harness.presentation.setAsset("player.attack", "player-attack.png"), true);

  harness.presentation.onCombatStart(combat);
  harness.setNow(1000);
  harness.presentation.onAction(combat, {
    actionId: "attack-asset-1",
    actionType: "AUTO_ATTACK",
    source: "PLAYER_AUTO_ATTACK",
    actorId: "player",
    targetId: "enemy"
  });

  harness.render(combat, 1000);
  harness.render(combat, 1001);

  assert.ok(harness.imageRequests.includes("player-attack.png"));
  assert.equal(harness.imageRequests.includes("player-sprite.png"), false);
  assert.ok(harness.imageDraws.includes("player-attack.png"));
  assert.equal(harness.imageDraws.includes("player-sprite.png"), false);

  const foundation = harness.presentation.getSceneFoundation();
  const player = foundation.layers.ACTORS.find((actor) => actor.id === "scene:PLAYER");
  assert.equal(player.transform.state, "ATTACK");
});

test("skill energy delta produces player-facing energy feedback", async () => {
  const loaded = await loadPresentation();
  const presentation = loaded.api.create(loaded.fake.canvas, loaded.fake.context);
  const combat = combatFixture();
  presentation.onCombatStart(combat);
  presentation.onAction(combat, {
    actionId: "energy-spend-1",
    actionType: "SKILL",
    cardId: "escudo_dark",
    targetId: "enemy",
    damage: 0,
    energyBefore: 42,
    energyAfter: 24,
    blockGained: 18
  });
  presentation.render(combat, 1000);
  assert.ok(loaded.fake.context.calls.includes("-18 ENERGY"));
});

test("victory and defeat expose presentation audio hooks", async () => {
  const loaded = await loadPresentation();
  const presentation = loaded.api.create(loaded.fake.canvas, loaded.fake.context);
  const events = [];
  presentation.setAudioHooks({
    victory: () => events.push("victory"),
    defeat: () => events.push("defeat")
  });
  const combat = combatFixture();
  presentation.onCombatStart(combat);
  presentation.onAction(combat, { actionId: "victory-1", actionType: "BURST", outcome: "VICTORY" });
  presentation.onAction(combat, { actionId: "defeat-1", actionType: "BURST", outcome: "DEFEAT" });
  assert.deepEqual(events, ["victory", "defeat"]);
});
