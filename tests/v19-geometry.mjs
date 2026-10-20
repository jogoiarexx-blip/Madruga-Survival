import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GEOMETRY_DETAIL,geometryDetail,roundedBoxGeometry} from '../src/render/geometry-detail.js';
import {createNatureAssets} from '../src/world/nature-assets.js';
import {createResourceWorld} from '../src/world/resources.js';
import {createWildlifeWorld} from '../src/world/wildlife.js';

const test=(label,fn)=>{fn();console.log(`OK detalhe v1.9: ${label}`);};
class Geometry {
 constructor(...args){this.args=args;this.disposed=false;}
 dispose(){this.disposed=true;}
}
class Material{constructor(args){Object.assign(this,args);}clone(){return new Material({...this});}}
class Obj {
 constructor(){this.position={x:0,y:0,z:0,set(x,y,z){this.x=x;this.y=y;this.z=z}};
 this.rotation={x:0,y:0,z:0};this.scale={x:1,y:1,z:1,set(x,y,z){this.x=x;this.y=y;this.z=z}};
 this.visible=true;this.children=[];this.userData={};}
 add(child){this.children.push(child);}
}
class Mesh extends Obj{constructor(geometry,material){super();this.geometry=geometry;this.material=material;}}
const THREE={Group:Obj,Mesh,MeshStandardMaterial:Material,MeshBasicMaterial:Material};
for(const shape of ['BoxGeometry','CylinderGeometry','ConeGeometry','SphereGeometry','DodecahedronGeometry',
 'IcosahedronGeometry','TorusGeometry'])THREE[shape]=Geometry;
const make=()=>({THREE,scene:{add(){}},getGroundHeight:()=>0,isPositionFree:()=>true,
  findSpawnPoint:()=>({x:10,z:10}),onHunt(){}});

test('detalhamento aumenta polígonos somente com qualidade escolhida',()=>{
 for(const prop of ['trunk','foliage','bushWidth','bushHeight','resourceCylinder','resourceSphere','flame']){
  assert.ok(GEOMETRY_DETAIL.high[prop]>GEOMETRY_DETAIL.medium[prop],prop);
  assert.ok(GEOMETRY_DETAIL.medium[prop]>=GEOMETRY_DETAIL.low[prop],prop);
 }
 assert.equal(geometryDetail('invalid'),geometryDetail('medium'));
});
test('geometrias da floresta permanecem compartilhadas e só mudam antes de gerar',()=>{
 const nature=createNatureAssets(THREE),original=nature.leafGeometry;
 assert.equal(nature.setQuality('medium'),false);
 assert.equal(nature.setQuality('high'),true);
 assert.equal(original.disposed,true);
 assert.equal(nature.leafGeometry.args.at(-1),GEOMETRY_DETAIL.high.foliage);
 assert.equal(nature.trunkGeometry.args.at(-1),GEOMETRY_DETAIL.high.trunk);
 assert.equal(nature.bushGeometry.args[1],GEOMETRY_DETAIL.high.bushWidth);
 assert.equal(nature.setQuality('high'),false);
 assert.equal(nature.setQuality('low'),true);
 assert.equal(nature.rockGeometry.args[1],0);
});
test('caixas arredondadas mudam posição dos vértices e recalculam normais',()=>{
 const points=[[1,1,1],[0,1,0],[-1,-1,-1]];
 class RealBox{constructor(){this.attributes={position:{count:points.length,
   getX:i=>points[i][0],getY:i=>points[i][1],getZ:i=>points[i][2],
   setXYZ(i,x,y,z){points[i]=[x,y,z]}}};}
   computeVertexNormals(){this.normalCalculated=true;}}
 const rounded=roundedBoxGeometry({BoxGeometry:RealBox},2,2,2,.2,4);
 assert.ok(points[0][0]<1&&points[0][0]>.8);
 assert.ok(points[0][1]<1&&points[0][1]>.8);
 assert.deepEqual(points[1],[0,1,0]);
 assert.ok(rounded.normalCalculated);
});
test('recursos mantêm a mesma posição por seed, com curvas mais detalhadas',()=>{
 const low=createResourceWorld(make()),high=createResourceWorld(make());
 low.generate(0xffffffff,'low');high.generate(0xffffffff,'high');
 assert.equal(low.nodes.length,high.nodes.length);
 assert.deepEqual(low.serialize(),high.serialize());
 const waterLow=low.nodes.find(n=>n.type==='water'),waterHigh=high.nodes.find(n=>n.type==='water');
 assert.ok(waterHigh.group.children[0].geometry.args.at(-1)>waterLow.group.children[0].geometry.args.at(-1));
 const berries=high.nodes.filter(n=>n.type==='berries');
 assert.ok(berries.length>5);
 assert.equal(berries[0].group.children[1].geometry,berries[1].group.children[1].geometry);
 assert.equal(high.nodes[0].group.children[1].geometry.args[3],GEOMETRY_DETAIL.high.decoration*2);
});
test('coelhos e javalis compartilham esferas, com alta resolução só no perfil alto',()=>{
 const low=createWildlifeWorld(make()),high=createWildlifeWorld(make());
 low.generate(123456,'low');high.generate(123456,'high');
 assert.deepEqual(low.serialize(),high.serialize());
 assert.equal(high.animals.length,10);
 const sphere1=high.animals[0].group.children[0].geometry;
 const sphere2=high.animals[1].group.children[0].geometry;
 assert.equal(sphere1,sphere2);
 assert.equal(sphere1.args[1],GEOMETRY_DETAIL.high.bushWidth);
 assert.equal(low.animals[0].group.children[0].geometry.args[1],GEOMETRY_DETAIL.low.bushWidth);
});
test('main integra perfis à floresta, aos recursos e à fauna sem alterar o GLB REV4',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const manager=readFileSync(new URL('../src/characters/zombie-models.js',import.meta.url),'utf8');
 assert.match(main,/natureAssets\.setQuality\(graphicsQuality\)/);
 assert.match(main,/resources\.generate\(worldSeed,graphicsQuality\)/);
 assert.match(main,/wildlife\.generate\(worldSeed,graphicsQuality\)/);
 assert.match(manager,/zumbi_geometrico_REV4\.glb/);
});
