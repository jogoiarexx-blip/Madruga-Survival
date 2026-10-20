import {RESOURCES,RECIPES,canAfford,cycleClock,isNight} from '../gameplay/survival.js';
import {isStructureRecipe} from '../gameplay/placement.js';
export function createSurvivalUI({getState,onCraft,onConsume,onClose,onRotate,onDismantle,onRepair,onFish=()=>{},getRotation,getCanCraft=()=>true,getRecipeCost=id=>RECIPES[id]?.cost}) {
  const el=id=>document.getElementById(id);
  const panel=el('inventory-panel'),inventory=el('inventory-items'),recipes=el('recipe-list');
  let visible=false;
  const buttons={};
  const create=(parent,className)=>{const div=document.createElement('div');div.className=className;parent.appendChild(div);return div;};
  for(const [key,{label,icon}] of Object.entries(RESOURCES)) {
    const div=create(inventory,'inventory-item');div.dataset.resource=key;
    const name=create(div,'resource-name');name.textContent=`${icon} ${label}`;
    buttons['resource-'+key]=create(div,'resource-count');
  }
  const buckets=[
    ['🧱 Construções · escolha a posição antes de gastar',id=>isStructureRecipe(id)],
    ['⚒ Ferramentas e equipamentos',id=>!isStructureRecipe(id)&&id!=='ironSpear'&&!['cooked','grilledFish','stew'].includes(id)&&!id.startsWith('repair')],
    ['🍲 Culinária',id=>['cooked','grilledFish','stew'].includes(id)],
    ['🛠 Reparos e melhorias',id=>id.startsWith('repair')||id==='ironSpear']
  ];
  for(const [heading,filter] of buckets){
    const title=document.createElement('h4');title.className='recipe-section-label';title.textContent=heading;recipes.appendChild(title);
    for(const [key] of Object.entries(RECIPES).filter(([id])=>filter(id))){
      const btn=document.createElement('button');btn.className='recipe-btn';btn.type='button';
      const name=document.createElement('span');name.className='recipe-title';btn.appendChild(name);
      const costs=document.createElement('span');costs.className='recipe-cost';btn.appendChild(costs);
      const description=document.createElement('span');description.className='recipe-detail';btn.appendChild(description);
      btn.addEventListener('click',()=>{onCraft(key);update(true);});
      recipes.appendChild(btn);buttons['recipe-'+key]={btn,name,costs,description};
    }
  }
  for(const key of ['berries','water','cooked','vegetables','grilledFish','stew']){
    const btn=el('use-'+key);btn.addEventListener('click',()=>{onConsume(key);update(true);});
  }
  el('fish-now').onclick=()=>{onFish();update(true);};
  el('inventory-close').onclick=()=>onClose();
  el('rotate-build').onclick=()=>{onRotate();update(true);};
  el('remove-build').onclick=()=>{onDismantle();update(true);};
  el('repair-build').onclick=()=>{onRepair();update(true);};
  function update(forcePanel=false){
    const s=getState();
    for(const key of ['hunger','thirst','stamina','warmth']) {
      el(key+'-bar').style.width=`${s[key].toFixed(1)}%`;
      el(key+'-value').textContent=`${Math.round(s[key])}`;
    }
    el('clock-display').textContent=`Dia ${s.days} · ${cycleClock(s)} · ${isNight(s)?'🌙 Noite':'☀️ Dia'}`;
    el('tool-status').textContent=`⛏ Picareta ${s.durability.pickaxe}/80 · 🔨 ${s.durability.hammer}/100 · 🗡 ${s.durability.spear}/90${s.crafted.ironSpear?' · Ferro reforçado':''}`;
    el('survival-goal').textContent=`Fogueiras ${s.firesBuilt} · Abrigos ${s.sheltersBuilt} · Sobreviveu ${s.days} ${s.days===1?'dia':'dias'}`;
    const status=s.thirst<20?'⚠ Procure água':s.hunger<20?'⚠ Precisa comer':s.warmth<25?'❄ Precisa de abrigo/fogo':s.stamina<15?'⚡ Descanse um pouco':'F: coletar · I: mochila · B: fogueira · H: abrigo';
    el('survival-hint').textContent=status;
    if(!visible&&!forcePanel)return;
    el('rotation-indicator').textContent=`Rotação adicional: ${getRotation()}°`;
    for(const key of Object.keys(RESOURCES))buttons['resource-'+key].textContent=s.inventory[key];
    for(const [key,recipe] of Object.entries(RECIPES)){
      const {btn,name,costs,description}=buttons['recipe-'+key];
      const cost=getRecipeCost(key);
      const requirements=Object.entries(cost).map(([k,v])=>`${RESOURCES[k].icon}${v}`).join('  ');
      name.textContent=`${isStructureRecipe(key)?'🧱 Posicionar':'⚒ Fabricar'} ${recipe.label}`;
      costs.textContent=requirements||'Sem custo';
      description.textContent=isStructureRecipe(key)?'Prévia 3D → ajustar → confirmar':recipe.hint;
      btn.disabled=!canAfford(s,key,cost)||!getCanCraft(key);
      btn.title=recipe.hint;
    }
    for(const key of ['berries','water','cooked','vegetables','grilledFish','stew'])el('use-'+key).disabled=s.inventory[key]<=0;
  }
  function open(){visible=true;panel.classList.remove('hidden');panel.setAttribute('aria-hidden','false');update(true);}
  function close(){visible=false;panel.classList.add('hidden');panel.setAttribute('aria-hidden','true');}
  return {update,open,close,get isOpen(){return visible;}};
}
