import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

async function loadEnergy() {
  const context = vm.createContext({ window: {}, Number, Object });
  vm.runInContext(await readFile("intento_2/webapp/js/game/energy.js", "utf8"), context);
  return context.window.EnergySystem;
}

test("energy starts at 3/3 and refills to max", async () => {
  const energy = await loadEnergy();
  const resources = energy.createEnergy(3);
  assert.equal(JSON.stringify(resources), JSON.stringify({ energy: 3, maxEnergy: 3 }));
  resources.energy = 1;
  energy.refill(resources);
  assert.equal(resources.energy, 3);
});

test("energy consumes exactly once and never goes negative", async () => {
  const energy = await loadEnergy();
  const resources = energy.createEnergy(3);
  assert.equal(energy.spend(resources, 2), true);
  assert.equal(resources.energy, 1);
  assert.equal(energy.spend(resources, 2), false);
  assert.equal(resources.energy, 1);
  assert.equal(energy.canSpend(resources, 1), true);
  assert.equal(energy.spend(resources, 1), true);
  assert.equal(resources.energy, 0);
});
