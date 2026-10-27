import {CRAFT_STATIONS} from '../gameplay/crafting.js';
import {RECIPES,RESOURCES} from '../gameplay/survival.js';

// Oficina avançada: interface exclusiva; nunca abre a mochila por trás.
export const WORKBENCH_RECIPES=Object.freeze(Object.keys(CRAFT_STATIONS).filter(id=>CRAFT_STATIONS[id]==='workbench'&&RECIPES[id]));
export function createWorkbenchUI({getStatus,onCraft,onClose}){
  const panel=document.getElementById('workbench-panel');
  const list=document.getElementById('workbench-recipes');
  const stock=document.getElementById('workbench-stock');
  const message=document.getElementById('workbench-message');
  let isOpen=false;
  const buttons=new Map();
  const groups={equip:'⚒ Ferramentas e equipamento',upgrade:'🛡 Melhorias e armaduras',repair:'🔧 Reparos e suprimentos'};
  const containers={};
  for(const [kind,title] of Object.entries(groups)){
    const section=document.createElement('section');section.className='workbench-group';
    const heading=document.createElement('h3');heading.textContent=title;section.appendChild(heading);
    const grid=document.createElement('div');grid.className='workbench-grid';section.appendChild(grid);
    list.appendChild(section);containers[kind]=grid;
  }
  for(const id of WORKBENCH_RECIPES){
    const recipe=RECIPES[id],kind=id.startsWith('repair')?'repair':/iron|spiked|hardened|crystal|reinforced|armored|chitin|trail/i.test(id)?'upgrade':'equip';
    const btn=document.createElement('button');btn.type='button';btn.className='workbench-recipe';
    const title=document.createElement('strong');title.textContent=recipe.label;
    const details=document.createElement('span');btn.append(title,details);
    btn.onclick=()=>{
      if(!isOpen)return;
      const result=onCraft(id);
      message.textContent=result?'✓ '+recipe.label+' fabricado!':'Não foi possível produzir '+recipe.label+'.';
      update();
    };
    containers[kind].appendChild(btn);buttons.set(id,{btn,details});
  }
  function update(){
    if(!isOpen)return;
    let count=0;
    for(const [id,{btn,details}] of buttons){
      const status=getStatus(id);
      const recipe=RECIPES[id];
      btn.disabled=!status.ok;
      if(status.ok)count++;
      const required=Object.entries(status.cost||recipe.cost).map(([key,amount])=>(RESOURCES[key]?.icon||'•')+' '+amount).join(' · ');
      details.textContent=required+(status.ok?' · PRONTO':' · '+(status.reason||'Indisponível'));
      btn.title=status.reason||'Fabricar '+recipe.label;
    }
    stock.textContent=count+' receita(s) disponíveis · os materiais vêm da mochila e de baús próximos';
  }
  function open(){isOpen=true;panel.classList.remove('hidden');panel.setAttribute('aria-hidden','false');message.textContent='Escolha uma receita para produzir usando a bancada.';update();}
  function close(){if(!isOpen)return;isOpen=false;panel.classList.add('hidden');panel.setAttribute('aria-hidden','true');onClose();}
  document.getElementById('workbench-close').onclick=close;
  return {open,close,update,get isOpen(){return isOpen}};
}
