import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function loadStore() {
  const source = await fs.readFile(
    path.join(root, "avatar", "action-store.js"),
    "utf8"
  );
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "cari-action-store-"));
  const tempFile = path.join(tempRoot, "action-store.mjs");
  await fs.writeFile(
    tempFile,
    source.replaceAll("window.localStorage", "globalThis.localStorage"),
    "utf8"
  );
  return import(pathToFileURL(tempFile).href);
}

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

globalThis.localStorage = new MemoryStorage();
const { AvatarActionStore } = await loadStore();

test("action store ships the requested starter actions", () => {
  const store = new AvatarActionStore(globalThis.localStorage);
  const labels = store.list().map(action => action.label);
  assert.deepEqual(labels, ["Neutral", "Feliz", "Triste", "Hablar", "Callar", "Enojada"]);
});

test("actions are persistent through the storage contract", () => {
  const storage = new MemoryStorage();
  const first = new AvatarActionStore(storage);
  const created = first.add("Cumpleaños");
  first.update(created.id, { icon: "★", loop: false, durationMs: 240 });
  const second = new AvatarActionStore(storage);
  const restored = second.get(created.id);
  assert.equal(restored.label, "Cumpleaños");
  assert.equal(restored.icon, "★");
  assert.equal(restored.loop, false);
  assert.equal(restored.durationMs, 240);
});

test("export/import preserves action order and metadata", () => {
  const storage = new MemoryStorage();
  const first = new AvatarActionStore(storage);
  first.add("Grito");
  const exported = first.exportJson();

  const otherStorage = new MemoryStorage();
  const second = new AvatarActionStore(otherStorage);
  const imported = second.importJson(exported);

  assert.equal(imported.length, first.list().length);
  assert.deepEqual(
    imported.map(action => action.label),
    first.list().map(action => action.label)
  );
});

test("frame operations are bounded and deterministic", () => {
  const storage = new MemoryStorage();
  const store = new AvatarActionStore(storage);
  const action = store.add("Animación");

  assert.equal(store.moveFrame(action.id, "missing", 1), false);
  assert.equal(store.removeFrame(action.id, "missing"), false);
  assert.equal(store.remove(action.id), true);

  const labels = store.list().map(item => item.label);
  assert.ok(labels.includes("Neutral"));
});
