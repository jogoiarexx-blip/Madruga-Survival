// Barra de consumíveis: regras puras e formato persistente de seis slots.
export const HOTBAR_CONSUMABLES = Object.freeze([
  'berries','water','cooked','vegetables','grilledFish','stew',
  'bandage','medicalKit','silkDressing'
]);
export const HOTBAR_DEFAULT = Object.freeze(['berries','water','cooked','bandage','medicalKit','silkDressing']);
export const HOTBAR_LENGTH = HOTBAR_DEFAULT.length;
const valid = new Set(HOTBAR_CONSUMABLES);

export function defaultHotbar(){ return [...HOTBAR_DEFAULT]; }
export function restoreHotbar(data){
  if (data === undefined) return defaultHotbar(); // Saves anteriores à v2.15.
  if (!Array.isArray(data) || data.length !== HOTBAR_LENGTH ||
      !data.every(item => item === null || (typeof item === 'string' && valid.has(item)))) return null;
  return [...data];
}
export function assignHotbarSlot(slots,index,item){
  const current=restoreHotbar(slots);
  if (!current || !Number.isInteger(index) || index<0 || index>=HOTBAR_LENGTH ||
      (item!==null && !valid.has(item))) return null;
  current[index]=item;
  return current;
}
export function hotbarIndexFromCode(code){
  if (typeof code!=='string') return -1;
  const match=/^Digit([4-9])$/.exec(code);
  return match ? Number(match[1])-4 : -1;
}
export function slotCount(inventory,item){
  if (!valid.has(item)) return 0;
  const n=inventory?.[item];
  return Number.isInteger(n)&&n>0?n:0;
}
