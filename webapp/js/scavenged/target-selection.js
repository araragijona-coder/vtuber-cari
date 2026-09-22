export function distanceSquared(ax,ay,bx,by){const dx=ax-bx,dy=ay-by;return dx*dx+dy*dy;}
export function hitTestCircle(point,target){const r=Math.max(0,Number(target.radius)||0);return distanceSquared(point.x,point.y,target.x,target.y)<=r*r;}
export function selectTarget(point,targets,{filter=t=>(t?.selectable!==false&&(t?.hp??1)>0),preferNearest=true}={}){
 const candidates=targets.filter(filter).filter(t=>hitTestCircle(point,t));if(!candidates.length)return null;if(!preferNearest)return candidates[0];
 return candidates.reduce((n,c)=>!n||distanceSquared(point.x,point.y,c.x,c.y)<distanceSquared(point.x,point.y,n.x,n.y)?c:n,null);
}
export function bindPointerTargeting(element,getTargets,onTarget){
 const handler=event=>{const r=element.getBoundingClientRect(),target=selectTarget({x:event.clientX-r.left,y:event.clientY-r.top},getTargets());if(target)onTarget(target,event);};
 element.addEventListener("pointerdown",handler,{passive:true});return()=>element.removeEventListener("pointerdown",handler);
}
// Conceptual provenance: Canvas hit-testing and touch input patterns from lightweight arcade projects.
