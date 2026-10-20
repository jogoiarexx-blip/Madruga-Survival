// Estruturas 3D sem assets externos: paredes, portas, pisos e móveis visitáveis.
import {preparePlacement,MODULAR_TYPES,STRUCTURE_TYPES,MAX_STRUCTURES,orientation,canPlaceAmong,
  resolveStructureCollision,positionBlocked,nearestInteractive,structureBlocksLine} from './building-rules.js';
import {buildingHP,maxBuildingHP,damageBuilding,repairBuilding} from '../gameplay/base-defense.js';
import {validChestItems} from '../gameplay/storage.js';
import {makeCrop,advanceCrop,validCrop} from '../gameplay/farming.js';
export function createBuildingWorld({THREE,scene,getGroundHeight,isPositionFree}) {
 const structures=[];
 const stone=new THREE.MeshStandardMaterial({color:0x92918a,roughness:.95});
 const wood=new THREE.MeshStandardMaterial({color:0x68432c,roughness:1});
 const warmWood=new THREE.MeshStandardMaterial({color:0x9d7043,roughness:1});
 const darkWood=new THREE.MeshStandardMaterial({color:0x4e3322,roughness:1});
 const roof=new THREE.MeshStandardMaterial({color:0x4c7e4c,roughness:1,side:THREE.DoubleSide});
 const straw=new THREE.MeshStandardMaterial({color:0xceb37d,roughness:1});
 const cloth=new THREE.MeshStandardMaterial({color:0x657fab,roughness:1});
 const metal=new THREE.MeshStandardMaterial({color:0x55595c,metalness:.3,roughness:.75});
 const flameMat=new THREE.MeshStandardMaterial({color:0xffac39,emissive:0xff6a15,emissiveIntensity:1.8});
 function block(group,w,h,d,mat,x=0,y=0,z=0){
   const p=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);p.position.set(x,y,z);p.castShadow=true;p.receiveShadow=true;group.add(p);return p;
 }
 function createVisual(type,group){
   let flame=null,glow=null,doorPivot=null,lid=null;
   if(type==='campfire'){
     for(let i=0;i<7;i++){const a=i*Math.PI*2/7;
       const p=new THREE.Mesh(new THREE.DodecahedronGeometry(.29,0),stone);
       p.position.set(Math.cos(a)*.75,.15,Math.sin(a)*.75);p.scale.y=.65;group.add(p);}
     for(let i=0;i<3;i++){const p=new THREE.Mesh(new THREE.CylinderGeometry(.12,.14,1.25,7),wood);
       p.rotation.z=Math.PI/2;p.rotation.y=i*Math.PI/3;p.position.y=.18;group.add(p);}
     flame=new THREE.Mesh(new THREE.ConeGeometry(.40,.95,6),flameMat.clone());
     flame.position.y=.72;group.add(flame);
     glow=new THREE.PointLight(0xffa44b,2.5,10,2);glow.position.y=1.2;group.add(glow);
   } else if(type==='shelter'){
     block(group,3.3,.18,3.6,wood,0,.12);
     for(const side of [-1,1]){const p=block(group,2.55,.12,3.8,roof,side*.83,1.20);p.rotation.z=side*.82;}
     block(group,1.15,.18,1.75,straw,0,.33,-.25);
     for(const z of [-1.72,1.72]){
       const p=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,2.30,6),wood);
       p.position.set(0,1.17,z);group.add(p);
     }
   } else if(type==='floor'){
     for(let i=0;i<6;i++)block(group,3,.12,.46,i%2?warmWood:wood,0,.105,-1.25+i*.5);
     for(const x of [-1.37,1.37])block(group,.18,.18,3,darkWood,x,.09);
   } else if(type==='wall'){
     for(let i=0;i<10;i++)block(group,3,.25,.22,i%2?warmWood:wood,0,.20+i*.255);
     for(const x of [-1.40,1.40])block(group,.17,2.77,.32,darkWood,x,1.39);
   } else if(type==='door'){
     for(const x of [-1.38,1.38])block(group,.24,2.77,.30,darkWood,x,1.39);
     block(group,3,.28,.33,warmWood,0,2.67);
     doorPivot=new THREE.Group();doorPivot.position.set(-1.26,0,0);group.add(doorPivot);
     block(doorPivot,2.40,2.3,.16,wood,1.2,1.29);
     for(const dx of [.2,1.15,2.15])block(doorPivot,.10,2.15,.21,darkWood,dx,1.3);
     block(doorPivot,.18,.15,.24,metal,2.13,1.25);
   } else if(type==='bed'){
     for(const x of [-.64,.64])for(const z of [-1,1])block(group,.16,.58,.16,darkWood,x,.30,z);
     block(group,1.48,.18,2.25,wood,0,.44);
     block(group,1.35,.21,1.65,cloth,0,.60,.22);
     block(group,1.25,.21,.45,straw,0,.62,-.80);
     block(group,1.55,.73,.15,darkWood,0,.69,-1.06);
   } else if(type==='roof'){
     // Cobertura piramidal sem colisor: o jogador pode caminhar por baixo.
     for(const side of [-1,1]){const top=block(group,2.35,.16,3.34,roof,side*.80,3.30,0);top.rotation.z=side*.63;}
     for(const x of [-1.42,1.42])block(group,.12,.18,3.36,darkWood,x,2.57);
     block(group,.22,.24,3.32,warmWood,0,4.01);
   } else if(type==='farmPlot'){
     block(group,2.75,.20,2.75,darkWood,0,.16);
     block(group,2.48,.10,2.48,stone,0,.29);
     for(const x of [-1.32,1.32])block(group,.13,.26,2.75,wood,x,.21);
     for(const z of [-1.32,1.32])block(group,2.75,.26,.13,wood,0,.21,z);
   } else if(type==='workbench'){
     for(const x of [-.96,.96])for(const z of [-.43,.43])block(group,.18,1.02,.18,darkWood,x,.54,z);
     block(group,2.5,.22,1.32,warmWood,0,1.10);
     block(group,.56,.34,.60,metal,.76,1.38,0);
     block(group,.8,.14,.30,stone,-.58,1.30,-.23);
     block(group,.13,.62,.13,metal,-.62,1.53,-.30);
   } else if(type==='chest'){
     block(group,1.42,.86,.94,wood,0,.47);
     for(const x of [-.62,.62])block(group,.10,.87,1,metal,x,.47);
     lid=new THREE.Group();lid.position.set(0,.94,-.42);group.add(lid);
     block(lid,1.48,.21,1, warmWood,0,.08,.42);
     block(lid,.19,.23,.24,metal,0,.08,.9);
   }
   return {flame,glow,doorPivot,lid};
 }
 // Holograma usa o mesmo construtor geométrico dos prédios reais.
 // Nunca entra na lista structures nem nas colisões/salvamento.
 function createPreview(type){
   if(!STRUCTURE_TYPES.includes(type))return null;
   const group=new THREE.Group();
   createVisual(type,group);
   const hologram=new THREE.MeshBasicMaterial({color:0x51f09d,transparent:true,opacity:.49,
     depthWrite:false,side:THREE.DoubleSide});
   const geometries=new Set();
   group.traverse(node=>{
     if(node.isLight){node.visible=false;return;}
     if(!node.isMesh)return;
     geometries.add(node.geometry);
     if(node.material!==stone&&node.material!==wood&&node.material!==warmWood&&
       node.material!==darkWood&&node.material!==roof&&node.material!==straw&&
       node.material!==cloth&&node.material!==metal&&node.material!==flameMat){
       // Ex.: chama clonada da fogueira.
       node.material?.dispose?.();
     }
     node.material=hologram;node.castShadow=false;node.receiveShadow=false;
   });
   scene.add(group);
   return {group,setPosition(x,z,rotation){
       group.position.set(x,getGroundHeight(x,z)+.03,z);
       group.rotation.y=orientation(rotation||0)*Math.PI/2;
     },setValid(valid){hologram.color.setHex(valid?0x51f09d:0xff6670);},
     dispose(){scene.remove(group);for(const g of geometries)g.dispose();hologram.dispose();}};
 }
 function place(type,x,z,rotation=0,options={}){
   if(!STRUCTURE_TYPES.includes(type)||!Number.isFinite(x)||!Number.isFinite(z))return null;
   const loc=preparePlacement(type,x,z,rotation,options),group=new THREE.Group();
   const visual=createVisual(type,group);
   group.position.set(loc.x,getGroundHeight(loc.x,loc.z),loc.z);
   group.rotation.y=orientation(loc.rotation||0)*Math.PI/2;
   const item={type,x:loc.x,z:loc.z,rotation:loc.rotation||0,group,
     ...visual,open:!!options.open,items:type==='chest'?{...(options.items||{})}:null,
     hp:buildingHP(type,options.hp),crop:type==='farmPlot'?(validCrop(options.crop)?{...options.crop}:makeCrop()):null};
   if(type==='farmPlot'){item.plantMeshes=[];for(let i=0;i<5;i++){
     const plant=new THREE.Mesh(new THREE.ConeGeometry(.22,.65,5),new THREE.MeshStandardMaterial({color:0x5da449,roughness:1}));
     plant.position.set((i%3-1)*.67,.42,Math.floor(i/3)*.85-.45);group.add(plant);item.plantMeshes.push(plant);
   }updateCropVisual(item);}
   if(item.doorPivot)item.doorPivot.rotation.y=item.open?-Math.PI*.55:0;
   scene.add(group);structures.push(item);if(item.hp<maxBuildingHP(item.type))updateCondition(item);return item;
 }
 function canPlace(type,x,z,playerPos,rotation=0,options={}){
   if(!STRUCTURE_TYPES.includes(type))return false;
   const p=preparePlacement(type,x,z,rotation,options);
   if(Math.abs(p.x)>103||Math.abs(p.z)>103)return false;
   if(type!=='floor'&&Math.hypot(p.x-playerPos.x,p.z-playerPos.z)<(type==='shelter'?2.4:1.15))return false;
   if(!canPlaceAmong(structures,p))return false;
   // Conferir pontas e centro dos módulos para não atravessar árvores e pedras.
   const offsets=['floor','wall','door','roof','farmPlot'].includes(type)?[-1.25,0,1.25]:[0];
   const angle=(p.rotation||0)*Math.PI/2;
   const c=Math.cos(angle),s=Math.sin(angle);
   for(const ox of offsets){
     const cx=p.x+ox*c,cz=p.z+ox*s;
     if(!isPositionFree(cx,cz,type==='shelter'?2.0:type==='campfire'?1.1:.43))return false;
   }
   return true;
 }
 function covered(pos){return structures.some(s=>s.type==='roof'&&Math.abs(pos.x-s.x)<1.45&&Math.abs(pos.z-s.z)<1.45);}
 function near(type,pos,radius=4.6){return structures.some(s=>s.type===type&&Math.hypot(s.x-pos.x,s.z-pos.z)<radius);}
 function nearest(pos,r=2.85){return nearestInteractive(structures,pos,r);}
 function toggleDoor(s){if(s?.type!=='door')return false;s.open=!s.open;
   s.doorPivot.rotation.y=s.open?-Math.PI*.55:0;return s.open;}
 function setChestOpen(s,open){if(s?.type==='chest'&&s.lid)s.lid.rotation.x=open?-.85:0;}
 function damage(s,amount){
   if(!structures.includes(s))return {hit:false,destroyed:false};
   const result=damageBuilding(s,amount);
   if(result.destroyed)remove(s);else updateCondition(s);
   return result;
 }
 function repair(s,state){if(!structures.includes(s)||!repairBuilding(s,state))return false;updateCondition(s);return true;}
 function updateCondition(s){if(!s?.group)return;
   if(!s.damageMarker){const mat=new THREE.MeshBasicMaterial({color:0xf14b3c,depthTest:false});
      s.damageMarker=new THREE.Mesh(new THREE.BoxGeometry(1.4,.08,.10),mat);s.damageMarker.position.set(0,2.92,0);s.group.add(s.damageMarker);}
   const percent=s.hp/maxBuildingHP(s.type);s.damageMarker.visible=percent<1;s.damageMarker.scale.x=Math.max(.05,percent);
 }
 function remove(s){const i=structures.indexOf(s);if(i<0)return false;
   structures.splice(i,1);scene.remove(s.group);
   s.group.traverse?.(n=>{if(n.geometry)n.geometry.dispose?.();if(n===s.flame)n.material?.dispose?.();});
   return true;
 }
 function updateCropVisual(item){if(item?.type!=='farmPlot')return;const factor=item.crop?.planted?Math.max(.18,item.crop.growth/125):0;
    for(const mesh of item.plantMeshes||[]){mesh.visible=!!item.crop?.planted;mesh.scale.y=.20+factor*1.4;}}
 function update(time,dt=0){for(const s of structures){if(s.type==='farmPlot'){
     if(advanceCrop(s.crop,dt))updateCropVisual(s);else if(dt>0)updateCropVisual(s);}
     if(s.flame){s.flame.scale.y=.78+Math.sin(time*10+s.x)*.22;
   s.flame.rotation.y=time*2;s.glow.intensity=2.1+.3*Math.sin(time*9+s.z);}}}
 function serialize(){return structures.map(s=>{
   const base={type:s.type,x:s.x,z:s.z};
   if(MODULAR_TYPES.includes(s.type))base.rotation=s.rotation;
   if(s.type==='door')base.open=s.open;
   if(s.type==='chest')base.items={...s.items};
   if(s.type==='farmPlot')base.crop={...s.crop};
   base.hp=s.hp;
   return base;
 });}
 function restore(saved){if(!Array.isArray(saved))return false;
   for(const b of saved){if(!b||!STRUCTURE_TYPES.includes(b.type)||!Number.isFinite(b.x)||!Number.isFinite(b.z)||Math.abs(b.x)>108||Math.abs(b.z)>108||structures.length>=MAX_STRUCTURES)continue;
     if(b.type==='chest'&&!validChestItems(b.items||{}))continue;
     place(b.type,b.x,b.z,b.rotation||0,{preserveCoordinates:true,open:!!b.open,items:b.items||{},hp:b.hp,crop:b.crop});
   }return true;}
 function resolveCollision(x,z,r=.46){return resolveStructureCollision(structures,x,z,r);}
 function isBlocked(x,z,r=.46){return positionBlocked(structures,x,z,r);}
 function blocksLine(from,to){return structureBlocksLine(structures,from,to);}
 return {structures,place,createPreview,canPlace,near,covered,updateCropVisual,nearest,toggleDoor,setChestOpen,remove,damage,repair,update,
   resolveCollision,isBlocked,blocksLine,serialize,restore};
}
