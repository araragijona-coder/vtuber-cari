import test from "node:test";
import assert from "node:assert/strict";

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function loadStore() {
  const source = await fs.readFile(path.join(root, "avatar", "action-store.js"), "utf8");
  const contract = await fs.readFile(path.join(root, "avatar", "avatar-contract.js"), "utf8");
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "cari-action-store-"));
  await fs.writeFile(path.join(tempRoot, "action-store.mjs"), source, "utf8");
  await fs.writeFile(path.join(tempRoot, "avatar-contract.js"), contract, "utf8");
  return import(pathToFileURL(path.join(tempRoot, "action-store.mjs")).href);
}

function makeStorage(initial = null) {
  return {
    value: initial,
    getItem() { return this.value; },
    setItem(_key, value) { this.value = value; }
  };
}

test("action store hydrates canonical actions from disk persistence", async () => {
  const { AvatarActionStore } = await loadStore();
  const disk = {
    loadCalls: 0,
    saved: null,
    async load() {
      this.loadCalls += 1;
      return {
        version: 1,
        actions: [{
          id: "happy",
          label: "Happy persisted",
          expression: "happy",
          durationMs: 120,
          loop: false,
          frames: [{
            id: "h0",
            name: "happy.png",
            url: "file:///avatar-actions/frames/happy/h0.png",
            mime: "image/png",
            bundled: true
          }]
        }]
      };
    },
    async save(payload) {
      this.saved = payload;
    }
  };

  const store = new AvatarActionStore(makeStorage(), disk);
  await store.ready;

  assert.equal(disk.loadCalls, 1);
  assert.equal(store.get("happy")?.label, "Happy persisted");
  assert.equal(store.get("happy")?.frames.length, 1);
});

test("action store flushes mutations into the persistent payload", async () => {
  const { AvatarActionStore } = await loadStore();
  const disk = {
    saved: null,
    async load() { return { version: 1, actions: [] }; },
    async save(payload) { this.saved = payload; }
  };

  const store = new AvatarActionStore(makeStorage(), disk);
  await store.ready;

  const added = store.add("Nueva acción persistente");
  await store.flush();

  assert.ok(disk.saved);
  assert.equal(disk.saved.version, 1);
  assert.equal(
    disk.saved.actions.some(action => action.id === added.id && action.label === "Nueva acción persistente"),
    true
  );
});

test("action store falls back to local storage when disk hydration is unavailable", async () => {
  const { AvatarActionStore } = await loadStore();
  const local = JSON.stringify([{
    id: "angry",
    label: "Enojada local",
    expression: "angry",
    frames: []
  }]);
  const disk = {
    async load() { throw new Error("disk unavailable"); },
    async save() {}
  };

  const store = new AvatarActionStore(makeStorage(local), disk);
  await store.ready;

  assert.equal(store.get("angry")?.label, "Enojada local");
  assert.match(store.persistenceError, /disk unavailable/);
});
