import {RESOURCES,RECIPES,cycleClock,isNight} from '../gameplay/survival.js';
import {isStructureRecipe} from '../gameplay/placement.js';
import {craftCategory,batchable,missingCostLabel} from '../gameplay/crafting.js';

const CATEGORY_OPTIONS=[['all','Todas'],['build','Construções'],['gear','Equipamentos'],
 ['upgrade','Melhorias e reparos'],['food','Culinária'],['healing','Saúde']];
export function createSurvivalUI({getState,onCraft,onConsume,onClose,onRotate,onDismantle,onRepair,onFish=()=>{},getRotation,
  getCanCraft=()=>true,getRecipeCost=id=>RECIPES[id]?.cost,getCraftStatus=null}){
 const el=id=>document.getElementById(id);
 const panel=el('inventory-panel'),inventory=el('inventory-items'),recipes=el('recipe-list');
 let visible=false,category='all',query='',batchMode='1';
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
 for(const [value,label] of [['1','1 unidade'],['5','5 unidades'],['max','Máximo']]){
  const opt=document.createElement('option');opt.value=value;opt.textContent=label;quantity.appendChild(opt);
 }
 const countInfo=make(recipes,'craft-count');
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
  const state=getState(),cost=getRecipeCost(id)||RECIPES[id].cost;
  const fallback={ok:!!getCanCraft(id),reason:'Precisa desbloquear ou aproximar-se da estação',maxBatch:1,missing:[]};
  return getCraftStatus?getCraftStatus(id,cost):fallback;
 }
 search.addEventListener('input',()=>{query=search.value.toLocaleLowerCase('pt-BR').trim();update(true);});
 filter.addEventListener('change',()=>{category=filter.value;update(true);});
 quantity.addEventListener('change',()=>{batchMode=quantity.value;update(true);});
 for(const key of ['berries','water','cooked','vegetables','grilledFish','stew','bandage']){
   const button=el('use-'+key);if(button)button.addEventListener('click',()=>{onConsume(key);update(true);});
 }
 el('fish-now').onclick=()=>{onFish();update(true);};
 el('inventory-close').onclick=onClose;
 el('rotate-build').onclick=()=>{onRotate();update(true);};
 el('remove-build').onclick=()=>{onDismantle();update(true);};
 el('repair-build').onclick=()=>{onRepair();update(true);};
 function update(forcePanel=false){
  const state=getState();
  for(const key of ['hunger','thirst','stamina','warmth']){
    el(key+'-bar').style.width=state[key].toFixed(1)+'%';
    el(key+'-value').textContent=String(Math.round(state[key]));
  }
  el('clock-display').textContent='Dia '+state.days+' · '+cycleClock(state)+' · '+(isNight(state)?'🌙 Noite':'☀️ Dia');
  el('tool-status').textContent='⛏ Picareta '+state.durability.pickaxe+'/80 · 🔨 '+state.durability.hammer+
    '/100 · 🗡 '+state.durability.spear+'/90'+(state.crafted.ironSpear?' · Lança de ferro':'')+
    (state.crafted.ironHammer?' · Marreta de ferro':'')+(state.crafted.reinforcedGrip?' · Empunhadura reforçada':'');
  el('survival-goal').textContent='Fogueiras '+state.firesBuilt+' · Abrigos '+state.sheltersBuilt+' · Sobreviveu '+state.days+' '+(state.days===1?'dia':'dias');
  el('survival-hint').textContent=state.thirst<20?'⚠ Procure água':state.hunger<20?'⚠ Precisa comer':
   state.warmth<25?'❄ Precisa de abrigo/fogo':state.stamina<15?'⚡ Descanse um pouco':
   'F: coletar · I: mochila · B: fogueira';
  if(!visible&&!forcePanel)return;
  el('rotation-indicator').textContent='Rotação adicional: '+getRotation()+'°';
  for(const key of Object.keys(RESOURCES))buttons['resource-'+key].textContent=String(state.inventory[key]||0);
  let shown=0;
  for(const [id,recipe] of Object.entries(RECIPES)){
    const c=recipeCards[id],cost=getRecipeCost(id)||recipe.cost,available=getStatus(id);
    const text=(recipe.label+' '+recipe.hint+' '+Object.keys(cost).map(k=>RESOURCES[k]?.label||k).join(' ')).toLocaleLowerCase('pt-BR');
    const match=(category==='all'||category===c.categoryId)&&(!query||text.includes(query));
    c.item.hidden=!match;if(match)shown++;
    const count=isStructureRecipe(id)||!batchable(id)?1:batchMode==='max'?available.maxBatch:Number(batchMode);
    c.heading.textContent=(isStructureRecipe(id)?'🧱 Posicionar ':'⚒ Fabricar ')+recipe.label+
     (batchable(id)&&count>1?' ×'+count:'');
    c.costs.textContent=Object.entries(cost).map(([k,v])=>RESOURCES[k].icon+(v*(batchable(id)?Math.max(1,count):1))).join('  ');
    c.info.textContent=recipe.hint;
    c.status.textContent=available.reason?
      (available.missing?.length?missingCostLabel(available.missing,RESOURCES)+' · ':'')+available.reason:
      isStructureRecipe(id)?'Prévia gratuita · pagamento na confirmação':
      available.station==='workbench'?'✓ Bancada disponível':
      available.station==='campfire'?'✓ Fogueira próxima':'✓ Pronto para fabricar';
    c.item.disabled=!available.ok||(!isStructureRecipe(id)&&count>available.maxBatch)||count<1;
    c.item.title=available.reason||recipe.hint;
    c.item.classList.toggle('craft-available',!c.item.disabled);
  }
  for(const child of recipes.querySelectorAll('.craft-section')){
    child.hidden=child.querySelectorAll('.craft-card:not([hidden])').length===0;
  }
  countInfo.textContent=shown?shown+' receitas encontradas':'Nenhuma receita corresponde à busca.';
  for(const key of ['berries','water','cooked','vegetables','grilledFish','stew','bandage']){
    const button=el('use-'+key);if(button)button.disabled=(state.inventory[key]||0)<=0;
  }
 }
 function open(){visible=true;panel.classList.remove('hidden');panel.setAttribute('aria-hidden','false');update(true)}
 function close(){visible=false;panel.classList.add('hidden');panel.setAttribute('aria-hidden','true')}
 return {update,open,close,get isOpen(){return visible}};
}
