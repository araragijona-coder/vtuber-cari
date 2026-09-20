import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const html = await fs.readFile(path.join(root, "renderer", "index.html"), "utf8");
const renderer = await fs.readFile(path.join(root, "renderer", "main.js"), "utf8");
const main = await fs.readFile(path.join(root, "main.js"), "utf8");
const obs = await fs.readFile(path.join(root, "runtime", "obs-service.js"), "utf8");

const buttonIds = new Set(
  [...html.matchAll(/<button[^>]*\\bid="([^"]+)"/g)].map(match => match[1])
);

test("every HTML button has an explicit routing contract", () => {
  const buttons = [...html.matchAll(/<button\\b([^>]*)>/g)].map(match => match[1]);
  const unrouted = buttons.filter(attributes =>
    !/\\bid="[^"]+"/.test(attributes) &&
    !/\\bdata-quick-action="[^"]+"/.test(attributes) &&
    !/\\bdata-nav-target="[^"]+"/.test(attributes)
  );
  assert.deepEqual(unrouted, []);
});

test("every explicit renderer button handler targets a real button", () => {
  const boundIds = [
    ...renderer.matchAll(/\$\("#([^"]+)"\)\.(?:onclick|ondblclick)\s*=/g)
  ].map(match => match[1]);

  const missing = [...new Set(boundIds)].filter(id => !buttonIds.has(id));
  assert.deepEqual(missing, []);
});

test("renderer has no obsolete header-stream binding", () => {
  assert.equal(renderer.includes('$("#header-stream").onclick'), false);
});

test("OBS IPC handlers only call service methods that exist", () => {
  const calls = [
    ...main.matchAll(/\bobs\.([A-Za-z0-9_]+)\(/g)
  ].map(match => match[1]);
  const methods = new Set(
    [...obs.matchAll(/\n  (?:async )?([A-Za-z0-9_]+)\(/g)].map(match => match[1])
  );

  const ignored = new Set(["emit"]);
  const invalid = [...new Set(calls)].filter(name => !methods.has(name) && !ignored.has(name));
  assert.deepEqual(invalid, []);
});

test("preload exposes the OBS commands used by the renderer", () => {
  for (const method of [
    "connect", "disconnect", "startStream", "stopStream", "setScene",
    "status", "scenes", "inputs", "inputKinds", "stats",
    "recordStatus", "startRecord", "stopRecord", "startVirtualCamera",
    "stopVirtualCamera", "virtualCameraStatus", "studioMode", "previewScene",
    "transition", "profiles", "sceneCollections", "setProfile",
    "setSceneCollection"
  ]) {
    assert.ok(preload.includes(method + ":" ) || preload.includes(method + " =") || preload.includes(method + "("),
      "missing preload method: " + method);
  }
});
