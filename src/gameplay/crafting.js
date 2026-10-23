// Craft integrado: regras puras, feedback de requisitos e transação atômica.
// Estruturas continuam usando commitPlacement, com prévia antes do pagamento.
import {RECIPES,canAfford,spendRecipe,addResource} from './survival.js';
import {isStructureRecipe} from './placement.js';
import {TOOL_MAX,makeTool,restoreTool} from './tools.js';
export const CRAFT_BATCH_LIMIT=20;
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
export function craftAvailability(state,id,{cost=RECIPES[id]?.cost,workbench=false,campfire=false,yieldCount=1}={}){
 const recipe=RECIPES[id];
 if(!recipe||!state?.inventory||!cost)return {ok:false,reason:'Receita inexistente',maxBatch:0,missing:[]};
 const station=CRAFT_STATIONS[id]||'hand';
 const cap=batchable(id)?CRAFT_BATCH_LIMIT:1;
 const missing=Object.entries(cost).filter(([resource,num])=>
    !Number.isInteger(num)||num<1||(state.inventory[resource]||0)<num)
   .map(([resource,num])=>({resource,need:num,have:state.inventory[resource]||0}));
 const blocked=requirement(state,id);
 const stationBlocked=station==='workbench'&&!workbench?'Aproxime-se de uma bancada':
    station==='campfire'&&!campfire?'Aproxime-se de uma fogueira':'';
 let max=cap;
 for(const [resource,amount] of Object.entries(cost)){
   if(!Number.isInteger(amount)||amount<1){max=0;break;}
   max=Math.min(max,Math.floor((state.inventory[resource]||0)/amount));
 }
 if(batchable(id)){
   const resultId=id,per=Math.max(1,Math.floor(yieldCount));
   max=Math.min(max,Math.floor((999-(state.inventory[resultId]||0))/per));
 }
 const reason=blocked||stationBlocked||(max===0?
    missing.length?'Materiais insuficientes':'Mochila cheia':'');
 return {ok:!reason,maxBatch:reason?0:max,missing,reason,station,cost,category:craftCategory(id)};
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
 if(!canAfford(state,id,cost)||!spendRecipe(state,id,cost))
  return {ok:false,reason:'Materiais mudaram durante a fabricação'};
 let produced=quantity;
 if(id==='fishingRod')state.crafted.fishingRod=true;
 else if(['hammer','spear','pickaxe'].includes(id))makeTool(state,id);
 else if(Object.hasOwn(UPGRADES,id))state.crafted[id]=true;
 else if(Object.hasOwn(REPAIRS,id))restoreTool(state,REPAIRS[id]);
 else if(batchable(id)){
  produced=quantity*Math.max(1,Math.floor(options.yieldCount||1));
  addResource(state,id,produced);
 }
 return {ok:true,produced,recipe:id,quantity};
}
export function missingCostLabel(missing,resources){
 return missing.map(({resource,need,have})=>
  (resources[resource]?.icon||'▪')+' '+have+'/'+need).join(' · ');
}
