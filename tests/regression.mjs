// Regressão de sistemas reais: sem trechos isolados de funções antigas ou VM com globais não definidos.
import assert from 'node:assert/strict';
import {createCollisionWorld} from '../src/world/collisions.js';
import {lakeTerrainDrop,LAKE,keepOutsideLake,nearLakeShore} from '../src/world/fishing-lake.js';
import {isInAttackArc} from '../src/gameplay/combat.js';
import {createSurvival,advanceSurvival,restoreSurvival} from '../src/gameplay/survival.js';
let passed=0;const test=(label,fn)=>{fn();console.log(`OK legacy ${++passed}: ${label}`);};
test('terreno continua incluindo a depressão da lagoa',()=>{
 assert.ok(lakeTerrainDrop(LAKE.x,LAKE.z)>1.5);
 assert.equal(lakeTerrainDrop(0,0),0);
 const edge=keepOutsideLake(LAKE.x,LAKE.z,.5);
 assert.ok(Math.hypot(edge.x-LAKE.x,edge.z-LAKE.z)>=LAKE.radius+.499);
 assert.equal(nearLakeShore({x:LAKE.x,z:LAKE.z}),false);
});
test('colisões são independentes da localização do mundo',()=>{
 const world=createCollisionWorld();world.add({x:0,z:0,radius:1});
 assert.equal(world.isPositionFree(0,0,.45),false);
 const moved=world.resolveCollision(.2,.2,.45);assert.ok(Math.hypot(moved.x,moved.z)>1.44);
 assert.equal(world.isPositionFree(10,10,.45),true);
});
test('colisões em limite de células e obstáculos múltiplos',()=>{
 const world=createCollisionWorld();world.add({x:7.9,z:-7.9,radius:1});world.add({x:16,z:0,radius:1});
 assert.equal(world.isPositionFree(8.2,-8.1,.5),false);
 assert.equal(world.isPositionFree(111,0,.5),false);
 assert.ok(world.resolveCollision(16,0,.45).x>17.4);
});
test('arco frontal de combate preservado',()=>{
 const p={x:0,z:0};assert.equal(isInAttackArc(p,0,{x:0,z:-2},2.5,.3),true);
 assert.equal(isInAttackArc(p,0,{x:0,z:2},2.5,.3),false);
 assert.equal(isInAttackArc(p,0,{x:0,z:-9},2.5,.3),false);
});
test('fogueira e abrigo previnem frio noturno',()=>{
 for(const protectedBy of [{nearFire:true},{sheltered:true}]){
  const state=createSurvival();state.time=480*.8;state.warmth=50;
  for(let i=0;i<700;i++)assert.equal(advanceSurvival(state,.1,protectedBy).damage,0);
  assert.ok(state.warmth>50);
 }
});
test('sobrevivência carregada preserva estrutura e estado',()=>{
 const saved=createSurvival();saved.time=125;saved.inventory.wood=13;
 const restored=restoreSurvival(JSON.parse(JSON.stringify(saved)));
 assert.equal(restored.inventory.wood,13);assert.equal(restored.time,125);
 assert.equal(restoreSurvival({...saved,warmth:500}),null);
});
console.log(`legacy regression: ${passed} verificações atuais`);
