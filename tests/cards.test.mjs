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

test("card definitions expose explicit roles, costs, targeting and effects", async () => {
  const cards = await loadCards();
  assert.equal(Object.keys(cards.CARD_DEFINITIONS).length, 9);
  assert.equal(Object.values(cards.CARD_DEFINITIONS).filter(card => card.type === "ATTACK").length, 3);
  assert.equal(Object.values(cards.CARD_DEFINITIONS).filter(card => card.type === "DEFENSE").length, 3);
  assert.equal(Object.values(cards.CARD_DEFINITIONS).filter(card => card.type === "SKILL").length, 3);
  for (const card of Object.values(cards.CARD_DEFINITIONS)) {
    assert.ok(card.cardId && card.name && card.targeting);
    assert.ok(Number.isFinite(card.cost));
    assert.ok(Number.isFinite(card.cooldownMs));
    assert.ok(card.effects);
  }
});

test("legacy thematic card identities remain present", async () => {
  const cards = await loadCards();
  for (const id of [
    "disparo_neon", "embestida_nitro", "derrape_expuesto",
    "escudo_dark", "barricada_neon", "espejo_urbano",
    "lectura_tactica", "sobrecarga", "pulso_debilitante"
  ]) {
    assert.ok(cards.definitionFor(id), id);
  }
});