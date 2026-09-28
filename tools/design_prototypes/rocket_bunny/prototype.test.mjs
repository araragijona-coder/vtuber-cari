import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const script = new URL('./prototype.mjs', import.meta.url);
execFileSync(process.execPath, [script.pathname], { stdio: 'ignore' });
const result = JSON.parse(fs.readFileSync('/tmp/rbp_phase3_results.json','utf8'));

assert.equal(result.models.baseline.simulations, 10000);
assert.equal(result.models.prototype.simulations, 10000);
assert.equal(result.determinism.sameTrace, true);
assert.equal(result.determinism.sameResult, true);
assert.ok(result.models.prototype.avgNitroGenerated > 0);
assert.ok(result.models.prototype.avgNitroSpent > 0);
assert.ok(result.models.prototype.redlineActivationRate > 0 && result.models.prototype.redlineActivationRate < 1);
assert.ok(result.policies['prototype:reactive:adaptive'].enemyResponseFrequency > 0);
assert.ok(result.policies['prototype:reactive:adaptive'].counterActionFrequency > 0);
assert.ok(result.valuation.LOW_NITRO.prototype.values.pump > result.valuation.ATTACK_PRESSURE.prototype.values.pump);
assert.ok(result.valuation.FINISH_WINDOW.prototype.values.ram > result.valuation.LOW_NITRO.prototype.values.ram);
assert.ok(result.traces['prototype:100777'].length > 0);

console.log('prototype tests: PASS');
