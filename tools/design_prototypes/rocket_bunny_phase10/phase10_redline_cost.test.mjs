import assert from 'node:assert/strict';
import {control,runner,redlineLegal,deterministicReplay,runAmplification} from './phase10_redline_cost.mjs';
assert.deepEqual(control(),{A:9548,B:1687,C:961,union:10274,noSpender:9406,deterministic:true,tests:'PASS'});
for(const c of [20,25,30]){const r=runner(c);assert.equal(r.CONFIG.redlineNitroCost,c);assert.equal(r.CONFIG.redlineDamageMultiplier,1.25);assert.equal(r.CONFIG.energyPerTurn,3);assert.equal(r.CONFIG.nitroGenerate,35);assert.equal(r.CONFIG.ramNitroCost,40);assert.equal(r.CONFIG.guardNitroCost,25);assert.equal(r.CONFIG.redlineIncomingMultiplier,1.25)}
assert.equal(redlineLegal(19,20),false);assert.equal(redlineLegal(20,20),true);assert.equal(redlineLegal(24,25),false);assert.equal(redlineLegal(25,25),true);assert.equal(redlineLegal(29,30),false);assert.equal(redlineLegal(30,30),true);
assert.equal(deterministicReplay(20),true);assert.equal(deterministicReplay(25),true);assert.equal(deterministicReplay(30),true);
assert.equal(runner(25,{defensiveAmplification:false}).CONFIG.redlineIncomingMultiplier,1);
const on=runAmplification(true),off=runAmplification(false);assert.equal(on.opportunities,off.opportunities);assert.equal(on.activations,off.activations);assert.equal(on.nitroSpent,off.nitroSpent);assert.equal(on.energySpent,off.energySpent);
console.log('phase10_redline_cost.test.mjs: PASS');
