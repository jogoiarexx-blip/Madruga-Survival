// Fogueira: só receitas de cozinha. Os alimentos prontos permanecem na mochila.
import {CRAFT_STATIONS} from '../gameplay/crafting.js';
import {RECIPES,RESOURCES} from '../gameplay/survival.js';

export const CAMPFIRE_RECIPES=Object.freeze(Object.keys(CRAFT_STATIONS).filter(id=>CRAFT_STATIONS[id]==='campfire'&&RECIPES[id]));
export function createCampfireUI({getStatus,onCraft,onClose}){
  const panel=document.getElementById('campfire-panel');
  const list=document.getElementById('campfire-recipes');
  const stock=document.getElementById('campfire-stock');
  const message=document.getElementById('campfire-message');
  let isOpen=false;
  const buttons=new Map();
  for(const id of CAMPFIRE_RECIPES){
    const recipe=RECIPES[id];
    const button=document.createElement('button');button.type='button';button.className='campfire-recipe';
    const title=document.createElement('strong');title.textContent=recipe.label;
    const details=document.createElement('span');
    const hint=document.createElement('small');hint.textContent=recipe.hint;
    button.append(title,details,hint);
    button.onclick=()=>{
      if(!isOpen)return;
      const result=onCraft(id);
      message.textContent=result?'✓ '+recipe.label+' preparado!':'Não foi possível preparar '+recipe.label+'.';
      update();
    };
    list.appendChild(button);buttons.set(id,{button,details});
  }
  function update(){
    if(!isOpen)return;
    let ready=0;
    for(const [id,{button,details}] of buttons){
      const status=getStatus(id)||{ok:false,reason:'Receita indisponível'};
      const recipe=RECIPES[id];
      button.disabled=!status.ok;
      if(status.ok)ready++;
      const cost=Object.entries(status.cost||recipe.cost).map(([key,amount])=>{
        const have=status.stock?.[key];
        return (RESOURCES[key]?.icon||'•')+' '+(have===undefined?'':have+'/')+amount;
      }).join(' · ');
      details.textContent=cost+(status.ok?' · PRONTO':' · '+(status.reason||'Indisponível'));
      button.title=status.reason||'Preparar '+recipe.label;
    }
    stock.textContent=ready+' de '+buttons.size+' pratos disponíveis · ingredientes na mochila e em baús próximos';
  }
  function open(){
    if(isOpen)return;
    isOpen=true;panel.classList.remove('hidden');panel.setAttribute('aria-hidden','false');
    message.textContent='Escolha o alimento que deseja preparar.';update();
  }
  function close(){
    if(!isOpen)return;
    isOpen=false;panel.classList.add('hidden');panel.setAttribute('aria-hidden','true');onClose();
  }
  document.getElementById('campfire-close').onclick=close;
  return {open,close,update,get isOpen(){return isOpen}};
}
