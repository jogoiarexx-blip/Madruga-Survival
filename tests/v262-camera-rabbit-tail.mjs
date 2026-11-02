import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCameraRig,selectNearBlockers,distanceToSegmentSquared,clampCameraToArena}
  from '../src/render/camera-rig.js';
import {createWildlifeWorld,RABBIT_TAIL_PUFF,rabbitTailPose} from '../src/world/wildlife.js';
import {createExplorationWorld} from '../src/world/exploration.js';

const near=(a,b,e=.000001)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
class Vec{
 constructor(x=0,y=0,z=0){this.set(x,y,z);}
 set(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;return this;}
 copy(v){return this.set(v.x,v.y,v.z);}
 add(v){return this.set(this.x+v.x,this.y+v.y,this.z+v.z);}
 sub(v){return this.set(this.x-v.x,this.y-v.y,this.z-v.z);}
 multiplyScalar(k){return this.set(this.x*k,this.y*k,this.z*k);}
 addScaledVector(v,k){return this.set(this.x+v.x*k,this.y+v.y*k,this.z+v.z*k);}
 length(){return Math.hypot(this.x,this.y,this.z);}
 distanceTo(v){return Math.hypot(this.x-v.x,this.y-v.y,this.z-v.z);}
 distanceToSquared(v){return (this.x-v.x)**2+(this.y-v.y)**2+(this.z-v.z)**2;}
 lerp(v,t){return this.set(this.x+(v.x-this.x)*t,this.y+(v.y-this.y)*t,this.z+(v.z-this.z)*t);}
}
class Group{
 constructor(){this.position=new Vec();this.rotation=new Vec();this.scale=new Vec(1,1,1);
   this.children=[];this.visible=true;this.userData={};}
 add(o){this.children.push(o);o.parent=this;}
 traverse(f){f(this);for(const child of this.children)child.traverse(f);}
 getWorldPosition(out){
  let x=this.position.x,y=this.position.y,z=this.position.z,p=this.parent;
  while(p){x+=p.position.x;y+=p.position.y;z+=p.position.z;p=p.parent;}
  return out.set(x,y,z);
 }
}
class Geo {constructor(...args){this.args=args;}dispose(){}}
class Mesh extends Group{constructor(geom,mat){super();this.geometry=geom;this.material=mat;}}
class Material{constructor(opts={}){Object.assign(this,opts);}}
const THREE={Vector3:Vec,Group,Mesh,MeshStandardMaterial:Material,DoubleSide:2};
for(const type of ['SphereGeometry','BoxGeometry'])THREE[type]=Geo;

const world=createExplorationWorld({THREE,scene:{add(){}},getGroundHeight:()=>0,isPositionFree:()=>true});
world.generate(129971);
assert.equal(world.cameraBlockers.length,world.sites.length);
assert.ok(world.cameraBlockers.every(x=>x.userData.cameraRadius>=4));
world.generate(129971);
assert.equal(world.cameraBlockers.length,world.sites.length,'Nenhuma duplicação após gerar novamente');

const start={x:0,z:0},end={x:0,z:8};
assert.equal(distanceToSegmentSquared({x:5,z:4},start,end),25);
const group={visible:true},entries=[{mesh:group,x:5,z:4,radius:4.2}];
assert.deepEqual(selectNearBlockers(entries,start,end,1.2,[]),[group],
 'Ruína larga é selecionada mesmo quando o pivô fica fora do segmento');
group.visible=false;
assert.deepEqual(selectNearBlockers(entries,start,end,1.2,[]),[]);
group.visible=true;

const blocker=new Group();blocker.position.set(1.3,0,3);blocker.userData.cameraRadius=3;
const ground=new Group();ground.name='terrain';
let rays=0;
const raycaster={
 set(origin,dir){this.origin={...origin};this.dir={...dir};},
 intersectObjects(list){
  rays++;
  if(!list.includes(blocker)||Math.abs(this.dir.z)<.0001)return [];
  const length=(3-this.origin.z)/this.dir.z;
  const x=this.origin.x+this.dir.x*length;
  return length>0&&length<=this.far&&x>.5&&x<1.9?[{distance:length}]:[];
 }
};
const camera={position:new Vec(0,3.5,8),lookAt(){}};
const player={position:new Vec(0,0,0)};
const scene={updateMatrixWorld(){}};
const rig=createCameraRig({THREE,camera,player,raycaster,
 getGroundHeight:()=>-10,cameraObstacles:[ground,blocker],scene});
rig.refreshObstacles();
rig.update(.05,Math.PI/2,0);
assert.ok(rays>=2,'Raycast do alvo ideal e do resultado após a suavização');
assert.ok(camera.position.z<3,'Ao girar rapidamente, posição final não atravessa a parede');
assert.ok(Number.isFinite(camera.position.y));

const before=camera.position.distanceTo(player.position);
rig.setDistance(11);
rig.update(.016,Math.PI/2,0);
assert.ok(Number.isFinite(camera.position.x));
rig.setDistance(NaN);rig.update(.016,Math.PI/2,0);
assert.ok(Number.isFinite(camera.position.x),'Zoom inválido é ignorado');
rig.setArena({x:0,z:0,radius:4.7},[]);
rig.update(.016,Math.PI/2,.1);
assert.ok(Math.hypot(camera.position.x,camera.position.z)<4.7,
 'Troca para caverna mantém câmera no limite circular');
rig.setArena(null);

assert.equal(RABBIT_TAIL_PUFF,.13);
const wildlife=createWildlifeWorld({THREE,scene:{add(){}},
 getGroundHeight:()=>0,isPositionFree:()=>true,onHunt(){}});
wildlife.generate(12345,'medium');
const rabbits=wildlife.animals.filter(a=>a.type==='rabbit');
assert.equal(rabbits.length,7);
for(const bunny of rabbits){
 const tail=bunny.rig.tail;
 assert.ok(tail instanceof Group && !(tail instanceof Mesh),
  'Rabo é um pivô leve, sem ampliação da esfera original');
 assert.equal(tail.children.length,3,'Três tufos pequenos com pelagem distinta');
 assert.ok(tail.children.every(mesh=>mesh.scale.y<.14),
  'Nenhum rabo cria bola grande branca');
 near(tail.position.z,.42);
}
const bunny=rabbits[0],step=Math.PI/2;
for(const moving of [false,true]){
 const pose=rabbitTailPose(step,moving);
 assert.ok(pose.scaleY>=.90&&pose.scaleY<=1.10);
 assert.ok(Math.abs(pose.rotationX)<.12);
}
wildlife.update(.05,{x:bunny.x+2,z:bunny.z+1},'medium');
assert.ok(bunny.rig.tail.scale.y>=.9&&bunny.rig.tail.scale.y<=1.1,
 'Escala do rabo continua correta depois da animação');
assert.ok(Number.isFinite(bunny.rig.tail.rotation.x));
assert.equal(wildlife.serialize().length,10,'Save de animais permanece compatível');
const main=src('src/main.js');
assert.match(main,/cameraObstacles\.push\(\.\.\.exploration\.cameraBlockers\)/);
assert.match(main,/wildlife\.generate\(worldSeed,graphicsQuality\)/);
assert.match(main,/cameraRig\.update\(dt,playerYaw,mousePitch\+cameraImpact\)/);
const html=src('index.html');
assert.match(html,/forest-webp-r1-s2-f6/);
console.log('OK câmera v2.62: ruínas grandes, colisão após suavizar, zoom e rabo compacto do coelho');
