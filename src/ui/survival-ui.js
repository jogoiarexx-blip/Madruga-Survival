import {RESOURCES,RECIPES,cycleClock,isNight} from '../gameplay/survival.js?v=2.6.0-crafting';
import {isStructureRecipe} from '../gameplay/placement.js';
import {craftCategory,batchable,missingCostLabel,craftBatchPreview} from '../gameplay/crafting.js?v=2.6.0-crafting';

const CATEGORY_OPTIONS=[['all','Todas'],['build','Construções'],['gear','Equipamentos'],
 ['upgrade','Melhorias e reparos'],['food','Culinária'],['healing','Saúde']];
export function createSurvivalUI({getState,onCraft,onConsume,onClose,onRotate,onDismantle,onRepair,onRepairKit=()=>{},onFish=()=>{},getRotation,
  getCanCraft=()=>true,getRecipeCost=id=>RECIPES[id]?.cost,getCraftStatus=null}){
 const el=id=>document.getElementById(id);
 const panel=el('inventory-panel'),inventory=el('inventory-items'),recipes=el('recipe-list');
 let visible=false,category='all',query='',batchMode='1',readyOnly=false;
 const buttons={},recipeCards={};
 const make=(parent,className,tag='div')=>{
  const n=document.createElement(tag);n.className=className;parent.appendChild(n);return n;};
 for(const [key,{label,icon}] of Object.entries(RESOURCES)){
   const item=make(inventory,'inventory-item');item.dataset.resource=key;
   make(item,'resource-name').textContent=icon+' '+label;
   buttons['resource-'+key]=make(item,'resource-count');
 }
 const toolbar=make(recipes,'craft-toolbar');
 const search=make(toolbar,'craft-search','input');
 search.type='search';search.placeholder='Buscar receita ou material…';search.setAttribute('aria-label','Buscar receita');
 const filter=make(toolbar,'craft-filter','select');
 filter.setAttribute('aria-label','Categoria das receitas');
 for(const [value,label] of CATEGORY_OPTIONS){
  const opt=document.createElement('option');opt.value=value;opt.textContent=label;filter.appendChild(opt);
 }
 const quantity=make(toolbar,'craft-quantity','select');quantity.setAttribute('aria-label','Quantidade para fabricar');
 for(const [value,label] of [['1','1 unidade'],['5','5 unidades'],['10','10 unidades'],['max','Máximo']]){
  const opt=document.createElement('option');opt.value=value;opt.textContent=label;quantity.appendChild(opt);
 }
 const readyFilter=make(toolbar,'craft-ready-filter','label');
 const readyCheckbox=make(readyFilter,'craft-ready-checkbox','input');readyCheckbox.type='checkbox';
 make(readyFilter,'craft-ready-label','span').textContent='Só possíveis';
 const countInfo=make(recipes,'craft-count');
 const stockInfo=make(recipes,'craft-count');stockInfo.classList.add('craft-stock-info');
 const categories=[
  ['build','🧱 Construção com prévia 3D'],
  ['gear','⚒ Ferramentas e equipamentos'],
  ['upgrade','🛠 Melhorias e reparos'],
  ['food','🍲 Cozinha na fogueira'],
  ['healing','🩹 Primeiros socorros']
 ];
 const groups={};
 for(const [id,label] of categories){
   const section=make(recipes,'craft-section');section.dataset.category=id;
   make(section,'recipe-section-label','h4').textContent=label;
   groups[id]=make(section,'craft-grid');
 }
 for(const [id,recipe] of Object.entries(RECIPES)){
   const categoryId=craftCategory(id),item=make(groups[categoryId],'craft-card','button');
   item.type='button';item.classList.add('recipe-btn');
   const heading=make(item,'recipe-title');
   const costs=make(item,'recipe-cost');
   const info=make(item,'recipe-detail');
   const status=make(item,'craft-requirements');
   item.addEventListener('click',()=>{
      const q=isStructureRecipe(id)||!batchable(id)?1:batchMode==='max'?
        Math.min(20,getStatus(id).maxBatch):Number(batchMode);
      if(q>=1)onCraft(id,q);update(true);
   });
   recipeCards[id]={item,heading,costs,info,status,categoryId};
 }
 function getStatus(id){
  const state=getState(),key=id,cost=getRecipeCost(key)||RECIPES[key].cost;
  const fallback={ok:!!getCanCraft(id),reason:'Precisa desbloquear ou aproximar-se da estação',maxBatch:1,missing:[]};
  return getCraftStatus?getCraftStatus(id,cost):fallback;
 }
 search.addEventListener('input',()=>{query=search.value.toLocaleLowerCase('pt-BR').trim();update(true);});
 filter.addEventListener('change',()=>{category=filter.value;update(true);});
 quantity.addEventListener('change',()=>{batchMode=quantity.value;update(true);});
 readyCheckbox.addEventListener('change',()=>{readyOnly=readyCheckbox.checked;update(true);});
 for(const key of ['berries','water','cooked','vegetables','grilledFish','stew','bandage','medicalKit','silkDressing']){
   const button=el('use-'+key);if(button)button.addEventListener('click',()=>{onConsume(key);update(true);});
 }
 el('fish-now').onclick=()=>{onFish();update(true);};
 el('inventory-close').onclick=onClose;
 el('rotate-build').onclick=()=>{onRotate();update(true);};
 el('remove-build').onclick=()=>{onDismantle();update(true);};
 el('repair-build').onclick=()=>{onRepair();update(true);};
 el('repair-kit-build').onclick=()=>{onRepairKit();update(true);};
 function update(forcePanel=false){
  const state=getState();
  for(const key of ['hunger','thirst','stamina','warmth']){
    el(key+'-bar').style.width=state[key].toFixed(1)+'%';
    el(key+'-value').textContent=String(Math.round(state[key]));
  }
  el('clock-display').textContent='Dia '+state.days+' · '+cycleClock(state)+' · '+(isNight(state)?'🌙 Noite':'☀️ Dia');
  el('tool-status').textContent='⛏ Picareta '+state.durability.pickaxe+'/80 · 🔨 '+state.durability.hammer+
    '/100 · 🗡 '+state.durability.spear+'/90'+(state.crafted.ironSpear?' · Lança de ferro':'')+
    (state.crafted.ironHammer?' · Marreta de ferro':'')+(state.crafted.reinforcedGrip?' · Empunhadura reforçada':'')+
    (state.crafted.spikedHammer?' · Marreta cravada':'')+(state.crafted.hardenedSpear?' · Lança temperada':'')+
    (state.crafted.crystalSpear?' · Ponta de cristal':'')+
    (state.crafted.armoredBroom?' · Vassoura reforçada':'')+
    (state.crafted.reinforcedVest?' · Colete equipado':'')+(state.crafted.chitinPadding?' · Reforço de quitina':'')+(state.crafted.trailBoots?' · Botas equipadas':'');
  el('survival-goal').textContent='Fogueiras '+state.firesBuilt+' · Abrigos '+state.sheltersBuilt+' · Sobreviveu '+state.days+' '+(state.days===1?'dia':'dias');
  el('survival-hint').textContent=state.thirst<20?'⚠ Procure água':state.hunger<20?'⚠ Precisa comer':
   state.warmth<25?'❄ Precisa de abrigo/fogo':state.stamina<15?'⚡ Descanse um pouco':
   'F: coletar · I: mochila · B: fogueira';
  if(!visible&&!forcePanel)return;
  el('rotation-indicator').textContent='Rotação adicional: '+getRotation()+'°';
  for(const key of Object.keys(RESOURCES))buttons['resource-'+key].textContent=String(state.inventory[key]||0);
  let shown=0,ready=0;
  for(const [id,recipe] of Object.entries(RECIPES)){
    const c=recipeCards[id],cost=getRecipeCost(id)||recipe.cost,available=getStatus(id);
    const isBuild=isStructureRecipe(id),single=isBuild||!batchable(id);
    const rawCount=single?1:batchMode==='max'?available.maxBatch:Number(batchMode);
    const count=rawCount>0?rawCount:1;
    const preview=craftBatchPreview(state,id,count,{status:available});
    const canMake=!!preview.ok&&(!isBuild||available.ok);
    if(canMake)ready++;
    const text=(recipe.label+' '+recipe.hint+' '+Object.keys(cost).map(k=>RESOURCES[k]?.label||k).join(' ')).toLocaleLowerCase('pt-BR');
    const match=(category==='all'||category===c.categoryId)&&(!query||text.includes(query))&&(!readyOnly||canMake);
    c.item.hidden=!match;if(match)shown++;
    c.heading.textContent=(isBuild?'🧱 Posicionar ':'⚒ Fabricar ')+recipe.label+
      (!single&&count>1?' ×'+count:'');
    c.costs.textContent=Object.entries(preview.cost).map(([k,v])=>{
      const have=available.stock?.[k]??state.inventory[k]??0;
      return (RESOURCES[k]?.icon||'▪')+' '+have+'/'+v;
    }).join('  ');
    c.info.textContent=recipe.hint+(!single?' · Produz '+preview.produced+' un.':'');
    c.status.textContent=available.reason?
      (preview.missing.length?missingCostLabel(preview.missing,RESOURCES)+' · ':'')+available.reason:
      !preview.ok?(preview.missing.length?missingCostLabel(preview.missing,RESOURCES)+' · ':'')+preview.reason:
      isBuild?'Prévia gratuita · pagamento ao confirmar':
      available.fromChests?'✓ Mochila + baús próximos':
      available.station==='workbench'?'✓ Bancada disponível':
      available.station==='campfire'?'✓ Fogueira próxima':'✓ Pronto para fabricar';
    c.item.disabled=!canMake;
    c.item.title=preview.reason||recipe.hint;
    c.item.classList.toggle('craft-available',canMake);
  }
  for(const child of recipes.querySelectorAll('.craft-section')){
    child.hidden=child.querySelectorAll('.craft-card:not([hidden])').length===0;
  }
  countInfo.textContent=shown+' receitas exibidas · '+ready+' fabricáveis com a quantidade selecionada';
  stockInfo.textContent='💡 Quantidades exibidas: disponível (mochila + baús próximos) / necessário. '+'O craft não retira itens dos baús distantes.';
  for(const key of ['berries','water','cooked','vegetables','grilledFish','stew','bandage','medicalKit','silkDressing']){
    const button=el('use-'+key);if(button)button.disabled=(state.inventory[key]||0)<=0;
  }
 }
 function open(){visible=true;panel.classList.remove('hidden');panel.setAttribute('aria-hidden','false');update(true)}
 function close(){visible=false;panel.classList.add('hidden');panel.setAttribute('aria-hidden','true')}
 return {update,open,close,get isOpen(){return visible}};
}
