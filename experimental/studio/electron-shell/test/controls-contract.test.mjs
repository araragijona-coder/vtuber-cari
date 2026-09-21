import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = fs.readFileSync(path.join(ROOT, "renderer", "index.html"), "utf8");
const js = fs.readFileSync(path.join(ROOT, "renderer", "main.js"), "utf8");
const preload = fs.readFileSync(path.join(ROOT, "preload.js"), "utf8");

test("every static button has a direct handler or declared navigation", () => {
  const buttonBlocks = [...html.matchAll(/<button\b[\s\S]*?<\/button>/g)].map(match => match[0]);
  const handlers = new Set(
    [...js.matchAll(/\$\("#([^"]+)"\)\.(?:onclick|onchange|ondblclick|onkeydown)\s*=/g)]
      .map(match => match[1])
  );

  const missing = buttonBlocks
    .filter(block => {
      const id = block.match(/\bid="([^"]+)"/)?.[1];
      return Boolean(id) && !handlers.has(id) && !/\bdata-nav-target=/.test(block);
    })
    .map(block => block.match(/\bid="([^"]+)"/)?.[1])
    .filter(Boolean);

  assert.deepEqual(missing, []);
});

test("renderer OBS/Twitch method calls exist in preload", () => {
  const obsMethods = new Set(
    [...preload.matchAll(/\b([A-Za-z0-9_]+):\s*[^\n]*ipcRenderer\.invoke\("obs:/g)]
      .map(match => match[1])
  );
  const twitchMethods = new Set(
    [...preload.matchAll(/\b([A-Za-z0-9_]+):\s*[^\n]*ipcRenderer\.invoke\("twitch:/g)]
      .map(match => match[1])
  );

  const usedObs = new Set(
    [...js.matchAll(/window\.cari\.native\.obs\.([A-Za-z0-9_]+)/g)]
      .map(match => match[1])
  );
  const usedTwitch = new Set(
    [...js.matchAll(/window\.cari\.native\.twitch\.([A-Za-z0-9_]+)/g)]
      .map(match => match[1])
  );

  assert.deepEqual([...usedObs].filter(name => !obsMethods.has(name)), []);
  assert.deepEqual([...usedTwitch].filter(name => !twitchMethods.has(name)), []);
});

test("renderer uses the real engine status element", () => {
  assert.ok(!js.includes('engine: $("#engine"),'));
  assert.match(js, /engine:\s*\$("#engine-chip"\)/);
});
