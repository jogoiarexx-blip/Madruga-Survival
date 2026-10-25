// Integridade persistente da base, defesa e reparo.
export const BUILDING_MAX_HP=Object.freeze({campfire:45,shelter:90,floor:70,wall:140,door:105,bed:65,chest:110,workbench:120,roof:85,farmPlot:60});
export function maxBuildingHP(type){return BUILDING_MAX_HP[type]||0;}
export function buildingHP(type,saved){
 const max=maxBuildingHP(type);return Number.isInteger(saved)&&saved>0&&saved<=max?saved:max;
}
export function damageBuilding(item,amount){
 if(!item||!maxBuildingHP(item.type)||!Number.isFinite(amount)||amount<=0)return {hit:false,destroyed:false};
 item.hp=Math.max(0,item.hp-Math.ceil(amount));
 return {hit:true,destroyed:item.hp<=0};
}
export function repairBuilding(item,state){
 if(!item||item.hp>=maxBuildingHP(item.type))return false;
 const key=['campfire','workbench'].includes(item.type)?'stone':'wood';
 if((state.inventory[key]||0)<1)return false;
 state.inventory[key]--;item.hp=Math.min(maxBuildingHP(item.type),item.hp+45);
 return true;
}
export function repairBuildingWithKit(item,state){
 if(!item||!maxBuildingHP(item.type)||!Number.isInteger(item.hp)||item.hp<1||item.hp>=maxBuildingHP(item.type)||
   !Number.isInteger(state?.inventory?.repairKit)||state.inventory.repairKit<1)return false;
 state.inventory.repairKit--;item.hp=Math.min(maxBuildingHP(item.type),item.hp+95);return true;
}
export function raidTarget(structures,enemyPosition,playerPosition){
 // Inimigos não destroem baús para evitar perda silenciosa do conteúdo.
 const valid=structures.filter(s=>s.hp>0&&!['floor','chest','bed','farmPlot'].includes(s.type)&&
   Math.hypot(s.x-playerPosition.x,s.z-playerPosition.z)<24);
 if(!valid.length)return null;
 valid.sort((a,b)=>{
   const penalty=s=>['wall','door'].includes(s.type)?0:2;
   return Math.hypot(a.x-enemyPosition.x,a.z-enemyPosition.z)+penalty(a)-
          Math.hypot(b.x-enemyPosition.x,b.z-enemyPosition.z)-penalty(b);
 });
 return valid[0];
}
