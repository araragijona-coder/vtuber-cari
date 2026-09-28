import assert from 'node:assert/strict';
import {historicalControl,adaptiveReachabilityAudit,controlled25Proof,thresholdMatrix,deterministicReplay,runPhase11} from './phase11_nitro_25_29.mjs';

assert.deepEqual(historicalControl(),{A:9548,B:1687,C:961,union:10274,noSpender:9406,deterministic:true,tests:'PASS'});

const reach=adaptiveReachabilityAudit();
assert.deepEqual(reach.nonMultipleValues,[]);
for(const v of [26,27,28,29]) assert.equal(reach.targetObserved[v],false);

const proof=controlled25Proof();
assert.equal(proof.found,true);
assert.equal(proof.state.nitro,25);
assert.equal(proof.state.energy>0,true);
assert.equal(proof.state.enemyHp>0,true);

const matrix=thresholdMatrix();
assert.deepEqual(matrix.map(x=>[x.nitro,x.cost25Legal,x.cost30Legal,x.cost25Exclusive,x.both]),[
 [25,true,false,true,false],
 [26,true,false,true,false],
 [27,true,false,true,false],
 [28,true,false,true,false],
 [29,true,false,true,false]
]);

assert.equal(deterministicReplay(),true);
const final=runPhase11();
assert.equal(final.status,'BLOCKED');
assert.equal(final.control.A,9548);
assert.equal(final.control.B,1687);
assert.equal(final.control.C,961);
assert.equal(final.control.union,10274);
console.log('phase11_nitro_25_29.test.mjs: PASS');
