import {RESOURCES} from '../gameplay/survival.js';
import {CHEST_CAPACITY,totalStored} from '../gameplay/storage.js';
export function createStorageUI({getInventory,onTransfer,onClose}){
 const panel=document.getElementById('storage-panel'),list=document.getElementById('storage-items');
 const display=document.getElementById('storage-usage');
 let chest=null;
 const entries=new Map();
 for(const [id,{label,icon}] of Object.entries(RESOURCES)){
   const row=document.createElement('div');row.className='storage-item';
   const heading=document.createElement('strong');row.appendChild(heading);
   const buttons=document.createElement('div');buttons.className='storage-item-actions';row.appendChild(buttons);
   const controls=[];
   for(const [direction,prefix,amount] of [['store','Guardar',1],['store','+5',5],['take','Retirar',1],['take','-5',5]]){
     const button=document.createElement('button');button.type='button';button.textContent=`${prefix}${amount===1?' 1':''}`;
     button.addEventListener('click',()=>{if(chest){onTransfer(chest,id,direction,amount);update();}});
     buttons.appendChild(button);controls.push({button,direction,amount});
   }
   list.appendChild(row);entries.set(id,{heading,controls,label,icon});
 }
 document.getElementById('storage-close').onclick=onClose;
 function update(){if(!chest)return;
   const bag=getInventory(),stored=totalStored(chest.items);
   display.textContent=`${stored}/${CHEST_CAPACITY}`;
   for(const [id,{heading,controls,label,icon}] of entries){
     heading.textContent=`${icon} ${label} · Mochila: ${bag[id]||0} · Baú: ${chest.items[id]||0}`;
     for(const {button,direction,amount} of controls){
       const available=direction==='store'?bag[id]||0:chest.items[id]||0;
       button.disabled=available<1||(direction==='store'?stored>=CHEST_CAPACITY:bag[id]>=999);
     }
   }
 }
 function open(s){chest=s;panel.classList.remove('hidden');panel.setAttribute('aria-hidden','false');update();}
 function close(){chest=null;panel.classList.add('hidden');panel.setAttribute('aria-hidden','true');}
 return {open,close,update,get isOpen(){return chest!==null;},get chest(){return chest;}};
}
