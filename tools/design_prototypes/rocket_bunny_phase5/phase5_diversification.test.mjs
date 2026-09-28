import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const output = execFileSync(process.execPath, ['phase5_diversification.mjs'], { encoding: 'utf8' });
const r = JSON.parse(output);

assert.equal(r.seeds.count, 10000);
assert.equal(r.seeds.start, 100001);
assert.equal(r.seeds.end, 110000);
assert.equal(r.control.reproducesPhase4NitroArm, true);
assert.equal(r.control.observed.winRate, 0.5531);
assert.equal(r.control.observed.avgTurns, 5.3878);
assert.equal(r.control.observed.energyWaste, 0.3213);
assert.equal(r.control.observed.nitroGenerated, 32.8195);
assert.equal(r.control.observed.nitroSpent, 15.181);
assert.equal(r.models.A.winRate, 0.5531);
assert.ok(r.models.B.nitroSpent > r.models.A.nitroSpent);
assert.ok(r.models.C.nitroSpent > 0);
assert.ok(r.models.D.nitroSpent > 0);
assert.ok(r.divergence.B.actionDivergenceRate > 0);
assert.ok(r.divergence.C.actionDivergenceRate > 0);
assert.ok(r.divergence.C.timingDivergenceRate > 0);
assert.ok(r.divergence.D.actionDivergenceRate > 0);
assert.ok(r.spenders.B.counts.guard > 0);
assert.ok(r.spenders.B.counts.ram > 0);
assert.ok(r.spenders.B.counts.redline > 0);
assert.equal(r.determinism, true);
assert.equal(r.counterfactuals.length, 4);
console.log('phase5 tests: PASS');