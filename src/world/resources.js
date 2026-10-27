import {geometryDetail} from '../render/geometry-detail.js';
import {createSeededRandom} from './random.js';
// Recursos exploráveis: nós em low-poly com regeneração e sem física pesada.
export function createResourceWorld({THREE,scene,getGroundHeight,isPositionFree,findSpawnPoint}) {
 const nodes=[];
 const materials={
  wood:new THREE.MeshStandardMaterial({color:0x80502d,roughness:1}),
  stone:new THREE.MeshStandardMaterial({color:0x91989a,roughness:1}),
  berries:new THREE.MeshStandardMaterial({color:0xbd4072,roughness:.75}),
  fiber:new THREE.MeshStandardMaterial({color:0x5dba61,roughness:1}),
  water:new THREE.MeshStandardMaterial({color:0x55bbec,roughness:.2,metalness:.2}),
  iron:new THREE.MeshStandardMaterial({color:0x546878,roughness:.48,metalness:.65})
 };
 // Os buffers são gerados apenas quando o mundo começa, após a escolha gráfica.
 let geometry=null,detail=geometryDetail();
 function makeGeometries(quality){
   detail=geometryDetail(quality);
   const sides=detail.resourceCylinder;
   geometry={
     wood:new THREE.CylinderGeometry(.28,.32,1.0,sides),
     stone:new THREE.DodecahedronGeometry(.48,detail.resourceFacet),
     berries:new THREE.IcosahedronGeometry(.37,detail.resourceSphere),
     fiber:new THREE.ConeGeometry(.40,.95,Math.max(5,sides)),
     water:new THREE.CylinderGeometry(.88,.88,.18,Math.max(12,sides*2)),
     iron:new THREE.DodecahedronGeometry(.60,detail.resourceFacet),
     vein:new THREE.IcosahedronGeometry(.13,detail.resourceSphere),
     berry:new THREE.SphereGeometry(.11,detail.smallSphereWidth,detail.smallSphereHeight),
     rim:new THREE.TorusGeometry(.96,.11,Math.max(6,Math.floor(detail.decoration/2)),Math.max(14,detail.decoration*2)),
     wellPost:new THREE.CylinderGeometry(.09,.09,1.65,detail.resourceCylinder)
   };
 }
 function makeNode(type,x,z,ready=true) {
   const group=new THREE.Group();
   const mesh=new THREE.Mesh(geometry[type],materials[type]);
   mesh.position.y=type==='water'?.17:type==='wood'?.5:type==='fiber'?.48:.45;
   mesh.castShadow=true;group.add(mesh);
   if(type==='wood') {
     mesh.rotation.z=Math.PI/2.4;
     for(let i=0;i<2;i++){
      const log=new THREE.Mesh(geometry.wood,materials.wood);
      log.rotation.z=Math.PI/2;log.rotation.y=i*1.35;log.position.set(i*.22,.25,i*.22);group.add(log);
     }
   }
   if(type==='iron'){
     for(let i=0;i<3;i++){const vein=new THREE.Mesh(geometry.vein,materials.water);
       vein.position.set(Math.sin(i*2.2)*.33,.5+Math.sin(i*2)*.12,Math.cos(i*2.2)*.25);group.add(vein);}
   }
   if(type==='berries'){
     for(let i=0;i<4;i++) {
      const berry=new THREE.Mesh(geometry.berry,materials.berries);
      berry.position.set(Math.sin(i*2)*.28,.76,Math.cos(i*2)*.28);group.add(berry);
     }
   }
   if(type==='water') {
     const rim=new THREE.Mesh(geometry.rim,materials.stone);
     rim.rotation.x=-Math.PI/2;rim.position.y=.23;group.add(rim);
     const post=new THREE.Mesh(geometry.wellPost,materials.wood);
     post.position.set(-1,.82,0);group.add(post);
   }
   group.position.set(x,getGroundHeight(x,z),z);
   scene.add(group);
   const node={type,x,z,group,cooldown:ready?0:40};nodes.push(node);
   group.visible=ready;
   return node;
 }
 function generate(seed=1234,quality='medium'){
   if(nodes.length)return; // Evita buffers extras e duplicação dos nós.
   makeGeometries(quality);
   const random=createSeededRandom((seed^0xA4F38B)>>>0);
   const spawn=(min,max,radius=.8)=>{
     for(let tries=0;tries<100;tries++){
       const angle=random()*Math.PI*2,d=min+random()*(max-min);
       const x=Math.sin(angle)*d,z=Math.cos(angle)*d;
       if(isPositionFree(x,z,radius) && nodes.every(n=>Math.hypot(n.x-x,n.z-z)>2.25))return {x,z};
     }
     return findSpawnPoint(min,max,radius);
   };
   const spot=spawn(5,7,.9);makeNode('water',spot.x,spot.z);
   const counts={wood:40,stone:32,berries:27,fiber:32,iron:20};
   for(const [type,count] of Object.entries(counts)){
     for(let i=0;i<count;i++){
       const range=type==='iron'?28:i<5?6:14;
       const p=spawn(range,type==='iron'?93:i<5?24:87,.75);
       if(isPositionFree(p.x,p.z,.75))makeNode(type,p.x,p.z);
     }
   }
 }
 function findNearby(position,distance=2.9){
   let best=null,closest=distance;
   for(const node of nodes){
     if(node.cooldown>0)continue;
     const d=Math.hypot(node.x-position.x,node.z-position.z);
     if(d<closest){closest=d;best=node;}
   }
   return best;
 }
 function harvest(position,canMineIron=false){
   const node=findNearby(position);
   if(!node)return null;
   if(node.type==='iron'&&!canMineIron)return {requires:'pickaxe',type:'iron',amount:0};
   const amount=node.type==='water'?2:node.type==='wood'?3:node.type==='stone'?2:node.type==='berries'?2:node.type==='iron'?2:3;
   node.cooldown=node.type==='water'?6:node.type==='iron'?125+Math.random()*35:65+Math.random()*35;
   node.group.visible=false;
   return {type:node.type,amount};
 }
 function harvestTarget(node,position,radius=2.5){
   if(!nodes.includes(node)||node.cooldown>0||node.type==='iron'||
      Math.hypot(node.x-position.x,node.z-position.z)>radius)return null;
   const type=node.type,amount=type==='water'?2:type==='wood'?3:type==='stone'?2:type==='berries'?2:3;
   node.cooldown=type==='water'?6:65+Math.random()*35;node.group.visible=false;
   return {type,amount};
 }
 function update(dt,playerPosition=null,quality='medium'){
   const distance=quality==='low'?52:quality==='high'?100:75;
   for(const node of nodes){
     if(node.cooldown>0)node.cooldown=Math.max(0,node.cooldown-dt);
     const nearby=!playerPosition||Math.hypot(node.x-playerPosition.x,node.z-playerPosition.z)<distance;
     node.group.visible=node.cooldown===0&&nearby;
   }
 }
 function serialize(){return nodes.map(n=>({type:n.type,x:n.x,z:n.z,cooldown:Math.round(n.cooldown*10)/10}));}
 function restore(saved){if(!Array.isArray(saved)||saved.length>nodes.length||saved.length<nodes.length-20)return false;
   // Saves v1.1 incluem os primeiros 132 nós; os 20 novos veios ficam intactos.
   nodes.forEach((n,i)=>{const d=saved[i];if(!d||n.type!==d.type)return;
     n.x=d.x;n.z=d.z;n.group.position.set(d.x,getGroundHeight(d.x,d.z),d.z);
     n.cooldown=d.cooldown;n.group.visible=n.cooldown===0;});return true;}
 return {nodes,generate,findNearby,harvest,harvestTarget,update,serialize,restore};
}
