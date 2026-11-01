import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {FOREST_NPC_SPECS,npcDistance,npcPatrolGoal,chooseNpcClip,createForestNpcs}
  from '../src/characters/forest-npcs.js';

const spec=id=>FOREST_NPC_SPECS.find(n=>n.id===id);
assert.equal(FOREST_NPC_SPECS.length,2);
assert.equal(spec('chiquinha').url,'./assets/models/chiquinha.glb');
assert.equal(spec('bruxa71').url,'./assets/models/bruxa%20do%2071.glb');
assert.ok(spec('chiquinha').height<spec('bruxa71').height,'chiquinha precisa ser menor');
assert.equal(npcDistance({x:0,z:0},{x:3,z:4}),5);
assert.equal(chooseNpcClip(['Idle','Walking','Attack'],true),'Walking');
assert.equal(chooseNpcClip(['Idle','Walking','Attack'],false),'Idle');
assert.equal(chooseNpcClip(['Attack','Death'],false),null);
assert.equal(chooseNpcClip([],true),null);
for(const npc of FOREST_NPC_SPECS){
  for(const t of [0,30,100,1000]){
    const p=npcPatrolGoal(npc,t);
    assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.z));
    assert.ok(npcDistance(npc,p)<=npc.walkRadius+.001);
  }
  const bytes=readFileSync(new URL('../'+npc.url.replace('./','').replaceAll('%20',' '),import.meta.url));
  assert.equal(bytes.toString('ascii',0,4),'glTF',npc.id+' precisa ser GLB');
  assert.equal(bytes.readUInt32LE(4),2,'versao GLB 2');
  assert.equal(bytes.readUInt32LE(8),bytes.length,'comprimento GLB integro');
  assert.equal(bytes.toString('ascii',16,20),'JSON','chunk JSON GLB');
  const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString('utf8'));
  assert.ok(gltf.scenes?.length>0&&gltf.meshes?.length>0,'GLB com malhas/cena');
  console.log(npc.name+': '+(statSync(new URL('../'+npc.url.replace('./','').replaceAll('%20',' '),import.meta.url)).size/1048576).toFixed(1)+' MiB, '+(gltf.animations?.length||0)+' animacoes, '+(gltf.skins?.length||0)+' skins');
}
class Node{
  constructor(){this.children=[];this.position={x:0,y:0,z:0,set(x,y,z){this.x=x;this.y=y;this.z=z;}};
    this.rotation={y:0};this.visible=true;}
  add(obj){this.children.push(obj);}
  traverse(cb){cb(this);for(const kid of this.children)kid.traverse(cb);}
}
class Mesh extends Node{constructor(){super();this.isMesh=true;}}
const THREE={Group:Node,Mesh,CylinderGeometry:class{},SphereGeometry:class{},
  ConeGeometry:class{},MeshLambertMaterial:class{}};
const scene=new Node();
const npcs=createForestNpcs({THREE,GLTFLoader:null,scene,
  getGroundHeight:()=>.3,resolveCollision:(x,z)=>({x,z})});
assert.equal(scene.children.length,2);
assert.equal(npcs.nearest({x:10,z:-8}).spec.id,'chiquinha');
assert.equal(npcs.nearest({x:-43,z:-37}).spec.id,'bruxa71');
assert.equal(npcs.nearest({x:0,z:0}),null);
assert.equal(npcs.nearest({x:10,z:-8},{insideCave:true}),null);
const line=npcs.interact({x:10,z:-8});
assert.match(line,/Chiquinha/);
assert.notEqual(npcs.interact({x:10,z:-8}),line);
npcs.reset();assert.equal(npcs.interact({x:10,z:-8}),line);
npcs.update(.016,{x:10,z:-8},{insideCave:true});
assert.ok(npcs.agents.every(a=>!a.model.visible));
npcs.update(.016,{x:10,z:-8},{insideCave:false});
assert.ok(npcs.agents.find(a=>a.spec.id==='chiquinha').model.visible);
console.log('NPC QA: GLB, escala, proximidade, dialogos, caverna, fallback e patrulha OK');
