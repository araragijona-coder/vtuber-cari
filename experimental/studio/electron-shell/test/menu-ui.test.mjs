import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = await fs.readFile(path.join(root, "renderer/index.html"), "utf8");
const menuSource = await fs.readFile(path.join(root, "renderer/menu-config.js"), "utf8");
const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "cari-menu-"));
const tempFile = path.join(tempRoot, "menu-config.mjs");
await fs.writeFile(tempFile, menuSource, "utf8");

try {
  const { STUDIO_MENU, CAPABILITIES } = await import(pathToFileURL(tempFile).href);

  test("every configured navigation item has a matching view", () => {
    const views = new Set(
      [...html.matchAll(/data-view-panel="([^"]+)"/g)].map(match => match[1])
    );
    assert.ok(STUDIO_MENU.length >= 10);
    for (const item of STUDIO_MENU) {
      assert.ok(views.has(item.id), "missing view for " + item.id);
    }
    assert.equal(new Set(STUDIO_MENU.map(item => item.id)).size, STUDIO_MENU.length);
  });

  test("HTML ids are unique", () => {
    const ids = [...html.matchAll(/id="([^"]+)"/g)].map(match => match[1]);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    assert.deepEqual(duplicates, []);
  });

  test("capability catalogs have valid states", () => {
    const allowed = new Set(["connected", "eventsub", "prepared", "planned"]);
    for (const service of ["twitch", "obs", "vtuber"]) {
      assert.ok(Array.isArray(CAPABILITIES[service]));
      assert.ok(CAPABILITIES[service].length > 5);
      for (const [name, api, state] of CAPABILITIES[service]) {
        assert.ok(name);
        assert.ok(api);
        assert.ok(allowed.has(state), service + ": " + name);
      }
    }
  });

  test("key service surfaces exist in the HTML", () => {
    for (const id of [
      "twitch-capabilities",
      "obs-capabilities",
      "obs-scenes",
      "obs-inputs",
      "expression-grid",
      "hotkey-grid"
    ]) {
      assert.match(html, new RegExp('id="' + id + '"'));
    }
  });
} finally {
  await fs.rm(tempRoot, { recursive: true, force: true });
}
