import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

async function loadCards() {
  const context = vm.createContext({
    window: {}, JSON, Number, String, Object, Array, Error
  });
  for (const path of [
    "intento_2/webapp/js/game/balance.js",
    "intento_2/webapp/js/game/cards.js"
  ]) {
    vm.runInContext(await readFile(path, "utf8"), context, { filename: path });
  }
  return context.window.CardSystem;
}

test("initial deck has 9 unique functional card definitions and draws 4", async () => {
  const cards = await loadCards();
  const combat = cards.createCombatDeckState(4);
  assert.equal(combat.drawPile.length, 9);
  cards.drawCards(combat, 4);
  assert.equal(combat.hand.length, 4);
  assert.equal(combat.drawPile.length, 5);
  assert.equal(new Set(combat.hand.map((card) => card.instanceId)).size, 4);
});

test("played cards move once from hand to discard and recycle deterministically", async () => {
  const cards = await loadCards();
  const combat = cards.createCombatDeckState(4);
  cards.drawCards(combat, 4);
  const first = combat.hand[0].instanceId;
  assert.ok(cards.playCard(combat, first));
  assert.equal(combat.hand.length, 3);
  assert.equal(combat.discardPile.length, 1);
  assert.equal(cards.playCard(combat, first), null);
  combat.hand.length = 0;
  cards.drawCards(combat, 5);
  assert.equal(combat.hand.length, 4);
  assert.equal(combat.drawPile.length, 0);
  assert.equal(combat.discardPile.length, 1);
});
