// Planos de transferência atômicos: nenhum estoque é mutado antes da validação.
// A quantidade em survival.inventory permanece a fonte autoritativa para o jogo.
import {CHEST_CAPACITY,validChestItems,totalStored} from './storage.js';
import {RESOURCES} from './survival.js';
import {validBag,reconcileBag,BAG_SIZE} from './inventory-slots.js';
const validAmount=n=>Number.isInteger(n)&&n>0&&n<=CHEST_CAPACITY;
const copied=bag=>bag.map(slot=>slot?{...slot}:null);

export function planStoreBagStack(inventory,bag,chestItems,index,amount){
  if(!validBag(bag,inventory)||!validChestItems(chestItems)||
      !Number.isInteger(index)||index<0||index>=BAG_SIZE||!validAmount(amount))return null;
  const slot=bag[index];
  if(!slot||slot.count<amount||inventory[slot.item]<amount||
      totalStored(chestItems)+amount>CHEST_CAPACITY)return null;
  const nextInventory={...inventory,[slot.item]:inventory[slot.item]-amount};
  const nextChest={...chestItems,[slot.item]:(chestItems[slot.item]||0)+amount};
  const nextBag=copied(bag);
  nextBag[index].count-=amount;
  if(nextBag[index].count===0)nextBag[index]=null;
  return validChestItems(nextChest)&&validBag(nextBag,nextInventory)?
    {inventory:nextInventory,bag:nextBag,items:nextChest}:null;
}

export function planTakeFromChest(inventory,bag,chestItems,key,amount){
  if(!validBag(bag,inventory)||!validChestItems(chestItems)||
      !Object.hasOwn(RESOURCES,key)||!validAmount(amount)||
      (chestItems[key]||0)<amount||inventory[key]+amount>999)return null;
  const nextInventory={...inventory,[key]:inventory[key]+amount};
  const nextChest={...chestItems,[key]:chestItems[key]-amount};
  if(nextChest[key]===0)delete nextChest[key];
  const nextBag=reconcileBag(bag,nextInventory);
  return nextBag&&validBag(nextBag,nextInventory)&&validChestItems(nextChest)?
    {inventory:nextInventory,bag:nextBag,items:nextChest}:null;
}
