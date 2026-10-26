// Regras da interface da mochila. A mochila continua armazenando contagens por recurso;
// arrastar para a barra de atalhos NÃO transfere nem duplica itens.
import {RESOURCES} from './survival.js';
import {HOTBAR_CONSUMABLES,HOTBAR_LENGTH,restoreHotbar} from './consumable-hotbar.js';

export const INVENTORY_SECTIONS = Object.freeze({
  basics:Object.freeze(['wood','stone','fiber','seeds','water']),
  food:Object.freeze(['berries','meat','cooked','vegetables','fish','grilledFish','stew']),
  craft:Object.freeze(['iron','scrap','cloth','spiderSilk','chitin','caveCrystal']),
  support:Object.freeze(['bandage','medicalKit','repairKit','silkDressing'])
});
export const INVENTORY_DRAG_TYPE = 'application/x-madruga-consumable';
export function inventoryCategory(key){
  return Object.keys(INVENTORY_SECTIONS).find(c=>INVENTORY_SECTIONS[c].includes(key)) || null;
}
export function canPlaceOnHotbar(key){return typeof key==='string'&&HOTBAR_CONSUMABLES.includes(key);}
export function inventoryMatches(key,{category='all',query=''}={}){
  if(!Object.hasOwn(RESOURCES,key))return false;
  if(category!=='all'&&category!==inventoryCategory(key))return false;
  const normalized=String(query).trim().toLocaleLowerCase('pt-BR');
  return !normalized||`${RESOURCES[key].label} ${key}`.toLocaleLowerCase('pt-BR').includes(normalized);
}
export function getQuickSlot(slots,key){
  if(!canPlaceOnHotbar(key))return -1;
  const saved=restoreHotbar(slots);
  if(!saved||saved.length!==HOTBAR_LENGTH)return -1;
  const already=saved.indexOf(key);
  return already!==-1?already:saved.indexOf(null); // nunca sobrescreve outro atalho sem escolha explícita
}
