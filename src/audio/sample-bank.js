// Reprodução de amostras CC0 opcionais. Não bloqueia nem a partida nem os sons procedurais.
// Fontes: Kenney Impact Sounds e RPG Audio (CC0 1.0), cópia pública com commit fixado.
export const SAMPLE_SOURCE='https://github.com/GeorgeQLe/assets-sfx-combat';
export const SAMPLE_REVISION='9662dc1bed3b06ae753045915f9accfac044c7ce';
const base=`assets/kenney/`;
export const SAMPLE_PATHS=Object.freeze({
  grassA:'impact-sounds/Audio/footstep_grass_000.ogg',
  grassB:'impact-sounds/Audio/footstep_grass_002.ogg',
  woodStep:'impact-sounds/Audio/footstep_wood_002.ogg',
  stoneStep:'impact-sounds/Audio/footstep_concrete_000.ogg',
  hitSoft:'impact-sounds/Audio/impactSoft_medium_000.ogg',
  hitHeavy:'impact-sounds/Audio/impactGeneric_light_001.ogg',
  woodHit:'impact-sounds/Audio/impactWood_heavy_002.ogg',
  metalHit:'impact-sounds/Audio/impactMetal_medium_002.ogg',
  doorOpen:'rpg-audio/Audio/doorOpen_1.ogg',
  doorClose:'rpg-audio/Audio/doorClose_1.ogg',
  chop:'rpg-audio/Audio/chop.ogg',
  craft:'rpg-audio/Audio/metalClick.ogg',
  collect:'rpg-audio/Audio/clothBelt.ogg'
});
export function sampleUrls(id){
 const path=SAMPLE_PATHS[id];if(!path)return [];
 return [
  `https://cdn.jsdelivr.net/gh/GeorgeQLe/assets-sfx-combat@${SAMPLE_REVISION}/${base}${path}`,
  `https://raw.githubusercontent.com/GeorgeQLe/assets-sfx-combat/${SAMPLE_REVISION}/${base}${path}`
 ];
}
export function createSampleBank({context,fetcher=globalThis.fetch,clock=()=>Date.now(),onStart=()=>{},onEnd=()=>{},canPlay=()=>true,maxParallel=3,retryMs=180000}={}){
 const slots=new Map();let inFlight=0;const queue=[];
 function runQueue(){
  while(inFlight<maxParallel&&queue.length){
   const job=queue.shift();inFlight++;
   job().finally(()=>{inFlight--;runQueue();});
  }
 }
 async function download(id){
  if(typeof fetcher!=='function'||typeof context?.decodeAudioData!=='function')return null;
  for(const url of sampleUrls(id)){
   const controller=typeof AbortController==='function'?new AbortController():null;
   const timeout=controller?setTimeout(()=>controller.abort(),6500):null;
   try{
    const response=await fetcher(url,controller?{signal:controller.signal,mode:'cors'}:{mode:'cors'});
    if(!response?.ok)continue;
    const length=Number(response.headers?.get?.('content-length'));
    if(length>192000)continue;
    const binary=await response.arrayBuffer();
    if(binary.byteLength<128||binary.byteLength>192000)continue;
    const audio=await context.decodeAudioData(binary.slice(0));
    if(audio?.duration>0&&audio.duration<8)return audio;
   }catch(_){}finally{if(timeout!==null)clearTimeout(timeout);}
  }
  return null;
 }
 function load(id){
  if(!sampleUrls(id).length)return Promise.resolve(null);
  let slot=slots.get(id);
  if(slot?.audio)return Promise.resolve(slot.audio);
  if(slot?.promise)return slot.promise;
  if(slot && clock()<slot.failedAt+retryMs)return Promise.resolve(null);
  slot={audio:null,promise:null,failedAt:0};slots.set(id,slot);
  slot.promise=new Promise(resolve=>{
   queue.push(async()=>{
    const audio=await download(id);
    slot.audio=audio;
    if(!audio)slot.failedAt=clock();
    slot.promise=null;
    resolve(audio);
   });runQueue();
  });
  return slot.promise;
 }
 function play(id,{destination,volume=.1,rate=1}={}){
  if(!canPlay()||!destination)return false;
  const audio=slots.get(id)?.audio;
  if(!audio){load(id);return false;}
  if(typeof context.createBufferSource!=='function')return false;
  try{
   const source=context.createBufferSource(),gain=context.createGain();
   source.buffer=audio;
   source.playbackRate.value=Math.max(.85,Math.min(1.15,rate));
   gain.gain.value=Math.max(0,Math.min(.38,volume));
   source.connect(gain);gain.connect(destination);
   onStart();
   source.onended=()=>{onEnd();try{source.disconnect();gain.disconnect();}catch(_){}};
   source.start();return true;
  }catch(_){return false;}
 }
 function preload(ids){
  if(typeof context?.decodeAudioData!=='function')return;
  ids.forEach(id=>load(id));
 }
 return {load,play,preload,status(){
  let ready=0,pending=0,failed=0;
  for(const s of slots.values()){if(s.audio)ready++;else if(s.promise)pending++;else failed++;}
  return {ready,pending,failed,requestsInFlight:inFlight};
 }};
}
