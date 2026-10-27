import {RESOURCES,RECIPES,cycleClock,isNight} from '../gameplay/survival.js?v=2.6.0-crafting';
import {isStructureRecipe} from '../gameplay/placement.js';
import {craftCategory,batchable,missingCostLabel,craftBatchPreview,CRAFT_STATIONS} from '../gameplay/crafting.js?v=2.6.0-crafting';
import {INVENTORY_SECTIONS,INVENTORY_DRAG_TYPE,canPlaceOnHotbar,inventoryMatches} from '../gameplay/inventory-ui-logic.js';
import {BAG_SIZE} from '../gameplay/inventory-slots.js';

const CATEGORY_OPTIONS=[['all','Todas'],['build','Construções'],['gear','Equipamentos'],
 ['upgrade','Melhorias e reparos'],['food','Culinária'],['healing','Saúde']];
const INVENTORY_GROUPS=[
  ['basics','🌿 Básicos',INVENTORY_SECTIONS.basics],
  ['food','🍖 Comida e pesca',INVENTORY_SECTIONS.food],
  ['craft','⚒ Materiais de craft',INVENTORY_SECTIONS.craft],
  ['support','🩹 Suporte e cura',INVENTORY_SECTIONS.support]
];

export function createSurvivalUI({getState,onCraft,onConsume,onClose,onRotate,onDismantle,onRepair,onRepairKit=()=>{},onFish=()=>{},getRotation,
  getCanCraft=()=>true,getRecipeCost=id=>RECIPES[id]?.cost,getCraftStatus=null,
  getSelectedItem=()=>null,onSelectItem=()=>{},onQuickAssign=()=>false,
  getBag=()=>[],onBagMove=()=>false,onBagSort=()=>false,
  getNearbyChest=()=>null,onBagStore=()=>false,onChestTake=()=>false,onToggleGear=()=>false}){
 const el=id=>document.getElementById(id);
 const panel=el('inventory-panel'),inventory=el('inventory-items'),recipes=el('recipe-list');
 let visible=false,category='all',query='',batchMode='1',readyOnly=false,inventoryFilter='all',inventoryQuery='';
 let selectedBagIndex=null,splitMode=false;
 const recipeCards={},slotCards=[];
 const inventoryTabs=el('inventory-category-tabs'),inventorySearch=el('inventory-search'),inventoryMessage=el('inventory-selection-help');
 const equipmentFields={
   weapon:el('equipment-main-value'),
   armor:el('equipment-armor-value'),
   support:el('equipment-support-value'),
   hotbar:el('equipment-hotbar-value')
 };
 const make=(parent,className,tag='div')=>{
  const n=document.createElement(tag);n.className=className;parent.appendChild(n);return n;};
 
 for(const id of ['vest','padding','boots']){
   const node=el('equipment-slot-'+id);
   if(node){node.setAttribute('role','button');node.tabIndex=0;
     const change=()=>{if(onToggleGear(id))update(true);};
     node.addEventListener('click',change);node.addEventListener('keydown',e=>{if(e.code==='Enter'||e.code==='Space'){e.preventDefault();change();}});
   }
 }
 const splitToggle=el('inventory-split-toggle'),sortButton=el('inventory-sort');
 const actionControls=el('inventory-bag-actions');
 const qtyLabel=make(actionControls,'inventory-quantity-label','label');
 qtyLabel.setAttribute('for','inventory-stack-quantity');qtyLabel.textContent='Quantidade';
 const stackQuantity=make(qtyLabel,'inventory-stack-quantity','input');
 stackQuantity.type='number';stackQuantity.id='inventory-stack-quantity';
 stackQuantity.min='1';stackQuantity.max='80';stackQuantity.step='1';stackQuantity.value='1';stackQuantity.inputMode='numeric';
 const halfButton=make(actionControls,'inventory-half-button','button');
 halfButton.type='button';halfButton.textContent='½ Metade';
 const fullButton=make(actionControls,'inventory-full-button','button');
 fullButton.type='button';fullButton.textContent='Tudo';
 function selectedStack(){return selectedBagIndex===null?null:getBag()[selectedBagIndex]||null;}
 function setAmount(n){stackQuantity.value=String(Math.max(1,Math.min(999,Math.floor(n)||1)));}
 function amount(){const n=Number(stackQuantity.value);return Number.isSafeInteger(n)&&n>0?n:0;}
 halfButton.addEventListener('click',()=>{if(selectedStack())setAmount(Math.floor(selectedStack().count/2));});
 fullButton.addEventListener('click',()=>{if(selectedStack())setAmount(selectedStack().count);});
 const chestPane=el('inventory-nearby-chest'),chestState=el('inventory-chest-status');
 const chestStore=el('inventory-store-selected'),chestTake=el('inventory-chest-take');
 const chestResource=el('inventory-chest-resource');
 for(const [key,info] of Object.entries(RESOURCES)){
   const option=make(chestResource,'','option');option.value=key;option.textContent=`${info.icon} ${info.label}`;
 }
 const storeSelected=()=>{
   if(selectedBagIndex===null||!amount())return;
   if(onBagStore(selectedBagIndex,amount())){
     selectedBagIndex=null;onSelectItem(null);update(true);
   }else{inventoryMessage.textContent='Não foi possível guardar: confira a quantidade, os itens e a capacidade do baú.';}
 };
 chestStore.addEventListener('click',storeSelected);
 chestTake.addEventListener('click',()=>{
   if(!amount())return;
   if(onChestTake(chestResource.value,amount()))update(true);
   else inventoryMessage.textContent='Não foi possível retirar: confira o estoque, a quantidade e o espaço da mochila.';
 });
 chestPane.addEventListener('dragover',e=>{
   if([...(e.dataTransfer?.types||[])].includes('application/x-madruga-bag-slot')){
     e.preventDefault();chestPane.classList.add('drop-ready');
   }
 });
 chestPane.addEventListener('dragleave',()=>chestPane.classList.remove('drop-ready'));
 chestPane.addEventListener('drop',e=>{
   e.preventDefault();chestPane.classList.remove('drop-ready');
   const value=e.dataTransfer?.getData('application/x-madruga-bag-slot');
   if(typeof value!=='string'||!/^(?:[0-9]|[12][0-9]|3[0-5])$/.test(value))return;
   selectedBagIndex=Number(value);storeSelected();
 });
 const dragSlotType='application/x-madruga-bag-slot';
 const grid=make(inventory,'inventory-grid inventory-backpack-grid');
 for(let index=0;index<BAG_SIZE;index++){
   const item=make(grid,'inventory-slot-card','button');
   item.type='button';item.dataset.index=String(index);item.draggable=true;
   item.setAttribute('aria-label',`Slot ${index+1} vazio`);
   const top=make(item,'inventory-slot-top');
   const icon=make(top,'inventory-slot-icon','span');
   const count=make(top,'inventory-slot-count resource-count','span');
   const name=make(item,'inventory-slot-name resource-name','span');
   slotCards.push({item,icon,count,name});
   item.addEventListener('click',()=>{
     const slots=getBag(),stack=slots[index];
     if(selectedBagIndex!==null&&selectedBagIndex!==index){
       if(onBagMove(selectedBagIndex,index,splitMode?'split':'move',splitMode?amount():undefined)){
         selectedBagIndex=null;onSelectItem(null);
       }else if(stack){selectedBagIndex=index;onSelectItem(stack.item);setAmount(stack.count>1?Math.floor(stack.count/2):1);}
     }else if(stack){
       selectedBagIndex=index;onSelectItem(stack.item);setAmount(stack.count>1?Math.floor(stack.count/2):1);
     }else selectedBagIndex=null;
     update(true);
   });
   item.addEventListener('dblclick',()=>{
     const stack=getBag()[index];
     if(stack&&canPlaceOnHotbar(stack.item)){onQuickAssign(stack.item);selectedBagIndex=null;update(true);}
   });
   item.addEventListener('dragstart',e=>{
     const stack=getBag()[index];if(!stack){e.preventDefault();return;}
     selectedBagIndex=index;onSelectItem(stack.item);
     if(e.dataTransfer){
       e.dataTransfer.setData(dragSlotType,String(index));
       if(canPlaceOnHotbar(stack.item)){
         e.dataTransfer.setData(INVENTORY_DRAG_TYPE,stack.item);
         e.dataTransfer.setData('text/plain',stack.item);
       }
       e.dataTransfer.effectAllowed='copyMove';
     }
     item.classList.add('inventory-dragging');update(true);
   });
   item.addEventListener('dragend',()=>item.classList.remove('inventory-dragging'));
   item.addEventListener('dragover',e=>{
     if([...(e.dataTransfer?.types||[])].includes(dragSlotType)){
       e.preventDefault();item.classList.add('drop-ready');
     }
   });
   item.addEventListener('dragleave',()=>item.classList.remove('drop-ready'));
   item.addEventListener('drop',e=>{
     e.preventDefault();item.classList.remove('drop-ready');
     const raw=e.dataTransfer?.getData(dragSlotType);
     if(typeof raw!=='string'||!/^(?:[0-9]|[12][0-9]|3[0-5])$/.test(raw))return;
     const from=Number(raw);
     if(onBagMove(from,index,splitMode?'split':'move',splitMode?amount():undefined)){selectedBagIndex=null;onSelectItem(null);}
     update(true);
   });
 }
 splitToggle.addEventListener('click',()=>{splitMode=!splitMode;splitToggle.textContent=splitMode?'✓ Mover quantidade':'✂ Mover quantidade';update(true);});
 sortButton.addEventListener('click',()=>{
   if(onBagSort()){selectedBagIndex=null;onSelectItem(null);update(true);}
 });

 const filterButtons={};
 for(const [key,text] of [['all','Todos'],['basics','Básicos'],['food','Comida'],['craft','Materiais'],['support','Cura']]){
   const btn=make(inventoryTabs,'inventory-filter-tab','button');btn.type='button';btn.textContent=text;
   btn.dataset.category=key;btn.setAttribute('aria-pressed',String(key==='all'));
   btn.addEventListener('click',()=>{inventoryFilter=key;update(true);});filterButtons[key]=btn;
 }
 inventorySearch.addEventListener('input',()=>{inventoryQuery=inventorySearch.value;update(true);});
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
   if(CRAFT_STATIONS[id]==='workbench')continue; // Exclusivos da bancada, nunca fabricados diretamente na mochila.
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
 function equippedWeaponLabel(state){
  const items=[];
  if(state.crafted.crystalSpear)items.push('Lança de cristal');
  else if(state.crafted.hardenedSpear)items.push('Lança temperada');
  else if(state.crafted.ironSpear)items.push('Lança de ferro');
  else if(state.crafted.spear)items.push('Lança');
  if(state.crafted.spikedHammer)items.push('Marreta cravada');
  else if(state.crafted.ironHammer)items.push('Marreta de ferro');
  else if(state.crafted.hammer)items.push('Marreta');
  if(state.crafted.armoredBroom)items.push('Vassoura reforçada');
  return items.length?items.join(' · '):'Cabo de vassoura';
 }
 function equippedArmorLabel(state){
  const armor=[];
  if(state.equippedGear?.vest)armor.push('Colete');
  if(state.equippedGear?.padding)armor.push('Quitina');
  return armor.length?armor.join(' + '):'Sem armadura';
 }
 function supportLabel(state){
  const support=[];
  if(state.equippedGear?.boots)support.push('Botas');
  if(state.crafted.fishingRod)support.push('Vara');
  if(state.crafted.pickaxe)support.push('Picareta');
  return support.length?support.join(' · '):'Sem utilidades';
 }
 function configuredConsumables(state){
  const keys=['berries','water','cooked','vegetables','grilledFish','stew','bandage','medicalKit','silkDressing'];
  return keys.filter(k=>(state.inventory[k]||0)>0).slice(0,4).map(k=>RESOURCES[k].icon).join(' ')||'Configure na lateral';
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
  for(const [name,btn] of Object.entries(filterButtons)){
    const active=name===inventoryFilter;
    btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',String(active));
  }
  const bag=getBag();
  const chest=getNearbyChest();
  chestPane.classList.toggle('hidden',!chest);
  if(chest){
    const contents=Object.entries(chest.items).filter(([,n])=>n>0);
    chestState.textContent=`Baú próximo: ${contents.reduce((sum,[,n])=>sum+n,0)}/80 itens · ${contents.length} tipos`;
    const available=[...chestResource.options].find(o=>(chest.items[o.value]||0)>0);
    if(!chest.items[chestResource.value]&&available)chestResource.value=available.value;
    chestTake.disabled=!available;
  }
  chestStore.disabled=!chest||selectedBagIndex===null;
  if(chest){chestTake.disabled=!chest.items[chestResource.value];}
  stackQuantity.max='999'; // baú limita a 80, mochila aceita pilhas de até 999
  splitToggle.setAttribute('aria-pressed',String(splitMode));
  splitToggle.classList.toggle('active',splitMode);
  for(let index=0;index<BAG_SIZE;index++){
    const stack=bag[index],card=slotCards[index];
    if(!card)continue;
    const resource=stack?RESOURCES[stack.item]:null;
    card.icon.textContent=resource?.icon||'';
    card.count.textContent=stack?String(stack.count):'';
    card.name.textContent=resource?.label||'';
    card.item.dataset.resource=stack?.item||'';
    card.item.dataset.consumable=String(Boolean(stack&&canPlaceOnHotbar(stack.item)));
    card.item.classList.toggle('is-empty',!stack);
    card.item.classList.toggle('selected',index===selectedBagIndex);
    card.item.classList.toggle('filtered-out',Boolean(stack&&!inventoryMatches(stack.item,{category:inventoryFilter,query:inventoryQuery})));
    card.item.setAttribute('aria-pressed',String(index===selectedBagIndex));
    const description=stack?`${resource?.label||stack.item} ×${stack.count}`:'vazio';
    card.item.setAttribute('aria-label',`Posição ${index+1}: ${description}`);
    card.item.title=`Posição ${index+1}: ${description}`;
  }
  if(selectedBagIndex!==null&&!bag[selectedBagIndex])selectedBagIndex=null;
  const choice=getSelectedItem();
  inventoryMessage.textContent=selectedBagIndex!==null&&bag[selectedBagIndex]?
    `Posição ${selectedBagIndex+1}: ${RESOURCES[bag[selectedBagIndex].item]?.label} ×${bag[selectedBagIndex].count}. ${splitMode?'Escolha quantos itens mover e toque em outro slot.':'Toque em outra posição para mover, juntar ou trocar.'} Arrastar também funciona.`:
    choice&&canPlaceOnHotbar(choice)?
    `${RESOURCES[choice].icon} ${RESOURCES[choice].label} selecionado — toque no slot 4–9 à direita ou arraste o item até ele.`:
    'Selecione uma pilha e escolha a posição. Ative Mover quantidade para dividir com precisão. Atalhos 4–9 continuam independentes.';
  if(equipmentFields.weapon)equipmentFields.weapon.textContent=equippedWeaponLabel(state);
  if(equipmentFields.armor)equipmentFields.armor.textContent=equippedArmorLabel(state);
  if(equipmentFields.support)equipmentFields.support.textContent=supportLabel(state);
  if(equipmentFields.hotbar)equipmentFields.hotbar.textContent=configuredConsumables(state);
  for(const [id,owned,text] of [
    ['vest',state.crafted.reinforcedVest,'Colete reforçado'],
    ['padding',state.crafted.chitinPadding,'Quitina'],
    ['boots',state.crafted.trailBoots,'Botas de caminhada']]){
    const node=el('equipment-slot-'+id);
    const wearing=owned&&state.equippedGear?.[id]===true;
    if(node){node.classList.toggle('equipped',wearing);node.classList.toggle('available',owned);
      node.setAttribute('aria-disabled',String(!owned));node.setAttribute('aria-pressed',String(wearing));
      node.setAttribute('aria-label',owned?text+(wearing?' vestido; toque para retirar':' guardado; toque para equipar'):text+' não fabricado');}
    const label=el('equipment-status-'+id);if(label)label.textContent=!owned?'Não fabricado':wearing?'✓ Vestido · retirar':'Na mochila · equipar';
  }

  let shown=0,ready=0;
  // A bancada tem receitas próprias e não cria cartões na mochila.
  // Iterar somente os cartões montados evita acessar undefined.item ao abrir
  // a mochila, inclusive durante a atualização do HUD a cada frame.
  for(const [id,c] of Object.entries(recipeCards)){
    const recipe=RECIPES[id];
    if(!recipe)continue;
    const cost=getRecipeCost(id)||recipe.cost,available=getStatus(id);
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
