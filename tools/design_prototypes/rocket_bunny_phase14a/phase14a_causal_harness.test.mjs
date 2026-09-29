import assert from 'node:assert/strict';
import { runTests } from './phase14a_causal_harness.mjs';

assert.equal(runTests(), 'PASS');
console.log('phase14a_causal_harness.test.mjs: PASS');
