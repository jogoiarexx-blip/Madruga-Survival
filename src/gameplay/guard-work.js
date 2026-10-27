// Seleção de trabalho e colheita do Chaves sem dependência do renderizador.
// Não minerar ferro sem ferramenta própria. Não colher acima do limite da mochila.
export const GUARD_WORK_RADIUS=23;
export function selectGuardWork(position,base,nodes=[],structures=[],inventory={}){
 if(!position||!base)return null;
 const candidates=[];
 for(const plot of structures){
   if(plot.type!=='farmPlot'||!plot.crop)continue;
   const crop=plot.crop;
   const action=!crop.planted?(inventory.seeds>0?'plant':null):
     crop.growth>=125?'harvest':crop.water<=8&&inventory.water>0?'water':null;
   if(action&&Math.hypot(plot.x-base.x,plot.z-base.z)<GUARD_WORK_RADIUS)
     candidates.push({kind:'farm',target:plot,action,x:plot.x,z:plot.z,priority:action==='harvest'?3:2});
 }
 for(const node of nodes){
   if(node.cooldown>0||node.type==='iron'||!Object.hasOwn(inventory,node.type)||inventory[node.type]>994)continue;
   if(Math.hypot(node.x-base.x,node.z-base.z)>GUARD_WORK_RADIUS)continue;
   candidates.push({kind:'resource',target:node,x:node.x,z:node.z,priority:1});
 }
 candidates.sort((a,b)=>b.priority-a.priority||Math.hypot(a.x-position.x,a.z-position.z)-Math.hypot(b.x-position.x,b.z-position.z));
 return candidates[0]||null;
}
