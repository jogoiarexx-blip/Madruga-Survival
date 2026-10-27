import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spiderDecision,spiderInterruptWindup,SPIDER_WEB_FAN_SPREAD,createSpiderAI} from '../src/gameplay/spider-ai.js';
import {spiderSoundGain} from '../src/audio/sfx.js';
let passed=0;
const test=(name,fn)=>{fn();console.log('OK v2.10',++passed,name);};
const file=relative=>readFileSync(new URL(relative,import.meta.url),'utf8');
test('teia comum continua disponível e usa um disparo',()=>{
 assert.equal(spiderDecision(11,true,0,.5),'WebShot');
});
test('teia em leque tem condição de variação e não ignora obstáculos',()=>{
 assert.equal(spiderDecision(11,true,0,.1),'WebBurst');
 assert.equal(spiderDecision(11,false,0,.1),null);
 assert.equal(spiderDecision(11,true,4,.1),null);
});
test('dispersão simétrica não deixa tiro central de fora',()=>{
 assert.deepEqual([...SPIDER_WEB_FAN_SPREAD],[-.23,0,.23]);
 assert.equal(SPIDER_WEB_FAN_SPREAD.reduce((a,b)=>a+b,0),0);
});
test('mordida continua prioritária quando Madruga está perto',()=>{
 assert.equal(spiderDecision(1.2,true,0,0),'Attack');
});
test('stagger leve não interrompe golpe da aranha',()=>{
 const brain={action:'Attack',actionTime:.1,cooldown:0};
 assert.equal(spiderInterruptWindup(brain,1),false);
 assert.equal(brain.action,'Attack');
});
test('combo forte cancela somente ataque em preparação',()=>{
 const brain={action:'Attack',actionTime:.21,cooldown:0};
 assert.equal(spiderInterruptWindup(brain,1.8),true);
 assert.equal(brain.action,null);assert.ok(brain.cooldown>=.85);
});
test('impacto tardio não é cancelado após o dano',()=>{
 const brain={action:'Attack',actionTime:.9,cooldown:0};
 assert.equal(spiderInterruptWindup(brain,2),false);
 assert.equal(brain.action,'Attack');
});
test('preparação da teia em leque pode ser interrompida',()=>{
 const brain={action:'WebBurst',actionTime:.12,cooldown:0};
 assert.equal(spiderInterruptWindup(brain,2),true);
});
test('salto anterior ao impacto pode ser interrompido',()=>{
 const brain={action:'Jump',actionTime:.5,cooldown:0};
 assert.equal(spiderInterruptWindup(brain,1.6),true);
});
test('distância reduz som e silencia aranhas afastadas',()=>{
 assert.equal(spiderSoundGain(0),1);
 assert.equal(spiderSoundGain(24),0);
 assert.equal(spiderSoundGain(70),0);
 assert.ok(spiderSoundGain(4)>spiderSoundGain(12));
 assert.equal(spiderSoundGain(-1),0);
 assert.equal(spiderSoundGain(NaN),0);
});
function makeEnemy(id=4){return {type:'spider',size:1.6,speed:3.4,damage:10,knockback:0,hp:7,
 mesh:{id,position:{x:0,y:0,z:0},rotation:{y:0,z:0},scale:{set(){} }},
 spiderBrain:{cooldown:0,action:null,actionTime:0,hit:false},
 spiderVisual:{events:[],attack(c){this.events.push(c)},jump(){this.events.push('Jump')},update(){}}};}
test('disparo em leque usa só WebShot no rig e envia 3 projéteis uma vez',()=>{
 const e=makeEnemy(),shots=[],sounds=[];
 const a=createSpiderAI({player:{position:{x:11,y:0,z:0}},getGroundHeight:()=>0,
   resolveCollision:(x,z)=>({x,z}),damagePlayer:()=>true,
   throwProjectile:(_enemy,spread)=>shots.push(spread),onSpiderSound:kind=>sounds.push(kind)});
 a.update(e,.1,2*Math.PI-e.mesh.id);
 assert.equal(e.spiderBrain.action,'WebBurst');
 assert.deepEqual(e.spiderVisual.events,['WebShot']);
 for(let i=0;i<10;i++)a.update(e,.1,2.3);
 assert.deepEqual(shots,[-.23,0,.23]);
 assert.equal(sounds.filter(k=>k==='web').length,1);
 assert.equal(sounds.filter(k=>k==='charge').length,1);
});
test('teia em leque não dispara atrás de parede',()=>{
 const e=makeEnemy(),shots=[];
 const a=createSpiderAI({player:{position:{x:11,y:0,z:0}},getGroundHeight:()=>0,
   resolveCollision:(x,z)=>({x,z}),hasLineOfSight:()=>false,
   damagePlayer:()=>true,throwProjectile:()=>shots.push(1)});
 for(let i=0;i<10;i++)a.update(e,.1,2*Math.PI-e.mesh.id);
 assert.equal(shots.length,0);
});
test('feedback de impacto e morte está integrado ao combate',()=>{
 const combat=file('../src/gameplay/combat.js'),model=file('../src/characters/spider-model.js');
 assert.match(combat,/spiderInterruptWindup\(enemy\.spiderBrain,impactStrength\)/);
 assert.match(combat,/enemy\.spiderVisual\?\.hurt\(impactStrength\)/);
 assert.match(combat,/sfx\.spiderDeath\?/);
 assert.match(model,/interrupt\(\)\{/);
 assert.match(model,/this\.recoil\*=Math\.exp/);
});
test('áudio procedural gera efeitos de passos, ataque, teia, ferimento e morte',()=>{
 const sfx=file('../src/audio/sfx.js');
 for(const name of ['spiderStep','spiderAttack','spiderCharge','spiderWeb','spiderJump','spiderHurt','spiderDeath'])
   assert.match(sfx,new RegExp(name+':'));
 assert.match(sfx,/AudioContext/);
});
test('entrada do jogo envia eventos e versão está atualizada',()=>{
 const main=file('../src/main.js'),index=file('../index.html'),pkg=JSON.parse(file('../package.json'));
 assert.match(main,/onSpiderSound:/);
 assert.match(index,/data-build="(?:2\.10\.0-spider|2\.11\.0-spider|2\.12\.0-nests|2\.13\.0-cave|2\.14\.0-cave|2\.15\.0-hotbar|2\.16\.0-inventory|2\.17\.0-bag|2\.18\.0-bag-chest|2\.19\.0-gear|2\.20\.0-build-wheel|2\.21\.0-menu|2\.22\.0-gpu|2\.23\.0-goblin|2\.24\.0-goblin-ik|2\.25\.0-menu-hud|2\.27\.0-recovery|2\.28\.0-model-cache|2\.29\.0-enemy-pool|2\.29\.1-goblin-visible|2\.30\.0-chaves-workbench|2\.31\.0-chaves-patrol-ai|2\.32\.0-chaves-orders|2\.34\.0-chaves-combat|2\.32\.0-chaves-orders|2\.34\.0-chaves-combat)"/);
 assert.ok(['2.10.0','2.11.0','2.12.0','2.13.0','2.14.0','2.15.0','2.16.0','2.17.0','2.18.0','2.19.0','2.20.0','2.21.0','2.22.0','2.23.0','2.24.0','2.25.0','2.26.0','2.26.1','2.27.0','2.28.0','2.29.0','2.29.1','2.30.0','2.31.0','2.32.0','2.33.0','2.34.0'].includes(pkg.version));
 assert.ok(pkg.scripts.test.includes('v210-spider-feedback.mjs'));
});
console.log('v2.10:',passed,'novas verificações aprovadas');
