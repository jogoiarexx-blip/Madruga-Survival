import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GUARD_ORDERS,GUARD_ORDER_NAMES,normalizeGuardOrder,nextGuardOrder,
  basePosition,guardWaypoint,canEngageInOrder} from '../src/gameplay/guard-orders.js';
import {createGuardState,restoreGuard,validGuard} from '../src/characters/villager-guard.js';
import {createGuardShotController} from '../src/gameplay/guard-combat.js';
let passed=0;
const test=(name,fn)=>{fn();console.log('v2.32 ✓',++passed,name);};
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('três ordens exclusivas e alternância determinística',()=>{
  assert.deepEqual(GUARD_ORDERS,['follow','defend','patrol']);
  assert.equal(nextGuardOrder('follow'),'defend');
  assert.equal(nextGuardOrder('defend'),'patrol');
  assert.equal(nextGuardOrder('patrol'),'follow');
  assert.equal(normalizeGuardOrder('invalid'),'defend');
  assert.equal(GUARD_ORDER_NAMES.patrol,'Patrulhar');
});
test('save legado não perde dados e assume defesa',()=>{
  const state=restoreGuard({recruited:true,hp:58,x:10,z:-3});
  assert.equal(state.mode,'defend');assert.equal(state.hp,58);
  assert.deepEqual(createGuardState(),{recruited:false,hp:80,x:4,z:2,mode:'defend'});
});
test('save novo preserva modo e recusa modo não confiável',()=>{
  for(const mode of GUARD_ORDERS){
    const state={recruited:true,hp:80,x:0,z:0,mode};
    assert.equal(validGuard(state),true);
    assert.equal(restoreGuard(state).mode,mode);
  }
  assert.equal(restoreGuard({recruited:true,hp:80,x:0,z:0,mode:'hack'}),null);
});
test('seguir acompanha jogador; defender volta à primeira estrutura',()=>{
  const player={x:30,z:40},built=[{x:-12,z:6}];
  assert.deepEqual(guardWaypoint('follow',player,built),{x:31.6,z:41.8});
  assert.deepEqual(guardWaypoint('defend',player,built),{x:-10,z:7.6});
  assert.deepEqual(basePosition([]),{x:4,z:2});
});
test('patrulha passa por quatro pontos sem escapar da base',()=>{
  const built=[{x:12,z:14}],p={x:80,z:80};
  const points=Array.from({length:4},(_,i)=>guardWaypoint('patrol',p,built,i));
  assert.equal(new Set(points.map(v=>JSON.stringify(v))).size,4);
  assert.ok(points.every(v=>Math.hypot(v.x-14,v.z-15.6)<5));
});
test('engajamento fica perto da base ou do jogador conforme ordem',()=>{
  const built=[{x:4,z:6}],player={x:95,z:95};
  assert.equal(canEngageInOrder({x:94,z:92},'follow',player,built),true);
  assert.equal(canEngageInOrder({x:94,z:92},'defend',player,built),false);
  assert.equal(canEngageInOrder({x:5,z:6},'patrol',player,built),true);
});
test('o efeito visual ocorre somente após tiro validado no tempo certo',()=>{
  const shot=createGuardShotController();
  const e={hp:3,mesh:{position:{x:6,y:1,z:0}}};let hits=0;
  assert.equal(shot.begin(e),true);
  assert.equal(shot.update(.3,{x:0,z:0},{onHit:()=>hits++}),false);
  assert.equal(hits,0);
  assert.equal(shot.update(.2,{x:0,z:0},{onHit:()=>hits++}),true);
  assert.equal(hits,1);
  assert.equal(shot.update(.2,{x:0,z:0},{onHit:()=>hits++}),false);
});
test('tiro não exibe efeito se perder linha de visão',()=>{
  const shot=createGuardShotController();const e={hp:3,mesh:{position:{x:6,z:0}}};let hits=0;
  shot.begin(e);
  assert.equal(shot.update(.5,{x:0,z:0},{canSee:()=>false,onHit:()=>hits++}),false);
  assert.equal(hits,0);
});
test('HUD, tecla, toque, F e dados salvos integram comandos',()=>{
  const main=source('src/main.js'),html=source('index.html'),guard=source('src/characters/villager-guard.js');
  assert.match(main,/KeyO'\)\{changeChavesOrder\(\)/);
  assert.match(main,/guard\.cycleOrder\(\)/);
  assert.match(main,/guard:guard\.getState\(\)/);
  assert.match(html,/id="guard-order"/);
  assert.match(html,/data-action="KeyO"/);
  assert.match(guard,/showShot\(target\);attackEnemy\(target,2\)/);
  assert.match(guard,/getObjectByName\('Muzzle'\)/);
  assert.match(guard,/patrolPause/);
});
test('rev32 está no cache do HTML, CSS e ponto de entrada',()=>{
  const html=source('index.html'),pkg=JSON.parse(source('package.json'));
  assert.equal(pkg.version,'2.39.0');
  assert.match(html,/data-build="2\.34\.0-chaves-combat|2\.35\.0-stability|2\.36\.0-wildlife-inventory|2\.37\.0-campfire-ui|2\.38\.0-save-profiling|2\.39\.0-wildlife-quests"/);
  assert.match(html,/main\.js\?v=2\.34\.0-chaves-combat|2\.35\.0-stability|2\.36\.0-wildlife-inventory|2\.37\.0-campfire-ui|2\.38\.0-save-profiling|2\.39\.0-wildlife-quests/);
  assert.match(html,/main\.css\?v=2\.34\.0-chaves-combat|2\.35\.0-stability|2\.36\.0-wildlife-inventory|2\.37\.0-campfire-ui|2\.38\.0-save-profiling|2\.39\.0-wildlife-quests/);
});
console.log('v2.32:',passed,'testes aprovados');
