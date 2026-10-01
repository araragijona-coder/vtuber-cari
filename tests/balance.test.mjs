import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

async function loadBalance() {
  const context = vm.createContext({ window: {}, Object, String, Number });
  vm.runInContext(await readFile("intento_2/webapp/js/game/balance.js", "utf8"), context);
  return context.window.CombatBalance;
}

test("balance has one explicit source for semi-real-time cards and timing", async () => {
  const balance = await loadBalance();
  assert.equal(balance.BALANCE.timing.fixedStepMs, 100);
  assert.equal(balance.BALANCE.energy.maxEnergy, 100);
  assert.ok(balance.BALANCE.energy.regenPerSecond > 0);
  assert.equal(balance.card("disparo_neon").damage, 16);
  assert.equal(balance.card("embestida_nitro").cost, 40);
  assert.equal(balance.card("escudo_dark").block, 18);
  assert.equal(balance.enemy("iron_guard").defense, 6);
});