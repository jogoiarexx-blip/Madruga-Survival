import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {beginPlacement,nudgePlacement,rotatePlacement,placementCandidate,placementStatus,commitPlacement,isStructureRecipe} from '../src/gameplay/placement.js';
import {createBuildingWorld} from '../src/world/buildings.js';
const check=(name,fn)=>{fn();console.log(`OK craft v1.6: ${name}`)};
check('construções têm prévia, equipamentos não',()=>{
 for(const type of ['campfire','shelter','floor','wall','door','roof','chest','bed','farmPlot','workbench'])assert.ok(isStructureRecipe(type));
 for(const type of ['pickaxe','cooked','ironSpear','repairPickaxe'])assert.ok(!isStructureRecipe(type));
 assert.equal(beginPlacement('cooked'),null);
});
check('planejamento altera posição e direção sem modificar mundo',()=>{
 const plan=beginPlacement('wall',0);
 const a=placementCandidate(plan,{x:0,z:0},0);
 assert.deepEqual(a,{type:'wall',x:0,z:-3,rotation:0});
 nudgePlacement(plan,'lateral',3);
 const b=placementCandidate(plan,{x:0,z:0},0);
 assert.deepEqual(b,{type:'wall',x:3,z:-3,rotation:0});
 rotatePlacement(plan);assert.equal(placementCandidate(plan,{x:0,z:0},0).rotation,1);
 nudgePlacement(plan,'distance',999);assert.equal(plan.distance,9);
 nudgePlacement(plan,'distance',-999);assert.equal(plan.distance,2.5);
 nudgePlacement(plan,'lateral',999);assert.equal(plan.lateral,6);
});
check('local proibido ou mochila vazia impedem confirmação',()=>{
 const plan=beginPlacement('floor');let spent=0,built=0;
 for(const [locationValid,materialValid] of [[false,true],[true,false]]){
   const result=commitPlacement({plan,position:{x:0,z:0},yaw:0,
      canPlace:()=>locationValid,canAfford:()=>materialValid,
      spend:()=>{spent++;return true},place:()=>{built++;return {}},refund:()=>{}});
   assert.equal(result.ok,false);
 }
 assert.equal(spent,0);assert.equal(built,0);
 const status=placementStatus(plan,{x:0,z:0},0,()=>false,()=>true);
 assert.match(status.reason,/bloqueado/);
});
check('confirmação debita uma vez e permite recuperação se criação falhar',()=>{
 const plan=beginPlacement('campfire');let amount=7,spawned=0;
 const options={plan,position:{x:0,z:0},yaw:0,
    canPlace:()=>true,canAfford:()=>amount>=4,
    spend:()=>{if(amount<4)return false;amount-=4;return true},
    refund:()=>{amount+=4},place:()=>{spawned++;return {id:spawned}}};
 assert.equal(commitPlacement(options).ok,true);assert.equal(amount,3);assert.equal(spawned,1);
 assert.equal(commitPlacement(options).ok,false);assert.equal(amount,3);assert.equal(spawned,1);
 amount=7;options.place=()=>null;
 assert.equal(commitPlacement(options).ok,false);assert.equal(amount,7);
});
check('prévia 3D é removível, não colide e não é salva',()=>{
 class Obj{constructor(){this.children=[];this.position={set(x,y,z){this.x=x;this.y=y;this.z=z}};this.rotation={};this.scale={};this.isLight=false}
   add(obj){this.children.push(obj)}traverse(fn){fn(this);for(const c of this.children)c.traverse(fn)}}
 class Mesh extends Obj{constructor(geo,material){super();this.isMesh=true;this.geometry=geo;this.material=material;}}
 class Geo{dispose(){}}
 class Mat{constructor(o){Object.assign(this,o);if(typeof this.color==='number')this.color={value:this.color,setHex(v){this.value=v}};}clone(){return new Mat({...this,color:this.color?.value??this.color})}dispose(){}}
 class Light extends Obj{constructor(){super();this.isLight=true}}
 const THREE={Mesh,Group:Obj,MeshStandardMaterial:Mat,MeshBasicMaterial:Mat,PointLight:Light,DoubleSide:2};
 for(const n of ['BoxGeometry','DodecahedronGeometry','CylinderGeometry','ConeGeometry'])THREE[n]=Geo;
 const scene={items:[],add(a){this.items.push(a)},remove(a){this.items.splice(this.items.indexOf(a),1)}};
 const buildings=createBuildingWorld({THREE,scene,getGroundHeight:()=>0,isPositionFree:()=>true});
 const ghost=buildings.createPreview('floor');assert.ok(ghost);assert.equal(scene.items.length,1);
 assert.equal(buildings.structures.length,0);assert.deepEqual(buildings.serialize(),[]);
 ghost.setPosition(3,-6,1);ghost.setValid(false);assert.equal(ghost.group.position.x,3);
 assert.equal(ghost.group.rotation.y,Math.PI/2);
 ghost.dispose();assert.equal(scene.items.length,0);
});
check('controles teclado, mouse e celular mostram confirmar e cancelar',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 for(const id of ['placement-panel','placement-confirm','placement-cancel','placement-left','placement-right','placement-rotate','placement-near','placement-far'])assert.ok(html.includes(`id="${id}"`));
 for(const name of ['confirmPlacement()','cancelPlacement()','movePlacement(','updatePlacementPreview()','placementGhost','createPreview','releasePlacement()'])assert.ok(main.includes(name));
 assert.ok(main.includes("['Enter','KeyF']"));
 assert.ok(main.includes("['Escape','Backspace']"));
 assert.ok(main.includes("document.getElementById('placement-panel')"));
});
