import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("economy GDD preserves defined recycling milestone", async () => {
  const data = JSON.parse(
    await readFile("experimental/bosozoku/economy_rules_v1.json", "utf8")
  );

  assert.equal(data.recycling.recycle_count_for_sr_fragments, 30);
  assert.equal(data.recycling.sr_fragments_awarded, 30);
});

test("economy GDD keeps unspecified balance values explicit", async () => {
  const data = JSON.parse(
    await readFile("experimental/bosozoku/economy_rules_v1.json", "utf8")
  );

  assert.equal(data.stamina_reserve.daily_saved_percentage, "PENDING_BALANCE");
  assert.equal(data.wrench_keys.source, "PENDING_RULE");
  assert.equal(data.gacha.exact_soft_pity_curve, "PENDING_BALANCE");
});

test("cosmetic skins do not modify competitive speed", async () => {
  const data = JSON.parse(
    await readFile("experimental/bosozoku/economy_rules_v1.json", "utf8")
  );

  assert.equal(data.monetization.cosmetic_skins_competitive_speed_modifiers, false);
});
