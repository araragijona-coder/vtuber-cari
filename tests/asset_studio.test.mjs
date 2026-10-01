import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

class MemoryStorage {
  #data = new Map();
  getItem(key) { return this.#data.get(key) ?? null; }
  setItem(key, value) { this.#data.set(key, String(value)); }
}

async function loadApi() {
  const source = await readFile("intento_2/webapp/js/admin/asset_studio.js", "utf8");
  const context = vm.createContext({
    window: {},
    document: { getElementById: () => null },
    console,
    Date,
    JSON,
    Math,
    Number,
    String,
    Object,
    Array,
    Set,
    Map
  });
  vm.runInContext(source, context, { filename: "asset_studio.js" });
  return context.window.MachGirlsAssetStudio;
}

test("asset metadata validation requires formal Yuri character identity", async () => {
  const api = await loadApi();
  assert.equal(api.validateMetadata({
    assetId: "yuri_attack",
    type: "CHARACTER",
    entityId: "yuri",
    state: "ATTACK",
    angle: "THREE_QUARTER",
    facing: "RIGHT",
    status: "DRAFT"
  }).valid, true);
  const maki = api.validateMetadata({
    assetId: "maki_attack",
    type: "CHARACTER",
    entityId: "maki_mach",
    state: "ATTACK",
    angle: "THREE_QUARTER",
    facing: "RIGHT",
    status: "DRAFT"
  });
  assert.equal(maki.valid, false);
});

test("PNG signature validation accepts canonical PNG signature and rejects impostors", async () => {
  const api = await loadApi();
  assert.equal(api.validatePngSignature(Uint8Array.from([137,80,78,71,13,10,26,10])), true);
  assert.equal(api.validatePngSignature(Uint8Array.from([137,80,78,71,0,0,0,0])), false);
});

test("PNG metadata validation enforces PNG and size safety", async () => {
  const api = await loadApi();
  assert.equal(api.validatePngFile({
    name: "yuri.png",
    type: "image/png",
    size: 1024
  }, { width: 512, height: 900, transparencyKnown: true, hasTransparentPixels: true }).valid, true);
  assert.equal(api.validatePngFile({
    name: "yuri.jpg",
    type: "image/jpeg",
    size: 1024
  }).valid, false);
  assert.equal(api.validatePngFile({
    name: "huge.png",
    type: "image/png",
    size: 9 * 1024 * 1024
  }).valid, false);
});

test("character anchor defaults use FEET_CENTER and non-character assets use CENTER", async () => {
  const api = await loadApi();
  const character = api.defaultAnchorFor("CHARACTER");
  const motorcycle = api.defaultAnchorFor("MOTORCYCLE");
  const background = api.defaultAnchorFor("BACKGROUND");
  assert.equal(character.name, "FEET_CENTER");
  assert.equal(character.x, 0.5);
  assert.equal(character.y, 1);
  assert.equal(motorcycle.name, "FEET_CENTER");
  assert.equal(motorcycle.x, 0.5);
  assert.equal(motorcycle.y, 1);
  assert.equal(background.name, "CENTER");
  assert.equal(background.x, 0.5);
  assert.equal(background.y, 0.5);
});

test("facing and flipX remain presentation metadata", async () => {
  const api = await loadApi();
  const meta = api.normalizeMetadata({
    assetId: "yuri_idle",
    type: "CHARACTER",
    entityId: "yuri",
    state: "IDLE",
    angle: "SIDE",
    facing: "LEFT",
    flipX: true,
    status: "DRAFT"
  });
  assert.equal(meta.facing, "LEFT");
  assert.equal(meta.flipX, true);
});

test("placeholder, draft and approved statuses remain distinct", async () => {
  const api = await loadApi();
  assert.equal(api.normalizeMetadata({ assetId: "p", type: "CHARACTER", entityId: "yuri", status: "TECHNICAL_PLACEHOLDER", sourceType: "PLACEHOLDER" }).status, "TECHNICAL_PLACEHOLDER");
  assert.equal(api.normalizeMetadata({ assetId: "d", type: "CHARACTER", entityId: "yuri", status: "DRAFT", sourceType: "UPLOAD" }).status, "DRAFT");
  assert.equal(api.normalizeMetadata({ assetId: "a", type: "CHARACTER", entityId: "yuri", status: "APPROVED", sourceType: "UPLOAD", approvedByHuman: true }).status, "APPROVED");
});

test("approved art requires explicit human approval flag", async () => {
  const api = await loadApi();
  const rejected = api.validateMetadata({
    assetId: "yuri_approved",
    type: "CHARACTER",
    entityId: "yuri",
    status: "APPROVED",
    sourceType: "UPLOAD",
    approvedByHuman: false
  });
  assert.equal(rejected.valid, false);
});

test("invalid asset metadata is rejected and registry serialization is deterministic", async () => {
  const api = await loadApi();
  const invalid = api.upsertAsset(api.createEmptyRegistry(), {
    assetId: "",
    type: "CHARACTER",
    entityId: "yuri"
  });
  assert.equal(invalid.success, false);

  const registry = api.createEmptyRegistry();
  const result = api.upsertAsset(registry, {
    assetId: "yuri_attack",
    type: "CHARACTER",
    entityId: "yuri",
    state: "ATTACK",
    angle: "THREE_QUARTER",
    facing: "RIGHT",
    status: "DRAFT"
  });
  assert.equal(result.success, true);
  assert.equal(result.registry.assets.length, 1);
  const roundTrip = JSON.parse(api.serializeRegistry(result.registry));
  assert.equal(roundTrip.schemaVersion, 1);
  assert.equal(roundTrip.assets[0].entityId, "yuri");
});

test("Yuri slot key remains stable across repeated normalization", async () => {
  const api = await loadApi();
  const a = api.normalizeMetadata({
    assetId: "yuri_attack",
    type: "CHARACTER",
    entityId: "yuri",
    state: "ATTACK",
    angle: "THREE_QUARTER",
    facing: "RIGHT"
  });
  const b = api.normalizeMetadata(a);
  assert.equal(
    [a.type, a.entityId, a.state, a.angle, a.facing].join("|"),
    [b.type, b.entityId, b.state, b.angle, b.facing].join("|")
  );
});

test("asset studio does not depend on combat or player save systems", async () => {
  const [html, js] = await Promise.all([
    readFile("intento_2/webapp/asset-studio.html", "utf8"),
    readFile("intento_2/webapp/js/admin/asset_studio.js", "utf8")
  ]);
  for (const forbidden of ["CombatEngine", "CombatClock", "EnergySystem", "BreakSystem", "BurstSystem", "SaveManager", "RocketBunnyTelemetry"]) {
    assert.equal(js.includes(forbidden), false, forbidden);
  }
  assert.equal(html.includes('onclick='), false);
  assert.equal(html.includes('onchange='), false);
  assert.equal(html.includes('oninput='), false);
  assert.equal(js.includes("innerHTML"), false);
  assert.match(html, /<input id="asset-file" type="file"/);
  assert.match(html, /id="preview-side"/);
  assert.match(html, /id="preview-player-x"/);
  assert.match(html, /id="preview-enemy-x"/);
  assert.match(js, /preview\.playerX/);
  assert.match(js, /preview\.enemyX/);
});