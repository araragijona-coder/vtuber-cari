import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

async function loadBalance() {
  const context = vm.createContext({ window: {}, Object, String });
  vm.runInContext(await readFile("intento_2/webapp/js/game/balance.js", "utf8"), context);
  return context.window.CombatBalance;
}

test("balance has one explicit source for cards and enemies", async () => {
  const balance = await loadBalance();
  assert.equal(balance.card("disparo_neon").damage, 18);
  assert.equal(balance.card("embestida_nitro").cost, 2);
  assert.equal(balance.card("escudo_dark").defenseMultiplier, 0.5);
  assert.equal(balance.enemy("iron_guard").defense, 6);
  assert.equal(balance.BALANCE.damage.criticalChance, 0.12);
});