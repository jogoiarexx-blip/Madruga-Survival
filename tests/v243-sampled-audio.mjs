import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SAMPLE_SOURCE,SAMPLE_REVISION,SAMPLE_PATHS,sampleUrls,createSampleBank} from '../src/audio/sample-bank.js';
import {initAudio,setAudioSettings,setAudioPaused,sfx,audioDebug} from '../src/audio/sfx.js';
let cases=0;
function test(name,fn){awaited.push(Promise.resolve().then(fn).then(()=>console.log(`OK v2.43 ${++cases}: ${name}`)));}
const awaited=[];
const source=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
test('manifesto CC0 possui caminhos fixos e válidos, sem scripts externos',()=>{
 assert.ok(SAMPLE_SOURCE.startsWith('https://github.com/'));
 assert.match(SAMPLE_REVISION,/^[a-f0-9]{40}$/);
 for(const [id,path] of Object.entries(SAMPLE_PATHS)){
  assert.match(id,/^[a-zA-Z]+$/);assert.match(path,/^(impact-sounds|rpg-audio)\/Audio\/[a-zA-Z0-9_]+\.ogg$/);
  assert.equal(sampleUrls(id).length,2);
  assert.ok(sampleUrls(id).every(url=>url.includes(SAMPLE_REVISION)));
 }
 assert.equal(sampleUrls('evil').length,0);
});
test('amostras são solicitadas apenas sob demanda e cacheadas após decodificação',async()=>{
 let fetchCount=0,decoded=0,soundStarted=0;
 const context={decodeAudioData:async()=>{decoded++;return {duration:.25}},
  createBufferSource:()=>({playbackRate:{value:1},connect(){},disconnect(){},start(){soundStarted++},stop(){}}),
  createGain:()=>({gain:{value:0},connect(){},disconnect(){}})};
 const bank=createSampleBank({context,fetcher:async()=>{fetchCount++;return {ok:true,headers:{get:()=>null},arrayBuffer:async()=>new ArrayBuffer(512)}},
  canPlay:()=>true});
 assert.equal(fetchCount,0);
 assert.equal(bank.play('doorOpen',{destination:{}}),false);
 await bank.load('doorOpen');
 assert.equal(fetchCount,1);assert.equal(decoded,1);
 assert.equal(bank.play('doorOpen',{destination:{}}),true);assert.equal(soundStarted,1);
 await bank.load('doorOpen');assert.equal(fetchCount,1);
});
test('falha de rede e arquivo inválido não impedem fallback',async()=>{
 let calls=0;
 const bank=createSampleBank({context:{decodeAudioData:async()=>({duration:3})},
  fetcher:async()=>{calls++;throw Error('offline')},clock:()=>1000,retryMs:60000});
 assert.equal(await bank.load('grassA'),null);assert.equal(calls,2);
 assert.equal(await bank.load('grassA'),null);assert.equal(calls,2);
 assert.equal(bank.play('grassA',{destination:{}}),false);
});
test('enfileiramento tem máximo de 3 downloads simultâneos',async()=>{
 let current=0,max=0;
 const bank=createSampleBank({context:{decodeAudioData:async()=>({duration:1})},maxParallel:3,
  fetcher:async()=>{
   current++;max=Math.max(current,max);
   await new Promise(resolve=>setImmediate(resolve));current--;
   return {ok:true,headers:{get:()=>null},arrayBuffer:async()=>new ArrayBuffer(256)};
  }});
 await Promise.all(Object.keys(SAMPLE_PATHS).map(id=>bank.load(id)));
 assert.ok(max<=3);assert.equal(bank.status().ready,Object.keys(SAMPLE_PATHS).length);
});
test('reject grande ou áudio longo, nunca toca conteúdo inválido',async()=>{
 const bank=createSampleBank({context:{decodeAudioData:async()=>({duration:120})},
  fetcher:async()=>({ok:true,headers:{get:()=>null},arrayBuffer:async()=>new ArrayBuffer(512)})});
 assert.equal(await bank.load('chop'),null);
 assert.equal(bank.status().failed,1);
});
test('áudio mantém mute, pausa e limite de vozes com fonte indisponível',()=>{
 // Sem AudioContext: deve permanecer opcional, sem erro ao executar eventos.
 setAudioSettings({muted:true});setAudioPaused(true);
 assert.equal(sfx.door(true),false);assert.equal(sfx.footstep(true),false);
 assert.ok(audioDebug().voices<=audioDebug().maxVoices);
});
test('jogo integra os samples sem remover WebAudio ou a ambiência',()=>{
 const sfxSource=source('src/audio/sfx.js');
 assert.match(sfxSource,/sampled\(opening\?'doorOpen':'doorClose'/);
 assert.match(sfxSource,/sampled\('craft'/);
 assert.match(sfxSource,/function tone\(/);
 assert.match(sfxSource,/updateSoundscape/);
 assert.match(sfxSource,/MAX_VOICES=18/);
});
test('saves não incorporam dados de áudio e HTML usa build atualizado',()=>{
 assert.equal(JSON.parse(source('package.json')).version,'2.51.0');
 assert.match(source('index.html'),/2\.43\.0-foley|2\.44\.0-quiet-builds|2\.45\.0-stable-play|2\.47\.0-multi-floor|2\.48\.0-interactive-fishing|2\.49\.0-fish-lod-rig|2\.51\.0-lake-shore-lod/);
 assert.match(source('src/main.js'),/sfx\.js\?v=2\.44\.0-quiet/);
 assert.doesNotMatch(source('src/gameplay/save-system.js'),/sampleBank|kenney|audioBlob/);
 assert.match(source('ASSETS-SONS-CC0.md'),/Creative Commons Zero/);
});
await Promise.all(awaited);
console.log(`v2.43: ${cases} novos testes aprovados`);
