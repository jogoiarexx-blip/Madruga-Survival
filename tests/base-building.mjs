import assert from 'node:assert/strict';
import {BUILD_GRID,preparePlacement,canPlaceAmong,positionBlocked,resolveStructureCollision,
 collidesWithStructure,nearestInteractive,structureBlocksLine} from '../src/world/building-rules.js';
import {createBuildingWorld} from '../src/world/buildings.js';
const ok=(label,fn)=>{fn();console.log('OK construção:',label);};
ok('módulos encaixam em grade de 3m e rodam em 90 graus',()=>{
 assert.equal(BUILD_GRID,3);
 assert.deepEqual(preparePlacement('wall',4.35,-4.8,5),{type:'wall',x:3,z:-6,rotation:1});
 assert.deepEqual(preparePlacement('campfire',4.35,-4.8),{type:'campfire',x:4.35,z:-4.8});
});
ok('parede bloqueia movimento e o jogador não atravessa',()=>{
 const w={type:'wall',x:0,z:0,rotation:0};
 assert.equal(positionBlocked([w],0,0),true);
 assert.equal(positionBlocked([w],0,2),false);
 const pushed=resolveStructureCollision([w],0,.25,.46);
 assert.ok(Math.abs(pushed.z)>=.6,JSON.stringify(pushed));
 const rotated={...w,rotation:1};
 assert.equal(collidesWithStructure(rotated,0,1.3),true);
 assert.equal(collidesWithStructure(rotated,1.4,1.3),false);
});
ok('porta fechada bloqueia e aberta libera, inclusive após rotação',()=>{
 const door={type:'door',x:6,z:-3,rotation:1,open:false};
 assert.equal(collidesWithStructure(door,6.1,-3,.46),true);
 door.open=true;
 assert.equal(collidesWithStructure(door,6.1,-3,.46),false);
});
ok('paredes bloqueiam linha de visão dos monstros e portas abertas liberam',()=>{
 const wall={type:'wall',x:0,z:0,rotation:0};
 const door={type:'door',x:3,z:0,rotation:0,open:false};
 const a={x:0,z:-2},b={x:0,z:2};
 assert.equal(structureBlocksLine([wall],a,b),true);
 assert.equal(structureBlocksLine([wall],{x:5,z:-2},{x:5,z:2}),false);
 assert.equal(structureBlocksLine([door],{x:3,z:-2},{x:3,z:2}),true);
 door.open=true;
 assert.equal(structureBlocksLine([door],{x:3,z:-2},{x:3,z:2}),false);
});
ok('peças de piso permitem paredes e móveis, mas não duplicação',()=>{
 const floor={type:'floor',x:0,z:0,rotation:0};
 assert.equal(canPlaceAmong([floor],{type:'wall',x:0,z:0,rotation:0}),true);
 assert.equal(canPlaceAmong([floor],{...floor}),false);
 const wall={type:'wall',x:0,z:0,rotation:0};
 assert.equal(canPlaceAmong([floor,wall],{type:'door',x:0,z:0,rotation:0}),false);
 assert.equal(canPlaceAmong([floor,wall],{type:'door',x:3,z:0,rotation:0}),true);
});
ok('prioriza interação próxima com cama, porta ou baú',()=>{
 const structures=[{type:'door',x:3,z:0},{type:'chest',x:1,z:0},{type:'bed',x:10,z:10}];
 assert.equal(nearestInteractive(structures,{x:0,z:0}).type,'chest');
 assert.equal(nearestInteractive(structures,{x:80,z:80}),null);
});
class G{constructor(){} dispose(){}}
class Mat{constructor(data){Object.assign(this,data)}clone(){return new Mat(this)}dispose(){}}
class Thing{constructor(){this.children=[];this.position={x:0,y:0,z:0,set(x,y,z){this.x=x;this.y=y;this.z=z}};
 this.rotation={x:0,y:0,z:0};this.scale={x:1,y:1,z:1};}add(c){this.children.push(c)}traverse(fn){fn(this);this.children.forEach(c=>c.traverse(fn))}}
class Group extends Thing{}
class Mesh extends Thing{constructor(geo,mat){super();this.geometry=geo;this.material=mat}}
class Light extends Thing{constructor(_c,intensity){super();this.intensity=intensity}}
const THREE={Group,Mesh,PointLight:Light,MeshStandardMaterial:Mat,BoxGeometry:G,
 ConeGeometry:G,CylinderGeometry:G,DodecahedronGeometry:G,DoubleSide:2};
const make=()=>{const scene={items:[],add(item){this.items.push(item)},remove(item){this.items.splice(this.items.indexOf(item),1)}};
 return {scene,buildings:createBuildingWorld({THREE,scene,getGroundHeight:()=>0,isPositionFree:()=>true})};};
ok('modelos 3D, portas, baú e cama funcionam e se restauram',()=>{
 const {scene,buildings:b}=make();
 const door=b.place('door',3.1,0,1);assert.equal(door.x,3);assert.equal(door.rotation,1);
 const chest=b.place('chest',0,3,0);chest.items.wood=12;
 b.place('bed',9,0,2);b.place('floor',0,0);b.place('wall',3,6);
 assert.equal(scene.items.length,5);
 assert.equal(b.toggleDoor(door),true);assert.equal(door.doorPivot.rotation.y<0,true);
 assert.equal(b.isBlocked(3,0,.46),false);
 assert.ok(b.nearest({x:0,z:3},2.2));
 const data=b.serialize();
 const {buildings:recovered}=make();recovered.restore(data);
 assert.deepEqual(recovered.serialize(),data);
 assert.equal(recovered.structures.find(s=>s.type==='chest').items.wood,12);
 assert.equal(recovered.structures.find(s=>s.type==='door').open,true);
 assert.equal(b.remove(chest),true);assert.equal(scene.items.length,4);
});
ok('máximo de estruturas e validação de lugar impedem sobreposições',()=>{
 const {buildings:b}=make();
 assert.equal(b.canPlace('wall',3,0,{x:0,z:0}),true);
 b.place('wall',3,0);
 assert.equal(b.canPlace('door',3,0,{x:0,z:0}),false);
 assert.equal(b.canPlace('bed',4,0,{x:0,z:0}),false);
 assert.equal(b.canPlace('floor',999,0,{x:0,z:0}),false);
});
