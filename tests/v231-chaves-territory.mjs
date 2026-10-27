import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGuardShotController,guardTarget,validGuardShot,CHAVES_SHOT_TIME} from '../src/gameplay/guard-combat.js';
import {patrolRoute,territoryFor,updateEnemyTerritory} from '../src/gameplay/enemy-territory.js';
let count=0;
function test(title,fn){fn();console.log('v2.31 ✓',++count,title);}
const entity=(x,z,hp=10,type='normal')=>({type,hp,mesh:{id:7,userData:{},position:{x,z}}});
test('Chaves seleciona o alvo vivo mais próximo e com visibilidade',()=>{
 const far=entity(9,0),near=entity(3,0),boss=entity(1,0,50,'boss'),dead=entity(2,0,0);
 assert.equal(guardTarget([far,dead,boss,near],{x:0,z:0}),near);
 assert.equal(guardTarget([far,near],{x:0,z:0},{canSee:(from,to)=>to.x>5}),far);
 assert.equal(guardTarget([boss,dead],{x:0,z:0}),null);
});
test('Chaves não aplica dano no primeiro frame; tiro ocorre no tempo do clipe',()=>{
 const target=entity(8,0);const shot=createGuardShotController();let hits=0;
 assert.equal(shot.begin(target),true);assert.equal(shot.begin(target),false);
 for(let elapsed=0;elapsed+.05<CHAVES_SHOT_TIME;elapsed+=.05)
   assert.equal(shot.update(.05,{x:0,z:0},{onHit:()=>hits++}),false);
 assert.equal(hits,0);
 assert.equal(shot.update(.12,{x:0,z:0},{onHit:()=>hits++}),true);
 assert.equal(hits,1);assert.equal(shot.update(1,{x:0,z:0},{onHit:()=>hits++}),false);
});
test('Chaves cancela tiro se alvo morrer, sair do alcance ou esconder-se',()=>{
 for(const reason of ['dead','out','blocked']){
   const t=entity(8,0),shot=createGuardShotController();let hits=0;
   shot.begin(t);
   if(reason==='dead')t.hp=0;
   if(reason==='out')t.mesh.position.x=20;
   shot.update(.5,{x:0,z:0},{canSee:()=>reason!=='blocked',onHit:()=>hits++});
   assert.equal(hits,0,reason);
 }
});
test('Dano só pode ser aplicado uma vez por clipe e não após cancelamento',()=>{
 const t=entity(5,0),s=createGuardShotController();let hits=0;
 s.begin(t);s.update(.6,{x:0,z:0},{onHit:()=>hits++});
 s.update(.6,{x:0,z:0},{onHit:()=>hits++});assert.equal(hits,1);
 s.update(1,{x:0,z:0},{onHit:()=>hits++});s.begin(t);s.cancel();
 s.update(.5,{x:0,z:0},{onHit:()=>hits++});assert.equal(hits,1);
 assert.equal(validGuardShot(t,{x:0,z:0}),true);
});
test('Patrulha segue rota previsível de cinco pontos dentro da área',()=>{
 const p={x:20,z:-15};const route=patrolRoute(p,11,3);
 assert.equal(route.length,5);assert.deepEqual(route,patrolRoute(p,11,3));
 for(const q of route)assert.ok(Math.hypot(q.x-p.x,q.z-p.z)<11);
 const enemy=entity(20,-15);
 const first=updateEnemyTerritory(enemy,{player:{x:95,z:95},now:1,canSee:()=>false});
 assert.equal(first.state,'patrol');assert.deepEqual(first.target,territoryFor(enemy).route[0]);
 enemy.mesh.position={...first.target};
 assert.equal(updateEnemyTerritory(enemy,{player:{x:95,z:95},now:2,canSee:()=>false}).target,null);
 const result=updateEnemyTerritory(enemy,{player:{x:95,z:95},now:3,canSee:()=>false});
 assert.equal(result.state,'patrol');assert.deepEqual(result.target,enemy.territory.route[1]);
});
test('Sons geram investigação sem dano e depois retorno',()=>{
 const e=entity(10,10);
 let output=updateEnemyTerritory(e,{player:{x:90,z:90},now:1,
   sounds:{hear:()=>({id:12,x:13,z:14})},canSee:()=>false});
 assert.equal(output.state,'investigate');assert.equal(output.canAttack,false);
 assert.deepEqual(output.target,{x:13,z:14});
 output=updateEnemyTerritory(e,{player:{x:90,z:90},now:10,
   sounds:{hear:()=>null},canSee:()=>false});
 assert.equal(output.state,'patrol');
});
test('Perda de visão busca último ponto, depois volta para base',()=>{
 const e=entity(0,0),p={x:6,z:0};
 assert.equal(updateEnemyTerritory(e,{player:p,now:2,canSee:()=>true}).state,'chase');
 assert.equal(updateEnemyTerritory(e,{player:{x:90,z:90},now:2.1,canSee:()=>false}).state,'search');
 e.mesh.position={x:17,z:0};
 assert.equal(updateEnemyTerritory(e,{player:{x:90,z:90},now:20,canSee:()=>false}).state,'return');
});
test('Perseguição tem limite, raid e boss mantêm comportamentos originais',()=>{
 const e=entity(0,0);territoryFor(e);e.mesh.position.x=30;
 assert.equal(updateEnemyTerritory(e,{player:{x:31,z:0},now:10,canSee:()=>true}).state,'return');
 for(const t of ['boss','normal']){
   const special=entity(0,0,10,t);if(t==='normal')special.raider=true;
   assert.equal(updateEnemyTerritory(special,{player:{x:1,z:1},now:1}),null);
 }
});
test('Integração do aliado e da IA usa a nova lógica sem eventos instantâneos',()=>{
 const guard=readFileSync(new URL('../src/characters/villager-guard.js',import.meta.url),'utf8');
 const enemyAI=readFileSync(new URL('../src/gameplay/enemy-ai.js',import.meta.url),'utf8');
 assert.match(guard,/shotController\.update\(dt/);
 assert.match(guard,/playAnimation\('Shoot'\)/);
 assert.doesNotMatch(guard,/attackEnemy\(target,2\);limbs/);
 assert.match(enemyAI,/sounds:perception\?\.sounds/);
 assert.match(enemyAI,/rig\.aura/);
});
console.log('v2.31:',count,'testes novos aprovados');
