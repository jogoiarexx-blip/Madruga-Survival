import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFrameDriver,createAssetPipeline,PAUSED_RENDER_MS} from '../src/render/startup-scheduler.js';
let count=0;
const test=async(name,fn)=>{await fn();console.log('OK v2.21 '+(++count)+': '+name);};
function harness(){
 const frames=new Map(),timers=new Map();let next=1,mode='off',rendered=0;
 const driver=createFrameDriver({
   requestFrame:fn=>{const id=next++;frames.set(id,fn);return id;},
   cancelFrame:id=>frames.delete(id),
   setTimer:(fn,ms)=>{const id=next++;timers.set(id,{fn,ms});return id;},
   clearTimer:id=>timers.delete(id),
   getMode:()=>mode,
   onFrame:()=>{rendered++;}
 });
 function tickFrame(){const [id,fn]=frames.entries().next().value||[];if(fn){frames.delete(id);fn();}}
 function tickTimer(){const [id,t]=timers.entries().next().value||[];if(t){timers.delete(id);t.fn();}}
 return {driver,frames,timers,tickFrame,tickTimer,setMode:value=>mode=value,get rendered(){return rendered}};
}
await test('menu inicial não agenda RAF nem timers e nunca renderiza',()=>{
 const h=harness();assert.equal(h.frames.size,0);assert.equal(h.timers.size,0);
 h.driver.wake();assert.equal(h.rendered,0);
 h.driver.start();assert.equal(h.frames.size,0);assert.equal(h.timers.size,0);
});
await test('jogo agenda apenas um frame e mantém um agendamento por vez',()=>{
 const h=harness();h.setMode('play');h.driver.start();
 assert.equal(h.frames.size,1);assert.equal(h.timers.size,0);
 h.tickFrame();assert.equal(h.rendered,1);assert.equal(h.frames.size,1);
 h.tickFrame();assert.equal(h.rendered,2);assert.equal(h.frames.size,1);
 h.driver.wake();assert.equal(h.frames.size,1);
});
await test('pausa usa apenas timer de 250ms, sem requestAnimationFrame contínuo',()=>{
 const h=harness();h.setMode('play');h.driver.start();h.tickFrame();
 h.setMode('pause');h.driver.wake();assert.equal(h.frames.size,0);assert.equal(h.timers.size,1);
 assert.equal([...h.timers.values()][0].ms,PAUSED_RENDER_MS);
 h.tickTimer();assert.equal(h.frames.size,1);h.tickFrame();assert.equal(h.rendered,2);
 assert.equal(h.frames.size,0);assert.equal(h.timers.size,1);
});
await test('aba oculta, game over e interrupção desligam todos agendamentos',()=>{
 const h=harness();h.setMode('play');h.driver.start();
 h.setMode('off');h.driver.wake();assert.equal(h.frames.size,0);assert.equal(h.timers.size,0);
 h.tickFrame();assert.equal(h.rendered,0);
 h.setMode('pause');h.driver.wake();assert.equal(h.timers.size,1);
 h.driver.stop();assert.equal(h.frames.size,0);assert.equal(h.timers.size,0);
 h.setMode('play');h.driver.wake();assert.equal(h.frames.size,0);
 h.driver.start();assert.equal(h.frames.size,1);
});
await test('pipeline somente começa sob comando, carrega na sequência correta, uma vez só',async()=>{
 const calls=[],progress=[];let releaseFirst;
 const pipeline=createAssetPipeline({stages:[
  {name:'Player',load:()=>{calls.push('player');return new Promise(r=>{releaseFirst=r;});}},
  {name:'Zumbis',load:async()=>{calls.push('zombie');return true;}},
  {name:'Aranha',load:async()=>{calls.push('spider');return true;}}
 ],onProgress:info=>progress.push(info)});
 assert.equal(pipeline.started,false);assert.deepEqual(calls,[]);
 const job=pipeline.start();assert.equal(job,pipeline.start());
 assert.deepEqual(calls,['player']);releaseFirst(true);
 assert.deepEqual(await job,[true,true,true]);
 assert.deepEqual(calls,['player','zombie','spider']);
 assert.equal(progress.at(-1).complete,true);
});
await test('falha de rig opcional não impede os demais',async()=>{
 const found=[];
 const pipeline=createAssetPipeline({stages:[
  {name:'Player',load:async()=>false},
  {name:'Zumbi',load:async()=>true},
  {name:'Spider',load:async()=>{found.push('spider');return true;}}
 ]});
 assert.deepEqual(await pipeline.start(),[false,true,true]);assert.deepEqual(found,['spider']);
});
await test('main não dispara GLBs nem RAF na importação, só no botão Iniciar/Retomar',()=>{
 const code=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.doesNotMatch(code,/^void playerRev5\.preload\(\);/m);
 const init=code.slice(code.indexOf('function initWorld()'),code.indexOf('// Checkpoints.'));
 assert.doesNotMatch(init,/void zombieModels\.preload\(\);|void spiderModels\.preload\(\);/);
 assert.match(code,/gameCanvas\.style\.visibility='hidden'/);
 assert.match(code,/function ensureRenderer\(\)/);
 assert.match(code,/let ground=null/);
 assert.match(code,/ground=createTerrain\(THREE,scene,getGroundHeight\)/);
 assert.match(code,/gameCanvas\.style\.visibility='visible'/);
 assert.match(code,/frameDriver\.start\(\)/);
 assert.doesNotMatch(code,/\nupdateHUD\(\);\n?animate\(\);/);
 assert.match(code,/await adventureLoader\.start\(stages\)/);
 assert.match(code,/createFrameDriver\(/);
});
await test('assets de inimigos só carregam automaticamente por padrão; v2.21 adia até o jogo',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const zombie=readFileSync(new URL('../src/characters/zombie-models.js',import.meta.url),'utf8');
 const spider=readFileSync(new URL('../src/characters/spider-model.js',import.meta.url),'utf8');
 assert.ok(main.includes('deferPreload:true'));
 for(const code of [zombie,spider]){assert.match(code,/deferPreload=false/);assert.match(code,/!deferPreload&&!asset&&!failed/);}
});
await test('menu informa carregamento sob demanda, mantém seletores e resume save',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const css=readFileSync(new URL('../styles/main.css',import.meta.url),'utf8');
 for(const id of ['start-btn','load-btn','gfx-low','gfx-med','gfx-high','asset-loading-status','menu-performance-tip'])assert.ok(html.includes(`id="${id}"`),id);
 assert.match(html,/data-build="(?:2\.22\.0-gpu|2\.23\.0-goblin|2\.24\.0-goblin-ik|2\.25\.0-menu-hud|2\.27\.0-recovery|2\.28\.0-model-cache|2\.29\.0-enemy-pool|2\.29\.1-goblin-visible|2\.30\.0-chaves-workbench|2\.31\.0-chaves-patrol-ai|2\.32\.0-chaves-orders|2\.34\.0-chaves-combat|2\.35\.0-stability|2\.36\.0-wildlife-inventory|2\.37\.0-campfire-ui|2\.38\.0-save-profiling|2\.39\.0-wildlife-quests)"/);
 assert.match(css,/#menu-performance-tip/);
});
console.log('v2.21: '+count+' novos cenários aprovados');
