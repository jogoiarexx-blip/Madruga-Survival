import {createFishSchoolVisual} from './fish-school-visual.js';
import {createLakeWaterMaterial,useDetailedWater} from './lake-water-material.js';
import {lakeHabitatSamples,habitatVisibility,HABITAT_PADS,HABITAT_CATTAILS} from './lake-habitat.js';
// Única geometria lógica compartilhada por água, areia, pesca, terreno e colisão.
export const LAKE=Object.freeze({x:70,z:51,radius:14.8,shore:2.7});
export function shorelineRadiusAt(angle){
 const a=Number.isFinite(angle)?angle:0;
 return LAKE.radius+.50*Math.sin(3*a)+.29*Math.sin(5*a)+.17*Math.sin(8*a);
}
export function lakeEdgeDistance(x,z){
 const dx=x-LAKE.x,dz=z-LAKE.z;
 return Math.hypot(dx,dz)-shorelineRadiusAt(Math.atan2(dz,dx));
}
export function lakeTerrainDrop(x,z){
 const edge=lakeEdgeDistance(x,z);
 const t=Math.max(0,Math.min(1,(edge+3)/(LAKE.shore+3)));
 return 1.65*(1-t*t*(3-2*t));
}
export function insideLake(x,z,r=0){return lakeEdgeDistance(x,z)<r;}
export function nearLakeShore(position,range=3.8){
 if(!position)return false;
 const edge=lakeEdgeDistance(position.x,position.z);
 return edge>=-1.5&&edge<=range;
}
export function keepOutsideLake(x,z,r=.45){
 const dx=x-LAKE.x,dz=z-LAKE.z,d=Math.hypot(dx,dz);
 const min=shorelineRadiusAt(Math.atan2(dz,dx))+r;
 if(d>=min)return {x,z};
 const ux=d>0.00001?dx/d:1,uz=d>0.00001?dz/d:0;
 return {x:LAKE.x+ux*min,z:LAKE.z+uz*min};
}
// Entorta apenas os vértices de borda de geometrias circulares, preservando UVs.
// O ângulo deve seguir o Z mundial, invertido após rotação -90° em X.
function contourGeometry(THREE,geometry){
 const attr=geometry.attributes.position;
 for(let i=0;i<attr.count;i++){
  const x=attr.getX(i),y=attr.getY(i),r=Math.hypot(x,y);
  if(r<.0001)continue;
  const a=Math.atan2(-y,x),dr=shorelineRadiusAt(a)-LAKE.radius;
  const adjusted=Math.max(0,r+dr);
  attr.setXY(i,x*adjusted/r,y*adjusted/r);
 }
 attr.needsUpdate=true;
 geometry.computeVertexNormals();
 return geometry;
}
export function createFishingLake({THREE,scene,getGroundHeight}){
 const root=new THREE.Group();root.position.set(LAKE.x,getGroundHeight(LAKE.x,LAKE.z)+lakeTerrainDrop(LAKE.x,LAKE.z)+.15,LAKE.z);
 const fallbackMaterial=new THREE.MeshStandardMaterial({color:0x318ca4,roughness:.33,metalness:.12,transparent:true,opacity:.88,depthWrite:false,side:THREE.DoubleSide});
 const detailedMaterial=createLakeWaterMaterial(THREE);
 const water=new THREE.Mesh(contourGeometry(THREE,new THREE.CircleGeometry(LAKE.radius,64)),fallbackMaterial);
 water.rotation.x=-Math.PI/2;water.renderOrder=1;root.add(water);
 const school=createFishSchoolVisual({THREE,parent:root,radius:LAKE.radius});
 const wetSand=new THREE.MeshStandardMaterial({color:0x8b8669,roughness:1});
 const drySand=new THREE.MeshStandardMaterial({color:0xb6a57c,roughness:1});
 const fringe=new THREE.Mesh(contourGeometry(THREE,new THREE.RingGeometry(LAKE.radius+.08,LAKE.radius+.85,64)),wetSand);
 fringe.rotation.x=-Math.PI/2;fringe.position.y=-.065;fringe.receiveShadow=true;root.add(fringe);
 const shore=new THREE.Mesh(contourGeometry(THREE,new THREE.RingGeometry(LAKE.radius+.86,LAKE.radius+LAKE.shore,64)),drySand);
 shore.rotation.x=-Math.PI/2;shore.position.y=-.085;shore.receiveShadow=true;root.add(shore);
 // Uma única chamada de desenho para juncos em vez de 30 malhas independentes.
 const reedsMat=new THREE.MeshStandardMaterial({color:0x4b7b48,roughness:1});
 const reedGeo=new THREE.ConeGeometry(.12,.84,4),reedCount=30;
 const reeds=new THREE.InstancedMesh(reedGeo,reedsMat,reedCount);
 const obj=new THREE.Object3D();
 for(let i=0;i<reedCount;i++){
  const a=i*2.3999632297,r=shorelineRadiusAt(a)+1.05+Math.sin(i*12.1)*.42;
  obj.position.set(Math.cos(a)*r,.30,Math.sin(a)*r);
  obj.rotation.set(0,a,.09*Math.sin(i));obj.scale.setScalar(.78+(i%5)*.09);obj.updateMatrix();
  reeds.setMatrixAt(i,obj.matrix);
 }
 reeds.instanceMatrix.needsUpdate=true;reeds.castShadow=false;root.add(reeds);
 const pebblesMat=new THREE.MeshStandardMaterial({color:0x85877e,roughness:1});
 const pebbleGeo=new THREE.IcosahedronGeometry(.11,0);
 const pebbles=new THREE.InstancedMesh(pebbleGeo,pebblesMat,28);
 for(let i=0;i<28;i++){
  const a=i*2.3999632297+.3,r=shorelineRadiusAt(a)+1.18+(i%4)*.26;
  obj.position.set(Math.cos(a)*r,-.035,Math.sin(a)*r);
  obj.rotation.set(0,a,0);obj.scale.set(.8+(i%5)*.2,.40,1.1+(i%3)*.3);obj.updateMatrix();
  pebbles.setMatrixAt(i,obj.matrix);
 }
 pebbles.instanceMatrix.needsUpdate=true;root.add(pebbles);
 // Plantas flutuantes e taboas na faixa rasa; duas draw calls no máximo.
 // InstancedMesh mantém o número de objetos estável e o LOD só muda count.
 const padGeo=new THREE.CircleGeometry(.34,7);
 const padMat=new THREE.MeshStandardMaterial({color:0x608a48,side:THREE.DoubleSide,roughness:.88});
 const lilyPads=new THREE.InstancedMesh(padGeo,padMat,HABITAT_PADS);
 lilyPads.name='Vegetacao_aquatica_LOD';lilyPads.rotation.x=-Math.PI/2;
 const pads=lakeHabitatSamples(HABITAT_PADS,shorelineRadiusAt,'pad');
 for(let i=0;i<pads.length;i++){
  const p=pads[i];obj.position.set(p.x,-p.z,-.005);
  obj.rotation.set(0,0,p.angle);obj.scale.set(p.scale,p.scale*.78,1);obj.updateMatrix();
  lilyPads.setMatrixAt(i,obj.matrix);
 }
 lilyPads.instanceMatrix.needsUpdate=true;root.add(lilyPads);
 const catGeo=new THREE.CylinderGeometry(.065,.085,.76,5);
 const catMat=new THREE.MeshStandardMaterial({color:0x66583b,roughness:.95});
 const cattails=new THREE.InstancedMesh(catGeo,catMat,HABITAT_CATTAILS);
 const tails=lakeHabitatSamples(HABITAT_CATTAILS,shorelineRadiusAt,'cattail');
 for(let i=0;i<tails.length;i++){
  const p=tails[i];obj.position.set(p.x,.25,p.z);
  obj.rotation.set(.12*Math.sin(i),p.angle,.08*Math.cos(i));
  obj.scale.set(.75*p.scale,.85*p.scale,.75*p.scale);obj.updateMatrix();
  cattails.setMatrixAt(i,obj.matrix);
 }
 cattails.instanceMatrix.needsUpdate=true;root.add(cattails);
 scene.add(root);
 let lastDetail=null,lastReeds=null,lastHabitat=-1;
 return {root,school,position:LAKE,near:nearLakeShore,update(position,quality='medium',elapsed=0,isFishing=false){
   const d=Math.hypot(position.x-LAKE.x,position.z-LAKE.z);
   root.visible=d<(quality==='low'?68:quality==='medium'?95:130);
   if(!root.visible)return;
   school.update(position,quality,elapsed,isFishing);
   const detail=useDetailedWater(d,quality);
   if(detail!==lastDetail){water.material=detail?detailedMaterial:fallbackMaterial;lastDetail=detail;}
   if(detail){detailedMaterial.uniforms.uTime.value=elapsed;detailedMaterial.uniforms.uOpacity.value=d<32?.79:.88;}
   else {const opacity=d<32?.76:.88;if(opacity!==fallbackMaterial.opacity)fallbackMaterial.opacity=opacity;}
   const showDecor=quality!=='low'&&d<44;
   if(lastReeds!==showDecor){reeds.visible=showDecor;pebbles.visible=showDecor;lastReeds=showDecor;}
   const habitat=habitatVisibility(d,quality),total=habitat.pads*100+habitat.cattails;
   if(total!==lastHabitat){lilyPads.count=habitat.pads;cattails.count=habitat.cattails;
     lilyPads.visible=habitat.pads>0;cattails.visible=habitat.cattails>0;lastHabitat=total;}
 }};
}
