import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(process.cwd(), "cyber-combat-hud.js"),
  "utf8"
);

test("CyberCombatCanvas source uses non-accumulating resize transform", () => {
  assert.match(source, /setTransform\(dpr/);
  assert.doesNotMatch(source, /ctx\.scale\(/);
});

test("CyberCombatCanvas source fixes strokeStyle on the 2D context", () => {
  assert.match(source, /this\.ctx\.strokeStyle = borderColor/);
  assert.doesNotMatch(source, /this\.strokeStyle = borderColor/);
});

test("CyberCombatCanvas source clamps HUD health values", () => {
  assert.match(source, /clampPercent/);
  assert.match(source, /Math\.min\(100, Math\.max\(0, number\)\)/);
});
