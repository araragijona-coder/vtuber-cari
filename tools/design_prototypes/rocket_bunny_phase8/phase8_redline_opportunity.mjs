import { SEEDS, run, CARDS } from '../rocket_bunny_phase6/phase6_redline.mjs';
const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
const pct=(n,d)=>d?n/d:0;
const key=t=>JSON.stringify({turn:t.turn,hp:t.hp,enemyHp:t.enemyHp,energy:t.energy,nitro:t.nitro,intent:t.intent,hand:t.hand});
function ledgerPair(seed){
  const a=run(seed,'A','adaptive','basic','normal',true);
  const b=run(seed,'B','adaptive','basic','normal',true);
  const rows=[];
  for(const t of b.trace){
    if(!t.redlineEligible) continue;
    const chosen=t.chosen;
    const redlineSelected=chosen?.kind==='redline';
    const ramLegal=t.energy>=CARDS.ram.cost && t.nitro>=40 && t.hand.includes('ram');
    const guardLegal=t.energy>=CARDS.guard.cost && t.nitro>=25 && t.hand.includes('guard');
    const pair=a.trace.find(x=>key(x)===key(t));
    let pairedAlternative='UNALIGNED';
    if(pair){
      if(pair.chosen?.kind==='guardNitro') pairedAlternative='Guard';
      else if(pair.chosen?.id==='ram' && pair.chosen?.ramSpend) pairedAlternative='Ram';
      else pairedAlternative='OTHER';
    }
    rows.push({seed,turn:t.turn,playerHP:t.hp,enemyHp:t.enemyHp,energy:t.energy,nitro:t.nitro,enemyIntent:t.intent,selectedAction:redlineSelected?'REDLINE+'+chosen.id:(chosen?.id||null),redlineSelected,ramLegal,guardLegal,bothLegal:ramLegal&&guardLegal,pairedAlternative,pairState:!!pair,hand:[...t.hand],post:t.post});
  }
  return {a,b,rows};
}
function collect(){const A=[],B=[],rows=[];for(const seed of SEEDS){const p=ledgerPair(seed);A.push(p.a);B.push(p.b);rows.push(...p.rows)}return{A,B,rows};}
function alternative(state,alt){
  const ramLegal=state.energy>=2&&state.nitro>=40&&state.hand.includes('ram');
  const guardLegal=state.energy>=1&&state.nitro>=25&&state.hand.includes('guard');
  const redlineLegal=state.energy>=1&&state.nitro>=25&&state.hand.length>0;
  if(alt==='RAM'&&!ramLegal)return {legal:false};
  if(alt==='GUARD'&&!guardLegal)return {legal:false};
  if(alt==='REDLINE'&&!redlineLegal)return {legal:false};
  const incoming=state.enemyIntent==='ATTACK'?45:state.enemyIntent==='SPECIAL'?18:0;
  if(alt==='RAM')return {legal:true,nitroCost:40,damage:{base:40,range:[36,44]},enemyHpDelta:{range:[-44,-36]},playerHpDelta:-incoming,turnImpact:'2 Energy; no Redline amplification',riskExposure:incoming>0?'baseline incoming hit':'none'};
  if(alt==='GUARD')return {legal:true,nitroCost:25,defensiveEffect:14,damage:{base:0,range:[0,0]},enemyDamageReceived:Math.max(0,incoming-14),playerHpDelta:-Math.max(0,incoming-14),turnImpact:'1 Energy; no Redline amplification',riskExposure:incoming>14?'residual '+(incoming-14)+' incoming':'blocked'};
  const affected=state.energy>=2&&state.nitro>=40&&state.hand.includes('ram')?'Ram':(state.hand.includes('shot')?'Shot':state.hand[0]);
  const raw=affected==='Ram'?40:(affected==='Shot'?18:0); const bonus=Math.round(raw*.25);
  return {legal:true,nitroCost:25,affectedCard:affected,bonusDamage:{base:bonus,range:[Math.round(bonus*.9),Math.round(bonus*1.1)]},damage:{base:raw+bonus,range:[Math.round((raw+bonus)*.9),Math.round((raw+bonus)*1.1)]},enemyHpDelta:{range:[-Math.round((raw+bonus)*1.1),-Math.round((raw+bonus)*.9)]},playerHpDelta:-Math.round(incoming*1.25),amplifiedIncoming:Math.round(incoming*.25),turnImpact:'Redline + '+affected,riskExposure:incoming>0?'+'+Math.round(incoming*.25)+' incoming from Redline amplification':'none'};
}
function summarize(rows){
 const opp=rows.length, act=rows.filter(r=>r.redlineSelected), ramAvail=rows.filter(r=>r.ramLegal), guardAvail=rows.filter(r=>r.guardLegal), both=rows.filter(r=>r.bothLegal);
 const matched=act.filter(r=>r.pairState), repRam=act.filter(r=>r.pairedAlternative==='Ram'), repGuard=act.filter(r=>r.pairedAlternative==='Guard'), noDirect=act.filter(r=>r.pairedAlternative==='OTHER');
 return {opportunities:opp,activations:act.length,activationRate:pct(act.length,opp),ramAvailable:ramAvail.length,guardAvailable:guardAvail.length,bothAvailable:both.length,ramOpportunityPct:pct(ramAvail.length,opp),guardOpportunityPct:pct(guardAvail.length,opp),bothOpportunityPct:pct(both.length,opp),pairedStateMatches:matched.length,pairedStateMatchRate:pct(matched.length,act.length),activationsReplacingRam:pct(repRam.length,act.length),activationsReplacingGuard:pct(repGuard.length,act.length),activationsNoDirectSpenderAmongMatched:pct(noDirect.length,matched.length),displacedNitroFromRam:repRam.length*40,displacedNitroFromGuard:repGuard.length*25};
}
function pairedEffects(rows,B){const act=rows.filter(r=>r.redlineSelected);return {meanExtraDamageField:mean(B.map(r=>r.redlineExtraDamage)),meanExtraIncoming:mean(B.map(r=>r.redlineExtraIncoming)),meanEnemyHpDelta:mean(act.map(r=>(r.post?.enemyHp??r.enemyHp)-r.enemyHp)),meanPlayerHpDelta:mean(act.map(r=>(r.post?.hp??r.playerHP)-r.playerHP)),riskEvents:B.reduce((n,r)=>n+r.redlineRiskEvents,0)};}
function counterfactuals(){const states=[{id:'A',hp:90,enemyHp:80,energy:2,nitro:80,enemyIntent:'ATTACK',hand:['ram','guard','shot']},{id:'B',hp:35,enemyHp:80,energy:2,nitro:80,enemyIntent:'ATTACK',hand:['ram','guard','shot']},{id:'C',hp:90,enemyHp:25,energy:2,nitro:80,enemyIntent:'DEFEND',hand:['ram','guard','shot']},{id:'D',hp:50,enemyHp:100,energy:2,nitro:50,enemyIntent:'SPECIAL',hand:['ram','guard','shot']}];return states.map(s=>({state:s,Ram:alternative(s,'RAM'),Guard:alternative(s,'GUARD'),Redline:alternative(s,'REDLINE')}));}
function replay(n,model){for(let i=0;i<n;i++){const seed=100001+i;const a=run(seed,model,'adaptive','basic','normal',true),b=run(seed,model,'adaptive','basic','normal',true);if(JSON.stringify(a)!==JSON.stringify(b))return false}return true;}
function runTests(){const c=counterfactuals();if(c.length!==4)throw new Error('counterfactual count');if(!c.every(x=>x.Ram.legal&&x.Guard.legal&&x.Redline.legal))throw new Error('availability');if(!(c[0].Redline.bonusDamage.base>0))throw new Error('bonus damage');if(!(c[0].Redline.amplifiedIncoming>0))throw new Error('incoming amplification');if(!replay(250,'A')||!replay(250,'B'))throw new Error('determinism');const p=ledgerPair(100001);if(p.rows.some(r=>r.redlineSelected&&!r.selectedAction.startsWith('REDLINE+')))throw new Error('opportunity detection');return 'PASS';}
function runPhase8(){const {A,B,rows}=collect();const s=summarize(rows);const byIntent={};for(const intent of ['ATTACK','DEFEND','SPECIAL']){const rs=rows.filter(r=>r.enemyIntent===intent),as=rs.filter(r=>r.redlineSelected);byIntent[intent]={opportunities:rs.length,activations:as.length,activationRate:pct(as.length,rs.length),incomingBase:intent==='ATTACK'?45:intent==='SPECIAL'?18:0,incomingWithRedline:intent==='ATTACK'?Math.round(45*1.25):intent==='SPECIAL'?Math.round(18*1.25):0};}
 const redlineVsRam=rows.filter(r=>r.redlineSelected&&r.ramLegal).slice(0,200).map(r=>({seed:r.seed,turn:r.turn,state:{playerHP:r.playerHP,enemyHP:r.enemyHp,energy:r.energy,nitro:r.nitro,intent:r.enemyIntent},Redline:alternative({...r,hand:r.hand},'REDLINE'),Ram:alternative({...r,hand:r.hand},'RAM')}));
 const redlineVsGuard=rows.filter(r=>r.redlineSelected&&r.guardLegal).slice(0,200).map(r=>({seed:r.seed,turn:r.turn,state:{playerHP:r.playerHP,enemyHP:r.enemyHp,energy:r.energy,nitro:r.nitro,intent:r.enemyIntent},Redline:alternative({...r,hand:r.hand},'REDLINE'),Guard:alternative({...r,hand:r.hand},'GUARD')));
 const allocA={ram:A.reduce((n,r)=>n+r.actions.filter(a=>a==='NITRO+ram').length,0)*40,guard:A.reduce((n,r)=>n+r.actions.filter(a=>a==='NITRO+guard').length,0)*25,redline:0}; const allocB={ram:B.reduce((n,r)=>n+r.actions.filter(a=>a==='NITRO+ram').length,0)*40,guard:B.reduce((n,r)=>n+r.actions.filter(a=>a==='NITRO+guard').length,0)*25,redline:B.reduce((n,r)=>n+r.redlineUses,0)*25};
 const tests=runTests();
 return {seeds:{start:100001,end:110000,count:10000},simulations:{A:10000,B:10000,total:20000,pairedSeeds:10000},models:{A:'Exact Phase-7/Phase-6 control: Nitro + Ram + Guard, Redline OFF',B:'Exact Phase-7/Phase-6 Redline: same rules, Redline ON',C:'Opportunity ledger over exact B traces; no runtime mechanics changed'},reproduction:{A:{winRate:mean(A.map(r=>r.win?1:0)),avgTurns:mean(A.map(r=>r.turns)),nitroGenerated:mean(A.map(r=>r.nitroGenerated)),nitroSpent:mean(A.map(r=>r.nitroSpent)),nitroRemaining:mean(A.map(r=>r.nitroRemaining))},B:{winRate:mean(B.map(r=>r.win?1:0)),avgTurns:mean(B.map(r=>r.turns)),nitroGenerated:mean(B.map(r=>r.nitroGenerated)),nitroSpent:mean(B.map(r=>r.nitroSpent)),nitroRemaining:mean(B.map(r=>r.nitroRemaining))}},opportunity:s,allocation:{A:allocA,B:allocB},benefitAndRisk:pairedEffects(rows,B),riskByIntent:byIntent,redlineVsRam,redlineVsGuard,counterfactuals:counterfactuals(),determinism:{A:replay(250,'A'),B:replay(250,'B')},tests};}
export {runPhase8,runTests,replay,counterfactuals,alternative};
if(import.meta.url==='file://'+process.argv[1])console.log(JSON.stringify(runPhase8(),null,2));
