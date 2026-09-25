import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("Rocket Bunny Petty seed defines six roster entries", async () => {
  const raw = await readFile("experimental/bosozoku/gdd_seed_deck_v1.json", "utf8");
  const data = JSON.parse(raw);

  assert.equal(data.roster.length, 6);
  assert.deepEqual(
    data.roster.map((entry) => entry.id),
    [
      "waifu_mafuyu",
      "waifu_kurara",
      "waifu_nitori",
      "waifu_sashi",
      "waifu_rinka",
      "waifu_tsubaki_hibana"
    ]
  );
});

test("Rocket Bunny Petty seed defines two prototype cards per protagonist", async () => {
  const raw = await readFile("experimental/bosozoku/gdd_seed_deck_v1.json", "utf8");
  const data = JSON.parse(raw);

  assert.equal(data.deck.length, 12);

  const counts = new Map();
  for (const card of data.deck) {
    counts.set(card.ownerId, (counts.get(card.ownerId) ?? 0) + 1);
    assert.equal(card.status, "prototype-balance-pending");
  }

  for (const rosterEntry of data.roster) {
    assert.equal(counts.get(rosterEntry.id), 2, rosterEntry.id);
  }
});

test("prototype seed distinguishes source-defined stats from unresolved balance", async () => {
  const raw = await readFile("experimental/bosozoku/gdd_seed_deck_v1.json", "utf8");
  const data = JSON.parse(raw);

  const defined = data.roster.filter((entry) => entry.sourceStats);
  const pending = data.roster.filter((entry) => !entry.sourceStats);

  assert.equal(defined.length, 2);
  assert.equal(pending.length, 4);
  assert.ok(pending.every((entry) => entry.runtimeStatsStatus === "pending-source-values"));
});
