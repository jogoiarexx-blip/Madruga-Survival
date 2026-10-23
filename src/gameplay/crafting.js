// Craft integrado: regras puras, feedback de requisitos e transação atômica.
// Estruturas continuam usando commitPlacement, com prévia antes do pagamento.
import {RECIPES,RESOURCES,addResource} from './survival.js';
import {validChestItems} from './storage.js';
import {isStructureRecipe} from './placement.js';
import {TOOL_MAX,makeTool,restoreTool} from './tools.js';
export const CRAFT_BATCH_LIMIT=20;
// Lista validada e deduplicada: um mesmo baú não pode ser contabilizado duas vezes.
export function eligibleCraftChests(chests=[]){
 if(!Array.isArray(chests))return [];
 const seen=new Set(),available=[];
 for(const chest of chests){
   if(!chest?.items||!validChestItems(chest.items)||seen.has(chest.items))continue;
   seen.add(chest.items);available.push(chest);
 }
 return available;
}
export function materialStock(state,key,chests=[]){
 if(!Object.hasOwn(RESOURCES,key))return 0;
 return (state?.inventory?.[key]||0)+eligibleCraftChests(chests).reduce((n,c)=>n+(c.items[key]||0),0);
}
// Reserva transacional reutilizável: mochila primeiro, depois baús próximos.
// O token de reembolso só pode ser usado uma vez e devolve a cada origem.
export function reserveCraftMaterials(state,cost,chests=[]){
 if(!state?.inventory||!cost||typeof cost!=='object'||Array.isArray(cost))
    return {ok:false,reason:'Materiais inválidos'};
 const entries=Object.entries(cost);
 if(!entries.length||entries.some(([id,n])=>!Object.hasOwn(RESOURCES,id)||!Number.isInteger(n)||n<=0))
    return {ok:false,reason:'Custo inválido'};
 const supplies=[{items:state.inventory,fromChest:false},
   ...eligibleCraftChests(chests).filter(c=>c.items!==state.inventory)
    .map(c=>({items:c.items,fromChest:true}))];
 const allocations=[];
 for(const [key,needed] of entries){
   let remaining=needed;
   for(const source of supplies){
     const available=source.items[key]||0;
     if(!Number.isInteger(available)||available<0) return {ok:false,reason:'Estoque inválido'};
     const used=Math.min(available,remaining);
     if(used>0){allocations.push({items:source.items,key,used,fromChest:source.fromChest});remaining-=used;}
     if(!remaining)break;
   }
   if(remaining)return {ok:false,reason:'Materiais insuficientes'};
 }
 for(const a of allocations)a.items[a.key]-=a.used;
 let refunded=false;
 return {ok:true,fromChests:allocations.some(a=>a.fromChest),
   refund(){
     if(refunded)return false;
     for(const a of allocations)a.items[a.key]+=a.used;
     refunded=true;return true;
   }
 };
}

const COOKING=new Set(['cooked','grilledFish','stew']);
const REPAIRS={repairHammer:'hammer',repairSpear:'spear',repairPickaxe:'pickaxe'};
const UPGRADES={ironSpear:'spear',ironHammer:'hammer',reinforcedGrip:'spear'};
export const CRAFT_STATIONS=Object.freeze({
  pickaxe:'workbench',ironSpear:'workbench',ironHammer:'workbench',reinforcedGrip:'workbench',
  repairHammer:'workbench',repairSpear:'workbench',repairPickaxe:'workbench',
  cooked:'campfire',grilledFish:'campfire',stew:'campfire'
});
export function craftCategory(id){
 if(isStructureRecipe(id))return 'build';
 if(COOKING.has(id))return 'food';
 if(Object.hasOwn(REPAIRS,id)||Object.hasOwn(UPGRADES,id))return 'upgrade';
 if(id==='bandage')return 'healing';
 return 'gear';
}
export function batchable(id){return COOKING.has(id)||id==='bandage';}
function requirement(state,id){
 const c=state?.crafted||{},dur=state?.durability||{};
 if(['hammer','spear','pickaxe','fishingRod'].includes(id)&&c[id])return 'Equipamento já fabricado';
 if(id==='spear'&&!c.hammer)return 'Fabrique primeiro a marreta';
 if(id==='ironSpear'&&!c.spear)return 'Fabrique primeiro a lança';
 if(id==='ironHammer'&&!c.hammer)return 'Fabrique primeiro a marreta';
 if(id==='reinforcedGrip'&&(!c.hammer||!c.spear))return 'Fabrique marreta e lança primeiro';
 if(Object.hasOwn(UPGRADES,id)&&c[id])return 'Melhoria já instalada';
 if(Object.hasOwn(REPAIRS,id)){
  const tool=REPAIRS[id];
  if(!c[tool])return 'Ferramenta ainda não fabricada';
  if(dur[tool]>=TOOL_MAX[tool])return 'Durabilidade já está no máximo';
 }
 return '';
}
export function craftAvailability(state,id,{cost=RECIPES[id]?.cost,workbench=false,campfire=false,yieldCount=1,chests=[]}={}){
 const recipe=RECIPES[id];
 if(!recipe||!state?.inventory||!cost)return {ok:false,reason:'Receita inexistente',maxBatch:0,missing:[]};
 const station=CRAFT_STATIONS[id]||'hand';
 const cap=batchable(id)?CRAFT_BATCH_LIMIT:1;
 const missing=Object.entries(cost).filter(([resource,num])=>
    !Object.hasOwn(RESOURCES,resource)||!Number.isInteger(num)||num<1||materialStock(state,resource,chests)<num)
   .map(([resource,num])=>({resource,need:num,have:materialStock(state,resource,chests)}));
 const blocked=requirement(state,id);
 const stationBlocked=station==='workbench'&&!workbench?'Aproxime-se de uma bancada':
    station==='campfire'&&!campfire?'Aproxime-se de uma fogueira':'';
 let max=cap;
 for(const [resource,amount] of Object.entries(cost)){
   if(!Number.isInteger(amount)||amount<1){max=0;break;}
   max=Math.min(max,Math.floor(materialStock(state,resource,chests)/amount));
 }
 if(batchable(id)){
   const resultId=id,per=Math.max(1,Math.floor(yieldCount));
   max=Math.min(max,Math.floor((999-(state.inventory[resultId]||0))/per));
 }
 const reason=blocked||stationBlocked||(max===0?
    missing.length?'Materiais insuficientes':'Mochila cheia':'');
 return {ok:!reason,maxBatch:reason?0:max,missing,reason,station,cost,category:craftCategory(id),
  fromChests:eligibleCraftChests(chests).some(c=>Object.keys(cost).some(key=>(c.items[key]||0)>0))};
}
export function craftItem(state,id,quantity=1,options={}){
 if(isStructureRecipe(id))return {ok:false,reason:'Construções exigem posicionamento'};
 if(!Number.isInteger(quantity)||quantity<1||quantity>CRAFT_BATCH_LIMIT)
  return {ok:false,reason:'Quantidade inválida'};
 const status=craftAvailability(state,id,options);
 if(!status.ok)return {ok:false,reason:status.reason,missing:status.missing};
 if(quantity>status.maxBatch)return {ok:false,reason:'Sem materiais ou espaço para essa quantidade'};
 if(!batchable(id)&&quantity!==1)return {ok:false,reason:'Equipamentos são fabricados uma vez'};
 const cost=Object.fromEntries(Object.entries(status.cost).map(([k,v])=>[k,v*quantity]));
 const reserved=reserveCraftMaterials(state,cost,options.chests||[]);
 if(!reserved.ok)return {ok:false,reason:reserved.reason};
 let produced=quantity;
 try{
   if(id==='fishingRod')state.crafted.fishingRod=true;
   else if(['hammer','spear','pickaxe'].includes(id))makeTool(state,id);
   else if(Object.hasOwn(UPGRADES,id))state.crafted[id]=true;
   else if(Object.hasOwn(REPAIRS,id))restoreTool(state,REPAIRS[id]);
   else if(batchable(id)){
     produced=quantity*Math.max(1,Math.floor(options.yieldCount||1));
     if(!addResource(state,id,produced))throw Error('Não foi possível adicionar o resultado');
   }
 }catch(_){
   reserved.refund();
   return {ok:false,reason:'Falha ao produzir; materiais devolvidos'};
 }
 return {ok:true,produced,recipe:id,quantity,fromChests:reserved.fromChests};
}
export function missingCostLabel(missing,resources){
 return missing.map(({resource,need,have})=>
  (resources[resource]?.icon||'▪')+' '+have+'/'+need).join(' · ');
}
