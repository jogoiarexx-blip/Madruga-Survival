// Planejamento de construção puro: prévia, ímã, confirmação e custo somente no commit.
import {preparePlacement,STRUCTURE_TYPES,orientation} from '../world/building-rules.js';
import {snapTargets} from '../world/build-snapping.js';
export const isStructureRecipe=id=>STRUCTURE_TYPES.includes(id);
export function beginPlacement(type,yaw=0,rotationOffset=0){
 if(!isStructureRecipe(type))return null;
 return {type,distance:type==='shelter'?4:3.8,lateral:0,snapEnabled:true,
   rotation:orientation(Math.round(yaw/(Math.PI/2))+rotationOffset)};
}
export function nudgePlacement(plan,axis,amount){
 if(!plan||!Number.isFinite(amount))return plan;
 if(axis==='distance')plan.distance=Math.max(2.5,Math.min(9,plan.distance+amount));
 if(axis==='lateral')plan.lateral=Math.max(-6,Math.min(6,plan.lateral+amount));
 return plan;
}
export function rotatePlacement(plan,steps=1){
 if(plan)plan.rotation=orientation(plan.rotation+steps);
 return plan;
}
export function toggleSnap(plan){
 if(plan)plan.snapEnabled=!plan.snapEnabled;
 return !!plan?.snapEnabled;
}
export function placementCandidate(plan,position,yaw,structures=[],canPlace=null){
 if(!plan||!position||!Number.isFinite(yaw))return null;
 // A prévia acompanha a direção do jogador, e pode ser ajustada lateralmente.
 const x=position.x-Math.sin(yaw)*plan.distance+Math.cos(yaw)*plan.lateral;
 const z=position.z-Math.cos(yaw)*plan.distance-Math.sin(yaw)*plan.lateral;
 const raw={x,z};
 const regular=preparePlacement(plan.type,x,z,plan.rotation);
 if(!plan.snapEnabled)return regular;
 const targets=snapTargets(plan.type,plan.rotation,structures,raw);
 for(const anchor of targets){
   if(!canPlace||canPlace(plan.type,anchor.x,anchor.z,position,anchor.rotation,{preserveCoordinates:true})){
     return {type:plan.type,x:anchor.x,z:anchor.z,rotation:anchor.rotation,
       snapped:true,snapLabel:anchor.label};
   }
 }
 return regular;
}
export function placementStatus(plan,position,yaw,canPlace,canAfford,structures=[]){
 const candidate=placementCandidate(plan,position,yaw,structures,canPlace);
 if(!candidate)return {valid:false,reason:'Sem construção selecionada',candidate:null};
 if(!canAfford(plan.type))return {valid:false,reason:'Materiais insuficientes',candidate};
 if(!canPlace(plan.type,candidate.x,candidate.z,position,candidate.rotation||0,
      {preserveCoordinates:!!candidate.snapped}))
   return {valid:false,reason:'Local bloqueado. Mova ou gire a peça',candidate};
 return {valid:true,reason:candidate.snapped?`Encaixe automático: ${candidate.snapLabel}`:
   'Local livre — confirme para construir',candidate};
}

// Transação: primeiro verifica, depois gasta. Falha na malha gera reembolso.
export function commitPlacement({plan,position,yaw,canPlace,canAfford,spend,place,refund,structures=[]}){
 const status=placementStatus(plan,position,yaw,canPlace,canAfford,structures);
 if(!status.valid)return {ok:false,reason:status.reason};
 if(!spend(plan.type))return {ok:false,reason:'Materiais indisponíveis'};
 let built=null;
 try{built=place(status.candidate);}catch(_){built=null;}
 if(!built){refund(plan.type);return {ok:false,reason:'Falha ao construir; materiais devolvidos'};}
 return {ok:true,built,candidate:status.candidate};
}
