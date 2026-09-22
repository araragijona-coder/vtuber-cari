export const DamageType=Object.freeze({PHYSICAL:"physical",MAGIC:"magic",TRUE:"true"});
export function clamp(v,min,max){return Math.min(max,Math.max(min,v));}
export function rollCritical({criticalChance=0,rng=Math.random}={}){return rng()<clamp(criticalChance,0,1);}
export function calculateDamage({attack=0,defense=0,multiplier=1,critical=false,criticalMultiplier=1.5,variance=0,damageType=DamageType.PHYSICAL,rng=Math.random}={}){
 const a=Math.max(0,Number(attack)||0),d=Math.max(0,Number(defense)||0),m=Math.max(0,Number(multiplier)||0),v=clamp(Number(variance)||0,0,1);
 let base=a*m;
 if(damageType!==DamageType.TRUE) base=Math.max(1,base-d);
 if(v>0) base*=1-v+rng()*v*2;
 if(critical) base*=Math.max(1,Number(criticalMultiplier)||1);
 return Math.max(0,Math.round(base));
}
export function resolveAttack(attacker,defender,options={}){
 const critical=rollCritical({criticalChance:attacker.criticalChance,rng:options.rng});
 const damage=calculateDamage({attack:attacker.attack,defense:defender.defense,multiplier:options.multiplier??1,critical,criticalMultiplier:attacker.criticalMultiplier??1.5,variance:options.variance??0.1,damageType:options.damageType??DamageType.PHYSICAL,rng:options.rng??Math.random});
 const hpBefore=Math.max(0,defender.hp),hpAfter=Math.max(0,hpBefore-damage);
 return {damage,critical,hpBefore,hpAfter,defeated:hpAfter===0};
}
// Conceptual provenance: dependency-free combat patterns from open-source vanilla Canvas RPGs.
