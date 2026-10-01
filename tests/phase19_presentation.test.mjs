import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

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
  const loaded = await loadPresentation();
  const presentation = loaded.api.create(loaded.fake.canvas, loaded.fake.context);
  const combat = combatFixture();
  presentation.render(combat, 1200);
  assert.ok(loaded.fake.context.calls.includes("!"));
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
  const loaded = await loadPresentation();
  const presentation = loaded.api.create(loaded.fake.canvas, loaded.fake.context);
  const combat = combatFixture();
  presentation.onAction(combat, {
    actionId: "burst-1",
    actionType: "BURST",
    targetId: "enemy",
    damage: 32
  });
  presentation.render(combat, 1100);
  assert.ok(loaded.fake.context.calls.includes("BURST!"));
});

test("skill feedback produces impact and does not replace DOM concerns", async () => {
  const source = await readFile("intento_2/webapp/js/combat.js", "utf8");
  assert.match(source, /presentation\?\.onAction\(combat, resolution\)/);
  assert.match(source, /button\.dataset\.cardInstanceId/);
  assert.match(source, /button\.dataset\.renderSignature/);
});

test("card interaction remains a real HTML button while realtime render continues", async () => {
  const [html, css, combat] = await Promise.all([
    readFile("intento_2/webapp/index.html", "utf8"),
    readFile("intento_2/webapp/css/style.css", "utf8"),
    readFile("intento_2/webapp/js/combat.js", "utf8")
  ]);
  assert.match(html, /<div id="combat-hand" class="combat-hand"/);
  assert.match(combat, /document\.createElement\("button"\)/);
  assert.match(combat, /requestAnimationFrame\(drawFrame\)/);
  assert.match(css, /button:focus-visible/);
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
  const presentation = await readFile("intento_2/webapp/js/combat_presentation.js", "utf8");
  assert.match(presentation, /ASSET_SLOTS/);
  assert.match(presentation, /setAsset/);
  assert.match(presentation, /setAudioHooks/);
  assert.doesNotMatch(presentation, /Math\.random\(/);
});


test("state-specific fighter assets override the generic sprite slot", async () => {
  const source = await readFile("intento_2/webapp/js/combat_presentation.js", "utf8");
  const loaded = await loadPresentationWithImageTracking(source);
  const presentation = loaded.api.create(loaded.fake.canvas, loaded.fake.context);
  presentation.setAsset("player.sprite", "player-idle.png");
  presentation.setAsset("player.attack", "player-attack.png");
  const combat = combatFixture();
  presentation.onCombatStart(combat);
  presentation.onAction(combat, {
    actionId: "attack-asset-1",
    actionType: "AUTO_ATTACK",
    source: "PLAYER_AUTO_ATTACK",
    actorId: "player",
    targetId: "enemy",
    damage: 7
  });
  presentation.render(combat, 1000);
  assert.ok(loaded.imageSources.includes("player-attack.png"));
  assert.equal(loaded.imageSources.includes("player-idle.png"), false);
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
