import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("production combat UI exposes realtime controls and no END TURN control", async () => {
  const html = await readFile("intento_2/webapp/index.html", "utf8");
  assert.match(html, /id="burst-action"/);
  assert.match(html, /id="character-ability"/);
  assert.match(html, /id="combat-burst"/);
  assert.match(html, /id="combat-enemy-break"/);
  assert.match(html, /id="combat-enemy-intent"/);
  assert.doesNotMatch(html, /id="end-turn"/);
});

test("combat controller uses the fixed-step clock and realtime frame driver", async () => {
  const source = await readFile("intento_2/webapp/js/combat.js", "utf8");
  assert.match(source, /CombatEngine\.advanceTime/);
  assert.match(source, /requestAnimationFrame/);
  assert.match(source, /useBurst/);
  assert.doesNotMatch(source, /setInterval\(/);
  assert.doesNotMatch(source, /endTurn/);
});
