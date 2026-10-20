import assert from 'node:assert/strict';
import {createResourceWorld} from '../src/world/resources.js';
import {createBuildingWorld} from '../src/world/buildings.js';
class Material{constructor(props){Object.assign(this,props)}clone(){return new Material(this)}}
class Geom{constructor(...args){this.args=args}}
class Object3D{constructor(){this.children=[];this.position={x:0,y:0,z:0,set(x,y,z){this.x=x;this.y=y;this.z=z}};this.rotation={x:0,y:0,z:0};this.scale={x:1,y:1,z:1};this.visible=true;}add(item){this.children.push(item)}}
class Mesh extends Object3D{constructor(geometry,material){super();this.geometry=geometry;this.material=material;}}
class Group extends Object3D{}
class PointLight extends Object3D{constructor(color,intensity){super();this.intensity=intensity;}}
const THREE={Mesh,Group,PointLight,MeshStandardMaterial:Material,SphereGeometry:Geom,CylinderGeometry:Geom,
 DodecahedronGeometry:Geom,IcosahedronGeometry:Geom,ConeGeometry:Geom,TorusGeometry:Geom,BoxGeometry:Geom,
 DoubleSide:2};
const make=()=>({THREE,scene:{items:[],add(o){this.items.push(o)}},getGroundHeight:()=>.1,
 isPositionFree:()=>true,findSpawnPoint:()=>({x:10,z:10})});
const test=(label,fn)=>{fn();console.log('OK mundo sobrevivência:',label)};
test('mesma seed gera recursos no mesmo lugar',()=>{
 const a=createResourceWorld(make()),b=createResourceWorld(make());
 a.generate(8766);b.generate(8766);
 assert.equal(a.nodes.length,b.nodes.length);assert.ok(a.nodes.length>100);
 assert.deepEqual(a.serialize(),b.serialize());
});
test('coleta, recarga e retorno do nó de recurso',()=>{
 const w=createResourceWorld(make());w.generate(2026);
 const node=w.nodes[1];const pos={x:node.x,z:node.z};
 const harvested=w.harvest(pos);assert.ok(harvested);
 assert.ok(w.nodes.some(n=>n.cooldown>0));
 w.update(140);assert.ok(w.nodes.every(n=>n.cooldown===0));
 const snapshot=w.serialize(),other=createResourceWorld(make());other.generate(2026);
 assert.ok(other.restore(snapshot));assert.deepEqual(other.serialize(),snapshot);
});
test('construções podem ser colocadas e são persistidas',()=>{
 const b=createBuildingWorld(make());
 assert.equal(b.canPlace('shelter',5,5,{x:0,z:0}),true);
 b.place('campfire',5,5);b.place('shelter',15,15);
 assert.ok(b.near('campfire',{x:5,z:3}));
 assert.equal(b.canPlace('shelter',5,5,{x:0,z:0}),false);
 const restored=createBuildingWorld(make());restored.restore(b.serialize());
 assert.deepEqual(restored.serialize(),b.serialize());
});
