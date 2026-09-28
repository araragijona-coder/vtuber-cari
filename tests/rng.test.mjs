import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

async function loadRng() {
  const context = vm.createContext({ window: {}, Number, String, Object, Math, TypeError, RangeError });
  vm.runInContext(await readFile("intento_2/webapp/js/game/rng.js", "utf8"), context);
  return context.window.CombatRNG;
}

test("same seed produces the same sequence", async () => {
  const rng = await loadRng();
  let a = rng.create("phase-8.8");
  let b = rng.create("phase-8.8");
  for (let i = 0; i < 5; i += 1) {
    const x = rng.next(a);
    const y = rng.next(b);
    assert.equal(x.value, y.value);
    assert.equal(x.rng.state, y.rng.state);
    a = x.rng; b = y.rng;
  }
});

test("different seeds can produce different values", async () => {
  const rng = await loadRng();
  assert.notEqual(rng.next(rng.create("seed-a")).value, rng.next(rng.create("seed-b")).value);
});

test("range and chance stay within limits", async () => {
  const rng = await loadRng();
  let state = rng.create(12345);
  const range = rng.float(state, 0.9, 1.1);
  assert.ok(range.value >= 0.9 && range.value <= 1.1);
  const chance = rng.chance(range.rng, 0.5);
  assert.ok(chance.roll >= 0 && chance.roll < 1);
});

test("rng module does not use Math.random", async () => {
  const source = await readFile("intento_2/webapp/js/game/rng.js", "utf8");
  assert.equal(source.includes("Math.random"), false);
});