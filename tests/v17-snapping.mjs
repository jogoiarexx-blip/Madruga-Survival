import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {snapTargets} from '../src/world/build-snapping.js';
import {preparePlacement,canPlaceAmong,MAX_STRUCTURES,positionBlocked,structureBlocksLine} from '../src/world/building-rules.js';
import {beginPlacement,rotatePlacement,toggleSnap,placementCandidate,placementStatus,commitPlacement} from '../src/gameplay/placement.js';
import {createBuildingWorld} from '../src/world/buildings.js';
import {validateSave} from '../src/gameplay/save-system.js';
import {createSurvival} from '../src/gameplay/survival.js';
const test=(name,fn)=>{fn();console.log('OK encaixe v1.7:',name);};
const floor={type:'floor',x:0,z:0,rotation:0};
const wall={type:'wall',x:0,z:1.5,rotation:0};
test('paredes grudam nas bordas de piso, com alinhamento de 90 graus',()=>{
 assert.deepEqual(snapTargets('wall',0,[floor],{x:0,z:1.2})[0],{x:0,z:1.5,label:'borda do piso',rotation:0});
 assert.deepEqual(snapTargets('wall',1,[floor],{x:1.2,z:0})[0],{x:1.5,z:0,label:'borda do piso',rotation:1});
 assert.equal(snapTargets('wall',0,[floor],{x:1.2,z:0}).length,0);
});
test('continuação e canto em L conectam paredes e portas corretamente',()=>{
 const straight=snapTargets('door',0,[wall],{x:3.1,z:1.5});
 assert.equal(straight[0].x,3);assert.equal(straight[0].z,1.5);
 const cross={type:'wall',x:1.5,z:0,rotation:1};
 const corner=snapTargets('wall',0,[cross],{x:0,z:1.5});
 assert.ok(corner.some(p=>p.x===0&&p.z===1.5));
 assert.equal(new Set(corner.map(p=>`${p.x}:${p.z}:${p.rotation}`)).size,corner.length);
});
test('pisos completam módulos vizinhos e telhados cobrem o piso central',()=>{
 const tile=snapTargets('floor',0,[floor],{x:3.2,z:0.1})[0];
 assert.equal(tile.x,3);assert.equal(tile.z,0);
 const roof=snapTargets('roof',0,[floor],{x:.1,z:0.2})[0];
 assert.equal(roof.x,0);assert.equal(roof.z,0);
 const nextRoof=snapTargets('roof',0,[{type:'roof',x:0,z:0}],{x:3.2,z:0})[0];
 assert.equal(nextRoof.x,3);
});
test('íman pode ser ligado e desligado, não força rotação contrária',()=>{
 const plan=beginPlacement('wall',0);plan.distance=3.8;
 const player={x:0,z:5};
 const withSnap=placementCandidate(plan,player,0,[floor],()=>true);
 assert.equal(withSnap.z,1.5);assert.equal(withSnap.snapped,true);
 toggleSnap(plan);
 const without=placementCandidate(plan,player,0,[floor],()=>true);
 assert.deepEqual(without,{type:'wall',x:0,z:0,rotation:0});
 rotatePlacement(plan);toggleSnap(plan);
 const rotated=placementCandidate(plan,player,0,[floor],()=>true);
 assert.equal(rotated.rotation,1);assert.equal(rotated.snapped,undefined);
});
test('íman ignora um encaixe ocupado e só escolhe posições válidas',()=>{
 const plan=beginPlacement('wall',0);
 const player={x:0,z:5};
 const occupied=[floor,wall];
 const canPlace=(type,x,z,_player,r,options)=>canPlaceAmong(occupied,preparePlacement(type,x,z,r,options));
 const status=placementStatus(plan,player,0,canPlace,()=>true,occupied);
 assert.ok(!status.candidate.snapped||status.candidate.z!==1.5);
 assert.ok(!status.valid||canPlace(status.candidate.type,status.candidate.x,status.candidate.z,player,status.candidate.rotation,{preserveCoordinates:!!status.candidate.snapped}));
});
test('proíbe sobrepor pisos/telhados parcialmente e parede colinear',()=>{
 assert.equal(canPlaceAmong([floor],{type:'floor',x:1.5,z:0}),false);
 assert.equal(canPlaceAmong([floor],{type:'floor',x:3,z:0}),true);
 assert.equal(canPlaceAmong([wall],{...wall}),false);
 assert.equal(canPlaceAmong([wall],{type:'wall',x:1.5,z:1.5,rotation:0}),false);
 assert.equal(canPlaceAmong([wall],{type:'wall',x:3,z:1.5,rotation:0}),true);
 assert.equal(canPlaceAmong([wall],{type:'wall',x:1.5,z:0,rotation:1}),true); // canto em L
});
test('parede na borda bloqueia movimento/visão sem alterar o piso',()=>{
 assert.equal(positionBlocked([floor,wall],0,1.5,.46),true);
 assert.equal(positionBlocked([floor,wall],0,0,.46),false);
 assert.equal(structureBlocksLine([wall],{x:0,z:0},{x:0,z:3}),true);
});
class Obj{constructor(){this.children=[];this.position={x:0,y:0,z:0,set(x,y,z){Object.assign(this,{x,y,z})}};this.rotation={x:0,y:0,z:0};this.scale={set(){},setScalar(){}};}add(...children){this.children.push(...children)}traverse(f){f(this);this.children.forEach(c=>c.traverse(f))}}
class Mesh extends Obj{constructor(g,m){super();this.geometry=g;this.material=m;this.isMesh=true;}}
class Geom{dispose(){} }
class Mat{constructor(o){Object.assign(this,o)}dispose(){}clone(){return new Mat(this)}}
class Light extends Obj{constructor(){super();this.isLight=true}}
const THREE={Mesh,Group:Obj,PointLight:Light,MeshBasicMaterial:Mat,MeshStandardMaterial:Mat,DoubleSide:2};
for(const name of ['BoxGeometry','DodecahedronGeometry','CylinderGeometry','ConeGeometry'])THREE[name]=Geom;
const mkWorld=()=>createBuildingWorld({THREE,scene:{add(){},remove(){}},getGroundHeight:()=>0,isPositionFree:()=>true});
test('mundo 3D posiciona peças nas metades e restaura saves exatos',()=>{
 const b=mkWorld();
 b.place('floor',0,0);
 assert.equal(b.canPlace('wall',0,1.5,{x:7,z:7},0,{preserveCoordinates:true}),true);
 const s=b.place('wall',0,1.5,0,{preserveCoordinates:true});
 assert.equal(s.z,1.5);
 const serialized=b.serialize();const b2=mkWorld();b2.restore(serialized);
 assert.deepEqual(b2.serialize(),serialized);
 assert.equal(b2.structures[1].z,1.5);
});
test('confirmação usa a MESMA coordenada que o holograma e só debita após validar',()=>{
 const plan=beginPlacement('wall',0),p={x:0,z:5},s=[floor];let spent=0;
 const result=commitPlacement({plan,position:p,yaw:0,structures:s,
    canPlace:()=>true,canAfford:()=>true,spend:()=>{spent++;return true},
    place:c=>({...c}),refund:()=>{spent--;}});
 assert.equal(result.ok,true);assert.equal(result.candidate.z,1.5);assert.equal(spent,1);
 assert.equal(plan.snapEnabled,true);
});
test('saves antigos continuam válidos e novo limite libera casas maiores',()=>{
 assert.equal(MAX_STRUCTURES,160);
 const saved={version:2,seed:42,graphicsQuality:'low',level:1,xp:0,kills:0,health:100,maxHealth:100,wave:1,elapsed:1,currentWeapon:0,
   player:{x:0,z:0,yaw:0},survival:createSurvival(),resources:[],buildings:[{type:'floor',x:0,z:0,rotation:0,hp:70}],
   healthPacks:[],speedBoosts:[],enemies:[]};
 assert.ok(validateSave(saved));
 saved.buildings.push({type:'wall',x:0,z:1.5,rotation:0,hp:90});
 assert.ok(validateSave(saved));
});
test('interface oferece ímã em teclado e botões de celular',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const css=readFileSync(new URL('../styles/main.css',import.meta.url),'utf8');
 assert.ok(main.includes("e.code==='KeyC'"));
 assert.ok(main.includes("['placement-snap',switchPlacementSnap]"));
 assert.ok(main.includes('structures:buildings.structures'));
 assert.ok(main.includes('preserveCoordinates:!!c.snapped'));
 assert.ok(html.includes('id="placement-snap"'));
 assert.ok(css.includes('placement-snap[aria-pressed'));
});
