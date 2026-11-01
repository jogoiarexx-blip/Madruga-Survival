// Cabana única e leve, sincronizada com o save da missão da Bruxa do 71.
import {CABIN_POSITION} from '../gameplay/npc-questlines.js';
export const CABIN_RADIUS=2.35;
export function createWitchCabin({THREE,scene,getGroundHeight}){
 const group=new THREE.Group();group.name='witch71_cabin';
 group.position.set(CABIN_POSITION.x,getGroundHeight(CABIN_POSITION.x,CABIN_POSITION.z),CABIN_POSITION.z);
 const wood=new THREE.MeshStandardMaterial({color:0x67452f,roughness:1});
 const beams=new THREE.MeshStandardMaterial({color:0x392923,roughness:1});
 const roof=new THREE.MeshStandardMaterial({color:0x443653,roughness:1,side:THREE.DoubleSide});
 const windows=new THREE.MeshStandardMaterial({color:0xf4b95f,emissive:0xa85e22,emissiveIntensity:.35});
 const foundation=new THREE.MeshStandardMaterial({color:0x79746c,roughness:1});
 function cube(w,h,d,material,x,y,z,rotation=0){
   const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
   mesh.position.set(x,y,z);mesh.rotation.z=rotation;mesh.castShadow=true;mesh.receiveShadow=true;
   group.add(mesh);return mesh;
 }
 cube(4.1,.25,4.1,foundation,0,.08,0);
 cube(4,2.6,.18,wood,0,1.42,-1.94);
 cube(.18,2.6,4,wood,-1.94,1.42,0);
 cube(.18,2.6,4,wood,1.94,1.42,0);
 cube(1.16,2.6,.18,wood,-1.42,1.42,1.94);
 cube(1.16,2.6,.18,wood,1.42,1.42,1.94);
 cube(.78,.53,.16,wood,0,2.455,1.94);
 cube(1.12,2.05,.20,beams,0,1.1,2.01);
 cube(.17,.17,.25,windows,.43,1.1,2.14);
 for(const x of [-1.75,1.75])for(const z of [-1.75,1.75])cube(.22,2.8,.22,beams,x,1.45,z);
 for(const x of [-1,1])cube(2.85,.23,4.8,roof,x*.87,3.28,0,x===-1?-.62:.62);
 cube(.55,1,.55,foundation,1.18,3.3,-.95);
 for(const x of [-1.95,1.95]){
   cube(.08,.72,.85,windows,x,1.6,-.65);
   cube(.12,.08,.95,beams,x,1.2,-.65);
 }
 group.visible=false;scene.add(group);
 return {
   group,position:CABIN_POSITION,
   setBuilt(value){group.visible=!!value;},
   get built(){return group.visible;},
   blocks(x,z,r=.45){return group.visible&&Math.hypot(x-CABIN_POSITION.x,z-CABIN_POSITION.z)<CABIN_RADIUS+r;},
   resolve(position,r=.45){
     if(!group.visible)return position;
     const dx=position.x-CABIN_POSITION.x,dz=position.z-CABIN_POSITION.z;
     const d=Math.hypot(dx,dz),distance=CABIN_RADIUS+r+.005;
     return d>=distance?position:{
       x:CABIN_POSITION.x+(d>.001?dx/d:1)*distance,
       z:CABIN_POSITION.z+(d>.001?dz/d:0)*distance
     };
   }
 };
}
