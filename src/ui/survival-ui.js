import {RESOURCES,RECIPES,canAfford,cycleClock,isNight} from '../gameplay/survival.js';
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
  for(const [key,recipe] of Object.entries(RECIPES)) {
    const btn=document.createElement('button');btn.className='recipe-btn';
    btn.type='button';btn.addEventListener('click',()=>{onCraft(key);update(true);});
    recipes.appendChild(btn);buttons['recipe-'+key]=btn;
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
      const button=buttons['recipe-'+key];
      const cost=getRecipeCost(key);
      const requirements=Object.entries(cost).map(([k,v])=>`${RESOURCES[k].icon}${v}`).join(' ');
      button.textContent=`${recipe.label} · ${requirements}`;
      button.disabled=!canAfford(s,key,cost)||!getCanCraft(key);
      button.title=recipe.hint;
    }
    for(const key of ['berries','water','cooked','vegetables','grilledFish','stew'])el('use-'+key).disabled=s.inventory[key]<=0;
  }
  function open(){visible=true;panel.classList.remove('hidden');panel.setAttribute('aria-hidden','false');update(true);}
  function close(){visible=false;panel.classList.add('hidden');panel.setAttribute('aria-hidden','true');}
  return {update,open,close,get isOpen(){return visible;}};
}
