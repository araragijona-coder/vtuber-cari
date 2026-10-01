import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

async function loadEnergy() {
  const context = vm.createContext({ window: {}, Number, Object });
  vm.runInContext(await readFile("intento_2/webapp/js/game/energy.js", "utf8"), context);
  return context.window.EnergySystem;
}

test("energy uses a regenerative 0-100 resource", async () => {
  const energy = await loadEnergy();
  const resources = energy.createEnergy({ maxEnergy: 100, energyRegen: 12 });
  assert.equal(JSON.stringify(resources), JSON.stringify({
    energy: 100, maxEnergy: 100, energyRegen: 12
  }));
  resources.energy = 25;
  energy.regenerate(resources, 1000);
  assert.equal(resources.energy, 37);
});

test("energy never exceeds max and cannot be overspent", async () => {
  const energy = await loadEnergy();
  const resources = energy.createEnergy({ maxEnergy: 100, energyRegen: 12 });
  assert.equal(energy.spend(resources, 40), true);
  assert.equal(resources.energy, 60);
  assert.equal(energy.spend(resources, 70), false);
  assert.equal(resources.energy, 60);
  energy.gain(resources, 1000);
  assert.equal(resources.energy, 100);
});