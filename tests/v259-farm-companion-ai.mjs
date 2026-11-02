import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGroundedFarmPlot,farmLocalWorld,farmLocalHeight,FARM_SIDE} from '../src/world/farm-plot-terrain.js';
import {collidesWithStructure,resolveStructureCollision,positionBlocked} from '../src/world/building-rules.js';
import {makeCrop,CROP_MATURITY} from '../src/gameplay/farming.js';
import {chooseChiquinhaFarm,createNpcQuestProgress,advanceChiquinhaWork,CHIQUINHA_INTERVAL}
  from '../src/gameplay/npc-questlines.js';
import {npcFarmApproach} from '../src/characters/forest-npcs.js';
import {selectGuardWork} from '../src/gameplay/guard-work.js';

const near=(a,b)=>assert.ok(Math.abs(a-b)<.00001,`${a} != ${b}`);
const ground=(x,z)=>x*.12-z*.03;
const pos=farmLocalWorld(10,-8,Math.PI/2,1,0);
near(pos.x,10);near(pos.z,-9);
near(farmLocalHeight(ground,10,-8,Math.PI/2,1,0,.018),ground(10,-9)-ground(10,-8)+.018);

// Malha real acompanha inclinação em todos os pontos do canteiro, sem nivelar
// a caixa inteira em uma única altura.
class Attr{
 constructor(w,d,nx,nz){
  this.coords=[];for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++)
    this.coords.push([w*(i/nx-.5),d*(.5-j/nz),0]);
  this.count=this.coords.length;
 }
 getX(i){return this.coords[i][0]}
 getY(i){return this.coords[i][1]}
 getZ(i){return this.coords[i][2]}
 setZ(i,v){this.coords[i][2]=v}
}
class PlaneGeometry{
 constructor(w,d,nx,nz){this.attributes={position:new Attr(w,d,nx,nz)};}
 computeVertexNormals(){}
 computeBoundingSphere(){}
}
class Mesh{
 constructor(geometry,material){this.geometry=geometry;this.material=material;this.rotation={x:0};
  this.position={x:0,y:0,z:0,set(x,y,z){this.x=x;this.y=y;this.z=z;}};}
}
const group={children:[],add(m){this.children.push(m)}};
const result=createGroundedFarmPlot({THREE:{Mesh,PlaneGeometry},group,getGroundHeight:ground,
 soilMaterial:{name:'soil'},edgeMaterial:{name:'border'},detail:true});
assert.ok(result.patches.length>=8);
for(const angle of [0,Math.PI/2,Math.PI]){
 result.conform(10,-8,angle);
 for(const {mesh,lift} of result.patches){
  assert.equal(mesh.castShadow,false);
  assert.equal(mesh.rotation.x,-Math.PI/2);
  const a=mesh.geometry.attributes.position;
  for(let i=0;i<a.count;i++){
   const v=farmLocalWorld(10,-8,angle,mesh.position.x+a.getX(i),mesh.position.z-a.getY(i));
   near(a.getZ(i),ground(v.x,v.z)-ground(10,-8)+lift);
  }
 }
}
near(result.patches[0].mesh.geometry.attributes.position.getZ(0),
 ground(10+FARM_SIDE/2,-8+FARM_SIDE/2)-ground(10,-8)+.018);
const plotShape={type:'farmPlot',x:10,z:-8,rotation:0};
assert.equal(collidesWithStructure(plotShape,10,-8,.46),false);
assert.equal(positionBlocked([plotShape],10,-8,.46),false);
assert.deepEqual(resolveStructureCollision([plotShape],10,-8,.46),{x:10,z:-8});

// IA da Chiquinha: a lavoura pronta ganha de terra vazia e terra seca.
const empty={type:'farmPlot',x:10,z:-8,crop:makeCrop()};
const dry={type:'farmPlot',x:12,z:-8,crop:{planted:true,growth:30,water:0}};
const harvest={type:'farmPlot',x:11,z:-10,crop:{planted:true,growth:CROP_MATURITY,water:0}};
const inv={vegetables:0,seeds:5,water:3};
assert.equal(chooseChiquinhaFarm([empty,dry,harvest],inv).plot,harvest);
assert.equal(chooseChiquinhaFarm([empty,dry],inv).action,'water');
dry.crop.water=60;
assert.equal(chooseChiquinhaFarm([empty,dry],inv).action,'plant');
assert.equal(chooseChiquinhaFarm([{...empty,x:100}],inv),null);
let approach=npcFarmApproach(empty,{x:10,z:-13},(x,z)=>z<-8);
near(approach.x,10);near(approach.z,-9.72);

// Trabalho à distância agora exige estar junto ao canteiro (no campo visual).
const state=createNpcQuestProgress();state.chiquinha.stage=1;
for(let i=0;i<CHIQUINHA_INTERVAL*11;i++)
 assert.equal(advanceChiquinhaWork(state,[empty],inv,.1,{workerPosition:{x:50,z:50}}),null);
assert.equal(empty.crop.planted,false);
let work=null;
for(let i=0;i<CHIQUINHA_INTERVAL*11;i++)
 work=advanceChiquinhaWork(state,[empty],inv,.1,{workerPosition:{x:10,z:-8}})||work;
assert.equal(work.action,'plant');

// Chaves não disputa o mesmo canteiro; escolhe outro trabalho e respeita a mochila.
const base={x:10,z:-8},two={type:'farmPlot',x:13,z:-8,crop:makeCrop()};
const both=[empty,two];
assert.equal(selectGuardWork(base,base,[],both,{...inv},{chiquinhaFarm:empty})?.target,two);
assert.equal(selectGuardWork(base,base,[],[empty],{...inv},{chiquinhaFarm:empty}),null);
two.crop={planted:true,growth:CROP_MATURITY,water:0};
assert.equal(selectGuardWork(base,base,[],[two],{vegetables:999,seeds:998,water:1}),null);
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const buildings=readFileSync(new URL('../src/world/buildings.js',import.meta.url),'utf8');
const guard=readFileSync(new URL('../src/characters/villager-guard.js',import.meta.url),'utf8');
assert.match(main,/chiquinhaFarm:npcQuests\.chiquinha\.stage>=1/);
assert.match(main,/workerPosition:simulateChiquinha/);
assert.match(buildings,/farmSurface\?\.conform/);
assert.match(buildings,/if\(type!=='farmPlot'\)batchStaticMeshes/);
assert.match(guard,/selectedWork=getWorkTarget/);
assert.match(readFileSync(new URL('../index.html',import.meta.url),'utf8'),/forest-webp-r1-s2-f3/);
console.log('OK v2.59: horta no solo, atravessável, 3 ângulos, IA coordenada Chiquinha/Chaves');
