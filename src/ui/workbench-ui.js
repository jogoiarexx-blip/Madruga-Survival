import {CRAFT_STATIONS,batchable} from '../gameplay/crafting.js';
import {RECIPES,RESOURCES} from '../gameplay/survival.js';
// Bancada com seleção da receita, custo detalhado e fabricação por lotes.
export const WORKBENCH_RECIPES=Object.freeze(Object.keys(CRAFT_STATIONS).filter(id=>CRAFT_STATIONS[id]==='workbench'&&RECIPES[id]));
const GROUPS=Object.freeze({equip:'⚒ Ferramentas e equipamento',upgrade:'🛡 Melhorias e armaduras',repair:'🔧 Reparos e suprimentos'});
export function workbenchGroup(id){return id.startsWith('repair')||['repairKit','medicalKit','silkDressing'].includes(id)?'repair':/iron|spiked|hardened|crystal|reinforced|armored|chitin|trail/i.test(id)?'upgrade':'equip'}
const DONE=/já fabricad|já instalad|no máximo/i;
export function describeWorkbenchRecipe(id,status,inventory={}){
 const recipe=RECIPES[id]||{},cost=status?.cost||recipe.cost||{};
 const rows=Object.entries(cost).map(([resource,need])=>{
   const have=Math.max(0,status?.stock?.[resource]??inventory[resource]??0);
   const bag=Math.min(have,Math.max(0,inventory[resource]||0));
   return {resource,icon:RESOURCES[resource]?.icon||'•',label:RESOURCES[resource]?.label||resource,need,have,bag,
     chests:Math.max(0,have-bag),ok:have>=need,short:Math.max(0,need-have)};
 });
 const reason=status?.reason||'';
 const state=status?.ok?'ready':DONE.test(reason)?'done':rows.some(r=>!r.ok)&&/materiais/i.test(reason)?'missing':'blocked';
 const badge={ready:'Pronto',done:'Concluído',missing:'Faltam materiais',blocked:'Bloqueado'}[state];
 const max=status?.ok?Math.max(1,status.maxBatch||1):0;
 const batches=batchable(id)?[...new Set([1,5,max].filter(q=>q>=1))].sort((a,b)=>a-b)
  .map(q=>({quantity:q,label:q===max&&q!==1&&q!==5?`Fabricar máximo (${q})`:`Fabricar ${q}`,
    enabled:state==='ready'&&q<=max,produced:q*(status?.yieldPerCraft||1)})):
  [{quantity:1,label:'Fabricar',enabled:state==='ready',produced:1}];
 const shortText=rows.filter(r=>!r.ok).map(r=>`${r.icon} faltam ${r.short} ${r.label.toLowerCase()}`).join(' · ');
 return {id,label:recipe.label||id,hint:recipe.hint||'',group:workbenchGroup(id),state,badge,rows,batches,
   reason:state==='missing'&&shortText?shortText:reason,fromChests:rows.some(r=>r.chests>0&&r.need>r.bag)};
}
export function createWorkbenchUI({getStatus,onCraft,onClose,getInventory=()=>({})}){
 const panel=document.getElementById('workbench-panel'),list=document.getElementById('workbench-recipes'),
   stock=document.getElementById('workbench-stock'),message=document.getElementById('workbench-message');
 let isOpen=false,selected=WORKBENCH_RECIPES[0]||null;
 const rows=new Map();
 list.replaceChildren();
 const layout=document.createElement('div');layout.className='wb-layout';
 const nav=document.createElement('div');nav.className='wb-list';nav.setAttribute('role','listbox');nav.setAttribute('aria-label','Receitas da bancada');
 const detail=document.createElement('article');detail.className='wb-detail';detail.setAttribute('aria-live','polite');
 layout.append(nav,detail);list.appendChild(layout);
 const containers={};
 for(const [kind,title] of Object.entries(GROUPS)){
   const section=document.createElement('section');section.className='workbench-group';
   const heading=document.createElement('h3');heading.textContent=title;
   const grid=document.createElement('div');grid.className='workbench-grid';
   section.append(heading,grid);nav.appendChild(section);containers[kind]=grid;
 }
 for(const id of WORKBENCH_RECIPES){
   const btn=document.createElement('button');btn.type='button';btn.className='workbench-recipe';
   btn.setAttribute('role','option');btn.dataset.recipe=id;
   const title=document.createElement('strong');title.textContent=RECIPES[id].label;
   const badge=document.createElement('span');badge.className='wb-badge';btn.append(title,badge);
   btn.onclick=()=>{select(id);if(globalThis.matchMedia?.('(max-width:700px)').matches)detail.scrollIntoView({block:'nearest',behavior:'smooth'})};
   containers[workbenchGroup(id)].appendChild(btn);rows.set(id,{btn,badge});
 }
 function select(id){selected=id;update()}
 function renderDetail(info){
   detail.replaceChildren();
   const h=document.createElement('h3');h.textContent=info.label;
   const badge=document.createElement('span');badge.className='wb-badge wb-'+info.state;badge.textContent=info.badge;
   const head=document.createElement('header');head.append(h,badge);
   const hint=document.createElement('p');hint.className='wb-hint';hint.textContent=info.hint;
   const table=document.createElement('ul');table.className='wb-costs';
   for(const r of info.rows){
     const li=document.createElement('li');li.className=r.ok?'ok':'short';
     const name=document.createElement('span');name.textContent=`${r.icon} ${r.label}`;
     const qty=document.createElement('b');qty.textContent=`${r.have}/${r.need}`;
     const origin=document.createElement('small');
     origin.textContent=(r.chests?`mochila ${r.bag} + baús ${r.chests}`:`mochila ${r.bag}`)+(r.ok?'':` · faltam ${r.short}`);
     li.append(name,qty,origin);table.appendChild(li);
   }
   const reason=document.createElement('p');reason.className='wb-reason';
   reason.textContent=info.state==='ready'?(info.fromChests?'✓ Pronto · parte dos materiais sai dos baús próximos':'✓ Pronto para fabricar'):'⚠ '+info.reason;
   const actions=document.createElement('div');actions.className='wb-actions';
   for(const b of info.batches){
     const btn=document.createElement('button');btn.type='button';btn.disabled=!b.enabled;
     btn.textContent=b.label+(b.produced>b.quantity?` → ${b.produced}`:'');
     btn.onclick=()=>{
       if(!isOpen)return;
       const result=onCraft(info.id,b.quantity),after=getStatus(info.id);
       message.textContent=result?`✓ ${info.label} ×${b.quantity} fabricado!`:`⚠ ${after.reason||'Não foi possível fabricar agora.'}`;
       update();
     };
     actions.appendChild(btn);
   }
   detail.append(head,hint,table,reason,actions);
 }
 function update(){
   if(!isOpen)return;
   let count=0;const inventory=getInventory();
   for(const [id,{btn,badge}] of rows){
     const info=describeWorkbenchRecipe(id,getStatus(id),inventory);
     if(info.state==='ready')count++;
     badge.textContent=info.badge;badge.className='wb-badge wb-'+info.state;
     btn.classList.toggle('selected',id===selected);btn.setAttribute('aria-selected',String(id===selected));
     btn.title=info.state==='ready'?'Fabricar '+info.label:info.reason;
     if(id===selected)renderDetail(info);
   }
   stock.textContent=count+' receita(s) prontas · materiais da mochila e de baús a até 6 m';
 }
 function open(){isOpen=true;panel.classList.remove('hidden');panel.setAttribute('aria-hidden','false');message.textContent='Escolha uma receita na lista para ver detalhes e fabricar.';update();rows.get(selected)?.btn.focus()}
 function close(){if(!isOpen)return;isOpen=false;panel.classList.add('hidden');panel.setAttribute('aria-hidden','true');onClose()}
 document.getElementById('workbench-close').onclick=close;
 return {open,close,update,select,get selected(){return selected},get isOpen(){return isOpen}};
}
