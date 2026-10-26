// v2.13: câmara subterrânea instanciada, coleta finita e progresso persistente.
// Regras independentes de Three.js para testes de regressão.
export const CAVE_CENTER=Object.freeze({x:83,z:83});
export const CAVE_RADIUS=12.2;
export const CRYSTAL_NODES=Object.freeze([
  Object.freeze({id:0,dx:-3,dz:4,amount:1}),
  Object.freeze({id:1,dx:3,dz:-4,amount:1}),
  Object.freeze({id:2,dx:5,dz:3,amount:1}),
  Object.freeze({id:3,dx:0,dz:1,amount:2,requiresBoss:true})
]);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function validCaveSave(value){
 if(value===undefined)return true;
 return value&&typeof value==='object'&&!Array.isArray(value)&&
   typeof value.inside==='boolean'&&typeof value.bossDefeated==='boolean'&&
   Array.isArray(value.collected)&&value.collected.length<=CRYSTAL_NODES.length&&
   value.collected.every(x=>Number.isInteger(x)&&x>=0&&x<CRYSTAL_NODES.length)&&
   new Set(value.collected).size===value.collected.length;
}
export function crystalAvailable(node,cave){
 return !!node&&!!cave&&!cave.collected.includes(node.id)&&(!node.requiresBoss||cave.bossDefeated);
}
export function takeCaveCrystal(state,node,inventory){
 if(!crystalAvailable(node,state))return {ok:false,reason:'Cristal indisponível'};
 if(!inventory||!Number.isInteger(inventory.caveCrystal)||inventory.caveCrystal<0||
    inventory.caveCrystal+node.amount>999)return {ok:false,reason:'Mochila cheia'};
 inventory.caveCrystal+=node.amount;state.collected.push(node.id);
 return {ok:true,amount:node.amount};
}
export function caveEntryFromNests(nests){
 const near=nests?.find(n=>n.id==='tecelas');
 return near?{x:near.x+5.5,z:near.z+4.5}:null;
}
export function createArachnidCave({THREE,scene,getGroundHeight}){
 let root=null,portal=null,entry=null;
 const state={inside:false,bossDefeated:false,collected:[]};
 const gems=new Map(),cameraBlockers=[];
 let queenCircle=null,lightOne=null,lightTwo=null;
 const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.94,...extra});
 const rock=mat(0x302f3c),ridge=mat(0x4b4052),ore=mat(0x65d4d8,{metalness:.26,emissive:0x158b98,emissiveIntensity:.55});
 const amber=mat(0x9e76ca,{emissive:0x42215d,emissiveIntensity:.3});
 const portalMat=mat(0x292333,{emissive:0x381a56,emissiveIntensity:.4});
 function disposeRoot(target){if(!target)return;scene.remove(target);
   const geometries=new Set(),ownedMaterials=new Set();
   target.traverse(o=>{if(o.geometry)geometries.add(o.geometry);
     if(o===queenCircle&&o.material)ownedMaterials.add(o.material);});
   for(const g of geometries)g.dispose?.();for(const m of ownedMaterials)m.dispose?.();
 }
 function sync(){if(root)root.visible=state.inside;for(const node of CRYSTAL_NODES){
   const mesh=gems.get(node.id);if(mesh)mesh.visible=crystalAvailable(node,state);
 }}
 function generate(nests){
   disposeRoot(root);disposeRoot(portal);gems.clear();cameraBlockers.length=0;queenCircle=null;lightOne=null;lightTwo=null;
   root=new THREE.Group();portal=new THREE.Group();
   entry=caveEntryFromNests(nests);
   const y=getGroundHeight(CAVE_CENTER.x,CAVE_CENTER.z);
   // Parede em segmentos: mantém o teto central aberto para a câmera em terceira pessoa.
   for(let i=0;i<22;i++){
     const a=i*Math.PI*2/22,rad=CAVE_RADIUS+.6*Math.sin(i*13.4);
     const x=CAVE_CENTER.x+Math.cos(a)*rad,z=CAVE_CENTER.z+Math.sin(a)*rad;
     const height=3.9+(i%4)*.55;
     const wall=new THREE.Mesh(new THREE.DodecahedronGeometry(1,0),i%3?rock:ridge);
     wall.position.set(x,getGroundHeight(x,z)+height*.42,z);
     wall.scale.set(1.7,height*.67,1.6);root.add(wall);cameraBlockers.push(wall);
   }
   // Solo rochoso composto de placas pequenas ajustadas ao relevo atual.
   for(let i=0;i<20;i++){
     const a=i*2.399,rr=2.4+Math.sqrt(i/20)*8.5;
     const x=CAVE_CENTER.x+Math.cos(a)*rr,z=CAVE_CENTER.z+Math.sin(a)*rr;
     const slab=new THREE.Mesh(new THREE.CylinderGeometry(1.35,1.65,.16,7),i%3?rock:ridge);
     slab.position.set(x,getGroundHeight(x,z)-.045,z);root.add(slab);
   }
   // Pedras pontiagudas e fungos brilhantes enriquecem a caverna com poucas geometrias.
   const spikeGeometry=new THREE.ConeGeometry(.56,1.75,6), mushroomGeometry=new THREE.SphereGeometry(.24,6,4);
   const fungus=mat(0x56c3c3,{emissive:0x1d7b8d,emissiveIntensity:.75});
   for(let i=0;i<34;i++){
     const angle=i*2.39996,r=4.3+(i%7)*.96;
     const x=CAVE_CENTER.x+Math.cos(angle)*r,z=CAVE_CENTER.z+Math.sin(angle)*r;
     // Evitar bloquear a rota de entrada, cristais e centro da arena.
     const spike=new THREE.Mesh(spikeGeometry,i%3?rock:ridge);
     const height=.55+(i%5)*.19;
     spike.position.set(x,getGroundHeight(x,z)+height*.58,z);
     spike.scale.set(.48+(i%3)*.2,height,.48+(i%3)*.2);root.add(spike);
     if(i%3===0){
       const glow=new THREE.Mesh(mushroomGeometry,fungus);
       glow.position.set(x+.4,getGroundHeight(x+.4,z)+.2,z);root.add(glow);
     }
   }
   for(const node of CRYSTAL_NODES){
     const x=CAVE_CENTER.x+node.dx,z=CAVE_CENTER.z+node.dz;
     const crystal=new THREE.Mesh(new THREE.OctahedronGeometry(node.requiresBoss?.92:.65,0),node.requiresBoss?amber:ore);
     crystal.position.set(x,getGroundHeight(x,z)+.72,z);crystal.rotation.z=.2;
     root.add(crystal);gems.set(node.id,crystal);
   }
   lightOne=new THREE.PointLight(0x6bd0cc,2.1,17,2);
   lightOne.position.set(CAVE_CENTER.x-4,y+3.5,CAVE_CENTER.z-3);root.add(lightOne);
   lightTwo=new THREE.PointLight(0xb27ae8,2.0,16,2);
   lightTwo.position.set(CAVE_CENTER.x+4,y+3.3,CAVE_CENTER.z+3);root.add(lightTwo);
   queenCircle=new THREE.Mesh(new THREE.RingGeometry(2.5,2.8,36),
     new THREE.MeshBasicMaterial({color:0x9457a8,transparent:true,opacity:.38,side:THREE.DoubleSide,depthWrite:false}));
   queenCircle.rotation.x=-Math.PI/2;
   queenCircle.position.set(CAVE_CENTER.x+4,getGroundHeight(CAVE_CENTER.x+4,CAVE_CENTER.z)+.14,CAVE_CENTER.z);
   root.add(queenCircle);
   const entrance=entry||{x:0,z:0};
   for(let i=0;i<7;i++){
     const a=Math.PI*(i/6),stone=new THREE.Mesh(new THREE.DodecahedronGeometry(.94,0),portalMat);
     stone.position.set(entrance.x+Math.cos(a)*2.0,getGroundHeight(entrance.x,entrance.z)+.8+Math.sin(a)*2.5,entrance.z);
     stone.scale.set(.86,1.18,.55);portal.add(stone);
   }
   portal.add(new THREE.PointLight(0xa674e9,1.5,8));portal.children.at(-1).position.set(entrance.x,getGroundHeight(entrance.x,entrance.z)+2,entrance.z);
   scene.add(portal);scene.add(root);sync();
 }
 function nearPortal(pos){return !!entry&&!state.inside&&dist(pos,entry)<2.8;}
 const exit={x:CAVE_CENTER.x-8.4,z:CAVE_CENTER.z};
 function nearExit(pos){return state.inside&&dist(pos,exit)<2.8;}
 function enter(){if(!entry)return null;state.inside=true;sync();return {...exit};}
 function leave(){if(!entry)return null;state.inside=false;sync();return {x:entry.x+3.5,z:entry.z+3.5};}
 function nearestCrystal(pos){return state.inside?CRYSTAL_NODES.filter(n=>crystalAvailable(n,state))
   .map(n=>({...n,x:CAVE_CENTER.x+n.dx,z:CAVE_CENTER.z+n.dz}))
   .filter(n=>dist(n,pos)<2.3).sort((a,b)=>dist(a,pos)-dist(b,pos))[0]||null:null;}
 function harvest(pos,inventory){const n=nearestCrystal(pos);if(!n)return {ok:false,reason:'Nenhum cristal próximo'};
   const result=takeCaveCrystal(state,n,inventory);if(result.ok)sync();return result;}
 function defeatBoss(){if(state.bossDefeated)return false;state.bossDefeated=true;sync();return true;}
 function update(time=0,queen=null){
   if(!root||!state.inside)return;
   if(lightOne)lightOne.intensity=2.05+.22*Math.sin(time*2.3);
   if(lightTwo)lightTwo.intensity=2.0+.25*Math.sin(time*1.7);
   if(queenCircle){
     queenCircle.visible=!!queen&&!state.bossDefeated;
     if(queenCircle.visible){
       queenCircle.position.x=queen.mesh.position.x;
       queenCircle.position.z=queen.mesh.position.z;
       queenCircle.material.color.setHex(queen.enraged?0xe94e89:0x9457a8);
       queenCircle.material.opacity=(queen.enraged?.48:.31)+.08*Math.sin(time*5);
       queenCircle.rotation.z=time*(queen.enraged?-.75:-.32);
     }
   }
 }
 function serialize(){return {inside:state.inside,bossDefeated:state.bossDefeated,collected:[...state.collected].sort((a,b)=>a-b)};}
 function restore(saved){if(!validCaveSave(saved))return false;
   state.inside=saved?.inside??false;state.bossDefeated=saved?.bossDefeated??false;state.collected=[...(saved?.collected||[])];sync();return true;}
 return {state,generate,nearPortal,nearExit,nearestCrystal,harvest,enter,leave,defeatBoss,update,serialize,restore,entry:()=>entry,exit,
   get cameraBlockers(){return cameraBlockers;},
   get inside(){return state.inside;}};
}
