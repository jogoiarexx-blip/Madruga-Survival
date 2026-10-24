import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {comboProfile,nextComboStep,COMBO_WINDOW,ATTACK_BUFFER_WINDOW} from '../src/gameplay/combo-system.js';
import {createCombatSystem} from '../src/gameplay/combat.js';
import {samplePlayerAttackPose,sampleRiggedWeaponMotion} from '../src/characters/player-attack-pose.js';
import {weaponTypes} from '../src/gameplay/equipment.js';
let passed=0;
const test=(name,fn)=>{fn();console.log('OK v2.4.0',++passed,name)};
class V {
 constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
 set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
 copy(v){return this.set(v.x,v.y,v.z);}
 clone(){return new V(this.x,this.y,this.z);}
 add(v){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this;}
}
class Obj{
 constructor(){this.position=new V();this.rotation=new V();this.material={emissiveIntensity:0,color:{setHex(){}}};this.scale={setScalar(){}};}
 add(){}remove(){}
}
const THREE={Group:Obj,Mesh:class extends Obj{constructor(geo,mat){super();this.material=mat}},
 RingGeometry:class{},MeshBasicMaterial:class{constructor(props){Object.assign(this,props)}},Vector3:V,DoubleSide:2};
function fixture({weapon=0,targetHP=20,yaw=0,alive=true,visual=null}={}){
 const target={mesh:new Obj(),type:'zombie',hp:targetHP,maxHp:targetHP,size:1,speed:1,knockback:0,attackTimer:0};
 target.mesh.position.set(0,.5,-2);
 const enemies=[target],hitFeedback=[],events=[];
 let active=alive,locked=true;
 const combat=createCombatSystem({THREE,scene:{add(){},remove(){}},player:{position:new V()},enemies,weaponTypes,
    healthPacks:[],speedBoosts:[],particles:[],getGroundHeight:()=>0,
    resolveCollision:(x,z)=>({x,z}),removeMesh(){},spawnParticle(){},gainXP(){},showToast(){},
    sfx:{attack(){events.push('swung')},hit(){events.push('hit')},boost(){}},spawnEnemy(){},spawnHealthPack(){},spawnSpeedBoost(){},
    advanceQuestIfReady(){},updateHUD(){},onBossDefeated(){},onEnemyKilled(){},
    onSwing:()=>0,onHitFeedback:x=>hitFeedback.push(x),onAttackStart:()=>visual,
    getLevel:()=>1,getWeaponIndex:()=>weapon,getPlayerYaw:()=>yaw,isGameActive:()=>active,isLocked:()=>locked});
 return {combat,target,enemies,events,hitFeedback,setWeapon:i=>weapon=i,setActive:x=>active=x,setLocked:x=>locked=x};
}
test('etapas do combo avançam, resetam e não atravessam armas',()=>{
 assert.equal(nextComboStep({lastWeapon:0,weapon:0,lastStep:0,elapsed:.3}),1);
 assert.equal(nextComboStep({lastWeapon:0,weapon:0,lastStep:1,elapsed:.3}),2);
 assert.equal(nextComboStep({lastWeapon:0,weapon:0,lastStep:2,elapsed:.3}),0);
 assert.equal(nextComboStep({lastWeapon:0,weapon:1,lastStep:1,elapsed:.3}),0);
 assert.equal(nextComboStep({lastWeapon:0,weapon:0,lastStep:1,elapsed:COMBO_WINDOW+.1}),0);
 assert.equal(nextComboStep({lastWeapon:0,weapon:0,lastStep:1,elapsed:-1}),0);
});
test('perfis das três armas possuem golpes finitos e terceiro golpe mais forte',()=>{
 for(let w=0;w<3;w++){
   const profiles=[0,1,2].map(step=>comboProfile(w,step));
   assert.equal(profiles[0].damageBonus,0);assert.equal(profiles[2].damageBonus,1);
   assert.ok(profiles[2].knockback>profiles[1].knockback);
   for(const p of profiles)assert.ok(p.hitPhase>0&&p.hitPhase<1&&p.duration>.2);
 }
});
test('cliques durante recarga não causam hits extras',()=>{
 const x=fixture();assert.equal(x.combat.attack(),true);
 for(let i=0;i<10;i++)assert.equal(x.combat.attack(),false);
 x.combat.update(.2);assert.equal(x.target.hp,19);
 x.combat.update(.3);assert.equal(x.target.hp,19);
 assert.equal(x.events.filter(e=>e==='hit').length,1);
});
test('três golpes requerem três ataques distintos e causam dano 1+1+2',()=>{
 const x=fixture();for(const [step,damage] of [[0,1],[1,1],[2,2]]){
   assert.equal(x.combat.attack(),true);
   assert.equal(x.combat.comboStep,step);
   x.combat.update(.47);
   assert.equal(x.target.hp,20-[1,2,4][step]);
 }
 assert.equal(x.hitFeedback.length,3);
 assert.deepEqual(x.hitFeedback.map(x=>x.step),[0,1,2]);
 assert.ok(x.target.knockback>.16);
});
test('pressão dentro do buffer gera um único golpe futuro',()=>{
 const x=fixture();x.combat.attack();x.combat.update(weaponTypes[0].cooldown-ATTACK_BUFFER_WINDOW/2);
 assert.equal(x.combat.attack(),true);assert.equal(x.combat.attackBuffered,true);
 assert.equal(x.combat.attack(),true); // multiple presses cannot queue multiple hits
 x.combat.update(.15);
 assert.equal(x.combat.comboStep,1);assert.equal(x.combat.attackBuffered,false);
 x.combat.update(.3);assert.equal(x.target.hp,18);assert.equal(x.hitFeedback.length,2);
});
test('trocar a arma invalida a entrada antecipada e reinicia combo',()=>{
 const x=fixture();x.combat.attack();x.combat.update(.34);x.combat.attack();
 x.setWeapon(1);x.combat.update(.1);assert.equal(x.combat.attackBuffered,false);
 x.combat.update(.5);x.combat.attack();assert.equal(x.combat.comboStep,0);
});
test('interromper ataque cancela contato e fila sem dano fantasma',()=>{
 const x=fixture();x.combat.attack();x.combat.cancelAttack();x.combat.update(1);
 assert.equal(x.target.hp,20);assert.equal(x.combat.attackBuffered,false);
});
test('modo inativo não processa colisão atrasada após reabrir o jogo',()=>{
 const x=fixture();x.combat.attack();x.setActive(false);x.combat.update(.2);
 x.setActive(true);x.combat.update(.7);assert.equal(x.target.hp,20);
});
test('efeito de impacto respeita resistência maior do boss',()=>{
 const x=fixture();x.target.type='boss';x.combat.attack();x.combat.update(.3);
 assert.ok(x.target.knockback<=.12+1e-8);
});
test('REV5 pode indicar instante real do contato',()=>{
 const x=fixture({visual:{hitPhase:.72}});x.combat.attack();x.combat.update(.25);
 assert.equal(x.target.hp,20);x.combat.update(.03);assert.equal(x.target.hp,19);
});
test('poses do fallback e da arma REV5 são diferentes para cada etapa e retornam ao repouso',()=>{
 for(let w=0;w<3;w++){
   const poses=[0,1,2].map(s=>samplePlayerAttackPose(w,.5,s));
   assert.notDeepEqual(poses[0],poses[1]);assert.notDeepEqual(poses[1],poses[2]);
   for(let step=0;step<3;step++){
     const p=samplePlayerAttackPose(w,.5,step),m=sampleRiggedWeaponMotion(w,.5,1,1,step);
     assert.ok(Object.values(p).every(Number.isFinite));assert.ok(Object.values(m).every(Number.isFinite));
     assert.ok(Math.abs(sampleRiggedWeaponMotion(w,1,0,0,step).x)<1e-8);
   }
 }
});
test('HUD, rigs e assets do original continuam integrados no jogo',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const rig=readFileSync(new URL('../src/characters/player-rev5.js',import.meta.url),'utf8');
 assert.match(main,/playerRev5\.setComboStep\(combat\.comboStep\)/);
 assert.match(main,/onHitFeedback:/);assert.match(main,/cameraRig\.update\(dt,playerYaw,mousePitch\+cameraImpact\)/);
 assert.match(rig,/setComboStep/);assert.match(html,/id="combat-combo-status"/);
 assert.match(main,/getPlayerPerception:/);assert.match(main,/craftItem\(/);
});
console.log('QA v2.4:',passed,'testes novos aprovados');
