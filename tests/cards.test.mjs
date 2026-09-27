import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

async function loadCards() {
  const context = vm.createContext({ window: {}, JSON, Number, String, Object, Array, Error });
  vm.runInContext(await readFile("intento_2/webapp/js/game/cards.js", "utf8"), context);
  return context.window.CardSystem;
}

test("MVP card definitions expose valid type, cost and damage", async () => {
  const cards = await loadCards();
  const shot = cards.definitionFor("disparo_neon");
  const charge = cards.definitionFor("embestida_nitro");
  const shield = cards.definitionFor("escudo_dark");

  assert.equal(shot.type, "ATTACK");
  assert.equal(shot.cost, 1);
  assert.equal(shot.damage, 18);
  assert.equal(charge.type, "ATTACK");
  assert.equal(charge.cost, 2);
  assert.equal(shield.type, "DEFEND");
  assert.equal(shield.cost, 1);
  assert.equal(shield.damage, 0);
});
