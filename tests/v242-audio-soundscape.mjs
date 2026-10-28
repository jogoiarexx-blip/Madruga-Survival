import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeAudioSettings,distanceVolume,soundscapeVolumes,canTrigger} from '../src/audio/audio-rules.js';
import {initAudio,setAudioPaused,setAudioSettings,getAudioSettings,updateSoundscape,sfx,audioDebug} from '../src/audio/sfx.js';
let count=0;
const test=(label,callback)=>{callback();console.log(`OK v2.42 ${++count}: ${label}`);};
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('configuração normaliza valores e rejeita volume inválido',()=>{
 const v=normalizeAudioSettings({master:4,effects:-1,ambient:'sem número',muted:true});
 assert.deepEqual(v,{master:1,effects:0,ambient:.55,muted:true});
});
test('atenuação por distância não permite ganho negativo ou NaN',()=>{
 assert.equal(distanceVolume(0),1);assert.equal(distanceVolume(26),0);
 assert.equal(distanceVolume(-1),0);assert.equal(distanceVolume(NaN),0);
 assert.ok(distanceVolume(12)<distanceVolume(2));
});
test('paisagem altera volume de água, vento e noite de forma segura',()=>{
 const day=soundscapeVolumes({nearWater:0,night:false}),far=soundscapeVolumes({nearWater:100}),night=soundscapeVolumes({nearWater:12,night:true});
 assert.ok(day.water>far.water);assert.ok(night.night>0);assert.equal(day.night,0);
 assert.deepEqual(soundscapeVolumes({nearWater:0,active:false}),{wind:0,water:0,night:0});
});
test('cooldown protege áudio de efeitos repetidos e tempo inválido',()=>{
 assert.equal(canTrigger(undefined,0,.2),true);assert.equal(canTrigger(3,3.1,.3),false);
 assert.equal(canTrigger(3,3.31,.3),true);assert.equal(canTrigger(0,NaN,.2),false);
});
class Gain{constructor(){this.gain={value:0,setValueAtTime(){},exponentialRampToValueAtTime(){},cancelScheduledValues(){},setTargetAtTime(value){this.value=value;}};}connect(){}disconnect(){}}
class Oscillator{constructor(){this.frequency={value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}};}connect(){}disconnect(){}start(){}stop(){this.onended?.();}}
class AudioMock{
 constructor(){this.state='running';this.currentTime=1;this.sampleRate=48000;this.destination={};this.noiseSources=0;}
 createGain(){return new Gain();}
 createOscillator(){return new Oscillator();}
 createBuffer(_channels,length){return {getChannelData:()=>new Float32Array(length)};}
 createBufferSource(){this.noiseSources++;return {loop:false,connect(){},start(){},stop(){}};}
 createBiquadFilter(){return {frequency:{value:0},connect(){}};}
 resume(){return Promise.resolve();}
}
test('áudio não cria contexto antes do gesto explícito',()=>{
 assert.equal(audioDebug().context,'off');assert.equal(audioDebug().landscape,false);
 setAudioSettings({master:.5});assert.equal(audioDebug().context,'off');
});
test('mixer de teste inicia com controle de volume persistido',()=>{
 globalThis.AudioContext=AudioMock;
 assert.equal(initAudio(),true);assert.equal(audioDebug().context,'running');
 assert.equal(setAudioSettings({effects:.2,ambient:.7,muted:false}).master,.5);
 assert.deepEqual(getAudioSettings(),{master:.5,effects:.2,ambient:.7,muted:false});
});
test('paisagem só nasce em partida ativa e respeita pausa e mute',()=>{
 updateSoundscape({active:false,nearWater:0,dt:1});assert.equal(audioDebug().landscape,false);
 setAudioPaused(false);updateSoundscape({active:true,nearWater:0,dt:.5,night:false});
 assert.equal(audioDebug().landscape,true);
 setAudioPaused(true);assert.equal(audioDebug().paused,true);
 setAudioSettings({muted:true});setAudioPaused(false);
 const before=audioDebug().voices;sfx.attack();assert.equal(audioDebug().voices,before);
});
test('controla concorrência de eventos sem deixar vozes acumuladas',()=>{
 setAudioSettings({muted:false});setAudioPaused(false);
 for(let n=0;n<100;n++){sfx.attack();sfx.spiderWeb(2);sfx.footstep(true);}
 assert.ok(audioDebug().voices<=audioDebug().maxVoices);
});
test('interface contém controles duplos sincronizáveis e não grava no save',()=>{
 const html=source('index.html');
 assert.equal(html.match(/data-audio-setting="master"/g)?.length,2);
 assert.equal(html.match(/data-audio-setting="effects"/g)?.length,2);
 assert.equal(html.match(/data-audio-setting="ambient"/g)?.length,2);
 assert.equal(html.match(/data-audio-toggle/g)?.length,2);
 assert.match(source('src/main.js'),/setupSoundSettings\(\)/);
 assert.match(source('src/main.js'),/setAudioPaused\(!running\)/);
 assert.match(source('src/main.js'),/sfx\.footstep\(runningFast,sneaking\)/);
 assert.match(source('src/main.js'),/sfx\.chavesShot/);
 assert.match(source('src/world/wildlife.js'),/onSound\('boar',dist\)/);
 assert.equal(JSON.parse(source('package.json')).version,'2.50.0');
});
console.log(`v2.42.0: ${count} regressões de áudio aprovadas`);
