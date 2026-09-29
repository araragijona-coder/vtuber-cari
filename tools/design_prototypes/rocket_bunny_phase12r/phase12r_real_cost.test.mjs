import assert from 'node:assert/strict';
import { runExperiment, costMatrixTest, cost25Regression, historicalControl } from './phase12r_real_cost.mjs';

assert.deepEqual(historicalControl(),{A:9548,B:1687,C:961,UNION:10274});

const matrix=costMatrixTest();
const expected=[[25,25,true],[25,30,false],[29,25,true],[29,30,false],[30,25,true],[30,30,true],[35,25,true],[35,30,true]];
for(let i=0;i<expected.length;i++){
  const [initial,cost,legal]=expected[i];
  assert.equal(matrix[i].initial,initial);
  assert.equal(matrix[i].cost,cost);
  assert.equal(matrix[i].legal,legal);
  assert.equal(matrix[i].finalNitro,legal?initial-cost:initial);
  assert.equal(matrix[i].nitroSpent,legal?cost:0);
}

assert.equal(cost25Regression().match,true);

const result=runExperiment();
assert.deepEqual(result.phase9Control,{A:9548,B:1687,C:961,UNION:10274});
assert.equal(result.cost25Regression.match,true);

for(const entry of [result.natural.cost25,result.natural.cost30]){
  assert.ok(Number.isInteger(entry.opportunities) && entry.opportunities>=0);
  assert.ok(Number.isInteger(entry.activations) && entry.activations>=0);
  assert.ok(Number.isInteger(entry.missed) && entry.missed>=0);
  assert.equal(entry.opportunities,entry.activations+entry.missed);
  assert.ok(Number.isFinite(entry.activationRate) && entry.activationRate>=0 && entry.activationRate<=1);
  assert.equal(entry.activationRate,entry.opportunities?entry.activations/entry.opportunities:0);
  assert.ok(Number.isInteger(entry.nitro25StateCount) && entry.nitro25StateCount>=0);
  assert.equal(entry.nitro25StateCount,entry.nitro25Seeds.length);
  assert.ok(Number.isInteger(entry.nitroGe30StateCount) && entry.nitroGe30StateCount>=0);
  assert.ok(entry.nitroGe30StateCount<=entry.opportunities);
}

assert.ok(Number.isFinite(result.pairedDivergence.action));
assert.ok(Number.isFinite(result.pairedDivergence.timing));
assert.ok(Number.isFinite(result.pairedDivergence.outcome));
assert.equal(result.deterministicReplay,true);
assert.equal(result.productionIntegration,false);

console.log('phase12r_real_cost.test.mjs: PASS');
