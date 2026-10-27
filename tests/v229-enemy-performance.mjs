import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createEnemySpawner} from '../src/characters/enemy-factory.js';
import {createEnemyAI} from '../src/gameplay/enemy-ai.js';
import {createEnemyGeometryPool,canDisposeEnemyGeometry} from '../src/render/enemy-geometry-pool.js';
let passed=0;
function check(name,action){action();passed++;console.log('OK v2.29 '+passed+': '+name);}
class Obj{
  static nextId=0;
  constructor(){this.id=++Obj.nextId;this.children=[];this.userData={};
    this.position={x:0,y:0,z:0,set(x,y,z){Object.assign(this,{x,y,z})}};
    this.rotation={x:0,y:0,z:0};this.scale={y:1,setScalar(){}};}
  add(...items){this.children.push(...items)}
}
class Mesh extends Obj{constructor(geometry,material){super();this.geometry=geometry;this.material=material;this.isMesh=true}}
let builds=0;
class Geo{constructor(...args){this.args=args;this.userData={};builds++}dispose(){this.disposed=true}}
class Mat{constructor(properties){Object.assign(this,properties)}clone(){return new Mat({...this})}}
const THREE={Group:Obj,Mesh,MeshStandardMaterial:Mat,MeshBasicMaterial:Mat};
for(const type of ['BoxGeometry','SphereGeometry','ConeGeometry','CylinderGeometry','OctahedronGeometry','TorusGeometry'])THREE[type]=Geo;
let quality='medium';const enemies=[];
const spawn=createEnemySpawner({THREE,scene:{add(){}},getGroundHeight:()=>0,
  findSpawnPoint:()=>({x:10,z:10}),shrinePosition:{x:30,z:-30},enemies,getQuality:()=>quality});
check('inimigos iguais reutilizam geometrias sem nova tesselação',()=>{
  spawn('normal');const first=builds;spawn('normal');
  assert.equal(builds,first);
  assert.strictEqual(enemies[0].mesh.geometry,enemies[1].mesh.geometry);
  assert.ok(spawn.geometryStats().reused>=first);
});
check('material, vida, posição e articulações permanecem individuais',()=>{
  const [a,b]=enemies;assert.notStrictEqual(a.mesh.material,b.mesh.material);
  a.mesh.userData.rig.leftArm.rotation.x=1.4;a.mesh.position.x=99;a.hp=0;
  assert.equal(b.mesh.userData.rig.leftArm.rotation.x,0);
  assert.equal(b.mesh.position.x,10);assert.equal(b.hp,2);
});
check('perfil de qualidade diferente não reutiliza geometria errada',()=>{
  const old=enemies[0].mesh.geometry;
  quality='high';spawn('normal');const hi=enemies.at(-1).mesh.geometry;
  assert.notStrictEqual(old,hi);spawn('normal');
  assert.strictEqual(enemies.at(-1).mesh.geometry,hi);
});
check('variantes com tamanhos diferentes mantêm buffers próprios',()=>{
  spawn('zombie');spawn('zombie_runner');spawn('boss');
  assert.notStrictEqual(enemies.at(-3).mesh.geometry,enemies.at(-2).mesh.geometry);
  assert.notStrictEqual(enemies.at(-1).mesh.geometry,enemies.at(-2).mesh.geometry);
});
check('cache persiste e identifica geometria compartilhada',()=>{
  const pool=createEnemyGeometryPool();let count=0;
  const a=pool.get('normal',()=>{count++;return new Geo()});
  assert.strictEqual(a,pool.get('normal',()=>{count++;return new Geo()}));
  assert.equal(count,1);assert.deepEqual(pool.stats,{unique:1,reused:1});
  assert.equal(canDisposeEnemyGeometry(a),false);assert.equal(canDisposeEnemyGeometry(new Geo()),true);
});
check('destruição de um inimigo não libera geometria de outro',()=>{
  const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  assert.ok(main.includes('canDisposeEnemyGeometry(node.geometry)'));
  assert.ok(main.includes('!node.userData?.sharedZombieGeometry'));
  assert.ok(main.includes('!node.userData?.sharedGoblinGeometry'));
});
check('muitos zumbis usam uma leitura de percepção por quadro',()=>{
  let reads=0;
  const zombie=x=>({type:'zombie',hp:3,damage:12,size:1,speed:3,attackTimer:10,windup:0,knockback:0,
    mesh:{id:x+100,position:{x,y:0,z:0},rotation:{x:0,y:0,z:0},scale:{y:1},material:{emissiveIntensity:0}}});
  const living=[zombie(0),zombie(60)];
  const ai=createEnemyAI({enemies:living,player:{position:{x:0,y:0,z:3}},
    getGroundHeight:()=>0,resolveCollision:(x,z)=>({x,z}),isGameActive:()=>true,
    showBossTelegraph(){},hideBossTelegraph(){},damagePlayer(){},spawnParticle(){},throwProjectile(){},sfx:{warning(){}},
    getPlayerPerception:()=>{reads++;return {night:false,sneaking:false,sprinting:false}}});
  ai.update(.016,0);assert.equal(reads,1);assert.ok(living[0].awareness);
  assert.notStrictEqual(living[0].awareness,living[1].awareness);
  ai.update(.016,.016);assert.equal(reads,2);
});
check('sem zumbis não existe leitura desnecessária',()=>{
  let reads=0;
  const ai=createEnemyAI({enemies:[],player:{position:{x:0,y:0,z:0}},isGameActive:()=>true,
    getPlayerPerception:()=>{reads++;return {}}});
  ai.update(.016,0);assert.equal(reads,0);
});
console.log('v2.29: '+passed+' verificações de desempenho lógico aprovadas');
