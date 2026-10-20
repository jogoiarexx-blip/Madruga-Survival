import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ZOMBIE_TYPES,chooseZombieType,withinCemetery,CEMETERY_POS} from '../src/gameplay/zombie-variants.js';
import {createCemetery} from '../src/world/cemetery.js';
import {createEnemySpawner} from '../src/characters/enemy-factory.js';
import {createEnemyAI} from '../src/gameplay/enemy-ai.js';
import {createVillagerGuard,createGuardState,restoreGuard,interactGuard} from '../src/characters/villager-guard.js';
import {createCombatSystem} from '../src/gameplay/combat.js';
import {createSurvival} from '../src/gameplay/survival.js';
import {validateSave} from '../src/gameplay/save-system.js';
let count=0;
const test=(name,fn)=>{fn();++count;console.log(`OK v1.6 ${count}: ${name}`);};
class Position{
 constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
 set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
 copy(p){return this.set(p.x,p.y,p.z);}
 clone(){return new Position(this.x,this.y,this.z);}
 add(v){return this.set(this.x+v.x,this.y+v.y,this.z+v.z);}
}
class Obj{
 constructor(){this.children=[];this.userData={};this.position=new Position();this.rotation={x:0,y:0,z:0};
 this.scale={x:1,y:1,z:1,set(x,y,z){this.x=x;this.y=y;this.z=z},setScalar(v){this.x=this.y=this.z=v}};this.id=Obj.nextId++}
 add(...objs){this.children.push(...objs);}
 lookAt(){}
 traverse(f){f(this);for(const c of this.children)c.traverse(f)}
}
Obj.nextId=1;
class Mesh extends Obj {constructor(geometry,material){super();this.geometry=geometry;this.material=material;this.isMesh=true;}}
class Geo {constructor(...args){this.args=args;}clone(){return new this.constructor(...this.args);}dispose(){}}
class Mat{constructor(o={}){Object.assign(this,o);if(typeof this.color==='number'){const val=this.color;this.color={value:val,setHex(v){this.value=v}}}}clone(){return new Mat({...this,color:this.color?.value??this.color})}}
const THREE={Group:Obj,Mesh,MeshStandardMaterial:Mat,MeshBasicMaterial:Mat};
for(const key of ['BoxGeometry','ConeGeometry','CylinderGeometry','OctahedronGeometry','SphereGeometry','TorusGeometry'])THREE[key]=Geo;
const scene={objects:[],add(obj){this.objects.push(obj)},remove(obj){this.objects=this.objects.filter(item=>item!==obj)}};
const at=(x,z)=>({x,z});

test('as três variantes têm velocidade, HP, dano e cores distintas',()=>{
 assert.deepEqual(Object.keys(ZOMBIE_TYPES),['zombie','zombie_runner','zombie_toxic','zombie_brute']);
 assert.ok(ZOMBIE_TYPES.zombie_runner.speed>ZOMBIE_TYPES.zombie.speed);
 assert.ok(ZOMBIE_TYPES.zombie_brute.hp>ZOMBIE_TYPES.zombie_toxic.hp);
 assert.ok(ZOMBIE_TYPES.zombie_toxic.poisonSeconds>0);
});
test('raridade de variante escala pelo dia, sem gigante na primeira noite',()=>{
 assert.equal(chooseZombieType({night:true,day:1,roll:.999}),'zombie_runner');
 assert.equal(chooseZombieType({night:true,day:2,roll:.80}),'zombie_toxic');
 assert.equal(chooseZombieType({night:true,day:5,roll:.96}),'zombie_brute');
 assert.equal(chooseZombieType({night:false,graveyard:false,day:11,roll:.96}),'zombie');
});
test('fábrica monta 3 infectados low-poly com rig e estatísticas configuradas',()=>{
 const enemies=[];
 const spawn=createEnemySpawner({THREE,scene,getGroundHeight:()=>0,
 findSpawnPoint:()=>at(12,-5),shrinePosition:at(32,-28),enemies});
 for(const type of ['zombie_runner','zombie_toxic','zombie_brute']){
   spawn(type);const enemy=enemies.at(-1);
   assert.equal(enemy.hp,ZOMBIE_TYPES[type].hp);
   assert.equal(enemy.speed,ZOMBIE_TYPES[type].speed);
   assert.equal(enemy.mesh.material.color.value,ZOMBIE_TYPES[type].shirt);
   assert.ok(enemy.mesh.userData.rig.leftLeg&&enemy.mesh.userData.rig.rightArm);
 }
});
test('cemitério tem coordenadas fixas, cripta, 16 lápides e colisores',()=>{
 const colliders=[];const cemetery=createCemetery({THREE,scene,getGroundHeight:()=>0,addCollider:v=>colliders.push(v)});
 const group=cemetery.create();
 assert.equal(cemetery.create(),group);
 assert.equal(cemetery.graves,16);
 assert.equal(colliders.length,17);
 assert.ok(withinCemetery(CEMETERY_POS));
 assert.equal(withinCemetery({x:0,z:0}),false);
 assert.ok(group.children.length>=18);
});
test('aldeão pode ser recrutado, patrulhar e atacar zumbis',()=>{
 const inventory={berries:4,water:2},enemy={hp:3,type:'zombie',mesh:{position:new Position(5,0,2)}};
 const enemies=[enemy],buildings=[{x:4,z:2}];let damage=0;
 const guard=createVillagerGuard({THREE,scene,getGroundHeight:()=>0,resolveCollision:(x,z)=>({x,z}),
 getStructures:()=>buildings,getEnemies:()=>enemies,canSee:()=>true,
 attackEnemy:(e,n)=>{assert.equal(e,enemy);damage+=n;}});
 assert.equal(guard.recruited,false);
 assert.equal(guard.nearby(at(4,2)),true);
 assert.match(guard.interact(inventory),/recrutado/);
 guard.update(1,1,at(0,0));
 assert.equal(guard.recruited,true);
 assert.ok(damage>0);
 assert.equal(guard.getState().recruited,true);
});
test('guarda abatido pode ser reanimado sem multiplicar comida/água',()=>{
 const state=createGuardState();state.recruited=true;state.hp=0;
 const inventory={berries:2,water:1};
 const message=interactGuard(state,inventory);
 assert.match(message,/voltou/);
 assert.equal(state.hp,50);
 assert.equal(inventory.berries,0);
 assert.equal(inventory.water,0);
 assert.equal(restoreGuard({...state,hp:81}),null);
 assert.equal(restoreGuard(undefined).recruited,false);
});
test('IA zumbi tóxico aplica status só após dano válido no jogador',()=>{
 const enemy={type:'zombie_toxic',mesh:new Mesh(new Geo(),new Mat({emissiveIntensity:0})),attackTimer:0,windup:0,knockback:0,
 size:1.01,damage:9,speed:2,hp:4};enemy.mesh.position.set(0,.5,-1);
 let poison=0,damage=0;
 const ai=createEnemyAI({enemies:[enemy],player:{position:new Position(0,0,0)},getGroundHeight:()=>0,
 resolveCollision:(x,z)=>({x,z}),isGameActive:()=>true,
 damagePlayer:(n)=>{damage+=n;return true},spawnParticle(){},throwProjectile(){},sfx:{warning(){}},
 onPoison:s=>poison=s});
 ai.update(.016,1);
 assert.equal(damage,9);assert.equal(poison,6);
});
test('infectados priorizam guarda próximo e gigante ataca a construção mais forte',()=>{
 const mk=(type,x,z)=>({type,mesh:new Mesh(new Geo(),new Mat({emissiveIntensity:0})),hp:12,size:1.88,speed:0,damage:ZOMBIE_TYPES[type].damage,
 attackTimer:0,knockback:0,windup:0});
 const zombie=mk('zombie',1,0);zombie.mesh.position.set(1,.5,0);
 const giant=mk('zombie_brute',2,1);giant.raider=true;giant.mesh.position.set(2,.9,1);
 let guardHits=0,buildingHits=0,playerHits=0;
 const ai=createEnemyAI({enemies:[zombie,giant],player:{position:new Position(0,0,0)},
 getGroundHeight:()=>0,resolveCollision:(x,z)=>({x,z}),isGameActive:()=>true,
 damagePlayer:()=>{playerHits++},spawnParticle(){},throwProjectile(){},sfx:{warning(){}},
 getGuard:()=>at(1,0),onGuardDamage:n=>{guardHits+=n},
 getRaidTarget:()=>at(2,1),onRaidDamage:(_,n)=>{buildingHits+=n}});
 ai.update(.016,1);
 // Somente o gigante participa da invasão; o zumbi comum mira o guarda.
 assert.equal(guardHits,10);
 assert.equal(playerHits,0);
 assert.ok(buildingHits>23);
});
test('recompensas de combate são negadas em mortes por aldeão',()=>{
 let xp=0,kills=0;
 const target={type:'zombie',mesh:new Mesh(new Geo(),new Mat({emissiveIntensity:0})),hp:2,size:.9,speed:1,knockback:0};
 target.mesh.position.set(1,.5,0);const enemies=[target];
 const combat=createCombatSystem({THREE,scene,player:{position:new Position()},enemies,weaponTypes:[],healthPacks:[],speedBoosts:[],particles:[],
 getGroundHeight:()=>0,resolveCollision:(x,z)=>({x,z}),removeMesh(){},spawnParticle(){},gainXP(n){xp+=n},showToast(){},
 sfx:{hit(){},boost(){}},spawnEnemy(){},spawnHealthPack(){},spawnSpeedBoost(){},advanceQuestIfReady(){},updateHUD(){},
 onEnemyKilled(){kills++},onBossDefeated(){},getLevel:()=>1,getWeaponIndex:()=>0,getPlayerYaw:()=>0,isGameActive:()=>true,isLocked:()=>true});
 combat.damageEnemy(target,2,.1,false);
 assert.equal(enemies.length,0);assert.equal(xp,0);assert.equal(kills,0);
});
test('save antigo é aceito; guarda e veneno novos persistem e são validados',()=>{
 const sample={version:2,seed:2026,graphicsQuality:'medium',level:1,xp:0,kills:0,health:100,maxHealth:100,
 wave:1,elapsed:2,currentWeapon:0,player:{x:0,z:0,yaw:0},survival:createSurvival(),raid:{lastNight:0,waves:0},
 resources:[],buildings:[],wildlife:[],healthPacks:[],speedBoosts:[],
 enemies:[{type:'zombie_brute',x:1,z:1,hp:12,enraged:false}]};
 assert.ok(validateSave(sample));
 assert.equal(Object.hasOwn(validateSave(sample),'guard'),false);
 const newSave={...sample,guard:{recruited:true,hp:50,x:4,z:2},poisonTimer:4.5};
 assert.equal(validateSave(newSave).guard.hp,50);
 assert.equal(validateSave({...newSave,poisonTimer:Infinity}),null);
 assert.equal(validateSave({...newSave,guard:{...newSave.guard,x:150}}),null);
 assert.equal(validateSave({...newSave,enemies:[{type:'zombie_brute',x:1,z:1,hp:13,enraged:false}]}),null);
});
test('jogo conecta minimapa, HUD, controles F e limites de spawn',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 for(const s of ['cemetery.create()','guard.update(dt','guard.interact(survival.inventory)','onGuardDamage:',
 'onPoison:',"enemies.length<12",'cemeteryPosition:CEMETERY_POS','poisonTimer'])assert.ok(main.includes(s),s);
 for(const id of ['guard-status','poison-status','cemetery-status'])assert.ok(html.includes(`id="${id}"`));
});
console.log(`${count} testes da expansão v1.6 concluídos.`);
