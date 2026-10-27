// Regras puras: áudio continua opcional e sem dependência de WebAudio durante testes.
export const AUDIO_STORAGE_KEY='madruga-survival.audio.v1';
export const DEFAULT_AUDIO_SETTINGS=Object.freeze({master:0.80,effects:0.80,ambient:0.55,muted:false});
export function clampAudio(value,fallback=1){
 const n=Number(value);
 return Number.isFinite(n)?Math.max(0,Math.min(1,n)):fallback;
}
export function normalizeAudioSettings(value={}){
 const v=value&&typeof value==='object'?value:{};
 return {master:clampAudio(v.master,DEFAULT_AUDIO_SETTINGS.master),
  effects:clampAudio(v.effects,DEFAULT_AUDIO_SETTINGS.effects),
  ambient:clampAudio(v.ambient,DEFAULT_AUDIO_SETTINGS.ambient),muted:v.muted===true};
}
export function distanceVolume(distance,maxDistance=26){
 if(!Number.isFinite(distance)||distance<0||!Number.isFinite(maxDistance)||maxDistance<=0)return 0;
 const factor=Math.max(0,1-distance/maxDistance);
 return factor*factor;
}
export function canTrigger(last,now,cooldown=0){
 return Number.isFinite(now)&&Number.isFinite(cooldown)&&cooldown>=0&&(!Number.isFinite(last)||now-last>=cooldown);
}
export function soundscapeVolumes({nearWater=Infinity,night=false,active=true}={}){
 if(!active)return {wind:0,water:0,night:0};
 return {wind:night?.038:.055,water:.095*distanceVolume(Math.max(0,nearWater),55),night:night?.016:0};
}
