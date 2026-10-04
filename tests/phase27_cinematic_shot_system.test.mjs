import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

async function loadShotDirectorAndPresentation() {
  const [directorSource, presentationSource] = await Promise.all([
    readFile("intento_2/webapp/js/combat_shot_director.js", "utf8"),
    readFile("intento_2/webapp/js/combat_presentation.js", "utf8")
  ]);
  const context = vm.createContext({
    window: {},
    performance: { now: () => 0 },
    Math,
    Number,
    String,
    Object,
    Array,
    Map,
    Set,
    JSON
  });
  vm.runInContext(directorSource, context, { filename: "combat_shot_director.js" });
  vm.runInContext(presentationSource, context, { filename: "combat_presentation.js" });
  return {
    director: context.window.MachGirlsShotDirector,
    presentation: context.window.CombatPresentation
  };
}

test("Phase 27 exposes deterministic cinematic shot profiles and semantic anchors", async () => {
  const { director } = await loadShotDirectorAndPresentation();
  assert.deepEqual(Array.from(director.SHOT_NAMES), [
    "ESTABLISHING",
    "PLAYER_FOCUS",
    "COMPANION_LEFT_FOCUS",
    "COMPANION_RIGHT_FOCUS",
    "ENEMY_FOCUS",
    "ATTACK_APPROACH",
    "IMPACT",
    "BREAK",
    "BURST",
    "VICTORY",
    "DEFEAT"
  ]);
  assert.deepEqual(Object.keys(director.SCENE_ANCHORS), [
    "PLAYER",
    "PLAYER_FOCUS",
    "COMPANION_LEFT",
    "COMPANION_RIGHT",
    "ENEMY_PRIMARY",
    "ENEMY_SECONDARY",
    "ENEMY_FAR",
    "FOREGROUND_LEFT",
    "FOREGROUND_RIGHT"
  ]);
  for (const name of director.SHOT_NAMES) {
    assert.match(director.SHOT_PROFILES[name].target, /STAGE|PLAYER_FOCUS|COMPANION_LEFT|COMPANION_RIGHT|ENEMY_PRIMARY/);
    assert.ok(director.SHOT_PROFILES[name].duration > 0);
    assert.ok(Number.isFinite(director.SHOT_PROFILES[name].zoom));
  }
});

test("Phase 27 camera interpolation is deterministic", async () => {
  const { director } = await loadShotDirectorAndPresentation();
  const a = director.create({ now: 0, clock: () => 0 });
  const b = director.create({ now: 0, clock: () => 0 });
  a.setShot("ENEMY_FOCUS", false, 0);
  b.setShot("ENEMY_FOCUS", false, 0);
  assert.deepEqual(a.getCameraFrame(1200, 700, 180), b.getCameraFrame(1200, 700, 180));
  a.setEntity("COMPANION_LEFT", { enabled: true, depth: 0.42, scale: 0.9 });
  const frame = a.getEntityFrame("COMPANION_LEFT", 1200, 700);
  assert.equal(frame.enabled, true);
  assert.equal(frame.depth, 0.42);
  assert.equal(frame.scale, 0.9);
  assert.equal(a.setEntity("UNKNOWN_ROLE", { enabled: true }), false);
});

test("Phase 27 presentation integrates the shot director without changing Phase 25 camera vocabulary", async () => {
  const { director, presentation } = await loadShotDirectorAndPresentation();
  const api = presentation;
  assert.deepEqual(Object.keys(api.CAMERA_PRESETS), [
    "IDLE", "APPROACH", "ATTACK", "IMPACT", "BREAK", "BURST", "VICTORY", "DEFEAT"
  ]);
  assert.equal(api.ASSET_SLOTS.includes("scene.companion_left_character"), true);
  assert.equal(api.ASSET_SLOTS.includes("scene.companion_right_motorcycle"), true);

  const p = api.create({}, {});
  p.setShot("PLAYER_FOCUS", true, 0);
  assert.equal(p.getShotState(0).name, "PLAYER_FOCUS");
  p.setSceneEntity("COMPANION_LEFT", { enabled: true, depth: 0.45 });
  const snapshot = p.getSceneSnapshot(1200, 700);
  assert.ok(snapshot.some((item) => item.role === "COMPANION_LEFT" && item.enabled));
  assert.equal(director.SHOT_PROFILES.PLAYER_FOCUS.target, "PLAYER_FOCUS");
});

test("Phase 27 Asset Studio persists cinematic staging metadata fields without changing storage namespace", async () => {
  const [studio, html] = await Promise.all([
    readFile("intento_2/webapp/js/admin/asset_studio.js", "utf8"),
    readFile("intento_2/webapp/asset-studio.html", "utf8")
  ]);
  for (const field of [
    "sceneRole",
    "depth",
    "baselineScale",
    "focusScale",
    "focusOffsetX",
    "focusOffsetY",
    "allowedShots",
    "foregroundPriority",
    "backgroundPriority"
  ]) {
    assert.match(studio, new RegExp(field));
    assert.match(html, new RegExp("asset-" + field.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())));
  }
  assert.match(studio, /mach_girls_asset_catalog_v1/);
  assert.match(html, /CINEMATIC STAGING/);
});

test("Phase 27 does not place combat systems in Asset Studio", async () => {
  const studio = await readFile("intento_2/webapp/js/admin/asset_studio.js", "utf8");
  for (const forbidden of [
    "CombatEngine",
    "CombatClock",
    "EnergySystem",
    "BreakSystem",
    "BurstSystem",
    "SaveManager",
    "RocketBunnyTelemetry"
  ]) {
    assert.equal(studio.includes(forbidden), false, forbidden);
  }
});

test("Phase 27 allows identity-neutral enemy/companion staging without creating formal character IDs", async () => {
  const studio = await readFile("intento_2/webapp/js/admin/asset_studio.js", "utf8");
  assert.match(studio, /sceneStagingRole/);
  assert.match(studio, /COMPANION_LEFT/);
  assert.match(studio, /ENEMY_SECONDARY/);
  assert.match(studio, /maki_mach/);
  assert.match(studio, /formally registered/);
});
