import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createZombieSenses,updateZombieAwareness,alertZombie,ambientSpawnPlan,ZOMBIE_STATES} from '../src/gameplay/zombie-perception.js';
import {createEnemyAI} from '../src/gameplay/enemy-ai.js';
import {ZOMBIE_TYPES} from '../src/gameplay/zombie-variants.js';
let passed=0;
const test=(name,fn)=>{fn();passed++;console.log('OK v2.3.0',passed,name)};
const enemy=(x=0,z=0,yaw=0)=>({isZombie:true,type:'zombie',speed:3.2,size:1,
  attackTimer:3,windup:0,knockback:0,hp:3,damage:12,mesh:{id:42,
    position:{x,y:0,z},rotation:{x:0,y:yaw,z:0},scale:{y:1},material:{emissiveIntensity:0}}});
const aware=(e,player,now,opt={})=>updateZombieAwareness(e,{player,now,dt:.05,...opt});

test('sinal acústico fica disponível e respeita raio',()=>{
 const sounds=createZombieSenses();sounds.emit({x:0,z:0},10,1,'walking');
 assert.ok(sounds.hear({x:6,z:0},1.2));
 assert.equal(sounds.hear({x:11,z:0},1.2),null);
});
test('ruído obstruído tem alcance reduzido',()=>{
 const sounds=createZombieSenses();sounds.emit({x:0,z:0},14,1);
 assert.ok(sounds.hear({x:9,z:0},1.05));
 assert.equal(sounds.hear({x:9,z:0},1.05,{blocked:()=>true}),null);
});
test('ruídos expiram e armazenamento não cresce sem limite',()=>{
 const s=createZombieSenses({capacity:3,lifetime:2});
 for(let i=0;i<10;i++)s.emit({x:i,z:0},14,0);
 assert.equal(s.count,3);s.prune(3);assert.equal(s.count,0);
});
test('valores inválidos não geram barulho espúrio',()=>{
 const s=createZombieSenses();assert.equal(s.emit({x:NaN,z:0},10,0),null);
 assert.equal(s.emit({x:0,z:0},-5,0),null);assert.equal(s.count,0);
});
test('zumbi sem pista não persegue jogador longe',()=>{
 const e=enemy();const r=aware(e,{x:0,z:40},0);
 assert.equal(r.state,ZOMBIE_STATES.PATROL);
 assert.notDeepEqual(r.target,{x:0,z:40});
});
test('sem visão, passos fazem zumbi investigar o último som',()=>{
 const sounds=createZombieSenses();sounds.emit({x:0,z:7},24,1);
 const r=aware(enemy(),{x:0,z:7},1.2,{sounds,canSee:()=>false});
 assert.equal(r.state,ZOMBIE_STATES.INVESTIGATE);
 assert.deepEqual(r.target,{x:0,z:7});assert.equal(r.canAttack,false);
});
test('movimento atrás do campo visual não denuncia posição por magia',()=>{
 const e=enemy(0,0,Math.PI),p={x:0,z:9};
 assert.equal(aware(e,p,0).state,ZOMBIE_STATES.PATROL);
});
test('ver jogador próximo ativa perseguição e capacidade de atacar',()=>{
 const e=enemy(),p={x:0,z:2};const r=aware(e,p,0);
 assert.equal(r.state,ZOMBIE_STATES.CHASE);assert.equal(r.canAttack,true);
});
test('invisibilidade por obstáculo impede perseguição mesmo de perto',()=>{
 const e=enemy();const r=aware(e,{x:0,z:2},0,{canSee:()=>false});
 assert.equal(r.state,ZOMBIE_STATES.PATROL);
});
test('modo furtivo reduz raio visual',()=>{
 const player={x:0,z:9};assert.equal(aware(enemy(),player,1).state,ZOMBIE_STATES.CHASE);
 assert.equal(aware(enemy(),player,1,{sneaking:true}).state,ZOMBIE_STATES.PATROL);
});
test('noite reduz visão, sprint amplia',()=>{
 const p={x:0,z:11};assert.equal(aware(enemy(),p,1,{night:true}).state,ZOMBIE_STATES.PATROL);
 assert.equal(aware(enemy(),p,1,{night:true,sprinting:true}).state,ZOMBIE_STATES.CHASE);
});
test('perda de visão segue última localização, não coordenada atual',()=>{
 const e=enemy(),p={x:0,z:7};aware(e,p,1);p.z=30;
 const r=aware(e,p,2,{canSee:()=>false});
 assert.equal(r.state,ZOMBIE_STATES.CHASE);assert.equal(r.canAttack,false);
 assert.deepEqual(r.target,{x:0,z:7});
});
test('após busca sem estímulo, zumbi volta à patrulha',()=>{
 const e=enemy();aware(e,{x:0,z:7},1);
 aware(e,{x:0,z:50},9,{canSee:()=>false});
 assert.equal(aware(e,{x:0,z:50},14,{canSee:()=>false}).state,ZOMBIE_STATES.PATROL);
});
test('investigação chegando ao local vira busca, sem atacar',()=>{
 const e=enemy();const sounds=createZombieSenses();sounds.emit({x:0,z:3},10,0);
 assert.equal(aware(e,{x:0,z:50},.1,{sounds}).state,ZOMBIE_STATES.INVESTIGATE);
 e.mesh.position.z=2.6;
 const r=aware(e,{x:0,z:50},.5,{sounds});
 assert.equal(r.state,ZOMBIE_STATES.SEARCH);assert.equal(r.canAttack,false);
});
test('atacado diretamente descobre posição do agressor',()=>{
 const e=enemy();alertZombie(e,{x:2,z:4},10);
 assert.equal(e.awareness.state,ZOMBIE_STATES.CHASE);
 assert.deepEqual(e.awareness.lastKnown,{x:2,z:4});
});
test('invasor não abandona ataque à base por barulho',()=>{
 const e=enemy();e.raider=true;alertZombie(e,{x:2,z:3},10);
 assert.equal(e.awareness,undefined);
});
test('spawn diurno respira mais e tem menor teto',()=>{
 const day=ambientSpawnPlan({night:false,wave:3,random:0});
 const night=ambientSpawnPlan({night:true,wave:3,random:0});
 assert.ok(day.delay>night.delay);assert.ok(day.cap<night.cap);
});
test('plano de spawn protege valores extremos',()=>{
 const x=ambientSpawnPlan({wave:NaN,random:3});assert.ok(x.cap>=4&&x.cap<=6);
 assert.ok(Number.isFinite(x.delay));
});
test('zumbi com percepção integrada não caminha em direção ao jogador distante',()=>{
 const e=enemy(0,0,0),p={position:{x:0,y:0,z:35}};const noises=createZombieSenses();
 const ai=createEnemyAI({enemies:[e],player:p,getGroundHeight:()=>0,
   resolveCollision:(x,z)=>({x,z}),showBossTelegraph(){},hideBossTelegraph(){},
   damagePlayer(){throw Error('não pode atacar')},spawnParticle(){},throwProjectile(){},sfx:{warning(){}},
   isGameActive:()=>true,getPlayerPerception:()=>({sounds:noises,night:false,sneaking:true})});
 ai.update(.05,0);
 assert.equal(e.awareness.state,ZOMBIE_STATES.PATROL);
 assert.ok(e.mesh.position.z<2);
});
test('novos comandos e indicadores ligados à interface, sem quebrar construção',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(main,/if \(e\.code === 'KeyC' && !placement\)/);
 assert.match(main,/ambientSpawnPlan\(/);assert.match(main,/playerNoise\(24,'attack'\)/);
 assert.match(main,/getPlayerPerception:/);assert.match(main,/sneaking\?\.43:1/);
 assert.match(main,/if\(e\.code==='KeyC'\)/); // placement magnetic snapping
 assert.match(html,/id="stealth-status"/);assert.match(html,/data-action="KeyC"/);
});
console.log(`QA Madruga Survivor v2.3.0: ${passed} testes adicionais aprovados.`);
