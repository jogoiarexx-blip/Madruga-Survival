// Agrupa somente peças rígidas diretas de uma construção, por material.
// Portas, tampas, fogo e plantios são filhos de pivôs/grupos e permanecem independentes.
// mergeGeometries é opcional para manter os testes com Three.js simulado funcionando.
export function batchStaticMeshes({THREE,group,mergeGeometries,exclude=[]}) {
  if(typeof mergeGeometries!=='function'||!group?.children||typeof group.remove!=='function')return 0;
  const excluded=new Set(exclude.filter(Boolean));
  const materials=new Map();
  for(const mesh of group.children) {
    if(!mesh?.isMesh||excluded.has(mesh)||Array.isArray(mesh.material)||!mesh.geometry?.clone ||
       !mesh.updateMatrix || mesh.isSkinnedMesh)continue;
    let pieces=materials.get(mesh.material);
    if(!pieces){pieces=[];materials.set(mesh.material,pieces);}
    pieces.push(mesh);
  }
  let saved=0;
  for(const [material,meshes] of materials) {
    if(meshes.length<2)continue;
    const copies=[];
    try {
      for(const mesh of meshes) {
        mesh.updateMatrix();
        copies.push(mesh.geometry.clone().applyMatrix4(mesh.matrix));
      }
      // Os atributos UV/normais podem diferir entre formatos. Se não forem
      // compatíveis, conservamos as peças originais, sem perder geometria.
      const geometry=mergeGeometries(copies,false);
      if(!geometry)continue;
      const result=new THREE.Mesh(geometry,material);
      result.name='StaticBatch';
      result.castShadow=meshes.some(m=>m.castShadow);
      result.receiveShadow=meshes.some(m=>m.receiveShadow);
      for(const mesh of meshes){group.remove(mesh);mesh.geometry.dispose();}
      group.add(result);
      saved+=meshes.length-1;
    } catch(error) {
      // Nunca bloquear a colocação da peça por uma falha opcional de batching.
      console.warn('Otimização de malha ignorada, geometria original mantida:',error);
    } finally {for(const copy of copies)copy.dispose?.();}
  }
  return saved;
}
