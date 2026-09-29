import assert from 'node:assert/strict';
import { EXPECTED, PHASE6_SOURCE, runTests } from './phase14a_causal_harness.mjs';
import { runPhase9 } from '../rocket_bunny_phase9/phase9_forced_choice.mjs';

const control=runPhase9(PHASE6_SOURCE);
assert.deepEqual(control.candidateCounts,{setA:9548,setB:1687,setC:961,union:10274});
assert.equal(control.sets.noSpenderAvailable,9406);
assert.deepEqual(control.candidateCounts,{setA:EXPECTED.A,setB:EXPECTED.B,setC:EXPECTED.C,union:EXPECTED.UNION});
assert.equal(control.sets.noSpenderAvailable,EXPECTED.NO_SPENDER);

assert.equal(runTests(), 'PASS');
console.log('phase14a_causal_harness.test.mjs: PASS');
