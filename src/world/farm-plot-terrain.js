// Canteiro acompanha a malha do terreno; não é plataforma ou obstáculo.
// Geometria pequena, sem rebuild por frame. Preview reaproveita os vértices.
export const FARM_SIDE=2.72;
export const FARM_SOIL_LIFT=.018;
export function farmLocalWorld(x,z,angle,dx,dz){
  const c=Math.cos(angle),s=Math.sin(angle);
  return {x:x+dx*c+dz*s,z:z-dx*s+dz*c};
}
export function farmLocalHeight(getGroundHeight,x,z,angle,dx,dz,lift=FARM_SOIL_LIFT){
  const p=farmLocalWorld(x,z,angle,dx,dz);
  return getGroundHeight(p.x,p.z)-getGroundHeight(x,z)+lift;
}
export function createGroundedFarmPlot({THREE,group,getGroundHeight,soilMaterial,edgeMaterial,detail=true}){
  const patches=[];
  const patch=(width,depth,material,dx=0,dz=0,lift=FARM_SOIL_LIFT)=>{
    const segmentsX=Math.max(1,Math.ceil(width/.40));
    const segmentsZ=Math.max(1,Math.ceil(depth/.40));
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,depth,segmentsX,segmentsZ),material);
    mesh.rotation.x=-Math.PI/2;
    mesh.position.set(dx,0,dz);
    mesh.castShadow=false;mesh.receiveShadow=true;
    group.add(mesh);patches.push({mesh,lift});
    return mesh;
  };
  patch(FARM_SIDE,FARM_SIDE,soilMaterial);
  // Ripas finas, rente ao solo: nenhuma borda elevada impede os pés do player.
  for(const side of [-1,1]){
    patch(.09,FARM_SIDE,edgeMaterial,side*(FARM_SIDE/2-.045),0,.029);
    patch(FARM_SIDE,.09,edgeMaterial,0,side*(FARM_SIDE/2-.045),.029);
  }
  if(detail)for(const dx of [-.68,0,.68])
    patch(.055,2.33,edgeMaterial,dx,0,.026);
  function conform(x,z,angle=0){
    if(!Number.isFinite(x)||!Number.isFinite(z))return;
    const center=getGroundHeight(x,z);
    for(const {mesh,lift} of patches){
      const attr=mesh.geometry.attributes.position;
      if(!attr?.setZ||!attr.getX||!attr.getY)continue;
      for(let i=0;i<attr.count;i++){
        const offsetX=mesh.position.x+attr.getX(i);
        const offsetZ=mesh.position.z-attr.getY(i);
        const p=farmLocalWorld(x,z,angle,offsetX,offsetZ);
        attr.setZ(i,getGroundHeight(p.x,p.z)-center+lift);
      }
      attr.needsUpdate=true;
      mesh.geometry.computeVertexNormals?.();
      mesh.geometry.computeBoundingSphere?.();
    }
  }
  return {conform,patches};
}
