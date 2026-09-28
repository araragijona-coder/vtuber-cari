import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadInstrumented, runPhase9 } from '../rocket_bunny_phase9/phase9_forced_choice.mjs';

export const BASE_SHA='109bb04255e578b14aa6d942d2180451e4fba580';
export const HISTORICAL_SHA='d22a31d7a57c73ae6fc6f0856b14d4acf2ecd228';
export const SEED_START=100001;
export const SEED_COUNT=10000;
export const SEEDS=Array.from({length:SEED_COUNT},(_,i)=>SEED_START+i);
export const COSTS=[25,30];

const here=path.dirname(fileURLToPath(import.meta.url));
export const PHASE6_PATH=path.resolve(here,'../rocket_bunny_phase6/phase6_redline.mjs');
export const PHASE6_SOURCE=fs.readFileSync(PHASE6_PATH,'utf8');

function instrument(source,cost){
  let x=source;
  x=x.replace(/const rng=seed=>\{let s=\(seed>>>0\)\|\|0x6d2b79f5;return\(\)=>\{s\^=s<<13;s\^=s>>>17;s\^=s<<5;s>>>=0;return s\/4294967296\}\};/,
    "const rng=seed=>{let s=(seed>>>0)||0x6d2b79f5;const f=()=>{s^=s<<13;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296};Object.defineProperty(f,'state',{get:()=>s,set:v=>{s=v>>>0}});return f};");
  x="function stateKey(s){return JSON.stringify({turn:s.turn,hp:s.hp,enemyHp:s.enemyHp,energy:s.energy,nitro:s.nitro,intent:s.enemyIntent,hand:s.hand,drawPile:s.drawPile,discard:s.discard,redlinePending:s.redlinePending,block:s.block,rngState:s.r.state});}\n"+x;
  x=x.replace(/function choose\(s,p,model\)\{const l=s\.hand\.filter\(id=>legal\(s,id\)\);if\(!l\.length\)return null;/,
    "function choose(s,p,model){const force=globalThis.__RB12_FORCE;const fk=stateKey(s);if(force&&force.key===fk){if(force.action==='REDLINE'){const id=force.card||best(s);return id?{id,kind:'redline'}:null}if(force.action==='GUARD')return{id:'guard',kind:'guardNitro'};if(force.action==='RAM')return{id:'ram',kind:'card',ramSpend:true};if(force.action==='BASE')return{id:force.card,kind:'card'}}const l=s.hand.filter(id=>legal(s,id));if(!l.length)return null;");
  x=x.replace(/\(model==='B'\|\|model==='C'\)&&s\.nitro>=25&&s\.hp>=55/g,
    "(model==='B'||model==='C')&&s.nitro>=__COST__&&s.hp>=55");
  x=x.replace(/s\.redlineOn&&s\.nitro>=25&&legalBefore\.length>0/g,
    "s.redlineOn&&s.nitro>=__COST__&&legalBefore.length>0");
  x=x.replace(/if\(a\.kind==='redline'\)\{if\(s\.nitro<25\|\|!legal\(s,a\.id\)\)return false;s\.nitro-=25;s\.nitroSpent\+=25;/,
    "if(a.kind==='redline'){if(s.nitro<__COST__||!legal(s,a.id))return false;s.nitro-=__COST__;s.nitroSpent+=__COST__;");
  x=x.replace(/const pre=\{turn:s\.turn,hp:s\.hp,enemyHp:s\.enemyHp,nitro:s\.nitro,energy:s\.energy,intent:s\.enemyIntent,hand:\[\.\.\.s\.hand\],redlineEligible\};/,
    "const pre={turn:s.turn,hp:s.hp,enemyHp:s.enemyHp,nitro:s.nitro,energy:s.energy,intent:s.enemyIntent,hand:[...s.hand],redlineEligible,availableActions:[...legalBefore],deckState:[...s.drawPile],discardState:[...s.discard],enemyState:{type:s.enemyType,intent:s.enemyIntent,hp:s.enemyHp},rngState:s.r.state,redlinePending:s.redlinePending,block:s.block,stateKey:stateKey(s)};");
  x=x.replace(/if\(captureTrace\)s\.trace\.push\(\{\.\.\.pre,chosen:a,ok,post:\{hp:s\.hp,enemyHp:s\.enemyHp,nitro:s\.nitro,energy:s\.energy\}\}\);/,
    "if(captureTrace)s.trace.push({...pre,chosen:a,ok,post:{hp:s.hp,enemyHp:s.enemyHp,nitro:s.nitro,energy:s.energy,block:s.block,rngState:s.r.state,hand:[...s.hand],discard:[...s.discard],drawPile:[...s.drawPile]}});const forcedStop=globalThis.__RB12_FORCE&&globalThis.__RB12_FORCE.key===pre.stateKey;n++;if(forcedStop||!ok||s.enemyHp<=0||s.hp<=0)break;");
  x=x.replace(/if\(s\.enemyHp>0&&s\.hp>0\)enemy\(s\);/,
    "if(s.enemyHp>0&&s.hp>0){const hpBefore=s.hp;const intentBefore=s.enemyIntent;enemy(s);s.trace.push({event:'ENEMY_RESOLUTION',turn:s.turn,intent:intentBefore,incomingBase:intentBefore==='ATTACK'?45:intentBefore==='SPECIAL'?18:0,incomingRawFinal:intentBefore==='ATTACK'?Math.round(45*1.25):intentBefore==='SPECIAL'?Math.round(18*1.25):0,incomingFinal:hpBefore-s.hp,hpBefore,hpAfter:s.hp});}");
  x=x.replace(/function run\(seed,model='A',policy='adaptive',enemyType='basic',variance='normal',captureTrace=false\)\{const s=state\(seed,model,enemyType,variance\);draw\(s,4\);while\(s\.turn<=20&&s\.hp>0&&s\.enemyHp>0\)\{/,
    "function run(seed,model='A',policy='adaptive',enemyType='basic',variance='normal',captureTrace=false){const injected=globalThis.__RB12_START_STATE;const s=state(seed,model,enemyType,variance);let injectedFirst=Boolean(injected);if(injected){s.turn=injected.turn;s.hp=injected.playerHP;s.enemyHp=injected.enemyHP;s.energy=injected.energy;s.nitro=injected.nitro;s.enemyIntent=injected.enemyIntent;s.hand=[...injected.hand];s.drawPile=[...injected.drawPile];s.discard=[...injected.discard];s.redlinePending=injected.redlinePending;s.block=injected.block;s.r.state=injected.rngState;s.enemyType=injected.enemyState?.type||enemyType;}else draw(s,4);while(s.turn<=20&&s.hp>0&&s.enemyHp>0){");
  x=x.replace(/s\.energy=3;s\.block=0;intent\(s\);/,
    "if(!injectedFirst){s.energy=3;s.block=0;intent(s);}else{injectedFirst=false;}");
  x=x.replace(/export \{CONFIG,CARDS,DECK,ENEMIES,POLICIES,SEEDS,run,runExperiment,counterfactuals\};/,'');
  x=x.replace(/if \(import\.meta\.url[^\n]+/,'');
  return x.replaceAll('__COST__',String(cost));
}

function runner(cost){return new Function(instrument(PHASE6_SOURCE,cost)+";return {CONFIG,CARDS,DECK,ENEMIES,POLICIES,SEEDS,run};")();}

function freeze(t,seed){
  return {seed,turn:t.turn,playerHP:t.hp,enemyHP:t.enemyHp,energy:t.energy,nitro:t.nitro,enemyIntent:t.intent,hand:[...t.hand],drawPile:[...t.deckState],discard:[...t.discardState],enemyState:{...t.enemyState},rngState:t.rngState,redlinePending:t.redlinePending,block:t.block,availableActions:[...t.availableActions],stateKey:t.stateKey};
}

function branch(r,frozen,action,card){
  globalThis.__RB12_START_STATE=frozen;
  globalThis.__RB12_FORCE={key:frozen.stateKey,action,card};
  try{
    const result=r.run(frozen.seed,'B','adaptive','basic','normal',true);
    const idx=result.trace.findIndex(t=>t.stateKey===frozen.stateKey);
    if(idx<0)throw new Error('frozen state not reached');
    const trace=result.trace[idx];
    const enemyEvent=result.trace.slice(idx+1).find(e=>e.event==='ENEMY_RESOLUTION'&&e.turn===frozen.turn);
    return {result,trace,enemyEvent};
  }finally{delete globalThis.__RB12_START_STATE;delete globalThis.__RB12_FORCE;}
}

function metric(f,b){
  const t=b.trace,e=b.enemyEvent;
  return {
    action:t.chosen?.kind==='redline'?'REDLINE':t.chosen?.id?.toUpperCase()||'UNAVAILABLE',
    affectedCard:t.chosen?.id||null,
    nitroBefore:f.nitro,nitroAfter:t.post.nitro,nitroConsumed:f.nitro-t.post.nitro,
    energySpent:f.energy-t.post.energy,energyRemaining:t.post.energy,
    enemyHpBefore:f.enemyHP,enemyHpAfter:t.post.enemyHp,damageDealt:f.enemyHP-t.post.enemyHp,
    damageReceived:e?e.hpBefore-e.hpAfter:0,playerHPBefore:f.playerHP,playerHPAfter:e?e.hpAfter:t.post.hp,
    survival:Boolean((e?e.hpAfter:t.post.hp)>0),incomingBase:e?.incomingBase??0,incomingFinal:e?.incomingFinal??0,
    riskEvent:Boolean(e&&t.chosen?.kind==='redline'&&e.incomingRawFinal>e.incomingBase)
  };
}

function average(rows,key){return rows.length?rows.reduce((s,r)=>s+r[key],0)/rows.length:0;}
function forcedSummary(rows){
  const out={states:rows.length};
  for(const cost of COSTS){
    const r=rows.map(x=>x[cost]),base=rows.map(x=>x.base);
    const attacks=r.filter(x=>x.incomingBase===45);
    out[cost]={directAffectedCardDamage:average(r,'damageDealt'),baseAffectedCardDamage:average(base,'damageDealt'),pureRedlineBonus:average(r,'damageDealt')-average(base,'damageDealt'),incomingDamage:average(r,'damageReceived'),remainingNitro:average(r,'nitroAfter'),remainingEnergy:average(r,'energyRemaining'),survivalRate:r.filter(x=>x.survival).length/r.length,riskEvents:r.filter(x=>x.riskEvent).length,attackStates:attacks.length,oneHitSurvivalRate:attacks.filter(x=>x.survival).length/Math.max(1,attacks.length)};
  }
  return out;
}

export function historicalControl(){
  const r=runPhase9(PHASE6_SOURCE);
  return {A:r.candidateCounts.setA,B:r.candidateCounts.setB,C:r.candidateCounts.setC,UNION:r.candidateCounts.union};
}

export function costMatrixTest(){
  const cases=[25,29,30,35],results=[];
  for(const initial of cases)for(const cost of COSTS){
    const f={seed:900000+initial*10+cost,turn:1,playerHP:100,enemyHP:150,energy:3,nitro:initial,enemyIntent:'DEFEND',hand:['shot'],drawPile:[],discard:[],enemyState:{type:'basic',intent:'DEFEND',hp:150},rngState:123456789,redlinePending:false,block:0,availableActions:['shot']};
    f.stateKey=JSON.stringify({turn:f.turn,hp:f.playerHP,enemyHp:f.enemyHP,energy:f.energy,nitro:f.nitro,intent:f.enemyIntent,hand:f.hand,drawPile:f.drawPile,discard:f.discard,redlinePending:f.redlinePending,block:f.block,rngState:f.rngState});
    const b=branch(runner(cost),f,'REDLINE','shot'),legal=initial>=cost;
    results.push({initial,cost,legal,ok:b.trace.ok,finalNitro:b.trace.post.nitro,nitroSpent:b.result.nitroSpent});
    assert.equal(b.trace.ok,legal);assert.equal(b.trace.post.nitro,legal?initial-cost:initial);assert.equal(b.result.nitroSpent,legal?cost:0);
  }
  return results;
}

export function cost25Regression(){
  const historical=loadInstrumented(PHASE6_SOURCE),patched=runner(25);
  const h=crypto.createHash('sha256'),p=crypto.createHash('sha256');
  for(const seed of SEEDS){h.update(JSON.stringify(historical.run(seed,'B','adaptive','basic','normal')));p.update(JSON.stringify(patched.run(seed,'B','adaptive','basic','normal')));}
  const historicalHash=h.digest('hex'),patchedHash=p.digest('hex');
  return {match:historicalHash===patchedHash,historicalHash,patchedHash};
}

function naturalStats(r){
  let opportunities=0,activations=0,missed=0,nitroSpent=0,energySpent=0,riskEvents=0,wins=0,turns=0,remainingNitro=0;
  let redline25=0,redlineGe30=0;const exact25Seeds=new Set();
  for(const seed of SEEDS){
    const x=r.run(seed,'B','adaptive','basic','normal',true);
    wins+=x.win?1:0;turns+=x.turns;nitroSpent+=x.nitroSpent;energySpent+=x.energySpent;remainingNitro+=x.nitroRemaining;riskEvents+=x.redlineRiskEvents;
    for(const t of x.trace)if(t.redlineEligible){opportunities++;if(t.chosen?.kind==='redline')activations++;else missed++;if(t.nitro===25){redline25++;exact25Seeds.add(seed);}if(t.nitro>=30)redlineGe30++;}
  }
  return {opportunities,activations,activationRate:activations/opportunities,missed,nitroSpentPerRun:nitroSpent/SEED_COUNT,remainingNitro:remainingNitro/SEED_COUNT,energySpent:energySpent/SEED_COUNT,riskEvents,riskRate:activations?riskEvents/activations:0,winRate:wins/SEED_COUNT,avgTurns:turns/SEED_COUNT,nitro25StateCount:redline25,nitro25Seeds:[...exact25Seeds].sort((a,b)=>a-b),nitroGe30StateCount:redlineGe30};
}

function pairedDivergence(r25,r30){
  let action=0,timing=0,outcome=0;
  for(const seed of SEEDS){
    const a=r25.run(seed,'B','adaptive','basic','normal'),b=r30.run(seed,'B','adaptive','basic','normal');
    const n=Math.max(a.actions.length,b.actions.length);let ad=false,td=false;
    for(let i=0;i<n;i++){if(a.actions[i]!==b.actions[i])ad=true;if((a.actions[i]||'').startsWith('REDLINE')!== (b.actions[i]||'').startsWith('REDLINE'))td=true;}
    if(ad)action++;if(td)timing++;if(a.win!==b.win)outcome++;
  }
  return {action:action/SEED_COUNT,timing:timing/SEED_COUNT,outcome:outcome/SEED_COUNT};
}

function extractFrozen(r){
  const map=new Map(),sets={A:new Set(),B:new Set(),C:new Set()};
  for(const seed of SEEDS){
    const x=r.run(seed,'B','adaptive','basic','normal',true);
    for(const t of x.trace)if(t.redlineEligible){
      const f=freeze({...t,seed});
      if(f.availableActions.includes('guard')&&f.nitro>=25)sets.A.add(f.stateKey);
      if(f.availableActions.includes('ram')&&f.nitro>=40)sets.B.add(f.stateKey);
      if(f.availableActions.includes('guard')&&f.availableActions.includes('ram')&&f.nitro>=40)sets.C.add(f.stateKey);
      if(!map.has(f.stateKey))map.set(f.stateKey,f);
    }
  }
  return {map,sets};
}

function forcedExperiment(r25){
  const {map,sets}=extractFrozen(r25),r30=runner(30),r25branch=runner(25),rows=[];
  for(const f of map.values()){
    if(f.nitro<30)continue;
    const affected=f.availableActions.includes('ram')?'ram':f.availableActions.includes('shot')?'shot':'guard';
    const m25=metric(f,branch(r25branch,f,'REDLINE',affected));
    const m30=metric(f,branch(r30,f,'REDLINE',affected));
    const mb=metric(f,branch(r25branch,f,'BASE',affected));
    rows.push({frozen:f,25:m25,30:m30,base:mb});
  }
  const subset=k=>rows.filter(x=>sets[k].has(x.frozen.stateKey));
  return {counts:{A:subset('A').length,B:subset('B').length,C:subset('C').length,UNION:rows.length},summary:{A:forcedSummary(subset('A')),B:forcedSummary(subset('B')),C:forcedSummary(subset('C'))},risk:{attackStates:rows.filter(x=>x.frozen.enemyIntent==='ATTACK').length,defendStates:rows.filter(x=>x.frozen.enemyIntent==='DEFEND').length,risk25:rows.filter(x=>x.frozen.enemyIntent==='ATTACK'&&x[25].riskEvent).length,risk30:rows.filter(x=>x.frozen.enemyIntent==='ATTACK'&&x[30].riskEvent).length,oneHitSurvivalDivergence:rows.filter(x=>x.frozen.enemyIntent==='ATTACK'&&x[25].survival!==x[30].survival).length}};
}

export function deterministicReplay(){
  const a=runner(25),b=runner(30);
  for(let i=0;i<250;i++){
    const seed=SEED_START+i;
    if(JSON.stringify(a.run(seed,'B','adaptive','basic','normal'))!==JSON.stringify(a.run(seed,'B','adaptive','basic','normal')))return false;
    if(JSON.stringify(b.run(seed,'B','adaptive','basic','normal'))!==JSON.stringify(b.run(seed,'B','adaptive','basic','normal')))return false;
  }
  return true;
}

export function runExperiment(){
  const control=historicalControl();
  assert.deepEqual(control,{A:9548,B:1687,C:961,UNION:10274});
  const matrix=costMatrixTest(),reg=cost25Regression();
  assert.equal(reg.match,true);
  const r25=runner(25),r30=runner(30);
  const s25=naturalStats(r25),s30=naturalStats(r30),divergence=pairedDivergence(r25,r30);
  const frozen=extractFrozen(r25),forced=forcedExperiment(r25);
  assert.deepEqual({A:frozen.sets.A.size,B:frozen.sets.B.size,C:frozen.sets.C.size,UNION:frozen.map.size},{A:9548,B:1687,C:961,UNION:10274});
  const deterministic=deterministicReplay();assert.equal(deterministic,true);
  return {baseSha:BASE_SHA,historicalSha:HISTORICAL_SHA,phase9Control:control,costMatrix:matrix,cost25Regression:reg,natural:{cost25:s25,cost30:s30},pairedDivergence:divergence,forcedOpportunity:forced,deterministicReplay:deterministic,defensiveAmplification:'ON',productionIntegration:false};
}

export function runTests(){
  const matrix=costMatrixTest();assert.equal(matrix.length,8);
  for(const x of matrix){assert.equal(x.legal,x.initial>=x.cost);assert.equal(x.finalNitro,x.legal?x.initial-x.cost:x.initial);assert.equal(x.nitroSpent,x.legal?x.cost:0);}
  assert.deepEqual(historicalControl(),{A:9548,B:1687,C:961,UNION:10274});
  assert.equal(cost25Regression().match,true);
  const r25=runner(25);const s=naturalStats(r25);assert.ok(s.nitro25StateCount>0);assert.ok(s.nitroGe30StateCount>0);
  assert.equal(deterministicReplay(),true);
  return 'PASS';
}

if(process.argv[1]?.endsWith('phase12r_real_cost.mjs'))console.log(JSON.stringify(runExperiment(),null,2));
