import {SCHOOL_COUNT,visibleFishCount,sampleFishSwim,fishBodyScale,fishUpdateInterval} from './fish-school.js';
// Instanced meshes: desenho com dois materiais e matrizes atualizadas somente perto da água.
export function createFishSchoolVisual({THREE,parent,radius=14.8}){
 const root=new THREE.Group();root.name='Cardume_LOD';parent.add(root);
 const bodyGeo=new THREE.SphereGeometry(.24,7,5);
 const finGeo=new THREE.ConeGeometry(.14,.25,3);
 const bodyMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.87,metalness:.05,side:THREE.DoubleSide});
 const finMat=new THREE.MeshStandardMaterial({color:0x657e70,roughness:.9,side:THREE.DoubleSide});
 const bodies=new THREE.InstancedMesh(bodyGeo,bodyMat,SCHOOL_COUNT);
 const tails=new THREE.InstancedMesh(finGeo,finMat,SCHOOL_COUNT);
 bodies.name='Peixes_LOD';bodies.frustumCulled=false;tails.frustumCulled=false;
 bodies.castShadow=false;tails.castShadow=false;
 root.add(bodies,tails);
 // Reuso de um único Object3D para atualizar matrizes, sem alocações por peixe.
 const obj=new THREE.Object3D();const color=new THREE.Color();
 for(let i=0;i<SCHOOL_COUNT;i++){
  const tint=i%3===0?0x667b63:i%3===1?0x8a815a:0x536c7c;
  bodies.setColorAt(i,color.setHex(tint));
 }
 if(bodies.instanceColor)bodies.instanceColor.needsUpdate=true;
 let lastUpdate=-Infinity,activeCount=0;
 function update(player,quality='medium',elapsed=0){
  const distance=Math.hypot(player.x-(parent.position.x||0),player.z-(parent.position.z||0));
  const count=visibleFishCount(distance,quality);
  root.visible=count>0;
  if(!count){activeCount=0;return;}
  if(count===activeCount && elapsed-lastUpdate<fishUpdateInterval(quality))return;
  activeCount=count;lastUpdate=elapsed;
  bodies.count=count;tails.count=count;
  for(let i=0;i<count;i++){
   const fish=sampleFishSwim(i,elapsed,radius);
   obj.position.set(fish.x,fish.y,fish.z);obj.rotation.set(0,fish.heading,0);
   const fishScale=fishBodyScale(i);
   obj.scale.set(fishScale.width,fishScale.height,fishScale.length);obj.updateMatrix();bodies.setMatrixAt(i,obj.matrix);
   obj.position.set(fish.x-Math.sin(fish.heading)*(.24*fishScale.length),fish.y,fish.z-Math.cos(fish.heading)*(.24*fishScale.length));
   obj.rotation.set(Math.PI/2,fish.heading+fish.tail,0);
   obj.scale.setScalar(fishScale.length*.80);obj.updateMatrix();tails.setMatrixAt(i,obj.matrix);
  }
  bodies.instanceMatrix.needsUpdate=true;tails.instanceMatrix.needsUpdate=true;
 }
 return {root,update,dispose(){parent.remove(root);bodyGeo.dispose();finGeo.dispose();bodyMat.dispose();finMat.dispose();}};
}
