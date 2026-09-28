import assert from 'node:assert/strict';
import { runTests, costMatrixTest, cost25Regression, historicalControl } from './phase12r_real_cost.mjs';
assert.deepEqual(historicalControl(),{A:9548,B:1687,C:961,UNION:10274});
const matrix=costMatrixTest();
const expected=[[25,25,true],[25,30,false],[29,25,true],[29,30,false],[30,25,true],[30,30,true],[35,25,true],[35,30,true]];
for(let i=0;i<expected.length;i++){const [initial,cost,legal]=expected[i];assert.equal(matrix[i].initial,initial);assert.equal(matrix[i].cost,cost);assert.equal(matrix[i].legal,legal);assert.equal(matrix[i].finalNitro,legal?initial-cost:initial);assert.equal(matrix[i].nitroSpent,legal?cost:0);}
assert.equal(cost25Regression().match,true);
assert.equal(runTests(),'PASS');
console.log('phase12r_real_cost.test.mjs: PASS');
