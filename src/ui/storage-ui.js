import {RESOURCES} from '../gameplay/survival.js';
import {CHEST_CAPACITY,totalStored} from '../gameplay/storage.js';
import {BAG_SIZE} from '../gameplay/inventory-slots.js';
const DND='application/x-madruga-storage-stack';
const validPayload=p=>p&&(p.source==='bag'&&Number.isInteger(p.index)&&p.index>=0&&p.index<BAG_SIZE||
 p.source==='chest'&&Object.hasOwn(RESOURCES,p.item));
export function createStorageUI({getInventory,getBag=()=>[],onTransfer,onClose}){
 const panel=document.getElementById('storage-panel'),list=document.getElementById('storage-items');
 const display=document.getElementById('storage-usage');
 let chest=null,selected=null,quantity=1;
 list.replaceChildren();list.className='storage-dual-grid';
 function element(tag,className,text,parent){const n=document.createElement(tag);n.className=className;if(text!==undefined)n.textContent=text;parent.appendChild(n);return n;}
 const controls=element('div','storage-quantity-controls',undefined,list);
 element('span','','Quantidade por transferência',controls);
 const qty=element('input','storage-amount',undefined,controls);qty.type='number';qty.min='1';qty.max=String(CHEST_CAPACITY);qty.step='1';qty.inputMode='numeric';qty.value='1';qty.setAttribute('aria-label','Quantidade a mover');
 for(const [text,mode] of [['1','one'],['½','half'],['Tudo','all']]){
  const btn=element('button','storage-amount-shortcut',text,controls);btn.type='button';
  btn.addEventListener('click',()=>{
   if(mode==='one'){quantity=1;}else{
    const available=selected?.source==='bag'?getBag()[selected.index]?.count:
      selected?.source==='chest'?chest?.items?.[selected.item]:0;
    quantity=mode==='half'?Math.max(1,Math.floor((available||1)/2)):Math.min(CHEST_CAPACITY,available||1);
   }
   qty.value=String(quantity);
  });
 }
 const hint=element('p','storage-selection-help','Selecione um item de uma grade e toque na outra para transferir.',list);
 const columns=element('div','storage-columns',undefined,list);
 const bagSection=element('section','storage-grid-section',undefined,columns);
 element('h3','','🎒 Mochila · 36 posições',bagSection);
 const bagGrid=element('div','storage-slot-grid',undefined,bagSection);
 const chestSection=element('section','storage-grid-section',undefined,columns);
 element('h3','','📦 Baú · capacidade 80',chestSection);
 const chestGrid=element('div','storage-slot-grid',undefined,chestSection);
 const note=element('p','inventory-help','Clique ou toque em um item e depois na grade oposta. No PC, arraste. O baú armazena quantidades por recurso; a mochila mantém suas 36 posições.',list);
 function amount(){const n=Number(qty.value);return Number.isSafeInteger(n)&&n>=1&&n<=CHEST_CAPACITY?n:0;}
 function commit(source){
  if(!chest||!validPayload(source))return false;
  const index=source.source==='bag'?source.index:undefined;
  const key=source.source==='bag'?getBag()?.[index]?.item:source.item;
  if(!key||!Object.hasOwn(RESOURCES,key))return false;
  const success=!!onTransfer(chest,key,source.source==='bag'?'store':'take',amount(),index);
  if(success){selected=null;quantity=1;qty.value='1';update();}
  else hint.textContent='⚠ Operação recusada: confira quantidade, capacidade e estoque.';
  return success;
 }
 function choose(source){
  if(!validPayload(source))return;
  if(selected&&selected.source!==source.source){commit(selected);return;}
  selected=source;hint.textContent='✓ Item selecionado. Toque na grade oposta ou arraste para transferir.';update();
 }
 function makeSlot(grid,item,count,source,label,empty=false){
  const button=element('button','storage-slot',undefined,grid);button.type='button';
  button.classList.toggle('is-empty',empty);button.classList.toggle('selected',selected?.source===source.source&&(source.source==='bag'?selected.index===source.index:selected.item===source.item));
  button.setAttribute('aria-label',label);button.title=label;
  if(!empty){button.draggable=true;
    element('span','storage-slot-icon',RESOURCES[item]?.icon||'▪',button);
    element('span','storage-slot-count',String(count),button);
    element('span','storage-slot-name',RESOURCES[item]?.label||item,button);
  }
  button.addEventListener('click',()=>{if(!empty)choose(source);else if(selected&&selected.source!==source.source)commit(selected);});
  button.addEventListener('dragstart',e=>{if(empty){e.preventDefault();return;}selected=source;
    e.dataTransfer?.setData(DND,JSON.stringify(source));if(e.dataTransfer)e.dataTransfer.effectAllowed='move';});
  button.addEventListener('dragover',e=>{if(e.dataTransfer?.types?.includes(DND)&&selected?.source!==source.source){e.preventDefault();button.classList.add('drop-ready');}});
  button.addEventListener('dragleave',()=>button.classList.remove('drop-ready'));
  button.addEventListener('drop',e=>{e.preventDefault();button.classList.remove('drop-ready');
    let raw=null;try{raw=JSON.parse(e.dataTransfer?.getData(DND)||'null');}catch(_){return;}
    if(validPayload(raw)&&raw.source!==source.source)commit(raw);
  });
  return button;
 }
 function update(){if(!chest)return;
  const bag=getBag(),stored=totalStored(chest.items);
  display.textContent=`${stored}/${CHEST_CAPACITY}`;
  bagGrid.replaceChildren();chestGrid.replaceChildren();
  for(let i=0;i<BAG_SIZE;i++){
    const stack=bag[i];makeSlot(bagGrid,stack?.item,stack?.count,{source:'bag',index:i},
     stack?`Mochila posição ${i+1}: ${RESOURCES[stack.item]?.label}, ${stack.count}`:`Mochila posição ${i+1}: vazia`,!stack);
  }
  let count=0;
  for(const [key,n] of Object.entries(chest.items))if(n>0&&Object.hasOwn(RESOURCES,key)){
    makeSlot(chestGrid,key,n,{source:'chest',item:key},`Baú: ${RESOURCES[key].label}, ${n}`);count++;
  }
  // Espaços visuais de destino, não são posições físicas persistentes do baú.
  for(let i=count;i<18;i++)makeSlot(chestGrid,null,0,{source:'chest',item:null},'Baú: espaço livre',true);
  if(selected)hint.textContent='Item selecionado · toque na grade oposta ou arraste para transferir.';
  else hint.textContent='Selecione uma pilha da mochila ou do baú; depois toque na grade oposta.';
 }
 document.getElementById('storage-close').onclick=onClose;
 function open(s){chest=s;selected=null;quantity=1;qty.value='1';panel.classList.remove('hidden');panel.setAttribute('aria-hidden','false');update();}
 function close(){chest=null;selected=null;panel.classList.add('hidden');panel.setAttribute('aria-hidden','true');}
 return {open,close,update,get isOpen(){return chest!==null;},get chest(){return chest;}};
}
