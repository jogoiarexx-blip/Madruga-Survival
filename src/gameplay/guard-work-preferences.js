// Preferências de coleta compatíveis com saves existentes, sem dependências 3D.
export const GUARD_WORK_KEYS=Object.freeze(['wood','stone','fiber','berries','water','seeds','vegetables']);
export const GUARD_WORK_LABELS=Object.freeze({wood:'🪵 Madeira',stone:'🪨 Pedra',fiber:'🌿 Fibra',berries:'🫐 Frutas',water:'💧 Água',seeds:'🌱 Sementes',vegetables:'🥕 Legumes'});
export const GUARD_FARM_KEY='farm';
export const GUARD_WORK_DEFAULT=Object.freeze(Object.fromEntries([...GUARD_WORK_KEYS,GUARD_FARM_KEY].map(k=>[k,true])));
export function validGuardWorkPreferences(data){
 return !!data&&typeof data==='object'&&!Array.isArray(data)&&
  Object.keys(data).every(k=>Object.hasOwn(GUARD_WORK_DEFAULT,k)&&typeof data[k]==='boolean');
}
export function normalizeGuardWorkPreferences(data){
 return {...GUARD_WORK_DEFAULT,...(validGuardWorkPreferences(data)?data:{})};
}
export function guardCanCollect(preferences,type){
 return GUARD_WORK_KEYS.includes(type)&&normalizeGuardWorkPreferences(preferences)[type];
}
