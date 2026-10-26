import {HOTBAR_CONSUMABLES,HOTBAR_LENGTH,slotCount} from '../gameplay/consumable-hotbar.js';
import {RESOURCES} from '../gameplay/survival.js';

export function createConsumableHotbarUI({getSlots,getInventory,onUse,onAssign}){
  const bar=document.getElementById('consumable-hotbar');
  const config=document.getElementById('hotbar-config');
  const buttons=[], selectors=[];
  for(let index=0;index<HOTBAR_LENGTH;index++){
    const number=index+4;
    const button=document.createElement('button');
    button.type='button';button.className='hotbar-slot';button.dataset.slot=String(index);
    const shortcut=document.createElement('span');shortcut.className='hotbar-key';shortcut.textContent=String(number);
    const icon=document.createElement('span');icon.className='hotbar-icon';icon.textContent='+';
    const amount=document.createElement('span');amount.className='hotbar-amount';amount.textContent='0';
    button.append(shortcut,icon,amount);
    button.addEventListener('click',event=>{event.preventDefault();if(!button.disabled)onUse(index);});
    bar.appendChild(button);buttons.push({button,icon,amount});

    const field=document.createElement('label');field.className='hotbar-config-item';
    const title=document.createElement('span');title.textContent=`Tecla ${number}`;
    const select=document.createElement('select');select.setAttribute('aria-label',`Consumível do atalho ${number}`);
    const empty=document.createElement('option');empty.value='';empty.textContent='— Vazio —';select.appendChild(empty);
    for(const item of HOTBAR_CONSUMABLES){
      const option=document.createElement('option');option.value=item;
      option.textContent=`${RESOURCES[item].icon} ${RESOURCES[item].label}`;
      select.appendChild(option);
    }
    select.addEventListener('change',()=>onAssign(index,select.value||null));
    field.append(title,select);config.appendChild(field);selectors.push(select);
  }
  function update(){
    const slots=getSlots(),inventory=getInventory();
    for(let i=0;i<HOTBAR_LENGTH;i++){
      const item=slots[i],qty=slotCount(inventory,item),description=item?RESOURCES[item]:null;
      const {button,icon,amount}=buttons[i];
      const label=description?`${description.label}: ${qty} disponível`:'Slot vazio';
      const aria=`Atalho ${i+4}: ${label}`;
      if(button.getAttribute('aria-label')!==aria){button.setAttribute('aria-label',aria);button.title=aria;}
      if(icon.textContent!==(description?.icon||'+'))icon.textContent=description?.icon||'+';
      const text=item?String(qty):'—';if(amount.textContent!==text)amount.textContent=text;
      const disabled=!item||qty===0;
      if(button.disabled!==disabled)button.disabled=disabled;
      button.classList.toggle('empty',!item);
      if(selectors[i].value!==(item||''))selectors[i].value=item||'';
    }
  }
  update();
  return {update,buttons:buttons.map(x=>x.button)};
}
