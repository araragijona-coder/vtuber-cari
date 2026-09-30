import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

async function loadTelemetry() {
  const window = {};
  const document = {
    documentElement: { dataset: { gameVersion: "test" } },
    visibilityState: "visible",
    addEventListener() {}
  };
  const sessionStorage = { setItem() {} };
  const context = vm.createContext({
    window,
    document,
    sessionStorage,
    console,
    JSON,
    Date,
    Math,
    Object,
    String,
    Number,
    Boolean
  });
  vm.runInContext(
    await readFile("intento_2/webapp/js/telemetry.js", "utf8"),
    context,
    { filename: "intento_2/webapp/js/telemetry.js" }
  );
  return context.window.RocketBunnyTelemetry;
}

test("telemetry emits versioned event envelopes without requiring a backend", async () => {
  const telemetry = await loadTelemetry();
  const events = telemetry.peek();
  assert.equal(events[0].event_name, "app_open");
  assert.equal(events[1].event_name, "session_start");
  assert.equal(events[0].event_version, 1);
  assert.equal(events[0].game_version, "test");
  assert.equal(events[0].session_id, telemetry.sessionId);
  assert.equal(events[0].user_id, null);
});

test("battle lifecycle preserves nullable fields instead of inventing values", async () => {
  const telemetry = await loadTelemetry();
  telemetry.beginCombat({ battleId: "b1", enemy: { id: "enemy-a" } });
  telemetry.recordCombatAction(
    { battleId: "b1", turn: 2, resources: { energy: 1 } },
    { actorId: "player", actionType: "CARD", cardId: "shot" }
  );
  telemetry.completeCombat(
    { battleId: "b1", turn: 3, outcome: "VICTORY" },
    "VICTORY",
    { cards_played_distribution: { shot: 1 } }
  );

  const battle = telemetry.peek().filter((event) => event.combat_id === "b1");
  assert.equal(battle.length, 3);
  assert.equal(battle[1].event_name, "battle_action");
  assert.equal(battle[2].event_name, "battle_completed");
  assert.equal(battle[2].payload.damage_taken, null);
  assert.deepEqual(battle[2].payload.cards_played_distribution, { shot: 1 });
});

test("flush returns and clears the current batch", async () => {
  const telemetry = await loadTelemetry();
  telemetry.track("custom_test", { value: 1 });
  const batch = telemetry.flush();
  assert.ok(batch.some((event) => event.event_name === "custom_test"));
  assert.equal(telemetry.peek().length, 0);
});
