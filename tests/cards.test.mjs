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

test("vertical slice card definitions expose explicit types, costs and effects", async () => {
  const cards = await loadCards();
  assert.equal(Object.keys(cards.CARD_DEFINITIONS).length, 9);
  assert.equal(Object.values(cards.CARD_DEFINITIONS).filter((card) => card.type === "ATTACK").length, 3);
  assert.equal(Object.values(cards.CARD_DEFINITIONS).filter((card) => card.type === "DEFENSE").length, 3);
  assert.equal(Object.values(cards.CARD_DEFINITIONS).filter((card) => card.type === "SKILL").length, 3);

  const shot = cards.definitionFor("disparo_neon");
  const charge = cards.definitionFor("embestida_nitro");
  const shield = cards.definitionFor("escudo_dark");

  assert.equal(shot.type, "ATTACK");
  assert.equal(shot.cost, 1);
  assert.equal(shot.damage, 18);
  assert.equal(charge.type, "ATTACK");
  assert.equal(charge.cost, 2);
  assert.equal(charge.damage, 38);
  assert.equal(shield.type, "DEFENSE");
  assert.equal(shield.cost, 1);
  assert.equal(shield.damage, 0);
  assert.equal(shield.effects.block, 8);
});

test("card instances carry cardId and remain independently hydratable", async () => {
  const cards = await loadCards();
  const combat = cards.createCombatDeckState(4);
  cards.drawCards(combat, 4);
  assert.equal(combat.hand.length, 4);
  for (const card of combat.hand) {
    const hydrated = cards.hydrateCard(card);
    assert.equal(hydrated.cardId, card.cardId);
    assert.equal(hydrated.instanceId, card.instanceId);
    assert.ok(hydrated.effects);
  }
});
