import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {footContactWeight,createZombieFootPlant} from '../src/characters/zombie-foot-plant.js';
import {createEnemyAI} from '../src/gameplay/enemy-ai.js';
import {ZOMBIE_TYPES} from '../src/gameplay/zombie-variants.js';
let tests=0;
const check=(name,fn)=>{fn();tests++;console.log('OK v2.1.5',tests,name)};
class Vector3 {
 constructor(x=0,y=0,z=0){Object.assign(this,{x,y,z})}
 set(x,y,z){Object.assign(this,{x,y,z});return this}
 copy(v){return this.set(v.x,v.y,v.z)}
 sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this}
 add(v){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this}
 lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}
 normalize(){return this.setLength(1)}
 setLength(n){const len=Math.sqrt(this.lengthSq())||1;this.x*=n/len;this.y*=n/len;this.z*=n/len;return this}
 distanceTo(v){return Math.hypot(this.x-v.x,this.y-v.y,this.z-v.z)}
 lerp(v,t){return this.set(this.x+(v.x-this.x)*t,this.y+(v.y-this.y)*t,this.z+(v.z-this.z)*t)}
}
class Quaternion{
 constructor(){this.set(0,0,0,1)}
 set(x,y,z,w){Object.assign(this,{x,y,z,w});return this}
 copy(q){return this.set(q.x,q.y,q.z,q.w)}
 invert(){this.x=-this.x;this.y=-this.y;this.z=-this.z;return this}
 multiply(q){let a={x:this.x,y:this.y,z:this.z,w:this.w};
 return this.set(a.w*q.x+a.x*q.w+a.y*q.z-a.z*q.y,a.w*q.y-a.x*q.z+a.y*q.w+a.z*q.x,a.w*q.z+a.x*q.y-a.y*q.x+a.z*q.w,a.w*q.w-a.x*q.x-a.y*q.y-a.z*q.z)}
 premultiply(q){return this.copy(new Quaternion().copy(q).multiply(this))}
 normalize(){const d=Math.hypot(this.x,this.y,this.z,this.w)||1;return this.set(this.x/d,this.y/d,this.z/d,this.w/d)}
 setFromUnitVectors(a,b){return this.set(a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x,1+a.x*b.x+a.y*b.y+a.z*b.z).normalize()}
 slerp(q,t){return this.set(this.x+(q.x-this.x)*t,this.y+(q.y-this.y)*t,this.z+(q.z-this.z)*t,this.w+(q.w-this.w)*t).normalize()}
}
function makeRig(){
 const bones={};
 const root={position:{y:.84},scale:{x:1.36},updateWorldMatrix(){},getObjectByName(name){return bones[name]}};
 const node=(name,world,parent)=>({name,world,parent,quaternion:new Quaternion(),
  getWorldPosition(v){return v.set(...this.world)},getWorldQuaternion(v){return v.set(0,0,0,1)},updateWorldMatrix(){}});
 const parent=node('root',[0,0,0],null);
 for(const [side,dx] of [['R',.17],['L',-.17]]){
  bones[side+'_Hip']=node(side+'_Hip',[dx,.7,0],parent);
  bones[side+'_Knee']=node(side+'_Knee',[dx,.4,0],bones[side+'_Hip']);
  bones[side+'_Foot']=node(side+'_Foot',[dx,.05,0],bones[side+'_Knee']);
 }
 return root;
}
check('apoios alternados',()=>{
 assert.equal(footContactWeight(.1,'right'),1);
 assert.equal(footContactWeight(.1,'left'),0);
 assert.equal(footContactWeight(.6,'left'),1);
 assert.equal(footContactWeight(.6,'right'),0);
});
check('entradas suaves e extremos seguros',()=>{
 assert.equal(footContactWeight(NaN,'right'),0);
 for(let x=0;x<1;x+=.01)for(const side of ['left','right'])assert.ok(footContactWeight(x,side)>=0&&footContactWeight(x,side)<=1);
});
check('pé apoiado ajusta altura do rig sem mover colisão',()=>{
 const rig=makeRig(),y=rig.position.y;
 const ik=createZombieFootPlant({THREE:{Vector3,Quaternion},model:rig,getGroundHeight:()=>0});
 assert.ok(ik);
 ik.update({dt:.03,moving:true,clip:'Andar',action:{time:.155,getClip(){return {duration:1.55}}}});
 assert.ok(rig.position.y>y);assert.ok(ik.legs[0].anchor);assert.equal(ik.legs[1].anchor,null);
 ik.reset();assert.equal(rig.position.y,y);
});
check('terreno é medido individualmente sob cada pé',()=>{
 const rig=makeRig(),places=[];
 const ik=createZombieFootPlant({THREE:{Vector3,Quaternion},model:rig,getGroundHeight:(x,z)=>{places.push([x,z]);return x*.03;}});
 ik.update({dt:.03,moving:true,clip:'Andar',action:{time:.155,getClip(){return {duration:1.55}}}});
 assert.ok(places.some(v=>v[0]<0)&&places.some(v=>v[0]>0));
});
check('ataques soltam os pontos de apoio e ausência de rig tem fallback',()=>{
 const rig=makeRig(),ik=createZombieFootPlant({THREE:{Vector3,Quaternion},model:rig,getGroundHeight:()=>0});
 ik.update({dt:.03,moving:true,clip:'Andar',action:{time:.155,getClip(){return {duration:1.55}}}});
 ik.update({dt:.03,moving:false,clip:'Morder'});
 assert.ok(ik.legs.every(l=>l.anchor===null));
 assert.equal(createZombieFootPlant({THREE:{},model:{},getGroundHeight:()=>0}),null);
});
check('integração habilita IK apenas próximo do jogador',()=>{
 const source=readFileSync(new URL('../src/gameplay/enemy-ai.js',import.meta.url),'utf8');
 const manager=readFileSync(new URL('../src/characters/zombie-models.js',import.meta.url),'utf8');
 assert.match(source,/locomotionPace, playerDistance<16/);
 assert.match(manager,/footIKNear && this\.footPlant/);
 assert.match(manager,/footPlant\.update\(\{dt:step,moving,clip:this\.current,action:actions\[this\.current\]\}\)/);
});
check('corpo articulado fica sem bob nem escala procedural',()=>{
 const z=ZOMBIE_TYPES.zombie,mesh={id:5,position:{x:0,y:0,z:0},rotation:{x:0,y:0,z:0},scale:{y:1},material:{emissiveIntensity:0}};
 const enemy={mesh,type:'zombie',size:z.size,speed:z.speed,hp:z.hp,damage:z.damage,attackTimer:8,knockback:0,windup:0,rev4Visual:{update(){}}};
 const player={position:{x:0,y:0,z:10}};
 const ai=createEnemyAI({enemies:[enemy],player,getGroundHeight:()=>.23,resolveCollision:(x,z)=>({x,z}),
  showBossTelegraph(){},hideBossTelegraph(){},damagePlayer(){return false},spawnParticle(){},throwProjectile(){},
  sfx:{warning(){}},isGameActive:()=>true});
 ai.update(.03,.4);
 assert.equal(mesh.position.y,.23+z.size/2);assert.equal(mesh.scale.y,1);assert.equal(mesh.rotation.z,0);
});
console.log('Total de testes v2.1.5:',tests);
