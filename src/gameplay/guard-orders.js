// Comandos de Chaves — calculados sem dependências de Three.js e compatíveis com saves antigos.
export const GUARD_ORDERS=Object.freeze(['follow','defend','patrol']);
export const GUARD_ORDER_NAMES=Object.freeze({follow:'Seguir',defend:'Defender base',patrol:'Patrulhar'});
export const DEFAULT_GUARD_ORDER='defend';
export function normalizeGuardOrder(value){return GUARD_ORDERS.includes(value)?value:DEFAULT_GUARD_ORDER;}
export function nextGuardOrder(value){const i=GUARD_ORDERS.indexOf(normalizeGuardOrder(value));return GUARD_ORDERS[(i+1)%GUARD_ORDERS.length];}
export const distanceXZ=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function basePosition(structures,spawn={x:4,z:2}){
 const b=Array.isArray(structures)?structures.find(item=>Number.isFinite(item?.x)&&Number.isFinite(item?.z)):null;
 return b?{x:b.x+2,z:b.z+1.6}:{x:spawn.x,z:spawn.z};
}
export function guardWaypoint(mode,player,structures,patrolIndex=0,spawn={x:4,z:2}){
 const base=basePosition(structures,spawn);
 if(mode==='follow')return {x:player.x+1.6,z:player.z+1.8};
 if(mode!=='patrol')return base;
 const i=Math.abs(Math.trunc(patrolIndex))%4;
 const offsets=[[4.3,0],[0,4.3],[-4.3,0],[0,-4.3]];
 return {x:base.x+offsets[i][0],z:base.z+offsets[i][1]};
}
export function canEngageInOrder(enemyPosition,mode,player,structures,{spawn={x:4,z:2},radius=14}={}){
 if(!enemyPosition)return false;
 const leash=mode==='follow'?player:basePosition(structures,spawn);
 return distanceXZ(enemyPosition,leash)<=(mode==='patrol'?radius+2:radius);
}
