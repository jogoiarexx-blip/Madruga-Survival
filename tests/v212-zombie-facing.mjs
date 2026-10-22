// Regressão v2.1.2 — orientação dos zumbis REV2 durante a marcha.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {faceZombieAlongPath} from '../src/gameplay/zombie-facing.js';
import {createEnemyAI} from '../src/gameplay/enemy-ai.js';
import {ZOMBIE_TYPES} from '../src/gameplay/zombie-variants.js';
let checks=0;
const test=(name,fn)=>{fn();console.log('OK zumbi v2.1.2:',name);checks++;};
const mesh=()=>({position:{x:0,y:0,z:0},rotation:{x:0,y:Math.PI,z:0}});
const front=m=>({x:Math.sin(m.rotation.y),z:Math.cos(m.rotation.y)});
const aligned=(m,x,z)=>{const f=front(m);return (f.x*x+f.z*z)/Math.hypot(x,z)>.9999};
test('quatro direções cardeais sempre ficam de frente',()=>{
 for(const [x,z] of [[0,10],[0,-10],[10,0],[-10,0]]){
  const m=mesh(); assert.equal(faceZombieAlongPath(m,{x,z},0,0,false),true);
  assert.ok(aligned(m,x,z));
 }
});
test('ao contornar obstáculo olha para o movimento real',()=>{
 const m=mesh();m.position.x=.1;m.position.z=.6;
 faceZombieAlongPath(m,{x:20,z:0},0,0,true);
 assert.ok(aligned(m,.1,.6));
});
test('parado ou atacando volta a olhar para o alvo',()=>{
 const m=mesh();m.position.x=2;m.position.z=2;
 faceZombieAlongPath(m,{x:2,z:0},2,2,false);
 assert.ok(aligned(m,0,-2));
});
test('não produz NaN com posição inválida ou zero',()=>{
 const m=mesh();
 assert.equal(faceZombieAlongPath(m,{x:0,z:0},0,0,true),false);
 assert.equal(faceZombieAlongPath(m,{x:NaN,z:0},0,0,false),false);
 assert.ok(Number.isFinite(m.rotation.y));
});
const fakeEnemy=(type,collide)=>{
 const m={id:2,position:{x:0,y:0,z:0},rotation:{x:0,y:Math.PI,z:0},scale:{y:1},
 material:{emissiveIntensity:0},lookAt(){throw new Error('zumbi não deve usar lookAt')}}; 
 const v=ZOMBIE_TYPES[type],enemy={type,mesh:m,size:v.size,speed:v.speed,hp:v.hp,damage:v.damage,
 attackTimer:10,knockback:0,windup:0};
 const player={position:{x:25,y:0,z:0}};
 const ai=createEnemyAI({enemies:[enemy],player,getGroundHeight:()=>0,resolveCollision:collide,
 showBossTelegraph(){},hideBossTelegraph(){},damagePlayer(){return true},
 spawnParticle(){},throwProjectile(){},sfx:{warning(){}},isGameActive:()=>true,
 hasLineOfSight:()=>true});
 return {ai,m};
};
test('simulação de 40 quadros de perseguição de zumbi normal',()=>{
 const {ai,m}=fakeEnemy('zombie',(x,z)=>({x,z}));
 for(let i=0;i<40;i++){
  const x=m.position.x,z=m.position.z;
  ai.update(1/60,i/60);
  assert.ok(aligned(m,m.position.x-x,m.position.z-z));
 }
});
test('simulação de desvio de obstáculo com zumbi corredor',()=>{
 const {ai,m}=fakeEnemy('zombie_runner',(x,z)=>({x:x*.12,z:z+.12}));
 for(let i=0;i<15;i++){
  const x=m.position.x,z=m.position.z;ai.update(1/60,i/60);
  assert.ok(aligned(m,m.position.x-x,m.position.z-z));
 }
});
test('GLB REV2 conserva frente +Z e a IA usa alinhamento de movimento',()=>{
 const manager=readFileSync(new URL('../src/characters/zombie-models.js',import.meta.url),'utf8');
 const code=readFileSync(new URL('../src/gameplay/enemy-ai.js',import.meta.url),'utf8');
 assert.match(manager,/model\.rotation\.y=0/);
 assert.match(code,/faceZombieAlongPath\(mesh,targetPos,previousX,previousZ,moving\)/);
});
console.log('Orientação REV2:',checks,'testes aprovados.');
