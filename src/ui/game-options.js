export const OPTIONS_KEY='madrugacraft.options.v1';
export const DEFAULT_OPTIONS=Object.freeze({fov:65,sensitivity:1,invertY:false,showFps:false});
export const OPTION_LIMITS=Object.freeze({fov:[55,90],sensitivity:[.4,2.5]});
const within=(v,[lo,hi],fallback)=>typeof v==='number'&&Number.isFinite(v)?Math.min(hi,Math.max(lo,v)):fallback;
export function normalizeOptions(raw){
 const s=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
 return {fov:Math.round(within(s.fov,OPTION_LIMITS.fov,65)),sensitivity:Math.round(within(s.sensitivity,OPTION_LIMITS.sensitivity,1)*20)/20,
 invertY:typeof s.invertY==='boolean'?s.invertY:false,showFps:typeof s.showFps==='boolean'?s.showFps:false};
}
export function loadOptions(storage){try{const v=storage?.getItem(OPTIONS_KEY);return normalizeOptions(v?JSON.parse(v):null)}catch(_){return normalizeOptions(null)}}
export function saveOptions(storage,v){const o=normalizeOptions(v);try{storage?.setItem(OPTIONS_KEY,JSON.stringify(o))}catch(_){}return o}
export function lookDelta(options,x,y){const k=.003*options.sensitivity;return {yaw:-x*k,pitch:y*k*(options.invertY?-1:1)}}
export function describeSave(save,now=Date.now()){
 if(!save)return '';
 const s=[`Dia ${save.survival?.days??1}`,`Nível ${save.level??1}`];
 const at=save.savedAt;
 if(typeof at==='number'&&Number.isFinite(at)&&at<=now+60000){const m=Math.max(0,Math.floor((now-at)/60000));
 s.push(m<1?'salvo agora':m<60?`salvo há ${m} min`:m<1440?`salvo há ${Math.round(m/60)} h`:`salvo há ${Math.round(m/1440)} d`)}
 return s.join(' · ');
}
