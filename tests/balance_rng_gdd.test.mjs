import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

async function loadBalanceRules() {
  return JSON.parse(
    await readFile("experimental/bosozoku/balance_rng_rules_v1.json", "utf8")
  );
}

test("tactical difficulty is strategy-driven rather than button-mashing", async () => {
  const data = await loadBalanceRules();

  assert.equal(data.tactical_difficulty.strategy_required, true);
  assert.equal(data.tactical_difficulty.button_mashing_only, false);
  assert.equal(
    data.tactical_difficulty.artificial_power_wall_as_primary_difficulty,
    false
  );
  assert.equal(data.tactical_difficulty.tactical_cards, true);
  assert.equal(data.tactical_difficulty.track_positioning, true);
  assert.equal(data.tactical_difficulty.waifu_synergies, true);
});

test("fuel reserve capacities match the defined economy contract", async () => {
  const data = await loadBalanceRules();

  assert.equal(
    data.time_and_fuel.reserve_tanks.free_to_play_capacity_daily_tanks,
    2
  );
  assert.equal(
    data.time_and_fuel.reserve_tanks.garage_max_capacity_daily_tanks,
    5
  );
});

test("RNG fiction does not alter the underlying rules", async () => {
  const data = await loadBalanceRules();

  assert.equal(data.rng_fiction.thematic_personification, "Gremlin del Taller");
  assert.equal(data.rng_fiction.fiction_changes_underlying_math, false);
  assert.equal(data.rng_fiction.rules_must_remain_traceable, true);
});

test("failure tolerance enforces the maximum 30 percent performance deficit", async () => {
  const data = await loadBalanceRules();

  assert.equal(data.failure_tolerance.maximum_performance_deficit_percent, 30);
  assert.equal(
    data.failure_tolerance.derived_minimum_performance_percent_of_optimal,
    70
  );
  assert.equal(data.failure_tolerance.fully_useless_equipment_allowed, false);
  assert.equal(data.failure_tolerance.performance_formula, "PENDING_BALANCE");
});

test("defined RNG recovery routes remain available", async () => {
  const data = await loadBalanceRules();

  assert.equal(data.rng_recovery.recycling_to_sr_engine, true);
  assert.equal(data.rng_recovery.recycling_milestone, 30);
  assert.equal(data.rng_recovery.sr_engine_fragments_generated, 30);
  assert.equal(
    data.rng_recovery.direct_sr_engine_stat_selection,
    "player_choice"
  );
  assert.equal(data.rng_recovery.wrench_keys_stat_control, true);
});

test("race contract is required before runtime enforcement", async () => {
  const data = await loadBalanceRules();

  assert.equal(data.runtime_contract.race_state_required_before_enforcement, true);
  assert.equal(data.runtime_contract.legacy_combat_integration, false);
  assert.equal(data.tactical_difficulty.automatic_primary_progression_without_decisions, false);
});
