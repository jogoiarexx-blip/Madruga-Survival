import {INVENTORY_DRAG_TYPE,canPlaceOnHotbar} from '../gameplay/inventory-ui-logic.js';
import {HOTBAR_CONSUMABLES,HOTBAR_LENGTH,slotCount} from '../gameplay/consumable-hotbar.js';
import {RESOURCES} from '../gameplay/survival.js';

export function createConsumableHotbarUI({getSlots,getInventory,onUse,onAssign,getSelectedItem=()=>null,onSelectSlot=()=>false,onConfigured=()=>{}}){
  const bar=document.getElementById('consumable-hotbar');
  const config=document.getElementById('hotbar-config');
  const buttons=[], selectors=[],dropTargets=[];
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

    const field=document.createElement('div');field.className='hotbar-config-item';field.dataset.slot=String(index);
    const title=document.createElement('span');title.textContent=`Tecla ${number}`;
    const target=document.createElement('button');target.type='button';target.className='inventory-hotbar-target';
    target.dataset.slot=String(index);target.setAttribute('aria-label',`Colocar item selecionado no atalho ${number}`);
    target.addEventListener('click',()=>{if(getSelectedItem())onSelectSlot(index);else selectors[index].focus();});
    target.addEventListener('dragover',e=>{
      if([...e.dataTransfer?.types||[]].includes(INVENTORY_DRAG_TYPE)){e.preventDefault();e.dataTransfer.dropEffect='copy';field.classList.add('drop-ready');}
    });
    target.addEventListener('dragleave',()=>field.classList.remove('drop-ready'));
    target.addEventListener('drop',e=>{
      e.preventDefault();field.classList.remove('drop-ready');
      const resource=e.dataTransfer?.getData(INVENTORY_DRAG_TYPE);
      if(canPlaceOnHotbar(resource) && onAssign(index,resource))onConfigured();
    });
    dropTargets.push(target);
    const select=document.createElement('select');select.setAttribute('aria-label',`Consumível do atalho ${number}`);
    const empty=document.createElement('option');empty.value='';empty.textContent='— Vazio —';select.appendChild(empty);
    for(const item of HOTBAR_CONSUMABLES){
      const option=document.createElement('option');option.value=item;
      option.textContent=`${RESOURCES[item].icon} ${RESOURCES[item].label}`;
      select.appendChild(option);
    }
    select.addEventListener('change',()=>{if(onAssign(index,select.value||null))onConfigured();});
    field.append(title,select,target);config.appendChild(field);selectors.push(select);
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
      const target=dropTargets[i];
      const targetLabel=description?`${description.icon} ${qty} un.`:'+ Soltar item';
      if(target.textContent!==targetLabel)target.textContent=targetLabel;
      target.classList.toggle('is-selected',Boolean(getSelectedItem()));
      const tooltip=description?`Atalho ${i+4}: ${description.label} (${qty} disponíveis)`:`Atalho ${i+4}: vazio`;
      const selected=getSelectedItem();
      const targetTitle=selected?`Inserir ${RESOURCES[selected]?.label||'item'} no atalho ${i+4}`:tooltip;
      if(target.title!==targetTitle)target.title=targetTitle;
    }
  }
  update();
  return {update,buttons:buttons.map(x=>x.button)};
}
