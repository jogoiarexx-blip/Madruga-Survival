import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createAdventureLoader} from '../src/render/adventure-loader.js';

let n=0;
async function test(name,fn){await fn();console.log(`OK v2.26 ${++n}: ${name}`);}
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

await test('sem progresso fictício: percentual vem somente de etapas concluídas',async()=>{
 const states=[],events=[];let yields=0;
 const loader=createAdventureLoader({yieldToBrowser:async()=>{yields++;},onProgress:s=>states.push(s)});
 const stages=['Terreno','Save','Shaders'].map(name=>({name,load:async()=>{events.push(name);}}));
 const result=await loader.start(stages);
 assert.deepEqual(events,['Terreno','Save','Shaders']);
 assert.deepEqual(states.map(s=>s.percent),[0,0,33,33,67,67,100,100]);
 assert.deepEqual(states.map(s=>s.status).at(-1),'ready');
 assert.equal(result.total,3);assert.equal(yields,4);
 assert.equal(loader.running,false);
});
await test('modelos opcionais falham sem impedir o jogo ou reiniciar o carregamento',async()=>{
 const states=[];let succeeded=0;const old=console.warn;console.warn=()=>{};
 try{
 const loader=createAdventureLoader({onProgress:s=>states.push(s)});
 const outcome=await loader.start([
  {name:'Player',optional:true,load:async()=>false},
  {name:'Zumbis',optional:true,load:()=>{throw Error('download');}},
  {name:'Render',load:()=>{succeeded++;}}
 ]);
 assert.equal(succeeded,1);
 assert.deepEqual(outcome.optionalFailures,['Player','Zumbis']);
 assert.equal(states.at(-1).percent,100);
 assert.equal(states.at(-1).status,'ready');
 }finally{console.warn=old;}
});
await test('falha no mundo não ativa etapas seguintes e informa erro',async()=>{
 const states=[];let more=0;
 const loader=createAdventureLoader({onProgress:s=>states.push(s)});
 await assert.rejects(()=>loader.start([
   {name:'Mundo',load:()=>{throw Error('WebGL unavailable');}},
   {name:'Start',load:()=>{more++;}}
 ]),/WebGL unavailable/);
 assert.equal(more,0);assert.equal(states.at(-1).status,'error');
 assert.equal(states.at(-1).percent,0);assert.equal(loader.running,false);
});
await test('botões simultâneos compartilham um único processo',async()=>{
 let release=()=>{},loads=0;
 const loader=createAdventureLoader({yieldToBrowser:()=>new Promise(r=>{release=r;})});
 const stages=[{name:'Cena',load:()=>{loads++;}}];
 const a=loader.start(stages),b=loader.start(stages);
 assert.equal(a,b);assert.equal(loader.running,true);
 release();await Promise.resolve();release();await a;
 assert.equal(loads,1);assert.equal(loader.running,false);
});
await test('HTML oferece loading acessível, retomada e confirmação para pointer lock',async()=>{
 const html=read('index.html');
 for(const id of ['loading-screen','loading-stage','loading-progress','loading-progress-fill','loading-percent',
  'loading-stage-count','loading-enter','loading-retry','loading-warning','start-btn','load-btn']){
  assert.ok(html.includes(`id="${id}"`),id);
 }
 assert.match(html,/aria-modal="true"[^>]*aria-labelledby="loading-title"/);
 assert.match(html,/role="progressbar"[^>]*aria-valuemin="0"[^>]*aria-valuemax="100"/);
 assert.match(html,/data-build="2\.27\.0-recovery|2\.28\.0-model-cache|2\.29\.0-enemy-pool|2\.29\.1-goblin-visible|2\.30\.0-chaves-workbench|2\.31\.0-chaves-patrol-ai|2\.32\.0-chaves-orders|2\.34\.0-chaves-combat|2\.35\.0-stability|2\.36\.0-wildlife-inventory|2\.32\.0-chaves-orders|2\.34\.0-chaves-combat|2\.35\.0-stability|2\.36\.0-wildlife-inventory|2\.37\.0-campfire-ui|2\.38\.0-save-profiling|2\.39\.0-wildlife-quests|2\.40\.0-fauna-exploration|2\.41\.0-ecosystem|2\.42\.0-soundscape|2\.43\.0-foley"/);
});
await test('main bloqueia simulação no loading e libera o mouse somente via clique final',async()=>{
 const code=read('src/main.js');
 assert.match(code,/gameActive = false;/);
 assert.match(code,/getMode:\(\)=>!gameActive\|\|document\.hidden\?'off'/);
 assert.match(code,/async function beginAdventure\(restore=false\)/);
 assert.match(code,/await adventureLoader\.start\(stages\)/);
 assert.match(code,/loadingEnter\.onclick=\(\)=>\{/);
 const enter=code.slice(code.indexOf('loadingEnter.onclick='),code.indexOf('function showPauseMenu('));
 assert.ok(enter.indexOf('gameActive=true')<enter.indexOf('controls.lock()'));
 const loading=code.slice(code.indexOf('async function beginAdventure('),code.indexOf("document.getElementById('start-btn').onclick"));
 assert.ok(loading.indexOf('menuPreview?.dispose()')<loading.indexOf('initWorld()'));
 assert.doesNotMatch(loading,/clearSave\(progressStorage\)/);
 assert.ok(!loading.includes('frameDriver.start()'));
 assert.match(code,/if\(adventureLoading\)\{e\.preventDefault\(\);return;\}/);
});
await test('estilos mantêm loading legível em celular e sem assets ou animações extra',async()=>{
 const css=read('styles/main.css');
 assert.match(css,/#loading-screen\{position:fixed;inset:0;z-index:260/);
 assert.match(css,/#loading-progress-fill\{height:100%;width:0%/);
 assert.match(css,/@media\(max-width:600px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 const pkg=JSON.parse(read('package.json'));
 assert.equal(pkg.version,'2.43.0');
 assert.match(pkg.scripts.test,/v226-adventure-loading/);
});
console.log(`v2.26: ${n} cenários de loading aprovados`);
