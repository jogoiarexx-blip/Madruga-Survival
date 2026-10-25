// Craft integrado: regras puras, feedback de requisitos e transação atômica.
// Estruturas continuam usando commitPlacement, com prévia antes do pagamento.
import {RECIPES,RESOURCES,addResource} from './survival.js?v=2.6.0-crafting';
import {validChestItems} from './storage.js';
import {isStructureRecipe} from './placement.js';
import {TOOL_MAX,makeTool,restoreTool} from './tools.js';
export const CRAFT_BATCH_LIMIT=20;
export const CRAFT_STACK_LIMIT=999;
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
 return (state?.inventory?.[key]||0)+eligibleCraftChests(chests).reduce((n,c)=>
   n+(c.items===state?.inventory?0:(c.items[key]||0)),0);
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
const UPGRADES={reinforcedVest:'body',trailBoots:'feet',ironSpear:'spear',ironHammer:'hammer',reinforcedGrip:'spear',spikedHammer:'hammer',hardenedSpear:'spear',armoredBroom:'broom'};
export const CRAFT_STATIONS=Object.freeze({
  pickaxe:'workbench',ironSpear:'workbench',ironHammer:'workbench',reinforcedGrip:'workbench',
  spikedHammer:'workbench',hardenedSpear:'workbench',armoredBroom:'workbench',
  reinforcedVest:'workbench',trailBoots:'workbench',medicalKit:'workbench',repairKit:'workbench',
  repairHammer:'workbench',repairSpear:'workbench',repairPickaxe:'workbench',
  cooked:'campfire',grilledFish:'campfire',stew:'campfire'
});
export function craftCategory(id){
 if(isStructureRecipe(id))return 'build';
 if(COOKING.has(id))return 'food';
 if(Object.hasOwn(REPAIRS,id)||Object.hasOwn(UPGRADES,id))return 'upgrade';
 if(id==='bandage'||id==='medicalKit')return 'healing';
 return 'gear';
}
export function batchable(id){return COOKING.has(id)||['bandage','medicalKit','repairKit'].includes(id);}
function requirement(state,id){
 const c=state?.crafted||{},dur=state?.durability||{};
 if(['hammer','spear','pickaxe','fishingRod'].includes(id)&&c[id])return 'Equipamento já fabricado';
 if(id==='spear'&&!c.hammer)return 'Fabrique primeiro a marreta';
 if(id==='ironSpear'&&!c.spear)return 'Fabrique primeiro a lança';
 if(id==='ironHammer'&&!c.hammer)return 'Fabrique primeiro a marreta';
 if(id==='reinforcedGrip'&&(!c.hammer||!c.spear))return 'Fabrique marreta e lança primeiro';
 if(id==='spikedHammer'&&!c.ironHammer)return 'Instale primeiro a cabeça de ferro da marreta';
 if(id==='hardenedSpear'&&!c.ironSpear)return 'Instale primeiro a ponta de ferro da lança';
 if(Object.hasOwn(UPGRADES,id)&&c[id])return 'Melhoria já instalada';
 if(Object.hasOwn(REPAIRS,id)){
  const tool=REPAIRS[id];
  if(!c[tool])return 'Ferramenta ainda não fabricada';
  if(dur[tool]>=TOOL_MAX[tool])return 'Durabilidade já está no máximo';
 }
 return '';
}
// Prévia pura: serve ao craft e à interface, sem consumir os recursos.
export function craftAvailability(state,id,{cost=RECIPES[id]?.cost,workbench=false,campfire=false,yieldCount=1,chests=[]}={}){
 const recipe=RECIPES[id];
 if(!recipe||!state?.inventory||!cost||typeof cost!=='object'||Array.isArray(cost))
   return {ok:false,reason:'Receita inexistente',maxBatch:0,missing:[]};
 const entries=Object.entries(cost);
 if(!entries.length||entries.some(([id,n])=>!Object.hasOwn(RESOURCES,id)||!Number.isInteger(n)||n<1))
   return {ok:false,reason:'Custo inválido',maxBatch:0,missing:[]};
 const station=CRAFT_STATIONS[id]||'hand';
 const cap=batchable(id)?CRAFT_BATCH_LIMIT:1;
 const stock=Object.fromEntries(entries.map(([key])=>[key,materialStock(state,key,chests)]));
 const missing=entries.filter(([key,num])=>stock[key]<num)
   .map(([resource,need])=>({resource,need,have:stock[resource]}));
 const blocked=requirement(state,id);
 const stationBlocked=station==='workbench'&&!workbench?'Aproxime-se de uma bancada':
    station==='campfire'&&!campfire?'Aproxime-se de uma fogueira':'';
 let max=Math.min(cap,...entries.map(([key,n])=>Math.floor(stock[key]/n)));
 if(batchable(id)){
   const per=Number.isInteger(yieldCount)&&yieldCount>0?yieldCount:1;
   max=Math.min(max,Math.floor((CRAFT_STACK_LIMIT-(state.inventory[id]||0))/per));
 }
 max=Math.max(0,max);
 const reason=blocked||stationBlocked||(max===0?
    missing.length?'Materiais insuficientes':'Mochila cheia':'');
 return {ok:!reason,maxBatch:reason?0:max,missing,reason,station,cost,stock,
  yieldPerCraft:batchable(id)?Math.max(1,Math.floor(yieldCount)||1):1,
  category:craftCategory(id),
  fromChests:eligibleCraftChests(chests).some(c=>entries.some(([key])=>(c.items[key]||0)>0))};
}
// Descreve um lote específico para a UI: custo real, quantidade produzida e faltas.
export function craftBatchPreview(state,id,quantity=1,options={}){
 const status=options.status||craftAvailability(state,id,options);
 const q=Number.isInteger(quantity)&&quantity>0?quantity:1;
 const cost=Object.fromEntries(Object.entries(status.cost||{}).map(([key,num])=>[key,num*q]));
 const missing=Object.entries(cost).filter(([key,num])=>(status.stock?.[key]||0)<num)
  .map(([resource,need])=>({resource,need,have:status.stock?.[resource]||0}));
 const produced=batchable(id)?q*(status.yieldPerCraft||1):1;
 const available=status.ok&&q<=status.maxBatch;
 const reason=status.reason||(available?'':missing.length?'Materiais insuficientes para o lote':
    batchable(id)&&q*(status.yieldPerCraft||1)+(state?.inventory?.[id]||0)>CRAFT_STACK_LIMIT?'Mochila cheia para o lote':'Reduza a quantidade');
 return {...status,ok:available,requested:q,produced,cost,missing,reason};
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
 const beforeCrafted={...state.crafted},beforeDurability={...state.durability};
 const beforeResult=state.inventory[id];
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
   Object.assign(state.crafted,beforeCrafted);
   Object.assign(state.durability,beforeDurability);
   if(beforeResult!==undefined)state.inventory[id]=beforeResult;
   reserved.refund();
   return {ok:false,reason:'Falha ao produzir; materiais devolvidos'};
 }
 return {ok:true,produced,recipe:id,quantity,fromChests:reserved.fromChests};
}
export function missingCostLabel(missing,resources){
 return missing.map(({resource,need,have})=>
  (resources[resource]?.icon||'▪')+' '+have+'/'+need).join(' · ');
}
