import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

async function loadPresentation() {
  const source = await readFile("intento_2/webapp/js/combat_presentation.js", "utf8");
  const context = vm.createContext({
    window: {},
    performance: { now: () => 1000 },
    Math,
    Number,
    String,
    Object,
    Array,
    Map,
    Set,
    JSON
  });
  vm.runInContext(source, context, { filename: "combat_presentation.js" });
  return context.window.CombatPresentation;
}

test("Phase 25 exposes reusable camera presets and layered scene vocabulary", async () => {
  const api = await loadPresentation();
  assert.deepEqual(
    Object.keys(api.CAMERA_PRESETS),
    ["IDLE", "APPROACH", "ATTACK", "IMPACT", "BREAK", "BURST", "VICTORY", "DEFEAT"]
  );
  assert.deepEqual(api.LAYER_ORDER, [
    "BACKGROUND",
    "FAR_PARALLAX",
    "MIDGROUND",
    "ENEMY",
    "COMBAT_FX",
    "CHARACTER_MOTORCYCLE",
    "FOREGROUND_FX",
    "HUD",
    "CARDS"
  ]);
  assert.deepEqual(api.VISUAL_STATES, {
    NORMAL: "NORMAL",
    ATTACKING: "ATTACKING",
    HURT: "HURT",
    BREAK: "BREAK",
    BURST_READY: "BURST READY",
    BURST_ACTIVE: "BURST ACTIVE",
    VICTORY: "VICTORY",
    DEFEAT: "DEFEAT"
  });
});

test("Phase 25 keeps motorcycle and character slots explicit", async () => {
  const api = await loadPresentation();
  assert.equal(api.ASSET_SLOTS.includes("player.motorcycle"), true);
  assert.equal(api.ASSET_SLOTS.includes("enemy.motorcycle"), true);

  const presentation = api.create({}, {});
  presentation.setAsset("player.motorcycle", "/assets/yuri-bike.png");
  assert.equal(presentation.getAsset("player.motorcycle"), "/assets/yuri-bike.png");

  assert.equal(
    presentation.setComposition("player", {
      characterScale: 1.12,
      motorcycleScale: 0.9,
      motorcycleOffsetX: 12,
      motorcycleOffsetY: 20
    }),
    true
  );
  assert.equal(presentation.setComposition("unknown", {}), false);

  presentation.setCameraPreset("ATTACK", true);
  const camera = presentation.getCameraState();
  assert.equal(camera.active, "ATTACK");
  assert.equal(camera.current.zoom, api.CAMERA_PRESETS.ATTACK.zoom);
});

test("Phase 25 asset catalog mapping only accepts explicitly approved assets", async () => {
  const api = await loadPresentation();
  const playerCombat = {
    characterId: "yuri",
    player: { identity: { characterId: "yuri" } },
    enemy: { id: "street_punk" }
  };

  assert.equal(
    api.create({}, {}).slotForCatalogRecord({
      type: "CHARACTER",
      entityId: "yuri",
      state: "ATTACK",
      status: "APPROVED"
    }, playerCombat),
    "player.attack"
  );
  assert.equal(
    api.create({}, {}).slotForCatalogRecord({
      type: "MOTORCYCLE",
      entityId: "yuri",
      state: "IDLE",
      status: "APPROVED"
    }, playerCombat),
    "player.motorcycle"
  );
  assert.equal(
    api.create({}, {}).slotForCatalogRecord({
      type: "MOTORCYCLE",
      entityId: "street_punk",
      state: "IDLE",
      status: "APPROVED"
    }, playerCombat),
    "enemy.motorcycle"
  );
  assert.equal(
    api.create({}, {}).slotForCatalogRecord({
      type: "MOTORCYCLE",
      entityId: "yuri",
      state: "IDLE",
      status: "DRAFT"
    }, playerCombat),
    null
  );
});

test("Phase 25 promotes timer and card ownership to the game-facing surface", async () => {
  const [html, combat] = await Promise.all([
    readFile("intento_2/webapp/index.html", "utf8"),
    readFile("intento_2/webapp/js/combat.js", "utf8")
  ]);

  assert.match(html, /id="combat-timer"/);
  assert.match(html, /id="combat-scene-state"/);
  assert.match(html, /id="combat-canvas"/);
  assert.match(html, /id="combat-energy"/);
  assert.match(html, /id="combat-enemy-hp"/);
  assert.doesNotMatch(html, /END TURN/i);

  assert.match(combat, /formatCombatTimer/);
  assert.match(combat, /card-owner/);
  assert.match(combat, /definition.characterId || "TEAM"/);
  assert.doesNotMatch(combat, /END TURN/i);
});

test("Phase 25 placeholder policy is explicit and Asset Studio catalog is separate from combat rules", async () => {
  const presentation = await readFile("intento_2/webapp/js/combat_presentation.js", "utf8");
  const studio = await readFile("intento_2/webapp/js/admin/asset_studio.js", "utf8");
  assert.match(presentation, /TECHNICAL CHARACTER PLACEHOLDER · NOT FINAL ART/);
  assert.match(presentation, /TECHNICAL MOTORCYCLE PLACEHOLDER · NOT FINAL ART/);
  assert.match(presentation, /mach_girls_asset_catalog_v1/);
  for (const forbidden of ["CombatEngine", "CombatClock", "EnergySystem", "BreakSystem", "BurstSystem", "SaveManager", "RocketBunnyTelemetry"]) {
    assert.equal(studio.includes(forbidden), false, forbidden);
  }
});
