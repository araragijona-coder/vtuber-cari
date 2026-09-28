import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadInstrumented, runPhase9 } from '../rocket_bunny_phase9/phase9_forced_choice.mjs';

export const BASE_SHA='b9ccbe8bfea3f1c2e1e1cc24321182c87dc68e99';
export const SEED_START=100001;
export const SEED_COUNT=10000;
export const TARGET_NITRO=[25,26,27,28,29];
export const DEFENSIVE_AMPLIFICATION=true;

const here=path.dirname(fileURLToPath(import.meta.url));
const PHASE6_PATH=path.resolve(here,'../rocket_bunny_phase6/phase6_redline.mjs');
const PHASE6_SOURCE=fs.readFileSync(PHASE6_PATH,'utf8');

export function historicalControl(){
  const r=runPhase9(PHASE6_SOURCE);
  return {
    A:r.candidateCounts.setA,
    B:r.candidateCounts.setB,
    C:r.candidateCounts.setC,
    union:r.candidateCounts.union,
    noSpender:r.sets.noSpenderAvailable,
    deterministic:r.determinism,
    tests:r.tests
  };
}

function phase6NitroTransitionAudit(source=PHASE6_SOURCE){
  const constants={
    initial:0,
    generate:35,
    guardSpend:25,
    ramSpend:40,
    cap:100
  };
  const required=[
    /nitro:0/,
    /nitroGenerate:35/,
    /guardNitroCost:25/,
    /ramNitroCost:40/,
    /redlineNitroCost:25/,
    /Math\.min\(100,s\.nitro\+35\)/,
    /s\.nitro-=25/,
    /s\.nitro-=40/
  ];
  const sourceChecks=required.map(re=>({pattern:String(re),ok:re.test(source)}));
  return {
    constants,
    sourceChecks,
    sourceInvariant:'All Nitro mutations in the historical source are +35, -25 or -40, with initial 0 and cap 100; every reachable Nitro value is therefore congruent to 0 mod 5.',
    invariantVerified:sourceChecks.every(x=>x.ok)
  };
}

export function adaptiveReachabilityAudit(){
  const runner=loadInstrumented(PHASE6_SOURCE);
  const values=new Set();
  const opportunityCounts={};
  const nonMultipleValues=[];
  for(let seed=SEED_START;seed<SEED_START+SEED_COUNT;seed++){
    const r=runner.run(seed,'B','adaptive','basic','normal',true);
    for(const t of r.trace){
      if(Number.isInteger(t.nitro)) values.add(t.nitro);
      if(t.redlineEligible && Number.isInteger(t.nitro))
        opportunityCounts[t.nitro]=(opportunityCounts[t.nitro]||0)+1;
    }
  }
  for(const v of values) if(v%5!==0) nonMultipleValues.push(v);
  return {
    seeds:{start:SEED_START,end:SEED_START+SEED_COUNT-1,count:SEED_COUNT},
    allNitroValues:[...values].sort((a,b)=>a-b),
    redlineOpportunityNitro:Object.keys(opportunityCounts).map(Number).sort((a,b)=>a-b),
    opportunityCounts,
    nonMultipleValues:nonMultipleValues.sort((a,b)=>a-b),
    targetObserved:Object.fromEntries(TARGET_NITRO.map(v=>[v,values.has(v)]))
  };
}

function controlledGenerationSource(source){
  return source.replace(
    /function choose\(s,p,model\)\{/,
    `function choose(s,p,model){const h=globalThis.__RB11_TARGET25;if(h){
      if(s.nitro<65&&s.hand.includes('pump')&&legal(s,'pump'))return{id:'pump',kind:'card'};
      if(s.nitro>=65&&s.hand.includes('ram')&&legal(s,'ram'))return{id:'ram',kind:'card',ramSpend:true};
      if(s.enemyIntent==='ATTACK'&&s.hand.includes('guard')&&legal(s,'guard'))return{id:'guard',kind:'card'};
      if(s.hand.length&&legal(s,best(s)))return{id:best(s),kind:'card'};
      return null;
    }`
  );
}

export function controlled25Proof(){
  const runner=loadInstrumented(controlledGenerationSource(PHASE6_SOURCE));
  for(let seed=SEED_START;seed<SEED_START+SEED_COUNT;seed++){
    globalThis.__RB11_TARGET25=true;
    let result;
    try{result=runner.run(seed,'A','adaptive','basic','normal',true);}
    finally{delete globalThis.__RB11_TARGET25;}
    for(const t of result.trace){
      if(t.post?.nitro===25 && t.post?.energy>0 && t.post?.enemyHp>0){
        return {
          found:true,
          seed,
          source:'CONTROLLED STATE GENERATION',
          controlOnly:'Action selection was controlled; Phase 6 card costs, damage, RNG, Nitro generation/spending and enemy logic were not changed.',
          transition:'65 Nitro -> Ram Nitro spend 40 -> 25 Nitro',
          state:{
            turn:t.turn,
            hp:t.post.hp,
            enemyHp:t.post.enemyHp,
            energy:t.post.energy,
            nitro:t.post.nitro,
            intent:t.intent,
            hand:t.post.hand,
            drawPile:t.post.drawPile,
            discard:t.post.discard,
            rngState:t.post.rngState
          },
          preState:{
            hp:t.hp,
            enemyHp:t.enemyHp,
            energy:t.energy,
            nitro:t.nitro,
            intent:t.intent,
            hand:t.hand,
            rngState:t.rngState
          }
        };
      }
    }
  }
  return {found:false};
}

export function thresholdMatrix(){
  const legal=(nitro,cost)=>nitro>=cost;
  return TARGET_NITRO.map(nitro=>({
    nitro,
    cost25Legal:legal(nitro,25),
    cost30Legal:legal(nitro,30),
    cost25Exclusive:legal(nitro,25)&&!legal(nitro,30),
    both:legal(nitro,25)&&legal(nitro,30)
  }));
}

export function deterministicReplay(){
  const runner=loadInstrumented(PHASE6_SOURCE);
  for(let i=0;i<250;i++){
    const seed=SEED_START+i;
    const a=runner.run(seed,'B','adaptive','basic','normal',true);
    const b=runner.run(seed,'B','adaptive','basic','normal',true);
    if(JSON.stringify(a)!==JSON.stringify(b)) return false;
  }
  return true;
}

export function runPhase11(){
  const control=historicalControl();
  if(control.A!==9548||control.B!==1687||control.C!==961||control.union!==10274)
    throw new Error('Phase 9 historical control mismatch');
  const transitionAudit=phase6NitroTransitionAudit();
  const reachability=adaptiveReachabilityAudit();
  const controlled25=controlled25Proof();
  const thresholds=thresholdMatrix();
  const deterministic=deterministicReplay();
  const unreachableTargets=TARGET_NITRO.filter(v=>v!==25);
  return {
    status:'BLOCKED',
    reason:'Historical Nitro mechanics preserve multiples of 5. Nitro 26–29 are unreachable without changing the mechanics, so the requested 25–29 paired state set cannot be produced legally.',
    control,
    transitionAudit,
    reachability,
    controlled25,
    thresholds,
    deterministic,
    comparison:{
      cost25:'NOT RUN as a full paired experiment',
      cost30:'NOT RUN as a full paired experiment',
      reason:'The required 25–29 state population does not exist under the historical mechanics.'
    },
    defensiveAmplification:DEFENSIVE_AMPLIFICATION,
    risk:'NOT VALIDATED in paired cost branches',
    evidence:{
      VERIFIED:[
        'Phase 9 control reproduced exactly.',
        'Historical Phase 6 Nitro mutations and costs.',
        '10,000-seed adaptive reachability audit.',
        'Nitro modulo-5 invariant.',
        'One mechanically reached Nitro-25 controlled state.',
        'Threshold legality for costs 25 and 30.',
        '250-seed deterministic replay.'
      ],
      SUPPORTED:[
        'The requested 26–29 state generation is incompatible with the unchanged historical Nitro arithmetic.'
      ],
      INFERRED:[
        'Distinguishing cost 25 from cost 30 at Nitro 26–29 would require a different Nitro-generation/spending lattice or a synthetic state that is explicitly outside the current mechanics.'
      ],
      UNKNOWN:[
        'Human preference, fun, UX and production balance.'
      ],
      NOT_VALIDATED:[
        'A >=500-state Nitro-25 sample.',
        'Any Nitro-26/27/28/29 paired resolution.',
        'Full 25-vs-30 damage/incoming/risk comparison.'
      ]
    },
    nextResearch:'Review whether the research target should be restricted to mechanically reachable Nitro values (especially 25) or whether a separate mechanics experiment is authorized to change the Nitro lattice. No production integration and no Phase 12 started.'
  };
}

if(process.argv[1]?.endsWith('phase11_nitro_25_29.mjs'))
  console.log(JSON.stringify(runPhase11(),null,2));
