import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

async function loadEconomyRules() {
  return JSON.parse(
    await readFile("experimental/bosozoku/economy_rules_v1.json", "utf8")
  );
}

test("economy GDD preserves defined fuel uses and reserve capacities", async () => {
  const data = await loadEconomyRules();

  assert.deepEqual(data.fuel.uses, [
    "mapas de historia",
    "incursiones contra jefes Banchou",
    "farmeo de piezas de moto"
  ]);
  assert.equal(data.fuel.reserve_tanks.free_to_play.capacity_in_daily_tanks, 2);
  assert.equal(
    data.fuel.reserve_tanks.garage_expansion.maximum_capacity_in_daily_tanks,
    5
  );
  assert.equal(
    data.fuel.reserve_tanks.garage_expansion.competitive_speed_advantage,
    false
  );
});

test("premium and standard asphalt currencies preserve source vocabulary and uses", async () => {
  const data = await loadEconomyRules();

  assert.deepEqual(data.currencies.premium.display_names, [
    "Kilometraje (KM)",
    "Millas de Asfalto"
  ]);
  assert.deepEqual(data.currencies.standard.display_names, [
    "Dinero de Pandilla",
    "Yenes"
  ]);
  assert.ok(data.currencies.premium.uses.includes("banners de personajes"));
  assert.ok(data.currencies.premium.uses.includes("banners de cartas SSR"));
  assert.ok(data.currencies.standard.uses.includes("costes de reciclaje"));
});

test("economy GDD preserves defined recycling milestone and deterministic SR engine exchange", async () => {
  const data = await loadEconomyRules();

  assert.equal(data.recycling.recycle_count_for_sr_fragments, 30);
  assert.equal(data.recycling.sr_fragments_awarded, 30);
  assert.equal(data.currencies.sr_engine_fragments.direct_exchange.required_fragments, 30);
  assert.equal(data.currencies.sr_engine_fragments.direct_exchange.result_count, 1);
  assert.equal(
    data.currencies.sr_engine_fragments.direct_exchange.main_stat_selection,
    "player_choice"
  );
  assert.equal(
    data.currencies.sr_engine_fragments.direct_exchange.secondary_stat_selection,
    "player_choice"
  );
});

test("rust fragments are distinct from SR engine fragments", async () => {
  const data = await loadEconomyRules();

  assert.notEqual(
    data.currencies.rust_fragments.display_name,
    data.currencies.sr_engine_fragments.display_name
  );
  assert.deepEqual(data.currencies.rust_fragments.sources, [
    "personajes repetidos del gacha",
    "cartas repetidas del gacha"
  ]);
});

test("economy GDD keeps unspecified balance and commercial values explicit", async () => {
  const data = await loadEconomyRules();

  assert.equal(data.fuel.reserve_tanks.accumulation_rules, "PENDING_RULE");
  assert.equal(data.fuel.reserve_tanks.garage_expansion.price, "PENDING_RULE");
  assert.equal(data.wrench_keys.source, "PENDING_RULE");
  assert.equal(data.wrench_keys.cost, "PENDING_RULE");
  assert.equal(data.gacha.exact_soft_pity_curve, "PENDING_BALANCE");
  assert.equal(data.gacha.guarantee_persistence, "PENDING_RULE");
  assert.equal(data.monetization.commercial_prices, "PENDING_RULE");
});

test("cosmetic monetization does not modify competitive speed", async () => {
  const data = await loadEconomyRules();

  assert.equal(data.monetization.cosmetic_skins_competitive_speed_modifiers, false);
});
