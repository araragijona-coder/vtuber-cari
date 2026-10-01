import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

async function loadCards() {
  const context = vm.createContext({ window: {}, JSON, Number, String, Object, Array, Error });
  for (const path of [
    "intento_2/webapp/js/game/balance.js",
    "intento_2/webapp/js/game/cards.js"
  ]) vm.runInContext(await readFile(path, "utf8"), context, { filename: path });
  return context.window.CardSystem;
}

test("compact hand starts at four cards from the nine-card skill cycle", async () => {
  const cards = await loadCards();
  const combat = cards.createCombatDeckState(4);
  cards.drawCards(combat, 4);
  assert.equal(combat.hand.length, 4);
  assert.equal(combat.drawPile.length, 5);
  assert.equal(new Set(combat.hand.map(card => card.instanceId)).size, 4);
});

test("playing a skill removes it and refills the hand without a turn boundary", async () => {
  const cards = await loadCards();
  const combat = cards.createCombatDeckState(4);
  cards.drawCards(combat, 4);
  const first = combat.hand[0].instanceId;
  assert.ok(cards.playCard(combat, first));
  cards.refillHand(combat);
  assert.equal(combat.hand.length, 4);
  assert.equal(combat.hand.some(card => card.instanceId === first), false);
  assert.equal(combat.discardPile.length, 1);
});

test("discard recycling is independent of turns", async () => {
  const cards = await loadCards();
  const combat = cards.createCombatDeckState(4);
  cards.drawCards(combat, 4);
  combat.hand.splice(0).forEach(card => combat.discardPile.push(card));
  cards.drawCards(combat, 4);
  assert.equal(combat.hand.length, 4);
  assert.equal(combat.discardPile.length, 0);
});