import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createEnemySpawner} from '../src/characters/enemy-factory.js';
import {enemyPose} from '../src/characters/enemy-animation.js';
import {validateSave} from '../src/gameplay/save-system.js';
import {createSurvival} from '../src/gameplay/survival.js';
const test=(label,fn)=>{fn();console.log(`OK v1.5: ${label}`);};
class Obj{constructor(){this.children=[];this.userData={};this.position={x:0,y:0,z:0,set(x,y,z){this.x=x;this.y=y;this.z=z}};this.rotation={x:0,y:0,z:0};this.scale={set(){},setScalar(){}};}add(...items){this.children.push(...items);}}
class Mesh extends Obj{constructor(g,m){super();this.geometry=g;this.material=m;this.isMesh=true;}}
class Geo{constructor(...args){this.args=args}clone(){return new this.constructor(...this.args)}}
class Mat{constructor(o={}){Object.assign(this,o);if(typeof this.color==='number'){const v=this.color;this.color={value:v,setHex(n){this.value=n}}}}clone(){return new Mat({...this,color:this.color?.value??this.color})}}
const THREE={Group:Obj,Mesh,MeshStandardMaterial:Mat,MeshBasicMaterial:Mat};
for(const name of ['BoxGeometry','SphereGeometry','ConeGeometry','CylinderGeometry','OctahedronGeometry','TorusGeometry'])THREE[name]=Geo;

test('zumbi nasce com stats próprios e olhos claros',()=>{
 const enemies=[];
 const spawn=createEnemySpawner({THREE,scene:{add(){}},getGroundHeight:()=>0,findSpawnPoint:()=>({x:6,z:8}),shrinePosition:{x:32,z:-28},enemies});
 spawn('zombie');
 const zombie=enemies[0];
 assert.equal(zombie.type,'zombie');
 assert.equal(zombie.hp,3);
 assert.ok(zombie.speed<3);
 assert.equal(zombie.mesh.material.color.value,0x4f6650);
 assert.equal(zombie.mesh.userData.rig.leftArm.position.x<0,true);
});

test('pose de zumbi mantém braços projetados para frente',()=>{
 const pose=enemyPose('zombie',0.35,true);
 assert.ok(pose.leftArm<-.6);
 assert.ok(pose.rightArm<-.6);
 assert.ok(Math.abs(pose.leftLeg)>0.1);
});

test('main integra zumbi aos spawns noturnos e invasões',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.ok(main.includes("spawnEnemy(i%4===0?chooseZombieType("));
 assert.ok(main.includes("r<0.43?chooseZombieType("));
});

test('save continua válido com zumbi e habilidades',()=>{
 const survival=createSurvival();
 const data={version:2,seed:123,graphicsQuality:'medium',level:1,xp:0,kills:0,health:100,maxHealth:100,wave:1,elapsed:0,currentWeapon:0,
   player:{x:0,z:0,yaw:0},survival,raid:{lastNight:0,waves:0},resources:[],buildings:[],wildlife:[],healthPacks:[],speedBoosts:[],
   enemies:[{type:'zombie',x:1,z:2,hp:3,enraged:false}]};
 assert.ok(validateSave(data));
});
