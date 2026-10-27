// Mixer procedural WebAudio: sem downloads e sem áudio antes de ação do jogador.
// Vozes curtas com limite de concorrência, categorias independentes e paisagem sonora em loop.
import {AUDIO_STORAGE_KEY,DEFAULT_AUDIO_SETTINGS,normalizeAudioSettings,distanceVolume,
 canTrigger,soundscapeVolumes} from './audio-rules.js';
import {createSampleBank} from './sample-bank.js';
let ctx=null,master=null,effectBus=null,ambientBus=null,landscape=null,sampleBank=null;
let settings={...DEFAULT_AUDIO_SETTINGS},paused=true,activeVoices=0,noiseClip=null;
const MAX_VOICES=18,previous=new Map();
try{settings=normalizeAudioSettings(JSON.parse(globalThis.localStorage?.getItem(AUDIO_STORAGE_KEY)||'null'));}catch(_){}
function mix(){
 if(!master)return;
 master.gain.value=settings.muted?0:settings.master;
 effectBus.gain.value=paused?0:settings.effects;
 ambientBus.gain.value=settings.ambient;
}
export function getAudioSettings(){return {...settings};}
export function setAudioSettings(patch){
 settings=normalizeAudioSettings({...settings,...patch});mix();
 try{globalThis.localStorage?.setItem(AUDIO_STORAGE_KEY,JSON.stringify(settings));}catch(_){}
 return getAudioSettings();
}
export function initAudio(){
 try{
  const Ctor=globalThis.AudioContext||globalThis.webkitAudioContext;
  if(!Ctor)return false;
  if(!ctx){
   ctx=new Ctor();master=ctx.createGain();effectBus=ctx.createGain();ambientBus=ctx.createGain();
   effectBus.connect(master);ambientBus.connect(master);master.connect(ctx.destination);mix();
   sampleBank=createSampleBank({context:ctx,onStart:()=>{activeVoices++},
     onEnd:()=>{activeVoices=Math.max(0,activeVoices-1)},
     canPlay:()=>activeVoices<MAX_VOICES&&ready()});
   // Sem bloqueio: o jogo inicia usando áudio procedural enquanto decodifica as amostras.
   sampleBank.preload(['grassA','grassB','woodStep','hitSoft','doorOpen','doorClose','craft']);
  }
  if(ctx.state==='suspended')ctx.resume()?.catch?.(()=>{});
  return true;
 }catch(_){return false;}
}
export function setAudioPaused(value){
 if(paused===!!value)return;
 paused=!!value;
 mix(); // pausa silencia imediatamente as vozes já iniciadas, inclusive samples
 updateLandscapeGains({active:false});
}
function ready(bus='effects'){
 return !!(ctx&&ctx.state==='running'&&!paused&&!settings.muted&&settings.master>0&&settings[bus]>0);
}
function tone(freq,duration=.1,type='sine',volume=.12,{delay=0,to=null,bus='effects'}={}){
 if(!ready(bus)||activeVoices>=MAX_VOICES||!Number.isFinite(freq)||freq<=0||volume<=0)return false;
 try{
  const t=ctx.currentTime+Math.max(0,delay),end=t+Math.max(.02,Math.min(1.6,duration));
  const osc=ctx.createOscillator(),gain=ctx.createGain();
  osc.type=type;osc.frequency.setValueAtTime(freq,t);
  if(to>0)osc.frequency.exponentialRampToValueAtTime(to,end);
  gain.gain.setValueAtTime(.0001,t);
  gain.gain.exponentialRampToValueAtTime(Math.max(.0002,Math.min(.3,volume)),t+.012);
  gain.gain.exponentialRampToValueAtTime(.0001,end);
  osc.connect(gain);gain.connect(bus==='ambient'?ambientBus:effectBus);
  activeVoices++;
  osc.onended=()=>{activeVoices=Math.max(0,activeVoices-1);try{osc.disconnect();gain.disconnect();}catch(_){}};
  osc.start(t);osc.stop(end+.012);
  return true;
 }catch(_){return false;}
}
function sample(id,volume=.1,rate=1){
 return sampleBank?.play(id,{destination:effectBus,volume,rate})||false;
}
function sampled(id,volume,fallback,rate=1){
 return sample(id,volume,rate)||fallback();
}
function noiseBurst(duration=.12,volume=.06,{lowpass=1700,bus='effects'}={}){
 if(!ready(bus)||activeVoices>=MAX_VOICES||!ctx.createBufferSource||!ctx.createBiquadFilter)return false;
 try{
  if(!noiseClip){
   noiseClip=ctx.createBuffer(1,Math.max(512,Math.floor(ctx.sampleRate*.75)),ctx.sampleRate);
   const data=noiseClip.getChannelData(0);
   for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
  }
  const time=ctx.currentTime,length=Math.min(.65,Math.max(.035,duration));
  const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
  src.buffer=noiseClip;filter.type='lowpass';filter.frequency.value=lowpass;
  gain.gain.setValueAtTime(.0001,time);
  gain.gain.exponentialRampToValueAtTime(volume,time+.008);
  gain.gain.exponentialRampToValueAtTime(.0001,time+length);
  src.connect(filter);filter.connect(gain);gain.connect(bus==='ambient'?ambientBus:effectBus);
  activeVoices++;
  src.onended=()=>{activeVoices=Math.max(0,activeVoices-1);try{src.disconnect();filter.disconnect();gain.disconnect();}catch(_){}};
  src.start(time);src.stop(time+length+.016);return true;
 }catch(_){return false;}
}
function limited(name,cooldown,fn){
 if(!ready())return false;
 const now=ctx.currentTime;
 if(!canTrigger(previous.get(name),now,cooldown))return false;
 const played=fn();if(played!==false)previous.set(name,now);
 return played!==false;
}
function buildLandscape(){
 if(!ctx||landscape)return;
 const size=Math.max(2048,Math.floor(ctx.sampleRate*1.3));
 const buffer=ctx.createBuffer(1,size,ctx.sampleRate),data=buffer.getChannelData(0);
 // Ruído fixo de baixa intensidade, filtrado para vento e margem da lagoa.
 for(let i=0;i<size;i++)data[i]=Math.random()*2-1;
 function channel(type,frequency){
  const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
  source.buffer=buffer;source.loop=true;filter.type=type;filter.frequency.value=frequency;
  gain.gain.value=0;source.connect(filter);filter.connect(gain);gain.connect(ambientBus);source.start();
  return {source,gain};
 }
 const wind=channel('lowpass',310),water=channel('bandpass',1120);
 const cricket=ctx.createOscillator(),cricketGain=ctx.createGain();
 cricket.type='sine';cricket.frequency.value=4200;cricketGain.gain.value=0;
 cricket.connect(cricketGain);cricketGain.connect(ambientBus);cricket.start();
 landscape={wind,water,cricket,cricketGain,elapsed:0,birdAt:0,chirpIndex:0};
}
function fadeGain(node,value){
 if(!ctx||!node)return;
 const t=ctx.currentTime;
 node.gain.cancelScheduledValues(t);
 node.gain.setTargetAtTime(value,t,.28);
}
function updateLandscapeGains({nearWater=Infinity,night=false,active=true}={}){
 if(!landscape)return;
 const levels=soundscapeVolumes({nearWater,night,active:active&&!paused&&!settings.muted});
 fadeGain(landscape.wind.gain,levels.wind);
 fadeGain(landscape.water.gain,levels.water);
 fadeGain(landscape.cricketGain,levels.night);
}
export function updateSoundscape({nearWater=Infinity,night=false,active=false,dt=0}={}){
 if(!ctx||ctx.state!=='running')return;
 if(active&&!landscape)buildLandscape();
 updateLandscapeGains({nearWater,night,active});
 if(!landscape||!active||paused||settings.muted)return;
 const s=landscape;s.elapsed+=Math.max(0,Math.min(1,dt));
 // Pássaros distantes e espaçados, sem setTimeout e sem tocar no menu/pausa.
 if(!night&&s.elapsed>s.birdAt){
  const base=1030+(s.chirpIndex%4)*140;s.chirpIndex++;
  tone(base,.11,'sine',.032,{to:base*1.22,bus:'ambient'});
  tone(base*1.31,.13,'sine',.024,{to:base*.91,delay:.16,bus:'ambient'});
  s.birdAt=s.elapsed+7+(s.chirpIndex%5)*2.4;
 }
}
export function spiderSoundGain(distance,maxDistance=24){return distanceVolume(distance,maxDistance);}
export const sfx={
 collect:()=>limited('collect',.075,()=>sampled('collect',.18,()=>{tone(720,.075,'sine',.075,{to:1040});return tone(1150,.105,'sine',.055,{delay:.055});})),
 hit:()=>limited('hit',.06,()=>sampled('hitHeavy',.22,()=>{tone(170,.11,'triangle',.13,{to:70});return tone(420,.065,'sawtooth',.05,{to:135});})),
 attack:()=>limited('attack',.1,()=>sampled('chop',.16,()=>tone(320,.07,'triangle',.10,{to:120}))),
 damage:()=>limited('damage',.22,()=>sampled('hitSoft',.27,()=>{tone(145,.22,'sawtooth',.18,{to:60});return tone(85,.16,'triangle',.13);})),
 heal:()=>limited('heal',.12,()=>{tone(520,.15,'sine',.13);return tone(780,.20,'sine',.09,{delay:.10});}),
 boost:()=>limited('boost',.12,()=>{tone(580,.1,'triangle',.11);return tone(900,.16,'sine',.08,{delay:.08});}),
 win:()=>limited('win',1,()=>{tone(523,.16);tone(659,.16,'sine',.12,{delay:.18});return tone(784,.31,'sine',.12,{delay:.36});}),
 warning:()=>limited('warning',.65,()=>{tone(290,.19,'triangle',.09);return tone(215,.27,'triangle',.075,{delay:.10});}),
 lose:()=>limited('lose',1,()=>tone(110,.55,'sawtooth',.18,{to:55})),
 // Variação da frequência conforme movimento e estado do solo. Evita passo digital agudo.
 footstep:(running=false,soft=false)=>limited('footstep',running?.17:.26,()=>{
  const variation=.91+Math.random()*.20;
  const id=soft?'grassA':Math.random()<.5?'grassA':'grassB';
  return sampled(id,soft?.09:running?.22:.16,()=>
   tone((soft?95:125)*variation,running?.09:.065,'triangle',soft?.03:.065,{to:60}),variation);
 }),
 door:(opening=true)=>limited('door',.15,()=>sampled(opening?'doorOpen':'doorClose',.25,()=>{tone(opening?225:180,.13,'sawtooth',.06,{to:105});return tone(opening?95:70,.085,'triangle',.065,{delay:.09});})),
 craft:()=>limited('craft',.18,()=>sampled('craft',.20,()=>{tone(380,.085,'triangle',.10,{to:290});return tone(590,.17,'sine',.085,{delay:.075});})),
 fire:()=>limited('fire',.30,()=>noiseBurst(.075,.032,{lowpass:1850})||tone(260,.12,'triangle',.055,{to:105})),
 fish:()=>limited('fish',.35,()=>{tone(455,.12,'triangle',.07,{to:220});return tone(840,.13,'sine',.085,{delay:.1});}),
 chavesShot:(distance=0)=>limited('chavesShot',.14,()=>{
  const gain=distanceVolume(distance,40);
  // Estalo de pressão filtrado + corpo grave, sem aumentar o número máximo de vozes.
  const burst=noiseBurst(.075,.105*gain,{lowpass:3700});
  return tone(210,.085,'sawtooth',.11*gain,{to:67})||burst;
 }),
 rabbit:(distance=0)=>limited('rabbit',1.9,()=>tone(920,.08,'sine',.055*distanceVolume(distance,28),{to:1350})),
 boar:(distance=0)=>limited('boar',1.7,()=>{const gain=distanceVolume(distance,36);
  noiseBurst(.18,.035*gain,{lowpass:550});
  tone(120,.21,'sawtooth',.13*gain,{to:75});return tone(85,.16,'triangle',.065*gain,{delay:.08});}),
 spiderStep:d=>limited('spiderStep',.22,()=>tone(110,.065,'triangle',.04*spiderSoundGain(d,19))),
 spiderAttack:d=>tone(250,.12,'sawtooth',.085*spiderSoundGain(d)),
 spiderCharge:d=>limited('spiderCharge',.28,()=>tone(165,.23,'sawtooth',.07*spiderSoundGain(d))),
 spiderWeb:d=>tone(490,.16,'triangle',.09*spiderSoundGain(d)),
 spiderJump:d=>tone(225,.17,'triangle',.08*spiderSoundGain(d)),
 spiderHurt:d=>tone(180,.10,'sawtooth',.095*spiderSoundGain(d)),
 spiderDeath:d=>tone(75,.42,'triangle',.11*spiderSoundGain(d))
};
export function audioDebug(){return {voices:activeVoices,maxVoices:MAX_VOICES,context:ctx?.state||'off',paused,landscape:!!landscape,samples:sampleBank?.status()||{ready:0,pending:0,failed:0}};}
