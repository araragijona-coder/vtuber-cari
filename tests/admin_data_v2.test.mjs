import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";
import { webcrypto } from "node:crypto";

class MemoryStorage {
  #data = new Map();
  failWrites = false;

  getItem(key) {
    return this.#data.has(key) ? this.#data.get(key) : null;
  }

  setItem(key, value) {
    if (this.failWrites) {
      throw new Error("QuotaExceededError");
    }
    this.#data.set(key, String(value));
  }

  removeItem(key) {
    this.#data.delete(key);
  }

  dump(key) {
    return this.#data.get(key) ?? null;
  }

  keys() {
    return [...this.#data.keys()];
  }
}

async function loadBrowserModules() {
  const storage = new MemoryStorage();
  const window = { localStorage: storage };
  const context = vm.createContext({
    window,
    crypto: webcrypto,
    console,
    Date,
    Math,
    Uint8Array,
    Set,
    JSON,
    Blob,
    URL,
    document: undefined
  });

  for (const path of [
    "intento_2/webapp/js/data/uuid.js",
    "intento_2/webapp/js/data/schema_validator.js",
    "intento_2/webapp/js/data/default_database.js",
    "intento_2/webapp/js/data/database_manager.js"
  ]) {
    const code = await readFile(path, "utf8");
    vm.runInContext(code, context, { filename: path });
  }

  return {
    context,
    storage,
    uuid: context.window.generateUUID,
    validator: context.window.SchemaValidator,
    defaults: context.window.DefaultDatabase,
    db: context.window.DatabaseManager
  };
}

test("generateUUID uses a UUID v4 compatible format", async () => {
  const { uuid } = await loadBrowserModules();
  const value = uuid();
  assert.match(
    value,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  );
});

test("schema v2 closes rarity and element enums", async () => {
  const { validator } = await loadBrowserModules();

  const report = validator.validatePayload({
    schemaVersion: 2,
    waifus: [{
      id: "w1",
      name: "Test",
      rarity: "INVALID",
      element: "invalid",
      baseStats: { hp: 100, atk: 20 }
    }],
    cards: []
  });

  assert.equal(report.valid, true);
  assert.equal(report.waifus[0].rarity, "Common");
  assert.equal(report.waifus[0].element, "NEUTRAL");
});

test("future schema versions are rejected", async () => {
  const { validator } = await loadBrowserModules();
  const report = validator.validatePayload({ schemaVersion: 99, waifus: [], cards: [] });
  assert.equal(report.valid, false);
  assert.match(report.errors[0], /no soportada/i);
});

test("legacy payload migrates to schema v2 and preserves valid records", async () => {
  const { validator } = await loadBrowserModules();

  const report = validator.validatePayload({
    waifus: [{
      id: "w1",
      name: "Legacy",
      rarity: "SR",
      element: "fire",
      baseStats: { hp: 300, atk: 30 }
    }],
    cards: [{
      id: "c1",
      name: "Golpe",
      waifuOwnerId: "w1",
      energyCost: 2,
      nitroGain: 25,
      effectType: "damage"
    }]
  });

  assert.equal(report.valid, true);
  assert.equal(report.sourceSchemaVersion, 1);
  assert.equal(report.schemaVersion, 2);
  assert.equal(report.waifus.length, 1);
  assert.equal(report.cards.length, 1);
  assert.equal(report.cards[0].title, "Golpe");
  assert.equal(report.cards[0].effectType, "DAMAGE");
});

test("database init backs up malformed local data before seeding defaults", async () => {
  const { db, storage, defaults } = await loadBrowserModules();

  storage.setItem("bosozoku_admin_db", "{malformed");
  const result = db.init(defaults);

  assert.equal(result.source, "defaults");
  assert.equal(db.db.schemaVersion, 2);

  const recoveryKeys = storage.keys().filter((key) =>
    key.startsWith("bosozoku_admin_db_recovery_")
  );

  assert.equal(recoveryKeys.length, 1);
  const recoveryPayload = JSON.parse(storage.dump(recoveryKeys[0]));
  assert.equal(recoveryPayload.reason, "json_malformado");
  assert.equal(recoveryPayload.payload, "{malformed");
  assert.equal(JSON.stringify(db.db), JSON.stringify({
    schemaVersion: 2,
    waifus: defaults.waifus,
    cards: defaults.cards
  }));
});

test("failed physical commit rolls the in-memory transaction back", async () => {
  const { db, storage } = await loadBrowserModules();

  db.seed({
    schemaVersion: 2,
    waifus: [{
      id: "w1",
      name: "Persisted",
      rarity: "R",
      element: "NEUTRAL",
      baseStats: { hp: 100, atk: 10 }
    }],
    cards: []
  });

  const before = db.snapshot();
  storage.failWrites = true;

  const result = db.addOrUpdateWaifu({
    id: "w2",
    name: "Rollback",
    rarity: "R",
    element: "NEUTRAL",
    baseStats: { hp: 100, atk: 10 }
  });

  assert.equal(result.success, false);
  assert.deepEqual(db.snapshot(), before);
});

test("transaction rejects duplicate IDs instead of silently dropping records", async () => {
  const { db } = await loadBrowserModules();

  db.seed({
    schemaVersion: 2,
    waifus: [{
      id: "w1",
      name: "One",
      rarity: "R",
      element: "NEUTRAL",
      baseStats: { hp: 100, atk: 10 }
    }],
    cards: []
  });

  const result = db.transaction((draft) => {
    draft.waifus.push(draft.waifus[0]);
  });

  assert.equal(result.success, false);
  assert.equal(db.db.waifus.length, 1);
});

test("admin preview module contains no innerHTML sink", async () => {
  const source = await readFile("intento_2/webapp/js/admin/admin_ui.js", "utf8");
  assert.equal(source.includes("innerHTML"), false);
});
