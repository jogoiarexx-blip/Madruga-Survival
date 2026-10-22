// Direção frontal do zumbi REV2: +Z. Priorize deslocamento real para evitar
// passos laterais e caminhada de costas durante desvio de obstáculos.
export function faceZombieAlongPath(mesh, target, previousX, previousZ, moving) {
  if (!mesh?.position || !mesh.rotation || !target) return false;
  let dx=target.x-mesh.position.x, dz=target.z-mesh.position.z;
  if (moving) {
    const stepX=mesh.position.x-previousX,stepZ=mesh.position.z-previousZ;
    if (Number.isFinite(stepX) && Number.isFinite(stepZ) && Math.hypot(stepX,stepZ)>0.0001) {
      dx=stepX; dz=stepZ;
    }
  }
  if (!Number.isFinite(dx)||!Number.isFinite(dz)||Math.hypot(dx,dz)<0.00001) return false;
  mesh.rotation.x=0;
  mesh.rotation.y=Math.atan2(dx,dz);
  return true;
}
