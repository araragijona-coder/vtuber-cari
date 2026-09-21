import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rawSource = await fs.readFile(path.join(root, "avatar", "action-store.js"), "utf8");
const source = rawSource.replace(
  'from "./avatar-contract.js";',
  'from "./avatar-contract.mjs";'
);
const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "cari-action-store-bridge-"));
const modulePath = path.join(tempRoot, "action-store.mjs");
const contractSource = await fs.readFile(path.join(root, "avatar", "avatar-contract.js"), "utf8");

globalThis.window = {
  localStorage: {
    getItem() { return null; },
    setItem() {}
  },
  cari: {
    native: {
      avatarActions: {
        async load() {
          return {
            version: 1,
            actions: [{
              id: "happy",
              label: "Persistida en disk",
              expression: "happy",
              durationMs: 160,
              loop: false,
              frames: [{
                id: "happy-0",
                name: "happy.png",
                url: "file:///avatar-actions/happy/happy.png",
                mime: "image/png",
                bundled: true
              }]
            }]
          };
        },
        async save() {
          throw new Error("save should not be called during hydration test");
        }
      }
    }
  }
};

await fs.writeFile(modulePath, source, "utf8");
await fs.writeFile(path.join(tempRoot, "avatar-contract.mjs"), contractSource, "utf8");
const esm = await import(pathToFileURL(modulePath).href);

test("AvatarActionStore resolves the Electron native persistence bridge", async () => {
  const store = new esm.AvatarActionStore();
  await store.ready;

  const action = store.get("happy");
  assert.equal(action?.label, "Persistida en disk");
  assert.equal(action?.frames[0]?.url, "file:///avatar-actions/happy/happy.png");
});

console.log("AvatarActionStore native bridge smoke: PASS");
