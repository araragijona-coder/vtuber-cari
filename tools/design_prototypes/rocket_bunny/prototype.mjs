import fs from 'node:fs';

const CONFIG = Object.freeze({
  simulations: 10000, seedStart: 100001, maxTurns: 20, handSize: 4,
  energyPerTurn: 3, playerMaxHp: 100, enemyMaxHp: 150, enemyAttack: 45,
  redlineNitroCost: 25, redlineDamageMultiplier: 1.25, redlineIncomingMultiplier: 1.25,
  nitroBoostCost: 40, nitroBoostBonus: 14,
  varianceProfiles: Object.freeze({low:[0.98,1.02],normal:[0.90,1.10],high:[0.75,1.25]})
});
const BASE_CARDS = Object.freeze({
  shot:{name:'DISPARO NEON',cost:1,type:'attack',damage:18},
  guard:{name:'ESCUDO DARK',cost:1,type:'defend',block:14},
  heavy:{name:'EMBESTIDA PESADA',cost:2,type:'attack',damage:30},
  precision:{name:'CORTE PRECISO',cost:1,type:'attack',damage:12}
});
const PROTO_CARDS = Object.freeze({
  shot:BASE_CARDS.shot, guard:BASE_CARDS.guard,
  pump:{name:'NITRO PUMP',cost:1,type:'nitro',damage:7,nitro:35},
  ram:{name:'EMBESTIDA NITRO',cost:2,type:'attack',damage:26}
});
const BASE_DECK=Object.freeze(['shot','shot','guard','guard','heavy','precision','heavy']);
const PROTO_DECK=Object.freeze(['shot','shot','guard','pump','ram','guard','ram']);

function rng(seed){let s=(seed>>>0)||0x6d2b79f5;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296;};}
function shuffle(a,r){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
const median=a=>{a=[...a].sort((x,y)=>x-y);return a.length?a[Math.floor(a.length/2)]:0;};

function makeState(seed,model,enemyType='basic'){
 const r=rng(seed);return{seed,model,enemyType,r,varianceProfile:'normal',turn:1,hp:100,enemyHp:150,
 energy:3,block:0,nitro:0,enemyIntent:'ATTACK',redlinePending:false,hand:[],
 drawPile:shuffle(model==='baseline'?BASE_DECK:PROTO_DECK,r),discard:[],actions:[],cardUses:{},
 energySpent:0,energyWaste:0,nitroGenerated:0,nitroSpent:0,redlineUses:0,redlineFailures:0,
 enemyResponses:0,counterActions:0,deathCause:null};
}
const cardsFor=s=>s.model==='baseline'?BASE_CARDS:PROTO_CARDS;
function draw(s,n){for(let i=0;i<n;i++){if(s.hand.length>=4)break;if(!s.drawPile.length){s.drawPile=shuffle(s.discard,s.r);s.discard=[];}const c=s.drawPile.shift();if(c)s.hand.push(c);}}
function setIntent(s){const x=s.r();if(s.enemyType==='reactive')s.enemyIntent=x<.45?'ATTACK':x<.75?'DEFEND':'SPECIAL';else if(s.enemyType==='pressure')s.enemyIntent=s.turn%3===0?'SPECIAL':x<.70?'ATTACK':'DEFEND';else s.enemyIntent=x<.70?'ATTACK':'DEFEND';}
function legal(s,id){const d=cardsFor(s)[id];return !!d&&s.energy>=d.cost;}
function score(s,id){
 const d=cardsFor(s)[id];if(!d||!legal(s,id))return-Infinity;
 if(id==='shot')return 18+(s.enemyIntent==='DEFEND'?2:0);
 if(id==='guard')return s.enemyIntent==='ATTACK'?(s.hp<60?40:22):5;
 if(id==='heavy')return 30+(s.enemyHp<=48?8:0);
 if(id==='precision')return 12+(s.enemyIntent==='DEFEND'?2:0);
 if(id==='pump')return (s.nitro<50?15:2)+(s.enemyIntent==='ATTACK'&&s.hp<60?-8:0);
 if(id==='ram')return 26+(s.nitro>=40?14:0)+(s.enemyHp<=48?8:0)+(s.nitro<40?-3:0);
 return-Infinity;
}
function best(s){return s.hand.filter(id=>legal(s,id)).sort((a,b)=>score(s,b)-score(s,a))[0]||null;}
function choose(s,policy){
 const ls=s.hand.filter(id=>legal(s,id));if(!ls.length)return null;
 if(policy==='defensive'&&s.enemyIntent==='ATTACK'&&ls.includes('guard'))return{kind:'card',id:'guard'};
 if(policy==='generator'&&s.model==='prototype'&&s.nitro<55&&ls.includes('pump'))return{kind:'card',id:'pump'};
 if(policy==='redline'&&s.model==='prototype'&&s.nitro>=25&&s.enemyIntent!=='ATTACK')return{kind:'redline',id:best(s)};
 if(policy==='adaptive'&&s.model==='prototype'){
  if(s.enemyIntent==='ATTACK'&&s.hp<55&&ls.includes('guard'))return{kind:'card',id:'guard'};
  if(s.nitro<35&&s.enemyIntent!=='ATTACK'&&ls.includes('pump'))return{kind:'card',id:'pump'};
  if(s.nitro>=40&&ls.includes('ram')&&(s.enemyHp<=55||s.energy>=2))return{kind:'card',id:'ram'};
  if(s.nitro>=25&&s.enemyIntent==='DEFEND'&&s.hp>55)return{kind:'redline',id:best(s)};
 }
 return{kind:'card',id:best(s)};
}
function resolveCard(s,id,redline=false){
 const d=cardsFor(s)[id];if(!d||!legal(s,id))return false;
 s.energy-=d.cost;s.energySpent+=d.cost;const i=s.hand.indexOf(id);if(i>=0){s.hand.splice(i,1);s.discard.push(id);}
 s.cardUses[id]=(s.cardUses[id]||0)+1;let dmg=0;
 if(['shot','heavy','precision','ram'].includes(id))dmg=d.damage;
 if(id==='pump'){dmg=7;s.nitro=Math.min(100,s.nitro+35);s.nitroGenerated+=35;}
 if(id==='guard')s.block+=14;
 if(id==='ram'&&s.nitro>=40){s.nitro-=40;s.nitroSpent+=40;dmg+=14;}
 if(redline)dmg=Math.round(dmg*1.25);
 if(dmg>0){const vp=CONFIG.varianceProfiles[s.varianceProfile];dmg=Math.max(0,Math.round(dmg*(vp[0]+(vp[1]-vp[0])*s.r())));s.enemyHp=Math.max(0,s.enemyHp-dmg);}
 s.actions.push(redline?'REDLINE+'+id:id);
 if(s.enemyType==='reactive'&&id==='shot'&&s.enemyIntent==='DEFEND'){s.enemyResponses++;s.enemyHp=Math.min(150,s.enemyHp+4);}
 if(s.enemyType==='reactive'&&id==='ram'&&s.enemyIntent==='SPECIAL'){s.enemyResponses++;s.counterActions++;s.hp=Math.max(0,s.hp-5);}
 return true;
}
function resolve(s,a){
 if(!a)return false;
 if(a.kind==='redline'){if(s.model!=='prototype'||s.nitro<25){s.redlineFailures++;return false;}s.nitro-=25;s.nitroSpent+=25;s.redlineUses++;s.redlinePending=true;return resolveCard(s,a.id,true);}
 return resolveCard(s,a.id,false);
}
function enemyAct(s){
 let dmg=s.enemyIntent==='ATTACK'?45:s.enemyIntent==='SPECIAL'?18:0;
 if(s.model==='prototype'&&s.redlinePending){dmg=Math.round(dmg*1.25);s.redlinePending=false;}
 const blocked=Math.min(s.block,dmg);s.block-=blocked;dmg-=blocked;s.hp=Math.max(0,s.hp-dmg);
 if(s.hp<=0)s.deathCause=s.enemyIntent==='SPECIAL'?'ENEMY_SPECIAL':'ENEMY_ATTACK';
}
function run(seed,model,policy='adaptive',enemyType='basic',trace=false,varianceProfile='normal'){
 const s=makeState(seed,model,enemyType);s.varianceProfile=varianceProfile;draw(s,4);const tr=[];
 while(s.turn<=CONFIG.maxTurns&&s.hp>0&&s.enemyHp>0){
  s.energy=3;s.block=0;setIntent(s);let n=0;
  while(s.energy>0&&s.hp>0&&s.enemyHp>0&&n<3){
   const a=choose(s,policy);if(!a)break;const be=s.energy,bn=s.nitro,bh=[...s.hand];const ok=resolve(s,a);n++;
   if(trace)tr.push({turn:s.turn,hp:s.hp,enemyHp:s.enemyHp,enemyIntent:s.enemyIntent,availableCards:bh,action:a.kind==='redline'?'REDLINE+'+a.id:a.id,energyBefore:be,energyAfter:s.energy,nitroBefore:bn,nitroAfter:s.nitro});
   if(!ok||s.enemyHp<=0||s.hp<=0||s.energy===be&&s.nitro===bn)break;
  }
  s.energyWaste+=s.energy;if(s.enemyHp>0&&s.hp>0)enemyAct(s);draw(s,2);s.turn++;
 }
 return{win:s.enemyHp<=0&&s.hp>0,turns:Math.min(s.turn,20),energySpent:s.energySpent,energyWaste:s.energyWaste,nitroGenerated:s.nitroGenerated,nitroSpent:s.nitroSpent,redlineUses:s.redlineUses,redlineFailures:s.redlineFailures,cardUses:s.cardUses,actions:s.actions,deathCause:s.deathCause,enemyResponses:s.enemyResponses,counterActions:s.counterActions,trace:tr};
}
function aggregate(rs){
 const wins=rs.filter(x=>x.win).length,uses={};for(const r of rs)for(const[k,v]of Object.entries(r.cardUses))uses[k]=(uses[k]||0)+v;
 const total=Object.values(uses).reduce((a,b)=>a+b,0);return{simulations:rs.length,winRate:wins/rs.length,lossRate:1-wins/rs.length,avgTurns:mean(rs.map(x=>x.turns)),medianTurns:median(rs.map(x=>x.turns)),avgEnergySpent:mean(rs.map(x=>x.energySpent)),avgEnergyWaste:mean(rs.map(x=>x.energyWaste)),avgNitroGenerated:mean(rs.map(x=>x.nitroGenerated)),avgNitroSpent:mean(rs.map(x=>x.nitroSpent)),avgRedlineUses:mean(rs.map(x=>x.redlineUses)),redlineActivationRate:rs.filter(x=>x.redlineUses>0).length/rs.length,cardUsage:uses,cardUsageShare:Object.fromEntries(Object.entries(uses).map(([k,v])=>[k,v/total])),actionDiversity:Object.keys(uses).length,enemyResponseFrequency:mean(rs.map(x=>x.enemyResponses)),counterActionFrequency:mean(rs.map(x=>x.counterActions)),deathCauses:rs.reduce((m,x)=>{if(x.deathCause)m[x.deathCause]=(m[x.deathCause]||0)+1;return m;},{})};}
const policies=['aggressive','defensive','generator','redline','adaptive'],seeds=Array.from({length:10000},(_,i)=>100001+i),out={models:{},policies:{},rngProfiles:{},traces:{},valuation:{},determinism:null};
for(const m of ['baseline','prototype'])out.models[m]=aggregate(seeds.map(s=>run(s,m)));
for(const m of ['baseline','prototype'])for(const e of ['basic','reactive','pressure'])for(const p of policies)out.policies[m+':'+e+':'+p]=aggregate(seeds.map(s=>run(s,m,p,e)));
for(const v of ['low','normal','high'])for(const m of ['baseline','prototype'])out.rngProfiles[v+':'+m]=aggregate(seeds.map(s=>run(s,m,'adaptive','basic',false,v)));
for(const m of ['baseline','prototype'])for(const seed of [100001,100777,109999])out.traces[m+':'+seed]=run(seed,m,'adaptive','basic',true).trace;
const states=[
 ['ATTACK_PRESSURE',50,70,60,'ATTACK'],['DEFEND_WINDOW',80,55,60,'DEFEND'],
 ['LOW_NITRO',70,90,10,'DEFEND'],['FINISH_WINDOW',45,30,80,'ATTACK']];
function valuation([name,hp,eh,nitro,intent],model){
 const c=model==='baseline'?BASE_CARDS:PROTO_CARDS,r={};for(const[id,d]of Object.entries(c)){let v=0;if(id==='guard')v=intent==='ATTACK'?(hp<60?40:22):5;else if(id==='shot')v=18+(intent==='DEFEND'?2:0);else if(id==='heavy')v=30+(eh<=48?8:0);else if(id==='precision')v=12+(intent==='DEFEND'?2:0);else if(id==='pump')v=(nitro<50?15:2)+(intent==='ATTACK'&&hp<60?-8:0);else if(id==='ram')v=26+(nitro>=40?14:0)+(eh<=48?8:0)+(nitro<40?-3:0);r[id]=v;}if(model==='prototype'&&nitro>=25)r.REDLINE=25;return{name,state:{hp,enemyHp:eh,nitro,enemyIntent:intent},values:r};}
for(const st of states)out.valuation[st[0]]={baseline:valuation(st,'baseline'),prototype:valuation(st,'prototype')};
const a=run(123456,'prototype','adaptive','reactive',true),b=run(123456,'prototype','adaptive','reactive',true);out.determinism={sameTrace:JSON.stringify(a.trace)===JSON.stringify(b.trace),sameResult:JSON.stringify({...a,trace:undefined})===JSON.stringify({...b,trace:undefined}),seed:123456};
fs.writeFileSync('/tmp/rbp_phase3_results.json',JSON.stringify(out,null,2));
console.log(JSON.stringify({models:out.models,determinism:out.determinism},null,2));
