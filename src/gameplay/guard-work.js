// Seleção de trabalho e colheita do Chaves sem dependência do renderizador.
// Não minerar ferro sem ferramenta própria. Não colher acima do limite da mochila.
import {cargoCount,cargoFitsChest,GUARD_CARGO_LIMIT} from './guard-cargo.js';
import {validChestItems} from './storage.js';
import {guardCanCollect,normalizeGuardWorkPreferences} from './guard-work-preferences.js';
export const GUARD_WORK_RADIUS=23;
export function selectGuardWork(position,base,nodes=[],structures=[],inventory={},options={}){
 if(!position||!base)return null;
 const cargo=options.cargo||{},carried=cargoCount(cargo);
 const preferences=normalizeGuardWorkPreferences(options.preferences);
 const chests=structures.filter(s=>s.type==='chest'&&s.items&&validChestItems(s.items)&&
    Math.hypot(s.x-base.x,s.z-base.z)<GUARD_WORK_RADIUS);
 const available=chests.filter(s=>cargoFitsChest(cargo,s.items))
   .sort((a,b)=>Math.hypot(a.x-position.x,a.z-position.z)-Math.hypot(b.x-position.x,b.z-position.z));
 if(carried>0&&(!available.length||carried>=6)){
   if(available.length)return {kind:'deposit',target:available[0],x:available[0].x,z:available[0].z,priority:5};
   if(options.player)return {kind:'handoff',target:options.player,x:options.player.x,z:options.player.z,priority:5};
 }
 const candidates=[];
 for(const plot of structures){
   if(!preferences.farm||plot.type!=='farmPlot'||!plot.crop)continue;
   const crop=plot.crop;
   const action=!crop.planted?(inventory.seeds>0?'plant':null):
     crop.growth>=125?'harvest':crop.water<=8&&inventory.water>0?'water':null;
   if(action&&Math.hypot(plot.x-base.x,plot.z-base.z)<GUARD_WORK_RADIUS)
     candidates.push({kind:'farm',target:plot,action,x:plot.x,z:plot.z,priority:action==='harvest'?3:2});
 }
 for(const node of nodes){
   if(node.cooldown>0||!guardCanCollect(preferences,node.type)||!Object.hasOwn(inventory,node.type)||inventory[node.type]>994)continue;
   if(chests.length&&carried>=GUARD_CARGO_LIMIT)continue;
   if(Math.hypot(node.x-base.x,node.z-base.z)>GUARD_WORK_RADIUS)continue;
   candidates.push({kind:'resource',target:node,x:node.x,z:node.z,priority:1});
 }
 candidates.sort((a,b)=>b.priority-a.priority||Math.hypot(a.x-position.x,a.z-position.z)-Math.hypot(b.x-position.x,b.z-position.z));
 if(!candidates.length&&carried>0){
   if(available.length)return {kind:'deposit',target:available[0],x:available[0].x,z:available[0].z,priority:5};
   if(options.player)return {kind:'handoff',target:options.player,x:options.player.x,z:options.player.z,priority:5};
 }
 return candidates[0]||null;
}
