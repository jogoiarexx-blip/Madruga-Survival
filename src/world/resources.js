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
 const geometry={
  wood:new THREE.CylinderGeometry(.28,.32,1.0,6),
  stone:new THREE.DodecahedronGeometry(.48,0),
  berries:new THREE.IcosahedronGeometry(.37,0),
  fiber:new THREE.ConeGeometry(.40,.95,5),
  water:new THREE.CylinderGeometry(.88,.88,.18,12),
  iron:new THREE.DodecahedronGeometry(.60,0)
 };
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
     for(let i=0;i<3;i++){const vein=new THREE.Mesh(new THREE.IcosahedronGeometry(.13,0),materials.water);
       vein.position.set(Math.sin(i*2.2)*.33,.5+Math.sin(i*2)*.12,Math.cos(i*2.2)*.25);group.add(vein);}
   }
   if(type==='berries'){
     for(let i=0;i<4;i++) {
      const berry=new THREE.Mesh(new THREE.SphereGeometry(.11,6,5),materials.berries);
      berry.position.set(Math.sin(i*2)*.28,.76,Math.cos(i*2)*.28);group.add(berry);
     }
   }
   if(type==='water') {
     const rim=new THREE.Mesh(new THREE.TorusGeometry(.96,.11,6,14),materials.stone);
     rim.rotation.x=-Math.PI/2;rim.position.y=.23;group.add(rim);
     const post=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,1.65,7),materials.wood);
     post.position.set(-1,.82,0);group.add(post);
   }
   group.position.set(x,getGroundHeight(x,z),z);
   scene.add(group);
   const node={type,x,z,group,cooldown:ready?0:40};nodes.push(node);
   group.visible=ready;
   return node;
 }
 function generate(seed=1234){
   const random=createSeededRandom(seed^0xA4F38B);
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
 return {nodes,generate,findNearby,harvest,update,serialize,restore};
}
