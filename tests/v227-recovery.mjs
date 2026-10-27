import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFrameDriver} from '../src/render/startup-scheduler.js';
let tested=0;
const check=(name,fn)=>{fn();console.log(`OK v2.27 ${++tested}: ${name}`);};
const source=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
check('scheduler interrompe frames após falha sem agendar outra execução',()=>{
  const frames=new Map();let next=0,calls=0,errors=[];
  const driver=createFrameDriver({
    requestFrame:fn=>{const id=++next;frames.set(id,fn);return id;},
    cancelFrame:id=>frames.delete(id),
    setTimer:()=>{throw Error('timer inesperado');},clearTimer:()=>{},
    getMode:()=> 'play',onFrame:()=>{calls++;throw new Error('crash HUD');},
    onError:e=>errors.push(e.message)
  });
  driver.start();const tick=[...frames.values()][0];frames.clear();tick();
  assert.deepEqual(errors,['crash HUD']);assert.equal(calls,1);
  assert.equal(driver.running,false);assert.equal(frames.size,0);
  driver.wake();assert.equal(frames.size,0);
});
check('modo sem handler mantém erro visível ao desenvolvedor',()=>{
  let tick;
  const driver=createFrameDriver({requestFrame:fn=>{tick=fn;return 1;},cancelFrame:()=>{},setTimer:()=>1,clearTimer:()=>{},getMode:()=> 'play',onFrame:()=>{throw Error('fatal');}});
  driver.start();assert.throws(tick,/fatal/);assert.equal(driver.running,false);
});
check('save anterior não é apagado apenas por clicar novo jogo',()=>{
  const main=source('src/main.js');
  const begin=main.slice(main.indexOf('async function beginAdventure('),main.indexOf("document.getElementById('start-btn').onclick"));
  assert.doesNotMatch(begin,/clearSave\(/);
  assert.match(begin,/await adventureLoader\.start\(stages\)/);
  assert.match(main,/if \(!worldInitialized \|\| !gameActive \|\| health<=0\) return false;/);
  assert.match(main,/writeSave\(progressStorage,serializeProgress\(\)\)/);
});
check('falha no RAF preserva checkpoint, desliga entrada e mostra recuperação',()=>{
  const main=source('src/main.js');
  const recovery=main.slice(main.indexOf('function recoverFromFrameError('),main.indexOf("window.addEventListener('pagehide'"));
  assert.match(recovery,/gameActive=false/);
  assert.match(recovery,/frameDriver\?\.stop\(\)/);
  assert.match(recovery,/readSave\(progressStorage\)/);
  assert.doesNotMatch(recovery,/writeSave\(|clearSave\(|saveProgress\(/);
  assert.match(recovery,/gameover.*classList\.remove\('hidden'\)/);
  assert.match(main,/onError:recoverFromFrameError/);
});
check('progresso REV5 só aparece no estágio do personagem, sem porcentagem falsa',()=>{
  const main=source('src/main.js');
  assert.match(main,/loadingStage\?\.textContent==='Preparando Seu Madruga e animações'/);
  assert.match(main,/loadingDetail\.textContent=message/);
  assert.match(main,/if\(status==='loading' && label!==previousLabel\)/);
  assert.match(source('index.html'),/2\.27\.0-recovery|2\.28\.0-model-cache|2\.29\.0-enemy-pool|2\.29\.1-goblin-visible|2\.30\.0-chaves-workbench|2\.31\.0-chaves-patrol-ai|2\.32\.0-chaves-orders|2\.34\.0-chaves-combat|2\.35\.0-stability|2\.36\.0-wildlife-inventory|2\.37\.0-campfire-ui|2\.38\.0-save-profiling|2\.39\.0-wildlife-quests|2\.40\.0-fauna-exploration|2\.41\.0-ecosystem|2\.42\.0-soundscape|2\.43\.0-foley/);
});
console.log(`v2.27: ${tested} regressões aprovadas`);
