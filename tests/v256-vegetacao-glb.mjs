import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FOREST_OBJECT_MODELS,forestTreeVariant,forestObjectRange,forestObjectCap,createForestObjectModels}
  from '../src/world/forest-object-models.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
assert.equal(FOREST_OBJECT_MODELS.length,4);
assert.deepEqual(FOREST_OBJECT_MODELS.map(x=>x.id),['tree1','tree2','tree3','bush']);
assert.ok(forestObjectRange('low','tree1')<forestObjectRange('high','tree1'));
assert.ok(forestObjectRange('low','bush')<forestObjectRange('medium','bush'));
assert.equal(forestTreeVariant(25,-10),forestTreeVariant(25,-10));
for(const id of ['tree1','tree2','tree3','bush'])assert.ok(
 forestObjectCap('low',id)<forestObjectCap('high',id),'limite de triangulos por perfil');
for(const model of FOREST_OBJECT_MODELS){
  const filepath='../'+model.url.replace('./','').replaceAll('%20',' ');
  const buf=readFileSync(new URL(filepath,import.meta.url));
  assert.equal(buf.toString('ascii',0,4),'glTF',model.id);
  assert.equal(buf.readUInt32LE(4),2);
  assert.equal(buf.readUInt32LE(8),buf.length);
  assert.equal(buf.toString('ascii',16,20),'JSON');
  const json=JSON.parse(buf.subarray(20,20+buf.readUInt32LE(12)).toString('utf8'));
  assert.ok(json.scenes?.length>=1&&json.meshes?.length>=1,'malhas validas');
  assert.ok(json.nodes?.length>=1);
  const primitives=json.meshes.reduce((a,m)=>a+m.primitives.length,0);
  const triangles=json.meshes.reduce((sum,m)=>sum+m.primitives.reduce((n,p)=>{
    const accessor=json.accessors[p.indices??p.attributes.POSITION];
    return n+((p.mode??4)===4?Math.floor(accessor.count/3):0);
  },0),0);
  console.log('GLB '+model.id+': '+(buf.length/1048576).toFixed(2)+' MiB; '
    +json.meshes.length+' meshes, '+primitives+' primitivas, ~'+triangles
    +' triangulos, '+(json.textures?.length||0)+' texturas');
}
const treeSource=read('src/world/forest.js');
assert.match(treeSource,/createForestObjectModels/);
assert.match(treeSource,/forestTreeVariant\(x,z\)/);
assert.match(treeSource,/bushPositions\.push/);
assert.match(treeSource,/collisionWorld\.add\(collider\)/);
assert.match(treeSource,/distantLeafGeometry/);
const main=read('src/main.js');
assert.match(main,/forest\.preloadModels\(\)/);
assert.match(main,/forest\.updateVisibility\(player\.position,graphicsQuality,dt\)/);
const gui=read('index.html');
assert.match(gui,/forest-glb-r1/);

class Obj {
 constructor(){
  this.position={x:0,y:0,z:0,set(x,y,z){this.x=x;this.y=y;this.z=z;},copy(other){this.set(other.x,other.y,other.z);}};
  this.rotation={y:0,set(x,y,z){this.x=x;this.y=y;this.z=z;}};
  this.scale={setScalar(x){this.x=this.y=this.z=x}};
  this.matrix={};this.matrixWorld={};this.children=[];this.visible=true;this.userData={};
 }
 add(x){this.children.push(x)}
 traverse(fn){fn(this);for(const kid of this.children)kid.traverse(fn)}
 updateMatrix(){this.matrix={x:this.position.x,y:this.position.y,z:this.position.z}}
 updateMatrixWorld(){}
}
class Mesh extends Obj{
 constructor(geometry,material){super();this.geometry=geometry;this.material=material;this.isMesh=true;}
}
class Geo {clone(){return new Geo()}applyMatrix4(){return this;}}
class Batch extends Mesh{
 constructor(geo,mat,n){super(geo,mat);this.capacity=n;this.count=n;
  this.instanceMatrix={needsUpdate:false,setUsage(){}};this.calls=[];}
 setMatrixAt(i,m){this.calls.push(i);}
}
class Matrix4{makeScale(){return this}makeTranslation(){return this}multiply(){return this}multiplyMatrices(){return this}}
class Box3{setFromObject(){this.min={x:-1,y:0,z:-1};this.max={x:1,y:3,z:1};return this}}
class Loader{load(url,onLoad){
 const root=new Obj();root.add(new Mesh(new Geo(),{name:url}));
 onLoad({scene:root});
}}
const THREE={Object3D:Obj,InstancedMesh:Batch,Matrix4,Box3,DynamicDrawUsage:'dynamic'};
const scene={children:[],add(x){this.children.push(x)}};
function tree(id,x,z){return {position:{x,y:0,z},rotation:{y:.4},visible:true,
 userData:{modelVariant:id,modelScale:1,lod:{trunk:{visible:true},
 detailedLeaves:[{visible:true}],far:false}}};}
const trees=[tree('tree1',5,0),tree('tree2',11,0),tree('tree3',15,0)];
const shrubs=[{x:3,y:0,z:2,scale:1,rotation:0,materialIndex:0,originalMatrix:{}},
 {x:100,y:0,z:100,scale:1,rotation:0,materialIndex:0,originalMatrix:{}}];
const fallback=[{visible:true,instanceMatrix:{needsUpdate:false},userData:{forestBushMaterial:0},
 count:2,setMatrixAt(i,m){this.matrices??=[];this.matrices[i]=m;}}];
const manager=createForestObjectModels({THREE,GLTFLoader:Loader,scene,trees,bushPositions:shrubs,bushFallback:fallback});
assert.deepEqual(Object.keys(manager.stats),['tree1','tree2','tree3','bush']);
await manager.preload();
assert.ok(Object.values(manager.stats).every(s=>s.loaded&&s.drawCalls===1));
manager.update({x:0,z:0},'medium',0,true);
assert.equal(manager.stats.tree1.instances,1);
assert.equal(manager.stats.tree2.instances,1);
assert.equal(manager.stats.tree3.instances,1);
assert.equal(manager.stats.bush.instances,1);
assert.equal(trees[0].userData.lod.trunk.visible,false);
assert.equal(fallback[0].visible,true,'arbusto distante permanece com malha leve');
assert.equal(fallback[0].count,1,'nao duplica arbusto GLB sobre o fallback');
manager.update({x:100,z:100},'medium',0,true);
assert.equal(manager.stats.tree1.instances,0);
assert.equal(manager.stats.bush.instances,1);
assert.equal(fallback[0].count,1);
assert.equal(trees[0].userData.lod.trunk.visible,true);
const once=await manager.preload();assert.equal(once,4);
const failed=createForestObjectModels({THREE,GLTFLoader:null,scene,trees,bushPositions:shrubs,bushFallback:[{visible:true}]});
assert.equal(await failed.preload(),0,'sem GLTFLoader mantém vegetação antiga');
console.log('OK vegetacao GLB: 4 modelos, LOD, instancing, cache de download, fallback e colisores preservados');
