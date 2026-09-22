export class TurnSystem{
 constructor({rng=Math.random}={}){this.rng=rng;this.queue=[];this.round=0;this.active=null;}
 reset(units=[]){this.round=0;this.active=null;this.queue=units.filter(Boolean).map(unit=>({unit,initiative:0,tie:this.rng()}));}
 startRound(){this.round++;for(const e of this.queue)e.initiative=Math.max(0,Number(e.unit.speed)||0)+(Number(e.unit.initiativeBonus)||0),e.tie=this.rng();this.queue.sort((a,b)=>b.initiative-a.initiative||b.tie-a.tie);return this.queue.map(e=>e.unit);}
 next(){if(!this.queue.length)return null;this.active=this.queue.shift().unit;return this.active;}
 endTurn(){this.active=null;return this.queue.length>0;}
 removeDefeated(){this.queue=this.queue.filter(e=>(e.unit.hp??0)>0);if(this.active&&(this.active.hp??0)<=0)this.active=null;}
}
