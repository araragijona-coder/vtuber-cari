import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import vm from "node:vm";

async function loadCatalog() {
  const context = vm.createContext({ window: {}, JSON, Number, String, Object, Array, Error });
  vm.runInContext(await readFile("intento_2/webapp/js/game/enemies.js", "utf8"), context);
  return context.window.EnemyCatalog;
}

test("MVP enemy catalog has four unique valid definitions", async () => {
  const catalog = await loadCatalog();
  const ids = catalog.ENEMY_SEQUENCE;
  assert.equal(ids.length, 4);
  assert.equal(new Set(ids).size, 4);
  for (const id of ids) {
    const enemy = catalog.definitionFor(id);
    assert.ok(enemy);
    assert.ok(enemy.name);
    assert.ok(enemy.archetype);
    assert.ok(enemy.maxHp > 0);
    assert.ok(enemy.attack >= 0);
    assert.ok(enemy.defense >= 0);
    assert.ok(Array.isArray(enemy.actions));
    assert.ok(enemy.actions.includes("ATTACK"));
    assert.ok(enemy.aiProfile);
  }
});

test("createEnemy creates independent state copies", async () => {
  const catalog = await loadCatalog();
  const first = catalog.createEnemy("iron_guard");
  const second = catalog.createEnemy("iron_guard");
  first.hp = 1;
  first.stats.atk = 999;
  first.actions.push("SKILL");
  assert.equal(second.hp, second.maxHp);
  assert.notEqual(second.stats.atk, 999);
  assert.equal(second.actions.includes("SKILL"), false);
  assert.equal(catalog.definitionFor("iron_guard").maxHp, 130);
});

test("enemy sequence is deterministic", async () => {
  const catalog = await loadCatalog();
  assert.deepEqual(
    [0, 1, 2, 3, 4].map((index) => catalog.sequenceAt(index)),
    ["street_punk", "iron_guard", "nitro_raider", "banchou_rookie", "street_punk"]
  );
});