// Chaves carrega recursos fisicamente até a base. Não altera a mochila do jogador à distância.
import {CHEST_CAPACITY,totalStored,validChestItems} from './storage.js';
export const GUARD_CARGO_LIMIT=18;
export const GUARD_CARGO_KEYS=Object.freeze(['wood','stone','fiber','berries','water','seeds','vegetables']);
export function validGuardCargo(cargo){
 return !!cargo&&typeof cargo==='object'&&!Array.isArray(cargo)&&
   Object.entries(cargo).every(([key,n])=>GUARD_CARGO_KEYS.includes(key)&&Number.isInteger(n)&&n>=0&&n<=GUARD_CARGO_LIMIT)&&
   Object.values(cargo).reduce((a,b)=>a+b,0)<=GUARD_CARGO_LIMIT;
}
export const cargoCount=cargo=>Object.values(cargo||{}).reduce((a,b)=>a+b,0);
export function collectCargo(cargo,key,count){
 if(!validGuardCargo(cargo)||!GUARD_CARGO_KEYS.includes(key)||!Number.isInteger(count)||count<1)return 0;
 const put=Math.min(count,GUARD_CARGO_LIMIT-cargoCount(cargo));
 if(put>0)cargo[key]=(cargo[key]||0)+put;
 return put;
}
export function cargoFitsChest(cargo,items){
 return validGuardCargo(cargo)&&validChestItems(items)&&totalStored(items)<CHEST_CAPACITY&&
  GUARD_CARGO_KEYS.some(k=>cargo[k]>0);
}
// Transação limitada à capacidade, sem duplicar, descartar ou tocar nos itens do jogador.
export function depositCargo(cargo,items){
 if(!cargoFitsChest(cargo,items))return 0;
 let remaining=CHEST_CAPACITY-totalStored(items),moved=0;
 for(const key of GUARD_CARGO_KEYS){
  const n=Math.min(cargo[key]||0,remaining);
  if(n<=0)continue;
  items[key]=(items[key]||0)+n;cargo[key]-=n;
  if(cargo[key]===0)delete cargo[key];
  remaining-=n;moved+=n;
  if(remaining<=0)break;
 }
 return moved;
}
// Quando todos os baús enchem, Chaves entrega o excesso ao jogador presencialmente.
export function handoffCargo(cargo,inventory){
 if(!validGuardCargo(cargo)||!inventory||typeof inventory!=='object')return 0;
 let moved=0;
 for(const key of GUARD_CARGO_KEYS){
  const have=Number(inventory[key]);if(!Number.isInteger(have)||have<0||have>999)continue;
  const n=Math.min(cargo[key]||0,999-have);
  if(n<=0)continue;inventory[key]=have+n;cargo[key]-=n;
  if(cargo[key]===0)delete cargo[key];moved+=n;
 }
 return moved;
}
