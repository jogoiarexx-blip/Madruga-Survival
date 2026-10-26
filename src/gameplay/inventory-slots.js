// Grade de organização: os totais continuam sendo controlados por survival.inventory.
// Nunca debite ou acrescente materiais diretamente em uma operação de slot.
import {RESOURCES} from './survival.js';
export const BAG_SIZE=36;
export const BAG_STACK_MAX=999; // limite herdado por recurso; evita perda de saves antigos
const keys=Object.keys(RESOURCES);
const validStack=s=>s===null||(!!s&&typeof s==='object'&&!Array.isArray(s)&&
  keys.includes(s.item)&&Number.isInteger(s.count)&&s.count>=1&&s.count<=BAG_STACK_MAX&&
  Object.keys(s).every(k=>k==='item'||k==='count'));
const copy=arr=>arr.map(s=>s?{item:s.item,count:s.count}:null);
const saneInventory=inventory=>!!inventory&&typeof inventory==='object'&&
  keys.every(k=>Number.isInteger(inventory[k])&&inventory[k]>=0&&inventory[k]<=BAG_STACK_MAX);
export function bagTotals(slots){
  const totals=Object.fromEntries(keys.map(k=>[k,0]));
  for(const slot of slots||[])if(slot?.item&&Object.hasOwn(totals,slot.item))totals[slot.item]+=slot.count;
  return totals;
}
export function validBag(slots,inventory){
  if(!Array.isArray(slots)||slots.length!==BAG_SIZE||!slots.every(validStack)||!saneInventory(inventory))return false;
  const total=bagTotals(slots);
  return keys.every(k=>total[k]===inventory[k]);
}
export function createBag(inventory){
  if(!saneInventory(inventory))return null;
  const result=Array(BAG_SIZE).fill(null);let i=0;
  for(const key of keys)if(inventory[key]>0){
    if(i===BAG_SIZE)return null;
    result[i++]={item:key,count:inventory[key]};
  }
  return result;
}
export function restoreBag(value,inventory){
  if(value===undefined)return createBag(inventory); // salvações anteriores à revisão
  return validBag(value,inventory)?copy(value):null;
}
// Mescla pilhas iguais primeiro apenas se for necessário liberar espaço para novo tipo.
function freeSlotByMerging(slots){
  for(let i=0;i<slots.length;i++)for(let j=i+1;j<slots.length;j++){
    const a=slots[i],b=slots[j];
    if(a&&b&&a.item===b.item&&a.count+b.count<=BAG_STACK_MAX){
      a.count+=b.count;slots[j]=null;return j;
    }
  }
  return -1;
}
// Aplica delta de coleta/craft sem descartar a organização existente.
export function reconcileBag(bag,inventory){
  if(!saneInventory(inventory))return null;
  if(!Array.isArray(bag)||bag.length!==BAG_SIZE||!bag.every(validStack))return createBag(inventory);
  const slots=copy(bag);
  let totals=bagTotals(slots);
  for(const key of keys){
    let excess=totals[key]-inventory[key];
    for(let i=BAG_SIZE-1;i>=0&&excess>0;i--){
      const slot=slots[i];if(!slot||slot.item!==key)continue;
      const taken=Math.min(slot.count,excess);slot.count-=taken;excess-=taken;
      if(slot.count===0)slots[i]=null;
    }
  }
  totals=bagTotals(slots);
  for(const key of keys){
    let missing=inventory[key]-totals[key];
    if(!missing)continue;
    for(const slot of slots){
      if(missing<=0)break;
      if(slot?.item!==key)continue;
      const give=Math.min(missing,BAG_STACK_MAX-slot.count);
      slot.count+=give;missing-=give;
    }
    while(missing>0){
      let index=slots.indexOf(null);
      if(index<0)index=freeSlotByMerging(slots);
      if(index<0)return null; // nunca inventar nem omitir pilhas caso modelo esteja impossível
      const give=Math.min(missing,BAG_STACK_MAX);
      slots[index]={item:key,count:give};missing-=give;
    }
  }
  return validBag(slots,inventory)?slots:null;
}
const validIndex=i=>Number.isInteger(i)&&i>=0&&i<BAG_SIZE;
// A movimentação só altera representação visual, nunca os totais.
export function moveBagStack(bag,from,to,quantity){
  if(!Array.isArray(bag)||bag.length!==BAG_SIZE||!bag.every(validStack)||
     !validIndex(from)||!validIndex(to)||from===to||!bag[from])return null;
  const slots=copy(bag),source=slots[from],target=slots[to];
  const amount=quantity===undefined?source.count:quantity;
  if(!Number.isInteger(amount)||amount<1||amount>source.count)return null;
  if(!target){slots[to]={item:source.item,count:amount};source.count-=amount;
    if(source.count===0)slots[from]=null;return slots;}
  if(target.item===source.item){
    const capacity=BAG_STACK_MAX-target.count;
    if(capacity<=0||amount>capacity)return null;
    target.count+=amount;source.count-=amount;
    if(source.count===0)slots[from]=null;return slots;
  }
  if(amount!==source.count)return null; // nunca mistura material diferente parcialmente
  slots[to]=source;slots[from]=target;return slots;
}
export function splitBagStack(bag,from,to){
  if(!validIndex(from)||!validIndex(to)||from===to||!Array.isArray(bag)||
     !bag[from]||bag[from].count<2||bag[to]!==null)return null;
  return moveBagStack(bag,from,to,Math.floor(bag[from].count/2));
}
export function sortBag(bag){
  if(!Array.isArray(bag)||bag.length!==BAG_SIZE||!bag.every(validStack))return null;
  // Ordena por ordem de tipos padrão e consolida pilhas até o máximo permitido.
  const amounts=bagTotals(bag),slots=Array(BAG_SIZE).fill(null);let i=0;
  for(const key of keys){let count=amounts[key];while(count>0){
    if(i>=BAG_SIZE)return null;
    const n=Math.min(count,BAG_STACK_MAX);slots[i++]={item:key,count:n};count-=n;
  }}
  return slots;
}
