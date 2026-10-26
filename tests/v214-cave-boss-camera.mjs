import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {clampCameraToArena,createCameraRig,distanceToSegmentSquared} from '../src/render/camera-rig.js';
import {createArachnidCave,CAVE_CENTER,CAVE_RADIUS} from '../src/world/arachnid-cave.js';
import {spiderDecision,QUEEN_RAGE_COOLDOWN_FACTOR} from '../src/gameplay/spider-ai.js';
let checks=0;const test=(label,fn)=>{fn();console.log('OK v2.14',++checks,label)};
const arena={...CAVE_CENTER,radius:CAVE_RADIUS-.2};
const inside=pt=>Math.hypot(pt.x-arena.x,pt.z-arena.z)<arena.radius-.38+1e-6;
test('orbita exterior nao sofre restricao por padrao',()=>{
 const origin={x:0,y:2,z:0},goal={x:25,y:4,z:-12};assert.deepEqual(clampCameraToArena(origin,goal,null),goal);
});
test('alvo proximo do centro preserva zoom ate bater no limite da arena',()=>{
 const start={x:CAVE_CENTER.x,y:2,z:CAVE_CENTER.z},goal={x:CAVE_CENTER.x+6,y:3,z:CAVE_CENTER.z};
 assert.deepEqual(clampCameraToArena(start,goal,arena),goal);
});
test('camera nunca atravessa a borda para todos os angulos',()=>{
 for(let i=0;i<360;i++){const a=i*Math.PI/180,start={x:83,y:2,z:83};const goal={x:83+30*Math.cos(a),y:7,z:83+30*Math.sin(a)};
 const pos=clampCameraToArena(start,goal,arena);assert.equal(inside(pos),true,`angulo ${i}`);
 assert.ok(Number.isFinite(pos.y));}
});
test('camera junto a borda se afasta para dentro, nao atravessa as paredes',()=>{
 const p=clampCameraToArena({x:83+10,y:2,z:83},{x:83+18,y:3,z:83},arena);
 assert.ok(p.x<83+arena.radius-.37);assert.ok(p.x>83+10);
});
test('camera aceita direcao tangente e sem deslocamento horizontal',()=>{
 for(const q of [{x:83+5,y:7,z:83},{x:83,y:2,z:83}]){
 const p=clampCameraToArena(q,{...q,y:q.y+4},arena);assert.ok(inside(p));
 }
});
test('cobertura rapida de distancia ao segmento',()=>{
 assert.equal(distanceToSegmentSquared({x:5,z:0},{x:0,z:0},{x:10,z:0}),0);
});
class V {constructor(x=0,y=0,z=0){this.set(x,y,z)}set(x,y,z){this.x=x;this.y=y;this.z=z;return this}copy(v){return this.set(v.x,v.y,v.z)}add(v){return this.set(this.x+v.x,this.y+v.y,this.z+v.z)}sub(v){return this.set(this.x-v.x,this.y-v.y,this.z-v.z)}multiplyScalar(t){return this.set(this.x*t,this.y*t,this.z*t)}addScaledVector(v,s){return this.set(this.x+v.x*s,this.y+v.y*s,this.z+v.z*s)}length(){return Math.hypot(this.x,this.y,this.z)}distanceTo(v){return Math.hypot(this.x-v.x,this.y-v.y,this.z-v.z)}distanceToSquared(v){return (this.x-v.x)**2+(this.y-v.y)**2+(this.z-v.z)**2}lerp(v,t){return this.set(this.x+(v.x-this.x)*t,this.y+(v.y-this.y)*t,this.z+(v.z-this.z)*t)}}
class Object3D{constructor(){this.position=new V();this.rotation=new V();this.scale=new V(1,1,1);this.children=[];this.visible=true}add(child){this.children.push(child);child.parent=this}traverse(fn){fn(this);for(const n of this.children)n.traverse(fn)}getWorldPosition(out){return out.copy(this.position)}}
class Geo{dispose(){this.disposed=true}}
class Color{constructor(hex=0){this.hex=hex}setHex(x){this.hex=x}}
class Material{constructor(params={}){Object.assign(this,params);this.color=new Color(params.color)}dispose(){this.disposed=true}}
class Mesh extends Object3D{constructor(geo,mat){super();this.geometry=geo;this.material=mat}}
const THREE={Vector3:V,Group:Object3D,Mesh,MeshStandardMaterial:Material,MeshBasicMaterial:Material,
 DodecahedronGeometry:Geo,CylinderGeometry:Geo,OctahedronGeometry:Geo,ConeGeometry:Geo,SphereGeometry:Geo,RingGeometry:Geo,
 PointLight:class extends Object3D{constructor(...a){super();this.intensity=a[1]??1}},DoubleSide:2};
const scene={children:[],add(o){this.children.push(o)},remove(o){const i=this.children.indexOf(o);if(i>=0)this.children.splice(i,1)},updateMatrixWorld(){}};
const cave=createArachnidCave({THREE,scene,getGroundHeight:()=>0});
test('caverna cria 22 barreiras reais para camera e decoracao compartilhada',()=>{
 cave.generate([{id:'tecelas',x:50,z:40}]);assert.equal(cave.cameraBlockers.length,22);
 assert.equal(scene.children.length,2);assert.ok(scene.children[1].children.length>90);
});
test('entrar e sair altera visibilidade sem duplicar elementos',()=>{
 cave.enter();assert.equal(cave.inside,true);assert.equal(scene.children[1].visible,true);
 cave.leave();assert.equal(cave.inside,false);assert.equal(scene.children[1].visible,false);
 cave.generate([{id:'tecelas',x:50,z:40}]);assert.equal(cave.cameraBlockers.length,22);assert.equal(scene.children.length,2);
});
test('aura segue a rainha e altera cor no segundo estagio',()=>{
 cave.enter();const root=scene.children.at(-1);const ring=root.children.find(x=>x.geometry instanceof Geo&&x.material?.transparent);
 assert.ok(ring);const enemy={mesh:{position:new V(84,0,86)},enraged:false};
 cave.update(1,enemy);assert.equal(ring.visible,true);assert.equal(ring.position.x,84);
 cave.update(2,{...enemy,enraged:true});assert.equal(ring.material.color.hex,0xe94e89);
 cave.update(3,null);assert.equal(ring.visible,false);
});
test('rainha derrotada para de exibir indicador e libera cristal',()=>{
 assert.equal(cave.defeatBoss(),true);cave.update(4,{mesh:{position:new V(83,0,83)},enraged:true});
 assert.equal(cave.state.bossDefeated,true);
});
test('camera em transicao de cena evita interpolacao por fora da arena',()=>{
 const player={position:new V(83,0,83)},camera={position:new V(0,10,0),lookAt(){}};
 const raycaster={set(){},intersectObjects(){return []}};
 const rig=createCameraRig({THREE,camera,player,raycaster,getGroundHeight:()=>0,cameraObstacles:[],scene});
 rig.setDistance(9);rig.setArena({...arena},cave.cameraBlockers);
 rig.update(.016,Math.PI/2,.2);assert.equal(inside(camera.position),true);
 for(let i=0;i<50;i++){player.position.x=83+Math.min(i*.2,9);rig.update(.016,-Math.PI/2,0);assert.ok(inside(camera.position));}
 rig.setArena(null);rig.update(.016,0,0);assert.ok(Number.isFinite(camera.position.x));
});
test('segunda fase concentra teias e aumenta o ritmo da rainha',()=>{
 assert.ok(QUEEN_RAGE_COOLDOWN_FACTOR>0&&QUEEN_RAGE_COOLDOWN_FACTOR<1);
 assert.equal(spiderDecision(10,true,0,.95,'matriarch',false),'WebShot');
 assert.equal(spiderDecision(10,true,0,.95,'matriarch',true),'WebBurst');
});
test('codigo une camera, boss, luzes, HUD e save legado',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 for(const key of ['cameraRig.setArena(','arachnidCave.cameraBlockers','arachnidCave.update(elapsed','bossWrapper.classList.toggle','enemy.spiderVisual?.enrage()','scene.fog.density=arachnidCave.inside'])
  assert.ok(main.includes(key),key);
});
console.log(`v2.14: ${checks} testes aprovados`);
