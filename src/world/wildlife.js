// Fauna leve low-poly: coelhos fogem, javalis se defendem; caça por colisão do ataque.
import {createSeededRandom} from './random.js';
import {isInAttackArc} from '../gameplay/combat.js';
export const MAX_ANIMALS=10;
export function validWildlife(data){return Array.isArray(data)&&data.length<=MAX_ANIMALS&&data.every(a=>
 a&&['rabbit','boar'].includes(a.type)&&Number.isFinite(a.x)&&Math.abs(a.x)<=109&&
 Number.isFinite(a.z)&&Math.abs(a.z)<=109&&Number.isInteger(a.hp)&&a.hp>=1&&a.hp<=(a.type==='boar'?5:2)&&
 Number.isFinite(a.heading)&&Math.abs(a.heading)<=Math.PI*2);}
export function createWildlifeWorld({THREE,scene,getGroundHeight,isPositionFree,onHunt,onHurt=()=>{},canSee=()=>true}){
 const animals=[];
 let respawnElapsed=0;
 const fur=new THREE.MeshStandardMaterial({color:0xaa977e,roughness:1});
 const white=new THREE.MeshStandardMaterial({color:0xf3e3cf,roughness:1});
 const boarMat=new THREE.MeshStandardMaterial({color:0x64483a,roughness:1});
 const hooves=new THREE.MeshStandardMaterial({color:0x332c2b,roughness:1});
 const eyes=new THREE.MeshStandardMaterial({color:0x101313,roughness:.5});
 const rabbitGeo=new THREE.SphereGeometry(1,8,6), boxGeo=new THREE.BoxGeometry(1,1,1);
 function sphere(g,mat,x,y,z,sx,sy,sz){const m=new THREE.Mesh(rabbitGeo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);g.add(m);return m;}
 function block(g,mat,x,y,z,sx,sy,sz){const m=new THREE.Mesh(boxGeo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);g.add(m);return m;}
 function spawn(type,x,z,hp=null,heading=0){
   if(animals.length>=MAX_ANIMALS)return null;
   const g=new THREE.Group();
   if(type==='rabbit'){
     sphere(g,fur,0,.35,0,.36,.28,.49);
     sphere(g,fur,0,.55,-.36,.27,.28,.28);
     for(const dx of [-.13,.13]){
       sphere(g,fur,dx,.94,-.43,.075,.38,.105);
       sphere(g,eyes,dx*1.9,.59,-.59,.042,.046,.042);
     }
     sphere(g,white,0,.34,.48,.14,.16,.14);
   } else {
     sphere(g,boarMat,0,.63,0,.70,.49,.93);
     sphere(g,boarMat,0,.68,-.72,.47,.39,.38);
     sphere(g,fur,0,.51,-1.01,.28,.22,.20);
     for(const dx of [-.43,.43]){
       for(const dz of [-.60,.55])block(g,hooves,dx,.23,dz,.22,.46,.23);
       sphere(g,white,dx*.75,.48,-1.04,.075,.12,.095);
     }
   }
   g.position.set(x,getGroundHeight(x,z),z);g.rotation.y=heading+Math.PI;
   scene.add(g);
   const a={type,x,z,heading,hp:hp??(type==='boar'?5:2),group:g,pace:1,attackDelay:0,wander:0};
   animals.push(a);return a;
 }
 function generate(seed=2026){
   if(animals.length)return;
   const rand=createSeededRandom((seed^0xBBCC1342)>>>0);
   for(let i=0;i<MAX_ANIMALS;i++){
     const type=i<7?'rabbit':'boar';
     for(let tries=0;tries<100;tries++){
       const angle=rand()*Math.PI*2,dist=12+rand()*62;
       const x=Math.sin(angle)*dist,z=Math.cos(angle)*dist;
       if(isPositionFree(x,z,1.25)&&animals.every(a=>Math.hypot(a.x-x,a.z-z)>5)){
         spawn(type,x,z,null,rand()*Math.PI*2);break;
       }
     }
   }
 }
 function update(dt,player,quality='medium'){
   const frame=Math.max(0,Math.min(dt,.1));
   if(animals.length<MAX_ANIMALS){
     respawnElapsed+=frame;
     if(respawnElapsed>=100){
       respawnElapsed=0;
       for(let tries=0;tries<20;tries++){
         const theta=Math.random()*Math.PI*2,r=26+Math.random()*35;
         const x=player.x+Math.cos(theta)*r,z=player.z+Math.sin(theta)*r;
         if(Math.abs(x)>98||Math.abs(z)>98||!isPositionFree(x,z,1.3))continue;
         spawn(Math.random()<.72?'rabbit':'boar',x,z,null,theta);break;
       }
     }
   }
   const radius=quality==='low'?45:quality==='medium'?72:100;
   for(const a of animals){
     const dx=a.x-player.x,dz=a.z-player.z,dist=Math.hypot(dx,dz);
     a.group.visible=dist<radius;a.attackDelay=Math.max(0,a.attackDelay-frame);
     if(dist>radius)continue;
     if(dist<12){const escape=Math.atan2(dx,dz);a.heading=escape;}
     else if(a.wander<=0){a.heading+=(Math.random()-.5)*2;a.wander=3+Math.random()*3;}
     a.wander=Math.max(0,a.wander-frame);
     const speed=dist<12?(a.type==='rabbit'?4.5:2.7):a.type==='rabbit'?.70:.43;
     const nx=a.x+Math.sin(a.heading)*speed*frame;
     const nz=a.z+Math.cos(a.heading)*speed*frame;
     if(Math.abs(nx)<98&&Math.abs(nz)<98&&isPositionFree(nx,nz,a.type==='boar'?.8:.45)){
       a.x=nx;a.z=nz;a.group.position.set(nx,getGroundHeight(nx,nz),nz);
     }else a.heading+=Math.PI*.65;
     a.heading=((a.heading+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;
     a.group.rotation.y=a.heading+Math.PI;
     if(a.type==='boar'&&dist<1.65&&a.attackDelay<=0&&canSee(a.group.position,player)){
       onHurt(5,a.group.position);a.attackDelay=2.8;
     }
   }
 }
 function attack(player,yaw,range,arc,damage){
   let hit=0;
   for(const a of [...animals]){
     if(!isInAttackArc(player,yaw,a,range+(a.type==='boar'?.5:.25),Math.cos(Math.PI*arc)))continue;
     if(!canSee(player,a.group.position))continue;
     a.hp-=Math.max(1,Math.floor(damage));hit++;
     if(a.hp<=0){const i=animals.indexOf(a);if(i>=0)animals.splice(i,1);scene.remove(a.group);onHunt(a.type,a.type==='boar'?3:1);}
     else a.heading=Math.atan2(a.x-player.x,a.z-player.z);
   }
   return hit;
 }
 function serialize(){return animals.map(a=>({type:a.type,x:a.x,z:a.z,hp:a.hp,heading:a.heading}));}
 function restore(saved){
   if(!validWildlife(saved))return false;
   for(const a of animals)scene.remove(a.group);
   animals.length=0;respawnElapsed=0;
   for(const a of saved)spawn(a.type,a.x,a.z,a.hp,a.heading);
   return true;
 }
 return {animals,generate,update,attack,serialize,restore};
}
