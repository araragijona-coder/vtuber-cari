import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

async function loadCards() {
  const context = vm.createContext({ window: {}, JSON, Number, String, Object, Array, Error });
  vm.runInContext(await readFile("intento_2/webapp/js/game/cards.js", "utf8"), context);
  return context.window.CardSystem;
}

test("initial deck is fixed at 7 physical cards and draws 4", async () => {
  const cards = await loadCards();
  const combat = cards.createCombatDeckState(4);
  assert.equal(combat.drawPile.length, 7);
  cards.drawCards(combat, 4);
  assert.equal(combat.hand.length, 4);
  assert.equal(combat.drawPile.length, 3);
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
  cards.drawCards(combat, 4);
  assert.equal(combat.drawPile.length, 0);
  assert.equal(combat.hand.length, 4);
  assert.equal(combat.discardPile.length, 0);
});
