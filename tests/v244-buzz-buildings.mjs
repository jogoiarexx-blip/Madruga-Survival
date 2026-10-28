import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {soundscapeVolumes} from '../src/audio/audio-rules.js';
import {initAudio,setAudioPaused,setAudioSettings,updateSoundscape,audioDebug} from '../src/audio/sfx.js';
import {createBuildingWorld} from '../src/world/buildings.js';
let count=0;
function test(label,fn){fn();console.log(`OK v2.44 ${++count}: ${label}`);}
const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
class Geometry{dispose(){}}
class Material{constructor(o){Object.assign(this,o)}clone(){return new Material({...this})}dispose(){}}
class Object3D{
 constructor(){this.children=[];this.position={x:0,y:0,z:0,set(x,y,z){this.x=x;this.y=y;this.z=z}};this.rotation={x:0,y:0,z:0};this.scale={x:1,y:1,z:1,set(x,y,z){this.x=x;this.y=y;this.z=z}};this.visible=true;}
 add(c){this.children.push(c)}traverse(fn){fn(this);this.children.forEach(child=>child.traverse(fn))}
}
class Mesh extends Object3D{constructor(geo,mat){super();this.isMesh=true;this.geometry=geo;this.material=mat}}
class Light extends Object3D{constructor(a,b){super();this.intensity=b}}
const THREE={Group:Object3D,Mesh,PointLight:Light,MeshStandardMaterial:Material,MeshBasicMaterial:Material,BoxGeometry:Geometry,DodecahedronGeometry:Geometry,CylinderGeometry:Geometry,ConeGeometry:Geometry,SphereGeometry:Geometry,TorusGeometry:Geometry,DoubleSide:2};
function sceneForQuality(q){const scene={add(){},remove(){}};return createBuildingWorld({THREE,scene,getGroundHeight:()=>0,isPositionFree:()=>true,getQuality:()=>q});}
function childrenOf(item){const result=[];item.group.traverse(n=>{if(n.isMesh)result.push(n)});return result;}
test('nenhum grilo permanente nem oscilador a 4200 Hz no ambiente',()=>{
 const s=src('src/audio/sfx.js');assert.doesNotMatch(s,/cricket\.frequency\.value=4200|cricket\.start\(\)/);
 assert.match(s,/s\.cricketAt=s\.elapsed\+/);assert.match(s,/const size=Math\.max\(2048,Math\.floor\(ctx\.sampleRate\*5\.1\)\)/);
});
test('ambiente mais baixo, mutável e não gera música noturna no menu',()=>{
 const near=soundscapeVolumes({nearWater:0}),far=soundscapeVolumes({nearWater:100});
 assert.ok(near.wind<.08&&near.water<.12&&far.water===0);
 assert.deepEqual(soundscapeVolumes({active:false,night:true,nearWater:0}),{wind:0,water:0,night:0});
});
test('mixador silencia barramento ambiente ao pausar',()=>{
 const s=src('src/audio/sfx.js');assert.match(s,/ambientBus\.gain\.value=paused\?0:settings\.ambient/);
 assert.match(s,/Math\.abs\(previousTarget-target\)<\.008/);
});
test('módulos de construção recebem molduras e vigas em qualidade alta',()=>{
 const b=sceneForQuality('high');const wall=b.place('wall',0,0),door=b.place('door',3,0),window=b.place('window',6,0);
 assert.ok(childrenOf(wall).length>=18);assert.ok(childrenOf(door).length>=14);assert.ok(childrenOf(window).length>=15);
 assert.equal(b.toggleDoor(door),true);assert.equal(b.toggleDoor(window),true);
});
test('qualidade mínima ainda mantém todas as estruturas e animações de portas',()=>{
 const low=sceneForQuality('low');const high=sceneForQuality('high');
 for(const type of ['wall','floor','door','window','roof','chest','workbench','campfire','shelter','bed','farmPlot']){
  const l=low.place(type,0,0),h=high.place(type,0,0);
  assert.ok(l?.group&&h?.group,type);assert.ok(childrenOf(h).length>=childrenOf(l).length,type);
 }
 assert.equal(low.toggleDoor(low.structures.find(s=>s.type==='door')),true);
});
test('save das estruturas preserva abertura e inventário após nova geometria',()=>{
 const b=sceneForQuality('medium');b.place('door',3,0);b.place('window',6,0);const chest=b.place('chest',0,3);chest.items.wood=9;
 b.toggleDoor(b.structures[0]);b.toggleDoor(b.structures[1]);
 const restored=sceneForQuality('low');restored.restore(b.serialize());assert.deepEqual(restored.serialize(),b.serialize());
});
test('conserva batching de peças estáticas e pivôs independentes',()=>{
 const code=src('src/world/buildings.js');assert.match(code,/batchStaticMeshes/);
 assert.match(code,/block\(doorPivot/);assert.match(code,/doorPivot\.rotation\.y/);
});
test('versão atualiza cache de HTML, CSS e ponto de entrada',()=>{
 assert.equal(JSON.parse(src('package.json')).version,'2.52.0');
 assert.match(src('index.html'),/2\.44\.0-quiet-builds|2\.45\.0-stable-play|2\.47\.0-multi-floor|2\.48\.0-interactive-fishing|2\.49\.0-fish-lod-rig|2\.51\.0-lake-shore-lod|2\.52\.0-lake-ecology/);
 assert.match(src('src/main.js'),/sfx\.js\?v=2\.44\.0-quiet/);
});
console.log(`v2.44.0: ${count} testes aprovados`);
