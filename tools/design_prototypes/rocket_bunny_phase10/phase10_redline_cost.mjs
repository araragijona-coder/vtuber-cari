import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadInstrumented,runPhase9} from '../rocket_bunny_phase9/phase9_forced_choice.mjs';
export const SEED_START=100001,SEED_COUNT=10000,COSTS=[20,25,30];
const here=path.dirname(fileURLToPath(import.meta.url));
const PHASE6_SOURCE=fs.readFileSync(path.resolve(here,'../rocket_bunny_phase6/phase6_redline.mjs'),'utf8');
export function patchPhase6(source,cost,{defensiveAmplification=true}={}){
 let x=source.replace(/redlineNitroCost:25/g,`redlineNitroCost:${cost}`).replace(/s\.redlineOn&&s\.nitro>=25/g,`s.redlineOn&&s.nitro>=${cost}`).replace(/\(model==='B'\|\|model==='C'\)&&s\.nitro>=25/g,`(model==='B'||model==='C')&&s.nitro>=${cost}`).replace(/s\.nitro<25\|\|!legal\(s,a\.id\)/g,`s.nitro<${cost}||!legal(s,a.id)`);
 if(!defensiveAmplification)x=x.replace(/redlineIncomingMultiplier:1\.25/g,'redlineIncomingMultiplier:1');
 return x;
}
export const runner=(cost,options={})=>loadInstrumented(patchPhase6(PHASE6_SOURCE,cost,options));
export const redlineLegal=(nitro,cost)=>nitro>=cost;
export function aggregate(rs){let o=0,a=0,m=0,g=0,s=0,n=0,e=0,w=0,d=0,i=0,k=0;for(const r of rs){o+=r.redlineOpportunities;a+=r.redlineUses;m+=r.redlineMissed;g+=r.nitroGenerated;s+=r.nitroSpent;n+=r.nitroRemaining;e+=r.energySpent;w+=r.energyWaste;d+=r.redlineExtraDamage;i+=r.redlineExtraIncoming;k+=r.redlineRiskEvents}return{simulations:rs.length,winRate:rs.filter(r=>r.win).length/rs.length,opportunities:o,activations:a,activationRate:a/o,missed:m,nitroGenerated:g/rs.length,nitroSpent:s/rs.length,nitroRemaining:n/rs.length,energySpent:e/rs.length,energyWaste:w/rs.length,redlineAffectedCardDamage:d/rs.length,incoming:i/rs.length,riskEvents:k,riskRate:a?k/a:0}};
export const runCost=c=>aggregate(Array.from({length:SEED_COUNT},(_,i)=>runner(c).run(SEED_START+i,'B','adaptive','basic','normal')));
export const runAmplification=on=>aggregate(Array.from({length:SEED_COUNT},(_,i)=>runner(25,{defensiveAmplification:on}).run(SEED_START+i,'B','adaptive','basic','normal')));
export const deterministicReplay=c=>{const r=runner(c);for(let i=0;i<250;i++){const s=SEED_START+i;if(JSON.stringify(r.run(s,'B','adaptive','basic','normal'))!==JSON.stringify(r.run(s,'B','adaptive','basic','normal')))return false}return true};
export function control(){const r=runPhase9(PHASE6_SOURCE);return{A:r.candidateCounts.setA,B:r.candidateCounts.setB,C:r.candidateCounts.setC,union:r.candidateCounts.union,noSpender:r.sets.noSpenderAvailable,deterministic:r.determinism,tests:r.tests}};
if(process.argv[1]?.endsWith('phase10_redline_cost.mjs'))console.log(JSON.stringify({control:control(),costs:Object.fromEntries(COSTS.map(c=>[c,runCost(c)])),amplification:{off:runAmplification(false),on:runAmplification(true)}},null,2));
