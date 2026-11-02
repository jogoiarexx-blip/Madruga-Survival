import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CAMERA_FOLLOW_MAX_OFFSET,CAMERA_FOLLOW_MANUAL_GRACE,movementCameraOffset,
  createMovementCameraFollow} from '../src/render/camera-follow.js';
import {createCameraRig} from '../src/render/camera-rig.js';
const near=(a,b,e=.001)=>assert.ok(Math.abs(a-b)<=e,`${a} !== ${b}`);
const forward=movementCameraOffset(0,0,-.15,.016);
assert.equal(forward,0,'Andando para frente câmera mantém eixo da visão');
const right=movementCameraOffset(0,.15,-.15,.016);
const left=movementCameraOffset(0,-.15,-.15,.016);
assert.ok(right<-.2,'Diagonal para direita puxa câmera à esquerda do caminho');
near(right,-left,1e-9);
assert.equal(movementCameraOffset(0,0,.15,.016),0,'Recuar não inverte câmera');
assert.equal(movementCameraOffset(0,0,0,.016),0,'Parado não segue movimento fantasma');
assert.equal(movementCameraOffset(0,.15,0,.016),-CAMERA_FOLLOW_MAX_OFFSET);
assert.equal(movementCameraOffset(0,.15,-.001,0),0,'Tempo inválido');
assert.equal(movementCameraOffset(NaN,.15,0,.016),0,'Ângulo inválido');
assert.equal(movementCameraOffset(0,.0001,0,.016),0,'Passo quase parado não vira câmera');
// Mudança de yaw além de pi usa o menor arco, sem saltos de 360 graus.
const wrapped=movementCameraOffset(Math.PI-.02,0,.15,.016);
assert.equal(wrapped,0);

const follow=createMovementCameraFollow();
let yaw=0;
for(let i=0;i<75;i++)yaw=follow.update(1/60,0,{dx:.12,dz:0});
assert.ok(yaw<-.75&&yaw>-.8,'Deslocamento lateral deve orientar câmera gradualmente');
assert.ok(Math.abs(follow.offset)<=CAMERA_FOLLOW_MAX_OFFSET);
const beforeMouse=yaw;
follow.noteManualLook();
near(follow.offset,0,1e-9);
assert.equal(follow.manualGrace,CAMERA_FOLLOW_MANUAL_GRACE);
for(let i=0;i<45;i++)near(follow.update(1/60,.25,{dx:.12,dz:0}),.25,1e-9);
assert.ok(follow.manualGrace>0);
for(let i=0;i<20;i++)yaw=follow.update(1/60,.25,{dx:.12,dz:0});
assert.ok(yaw<.25,'Após mouse parar câmera volta a seguir caminhada');
for(let i=0;i<60;i++)yaw=follow.update(1/60,.25,{dx:0,dz:0});
near(yaw,.25,.015);
for(let i=0;i<10;i++)follow.update(.016,0,{dx:.1,dz:0,enabled:false});
near(follow.offset,0,.03,'Construção/combate impedem câmera automática');
follow.reset();
near(follow.offset,0,0);

class V{
 constructor(x=0,y=0,z=0){this.set(x,y,z);}
 set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
 copy(v){return this.set(v.x,v.y,v.z)}
 add(v){return this.set(this.x+v.x,this.y+v.y,this.z+v.z)}
 sub(v){return this.set(this.x-v.x,this.y-v.y,this.z-v.z)}
 multiplyScalar(k){return this.set(this.x*k,this.y*k,this.z*k)}
 addScaledVector(v,k){return this.set(this.x+v.x*k,this.y+v.y*k,this.z+v.z*k)}
 length(){return Math.hypot(this.x,this.y,this.z)}
 distanceTo(v){return Math.hypot(this.x-v.x,this.y-v.y,this.z-v.z)}
 distanceToSquared(v){return (this.x-v.x)**2+(this.y-v.y)**2+(this.z-v.z)**2}
 lerp(v,t){return this.set(this.x+(v.x-this.x)*t,this.y+(v.y-this.y)*t,this.z+(v.z-this.z)*t)}
}
const THREE={Vector3:V},scene={updateMatrixWorld(){}};
const player={position:new V(0,0,0)},camera={position:new V(0,3.2,8),lookAt(){}};
const raycaster={set(){},intersectObjects(){return []}};
const rig=createCameraRig({THREE,scene,camera,player,raycaster,
 getGroundHeight:()=>0,cameraObstacles:[]});
rig.refreshObstacles();
for(let i=0;i<90;i++)rig.update(1/60,0,.18,{dx:.1,dz:0});
assert.ok(camera.position.x<-.35,'Câmera física deve girar acompanhando movimento lateral');
const xAtTurn=camera.position.x;
rig.onManualLook();
for(let i=0;i<30;i++)rig.update(1/60,.55,.18,{dx:.1,dz:0});
assert.ok(camera.position.x> xAtTurn,'Mouse deve recuperar o controle orbital mesmo andando');
rig.setArena({x:0,z:0,radius:4.6},[]);
rig.update(.016,0,.1,{dx:0,dz:-.1});
assert.ok(Math.hypot(camera.position.x,camera.position.z)<4.6,'Seguir movimento continua respeitando a arena');
rig.setArena(null);
rig.update(.016,0,.1,{dx:0,dz:-.1});
assert.ok(Number.isFinite(camera.position.x));

const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const renderer=readFileSync(new URL('../src/render/camera-rig.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert.match(main,/dx:player\.position\.x-beforeMoveX/);
assert.match(main,/dz:player\.position\.z-beforeMoveZ/);
assert.match(main,/cameraRig\.onManualLook\(\)/);
assert.match(main,/enabled:!placement&&!combat\.isAttacking&&!isFishing&&dashTimer<=0/);
assert.match(renderer,/orbitYaw=movementFollow\.update\(step,yaw,movement\)/);
assert.match(html,/forest-webp-r1-s2-f7/);
console.log('OK v2.63: câmera segue curvas do movimento, manual priorizado, sem espiral, colisões intactas');
