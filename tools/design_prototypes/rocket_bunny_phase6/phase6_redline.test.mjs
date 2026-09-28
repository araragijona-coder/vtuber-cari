import assert from 'node:assert/strict';
import { SEEDS, run, runExperiment, counterfactuals } from './phase6_redline.mjs';

assert.equal(SEEDS.length, 10000);
assert.equal(SEEDS[0], 100001);
assert.equal(SEEDS.at(-1), 110000);

for (const model of ['A', 'B']) {
  const x = run(100001, model, 'adaptive', 'basic', 'normal');
  const y = run(100001, model, 'adaptive', 'basic', 'normal');
  assert.deepEqual(x, y, `determinism failed for ${model}`);
}

const cf = counterfactuals();
assert.equal(cf.length, 4);
assert.equal(cf[0].redlineOff.id, 'ram');
assert.equal(cf[0].redlineOn.id, 'REDLINE+ram');
assert.equal(cf[1].redlineOn.id, 'ram');
assert.equal(cf[2].redlineOn.id, 'REDLINE+ram');
assert.equal(cf[3].redlineOn.id, 'REDLINE+ram');

const result = runExperiment();
assert.equal(result.seeds.count, 10000);
assert.equal(result.determinism.A, true);
assert.equal(result.determinism.B, true);
assert.equal(result.models.A.redlineUses, 0);
assert.ok(result.models.B.redlineUses > 0);
assert.ok(result.pairedAB.actionDivergenceRate > 0);
assert.ok(result.models.B.redlineOpportunityCount > result.models.B.redlineUses);
assert.ok(result.models.B.redlineMissedOpportunityCount > 0);
assert.ok(result.models.B.redlineExtraDamage > 0);
assert.ok(result.models.B.redlineRiskEvents >= 1);

console.log('phase6_redline.test.mjs: PASS');