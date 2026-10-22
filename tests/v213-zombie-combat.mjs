import assert from 'node:assert/strict';
import {createEnemyAI} from '../src/gameplay/enemy-ai.js';
import {ZOMBIE_TYPES} from '../src/gameplay/zombie-variants.js';
import {queueZombieImpact,advanceZombieImpact,ZOMBIE_ATTACK_DURATION} from '../src/gameplay/zombie-attack-events.js';
let passed=0;
function test(name,run){run();passed++;console.log('OK REV2 v2.1.3:',name);}
function scenario(type,{blocked=false,distance=1.6,timer=0}={}){
 const v=ZOMBIE_TYPES[type],player={position:{x:0,y:0,z:distance}},state={hits:0,attacks:0,moves:[]};
 const mesh={id:2,position:{x:0,y:0,z:0},rotation:{x:0,y:Math.PI,z:0},scale:{y:1},
  material:{emissiveIntensity:0},lookAt(){throw Error('zumbi não usa lookAt')}};
 const enemy={type,mesh,size:v.size,speed:v.speed,hp:v.hp,damage:v.damage,attackTimer:timer,knockback:0,windup:0,
  rev4Visual:{attack(){state.attacks++},update(dt,moving){state.moves.push(moving)}}};
 const ai=createEnemyAI({enemies:[enemy],player,getGroundHeight:()=>0,
  resolveCollision:(x,z)=>blocked?{x:mesh.position.x,z:mesh.position.z}:{x,z},
  showBossTelegraph(){},hideBossTelegraph(){},damagePlayer(){state.hits++;return true},
  spawnParticle(){},throwProjectile(){},sfx:{warning(){}},isGameActive:()=>true,hasLineOfSight:()=>true});
 const tick=n=>{for(let i=0;i<n;i++)ai.update(.05,i*.05);};
 return {enemy,mesh,player,state,tick};
}
test('animação de marcha para diante de obstáculo',()=>{
 const s=scenario('zombie',{blocked:true,distance:10,timer:4});s.tick(12);
 assert.ok(s.state.moves.every(v=>!v));assert.equal(s.mesh.position.z,0);
});
test('locomoção é reproduzida quando o zumbi avança',()=>{
 const s=scenario('zombie_runner',{distance:10,timer:4});s.tick(6);
 assert.ok(s.state.moves.every(Boolean));assert.ok(s.mesh.position.z>0);
});
test('mordida só acerta uma vez após o instante de impacto',()=>{
 const s=scenario('zombie');s.tick(1);
 assert.equal(s.state.hits,0);assert.equal(s.state.attacks,1);
 assert.ok(s.enemy.attackTimer>=ZOMBIE_ATTACK_DURATION.zombie);
 s.tick(10);assert.equal(s.state.hits,0);
 s.tick(2);assert.equal(s.state.hits,1);assert.equal(s.state.attacks,1);
});
test('esquiva para as costas cancela dano sem girar ou recuar durante o golpe',()=>{
 const s=scenario('zombie');s.tick(1);
 const yaw=s.mesh.rotation.y,z=s.mesh.position.z;
 s.player.position.z=-1.4;s.tick(12);
 assert.equal(s.state.hits,0);assert.equal(s.mesh.rotation.y,yaw);assert.equal(s.mesh.position.z,z);
 assert.equal(s.state.attacks,1);
});
test('zumbi tóxico respeita duração de 1.85s do agarrão',()=>{
 const s=scenario('zombie_toxic');s.tick(1);
 assert.equal(s.state.attacks,1);
 s.tick(27);assert.equal(s.state.attacks,1);
 s.tick(15);assert.ok(s.state.attacks>=2);
});
test('morte cancela o dano pendente e preserva o ângulo inicial',()=>{
 const e={type:'zombie',hp:3,mesh:{rotation:{y:Math.PI/3}}};
 assert.ok(queueZombieImpact(e,'player'));assert.equal(e.pendingImpact.facingYaw,Math.PI/3);
 e.hp=0;assert.equal(advanceZombieImpact(e,1),null);
 assert.equal(e.pendingImpact,null);
});
test('modelo procedural mantém fallback de dano sem animação REV2',()=>{
 const s=scenario('zombie');delete s.enemy.rev4Visual;s.tick(1);assert.equal(s.state.hits,1);
});
console.log('v2.1.3:',passed,'novos testes aprovados.');