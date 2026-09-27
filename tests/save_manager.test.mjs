import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

async function loadSaveManager(initial = {}) {
  const storageData = new Map(Object.entries(initial));
  const localStorage = {
    getItem(key) { return storageData.has(key) ? storageData.get(key) : null; },
    setItem(key, value) { storageData.set(key, String(value)); },
    removeItem(key) { storageData.delete(key); }
  };
  const window = { localStorage };
  const context = vm.createContext({
    window,
    console,
    JSON,
    Number,
    String,
    Object,
    Array,
    Set,
    Date,
    Error,
    TypeError,
    Infinity,
    NaN
  });

  vm.runInContext(
    await readFile("intento_2/webapp/js/storage/save_manager.js", "utf8"),
    context,
    { filename: "save_manager.js" }
  );

  return { manager: context.window.SaveManager, storageData };
}

function validSave(manager) {
  return manager.createDefaultSave("player-test");
}

test("missing save returns defaults", async () => {
  const { manager } = await loadSaveManager();
  const result = manager.load();
  assert.equal(result.source, "defaults");
  assert.equal(result.save.player.id, "local-player");
  assert.equal(result.save.saveVersion, manager.CURRENT_SAVE_VERSION);
});

test("save then load preserves player data", async () => {
  const { manager } = await loadSaveManager();
  const save = validSave(manager);
  save.player.level = 4;
  save.player.xp = 125;
  save.player.currency = 30;
  save.player.wins = 3;
  save.player.losses = 1;

  assert.equal(manager.save(save).success, true);
  const loaded = manager.load();

  assert.equal(loaded.source, "localStorage");
  assert.deepEqual(loaded.save.player, save.player);
});

test("corrupt JSON safely falls back to defaults", async () => {
  const { manager, storageData } = await loadSaveManager();
  storageData.set(manager.STORAGE_KEY, "{not-json");

  const result = manager.load();
  assert.equal(result.source, "defaults");
  assert.equal(result.reason, "corrupt_json");
});

test("unsupported version safely falls back to defaults", async () => {
  const { manager, storageData } = await loadSaveManager();
  storageData.set(manager.STORAGE_KEY, JSON.stringify({
    ...validSave(manager),
    saveVersion: 999
  }));

  const result = manager.load();
  assert.equal(result.source, "defaults");
  assert.equal(result.reason, "no_safe_migration_for_version_999");
});

test("invalid numeric values are rejected", async () => {
  const { manager, storageData } = await loadSaveManager();
  const save = validSave(manager);

  for (const value of [NaN, Infinity, -1, "10"]) {
    const candidate = JSON.parse(JSON.stringify(save));
    candidate.player.xp = value;
    storageData.set(manager.STORAGE_KEY, JSON.stringify(candidate));

    const result = manager.load();
    assert.equal(result.source, "defaults");
    assert.equal(result.reason, "validation_failed");
  }
});

test("clear removes player save without touching admin storage", async () => {
  const { manager, storageData } = await loadSaveManager({
    bosozoku_admin_db: JSON.stringify({ schemaVersion: 2, waifus: [], cards: [] })
  });

  const save = validSave(manager);
  assert.equal(manager.save(save).success, true);
  assert.equal(manager.clear().success, true);
  assert.equal(storageData.has(manager.STORAGE_KEY), false);
  assert.equal(storageData.has("bosozoku_admin_db"), true);
  assert.equal(manager.load().source, "defaults");
});

test("saveFromGameState records victory once per battle", async () => {
  const { manager } = await loadSaveManager();
  const state = {
    player: { id: "player-test" },
    combat: {
      battleId: "battle-1",
      turn: 3,
      outcome: "VICTORY",
      player: { hp: 50 },
      enemy: { hp: 0 }
    }
  };

  assert.equal(manager.saveFromGameState(state, "VICTORY").success, true);
  assert.equal(manager.saveFromGameState(state, "VICTORY").success, true);

  const loaded = manager.load().save;
  assert.equal(loaded.player.wins, 1);
  assert.equal(loaded.player.losses, 0);
  assert.deepEqual(loaded.completedBattles, ["battle-1"]);
  assert.equal(loaded.lastBattle.outcome, "VICTORY");
});

test("saveFromGameState records defeat once per battle", async () => {
  const { manager } = await loadSaveManager();
  const state = {
    player: { id: "player-test" },
    combat: {
      battleId: "battle-2",
      turn: 4,
      outcome: "DEFEAT",
      player: { hp: 0 },
      enemy: { hp: 12 }
    }
  };

  assert.equal(manager.saveFromGameState(state, "DEFEAT").success, true);
  assert.equal(manager.saveFromGameState(state, "DEFEAT").success, true);

  const loaded = manager.load().save;
  assert.equal(loaded.player.wins, 0);
  assert.equal(loaded.player.losses, 1);
  assert.deepEqual(loaded.completedBattles, ["battle-2"]);
  assert.equal(loaded.lastBattle.outcome, "DEFEAT");
});
