import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadInstrumented, runPhase9 } from '../rocket_bunny_phase9/phase9_forced_choice.mjs';

export const BASE_SHA='328cbb112bc806abe1ea43339129b650a7d7e53a';
export const SEED_START=100001;
export const SEED_END=110000;
export const SEED_COUNT=10000;
export const REPLAY_COUNT=250;
export const EXPECTED={A:9548,B:1687,C:961,UNION:10274,NO_SPENDER:9406};

const here=path.dirname(fileURLToPath(import.meta.url));
export const PHASE6_PATH=path.resolve(here,'../rocket_bunny_phase6/phase6_redline.mjs');
export const PHASE6_SOURCE=fs.readFileSync(PHASE6_PATH,'utf8');

function fullStateKey(t){
  return JSON.stringify({
    turn:t.turn,hp:t.hp,enemyHp:t.enemyHp,energy:t.energy,nitro:t.nitro,
    intent:t.intent,hand:t.hand,drawPile:t.deckState,discard:t.discardState,
    redlinePending:t.redlinePending,block:t.block,
    enemyType:t.enemyState?.type ?? 'basic',rngState:t.rngState,
    legalActions:t.availableActions,redlineLegal:Boolean(t.redlineEligible),
    guardLegal:t.availableActions.includes('guard')&&t.nitro>=25,
    ramLegal:t.availableActions.includes('ram')&&t.nitro>=40
  });
}

function freeze(t,seed,CARDS){
  const cardCosts=Object.fromEntries(Object.entries(CARDS).map(([id,v])=>[id,v.cost]));
  const f={seed,turn:t.turn,playerHP:t.hp,enemyHP:t.enemyHp,energy:t.energy,nitro:t.nitro,enemyIntent:t.intent,
    hand:[...t.hand],drawPile:[...t.deckState],discard:[...t.discardState],redlinePending:t.redlinePending,block:t.block,
    enemyType:t.enemyState?.type ?? 'basic',rngState:t.rngState,availableActions:[...t.availableActions],cardCosts,
    redlineLegal:Boolean(t.redlineEligible),guardLegal:t.availableActions.includes('guard')&&t.nitro>=25,
    ramLegal:t.availableActions.includes('ram')&&t.nitro>=40,stateKey:t.stateKey};
  f.fullStateKey=fullStateKey(t);
  return f;
}

function collectNatural(runner){
  const map=new Map();
  const observedStates=new Map();
  const sets={A:new Set(),B:new Set(),C:new Set()};
  const collisions=[];
  let observed=0;
  for(let seed=SEED_START;seed<=SEED_END;seed++){
    const result=runner.run(seed,'B','adaptive','basic','normal',true);
    for(const t of result.trace){
      if(!t.redlineEligible)continue;
      observed++;
      const f=freeze(t,seed,runner.CARDS);
      const prior=observedStates.get(f.stateKey);
      if(prior && prior.fullStateKey!==f.fullStateKey)collisions.push({stateKey:f.stateKey,first:prior.fullStateKey,second:f.fullStateKey});
      if(!prior)observedStates.set(f.stateKey,f);
      if(f.guardLegal)sets.A.add(f.stateKey);
      if(f.ramLegal)sets.B.add(f.stateKey);
      if(f.guardLegal&&f.ramLegal)sets.C.add(f.stateKey);
    }
  }
  const causalUnion=new Set([...sets.A,...sets.B,...sets.C]);
  for(const stateKey of causalUnion)map.set(stateKey,observedStates.get(stateKey));
  const nonCausalRedlineEligible=[...observedStates.keys()].filter(stateKey=>!causalUnion.has(stateKey));
  return {map,sets,observed,observedStates,causalUnion,redlineEligibleWithoutGuardOrRam:nonCausalRedlineEligible.length,collisions};
}

function branch(runner,frozen,action){
  if(action==='REDLINE'&&!frozen.redlineLegal)throw new Error('illegal REDLINE branch');
  if(action==='GUARD'&&!frozen.guardLegal)throw new Error('illegal GUARD branch');
  if(action==='RAM'&&!frozen.ramLegal)throw new Error('illegal RAM branch');
  globalThis.__RB9_FORCE_HOOK={key:frozen.stateKey,action};
  try{
    const result=runner.run(frozen.seed,'B','adaptive','basic','normal',true);
    const idx=result.trace.findIndex(t=>t.stateKey===frozen.stateKey);
    if(idx<0)throw new Error(`natural state not reached: seed=${frozen.seed}`);
    const t=result.trace[idx];
    if(fullStateKey(t)!==frozen.fullStateKey)throw new Error('complete frozen-state identity mismatch');
    if(!t.ok)throw new Error(`branch did not resolve: ${action}`);
    const enemy=result.trace.slice(idx+1).find(e=>e.event==='ENEMY_RESOLUTION'&&e.turn===frozen.turn);
    return {trace:t,enemy,result};
  }finally{delete globalThis.__RB9_FORCE_HOOK;}
}

function followUpActions(t,r){
  const costs=r.CARDS;
  const out=t.post.hand.filter(id=>t.post.energy>=costs[id].cost);
  if(t.post.nitro>=25&&out.length)out.push('REDLINE');
  if(t.post.nitro>=25&&out.includes('guard'))out.push('GUARD_NITRO');
  if(t.post.nitro>=40&&out.includes('ram'))out.push('RAM_NITRO');
  return out;
}

function metrics(frozen,branchResult,action,runner){
  const t=branchResult.trace,e=branchResult.enemy;
  const playerAfter=e?.hpAfter ?? t.post.hp;
  const enemyAfter=t.post.enemyHp;
  return {
    action,affectedCard:action==='REDLINE'?(t.chosen?.id??null):null,
    affectedCardDamage:frozen.enemyHP-enemyAfter,incomingDamage:e?.incomingFinal??0,
    playerHPBefore:frozen.playerHP,playerHPAfter:playerAfter,playerHPDelta:playerAfter-frozen.playerHP,
    enemyHPBefore:frozen.enemyHP,enemyHPAfter:enemyAfter,enemyHPDelta:enemyAfter-frozen.enemyHP,
    energyBefore:frozen.energy,energyAfter:t.post.energy,energyDelta:t.post.energy-frozen.energy,
    nitroBefore:frozen.nitro,nitroAfter:t.post.nitro,nitroDelta:t.post.nitro-frozen.nitro,
    resourcesSpent:{energy:frozen.energy-t.post.energy,nitro:frozen.nitro-t.post.nitro},
    resourcesRemaining:{energy:t.post.energy,nitro:t.post.nitro},
    followUpLegalActions:followUpActions(t,runner),
    survival:playerAfter>0,riskEvent:Boolean(action==='REDLINE'&&e&&e.incomingFinal>e.incomingBase),
    timing:{enemyResolutionOccurred:Boolean(e),enemyResolutionTurn:e?.turn??null},
    rngStateBefore:frozen.rngState,rngStateAfter:e?.rngStateAfter??t.post.rngState
  };
}

function divergence(a,b){
  return {
    actionDivergence:a.action!==b.action,
    timingDivergence:a.timing.enemyResolutionOccurred!==b.timing.enemyResolutionOccurred,
    outcomeDivergence:a.playerHPAfter!==b.playerHPAfter||a.enemyHPAfter!==b.enemyHPAfter||a.survival!==b.survival
  };
}

function deterministicReplay(runner,natural){
  const sample=[...natural.map.values()].slice(0,REPLAY_COUNT);
  for(const f of sample){
    for(const action of ['REDLINE',...(f.guardLegal?['GUARD']:[]),...(f.ramLegal?['RAM']:[])]){
      const a=branch(runner,f,action);const b=branch(runner,f,action);
      if(JSON.stringify(a.trace)!==JSON.stringify(b.trace)||JSON.stringify(a.enemy)!==JSON.stringify(b.enemy))return {pass:false,seed:f.seed,action};
    }
  }
  return {pass:true,seeds:sample.length};
}

export function runTests(){
  const control=runPhase9(PHASE6_SOURCE);
  assert.deepEqual(control.candidateCounts,{setA:EXPECTED.A,setB:EXPECTED.B,setC:EXPECTED.C,union:EXPECTED.UNION});
  assert.equal(control.sets.noSpenderAvailable,EXPECTED.NO_SPENDER);
  const runner=loadInstrumented(PHASE6_SOURCE);
  const natural=collectNatural(runner);
  assert.equal(natural.sets.A.size,EXPECTED.A);
  assert.equal(natural.sets.B.size,EXPECTED.B);
  assert.equal(natural.sets.C.size,EXPECTED.C);
  assert.equal(natural.map.size,EXPECTED.UNION);
  assert.equal(natural.causalUnion.size,EXPECTED.UNION);
  assert.equal(natural.observed,12171);
  assert.equal(natural.observedStates.size,12171);
  assert.equal(natural.redlineEligibleWithoutGuardOrRam,natural.observedStates.size-natural.causalUnion.size);
  assert.equal(natural.causalUnion.size+natural.redlineEligibleWithoutGuardOrRam,natural.observedStates.size);
  for(const stateKey of natural.causalUnion)assert.equal(natural.observedStates.has(stateKey),true);
  for(const stateKey of natural.observedStates.keys())if(!natural.causalUnion.has(stateKey))assert.equal(natural.map.has(stateKey),false);
  assert.equal(natural.collisions.length,0);
  assert.equal(deterministicReplay(runner,natural).pass,true);
  return 'PASS';
}

export function runExperiment(){
  const control=runPhase9(PHASE6_SOURCE);
  assert.deepEqual(control.candidateCounts,{setA:EXPECTED.A,setB:EXPECTED.B,setC:EXPECTED.C,union:EXPECTED.UNION});
  assert.equal(control.sets.noSpenderAvailable,EXPECTED.NO_SPENDER);
  const runner=loadInstrumented(PHASE6_SOURCE);
  const natural=collectNatural(runner);
  assert.equal(natural.sets.A.size,EXPECTED.A);assert.equal(natural.sets.B.size,EXPECTED.B);assert.equal(natural.sets.C.size,EXPECTED.C);assert.equal(natural.map.size,EXPECTED.UNION);assert.equal(natural.causalUnion.size,EXPECTED.UNION);assert.equal(natural.observed,12171);assert.equal(natural.observedStates.size,12171);assert.equal(natural.redlineEligibleWithoutGuardOrRam,natural.observedStates.size-natural.causalUnion.size);assert.equal(natural.causalUnion.size+natural.redlineEligibleWithoutGuardOrRam,natural.observedStates.size);assert.equal(natural.collisions.length,0);
  const replay=deterministicReplay(runner,natural);assert.equal(replay.pass,true);
  const rows=new Map();
  const add=(f,a)=>{const b=branch(runner,f,a);const row={state:f,action:a,metrics:metrics(f,b,a,runner)};(rows.get(f.stateKey)||[]).push(row);};
  for(const f of natural.map.values()){
    if(f.redlineLegal)add(f,'REDLINE');
    if(f.guardLegal)add(f,'GUARD');
    if(f.ramLegal)add(f,'RAM');
  }
  const comparisons=[];
  for(const f of natural.map.values()){
    const rs=rows.get(f.stateKey)||[];const get=a=>rs.find(x=>x.action===a)?.metrics;
    if(f.guardLegal&&get('REDLINE')&&get('GUARD'))comparisons.push({population:'A',stateKey:f.stateKey,left:get('REDLINE'),right:get('GUARD'),divergence:divergence(get('REDLINE'),get('GUARD'))});
    if(f.ramLegal&&get('REDLINE')&&get('RAM'))comparisons.push({population:'B',stateKey:f.stateKey,left:get('REDLINE'),right:get('RAM'),divergence:divergence(get('REDLINE'),get('RAM'))});
    if(f.guardLegal&&f.ramLegal&&get('REDLINE')&&get('GUARD')&&get('RAM')){
      comparisons.push({population:'C',comparison:'REDLINE_vs_GUARD',stateKey:f.stateKey,left:get('REDLINE'),right:get('GUARD'),divergence:divergence(get('REDLINE'),get('GUARD'))});
      comparisons.push({population:'C',comparison:'REDLINE_vs_RAM',stateKey:f.stateKey,left:get('REDLINE'),right:get('RAM'),divergence:divergence(get('REDLINE'),get('RAM'))});
      comparisons.push({population:'C',comparison:'GUARD_vs_RAM',stateKey:f.stateKey,left:get('GUARD'),right:get('RAM'),divergence:divergence(get('GUARD'),get('RAM'))});
    }
  }
  const rejected={};for(const f of natural.map.values()){if(!f.redlineLegal)rejected.redline_illegal=(rejected.redline_illegal||0)+1;if(!f.guardLegal)rejected.guard_illegal=(rejected.guard_illegal||0)+1;if(!f.ramLegal)rejected.ram_illegal=(rejected.ram_illegal||0)+1;}
  return {baseSha:BASE_SHA,seeds:{start:SEED_START,end:SEED_END,count:SEED_COUNT},phase9Control:control.candidateCounts,noSpenderControl:control.sets.noSpenderAvailable,naturalStateObservationCount:natural.observed,naturalUniqueRedlineEligibleStates:natural.observedStates.size,naturalStates:natural.map.size,redlineEligibleWithoutGuardOrRam:natural.redlineEligibleWithoutGuardOrRam,noSpenderNaturalStates:[...natural.map.values()].filter(f=>f.availableActions.includes('shot')).length,populations:{A:natural.sets.A.size,B:natural.sets.B.size,C:natural.sets.C.size,UNION:natural.map.size},syntheticStates:0,deterministicReplay:replay,rejectedStateAccounting:rejected,comparisons,mechanicSelection:null};
}

if(process.argv[1]?.endsWith('phase14a_causal_harness.mjs'))console.log(JSON.stringify(runExperiment(),null,2));
