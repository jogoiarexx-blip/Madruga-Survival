// Equipamentos fabricados são propriedade permanente; equipar ou retirar não cria itens.
export const GEAR_KEYS=Object.freeze(['vest','padding','boots']);
export const GEAR_RECIPES=Object.freeze({vest:'reinforcedVest',padding:'chitinPadding',boots:'trailBoots'});
const owned=(survival,key)=>survival?.crafted?.[GEAR_RECIPES[key]]===true;
export function normalizeGear(survival,saved){
  if(!survival||typeof survival!=='object')return null;
  if(saved===undefined)return Object.fromEntries(GEAR_KEYS.map(key=>[key,owned(survival,key)])); // legado: fabricado implicava equipado
  if(!saved||typeof saved!=='object'||Array.isArray(saved)||Object.keys(saved).length!==GEAR_KEYS.length)return null;
  if(!GEAR_KEYS.every(key=>typeof saved[key]==='boolean'&&(!saved[key]||owned(survival,key))))return null;
  if(Object.keys(saved).some(key=>!GEAR_KEYS.includes(key)))return null;
  return {...saved};
}
export function isGearEquipped(survival,key){return GEAR_KEYS.includes(key)&&owned(survival,key)&&survival.equippedGear?.[key]===true;}
export function setGearEquipped(survival,key,value){
  if(!GEAR_KEYS.includes(key)||typeof value!=='boolean'||!owned(survival,key)||!survival.equippedGear)return false;
  if(survival.equippedGear[key]===value)return false;
  survival.equippedGear[key]=value;return true;
}
export function equipNewCraft(survival,recipe){
  const key=GEAR_KEYS.find(key=>GEAR_RECIPES[key]===recipe);
  return key?setGearEquipped(survival,key,true):false;
}
