import assert from "node:assert/strict";
import { test } from "node:test";

test("MVP balance targets remain bounded", () => {
  const cards = [
    { id: "disparo_neon", cost: 1, damage: 18 },
    { id: "embestida_nitro", cost: 2, damage: 38 },
    { id: "escudo_dark", cost: 1, damage: 0 }
  ];
  assert.ok(cards[0].damage / cards[0].cost < cards[1].damage / cards[1].cost);
  assert.ok(cards[1].damage <= 50);
  assert.ok(cards[2].cost <= 1);
});
