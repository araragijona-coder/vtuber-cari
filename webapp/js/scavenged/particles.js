export class ParticlePool{
 constructor({capacity=256,rng=Math.random}={}){this.capacity=Math.max(1,capacity|0);this.rng=rng;this.items=[];}
 emit({x,y,count=10,speed=120,life=.35,size=3,spread=Math.PI*2,angle=0}){
  for(let i=0;i<count;i++){if(this.items.length>=this.capacity)this.items.shift();const a=angle-spread/2+this.rng()*spread,s=speed*(.35+this.rng()*.65);this.items.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life,maxLife:life,size:size*(.6+this.rng()*.8)});}
 }
 update(dt,drag=.92){const step=Math.max(0,Math.min(.05,dt));for(const p of this.items){p.x+=p.vx*step;p.y+=p.vy*step;p.vx*=Math.pow(drag,step*60);p.vy*=Math.pow(drag,step*60);p.life-=step;}this.items=this.items.filter(p=>p.life>0);}
 draw(ctx){for(const p of this.items){const alpha=Math.max(0,p.life/p.maxLife);ctx.globalAlpha=alpha;ctx.beginPath();ctx.arc(p.x,p.y,p.size*(.5+alpha),0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}
 clear(){this.items.length=0;}
}
// Conceptual provenance: bounded particle pools and high-speed impact FX from vanilla Canvas arcade patterns.
