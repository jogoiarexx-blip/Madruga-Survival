// Previa estatica no menu: sem loop RAF, sem simular o mundo.
// Reusa o mesmo WebGLRenderer da partida; shaders preparados neste contexto sao reutilizaveis.
export function createMenuPreview({THREE,cloneSkeleton,renderer,model}){
  const scene=new THREE.Scene();
  scene.background=new THREE.Color(0x091b14);
  scene.add(new THREE.HemisphereLight(0xd4f4da,0x213628,2.05));
  const rim=new THREE.DirectionalLight(0xffd5a0,2.25);rim.position.set(3.5,7,4);scene.add(rim);
  const fill=new THREE.DirectionalLight(0x90b6fc,.7);fill.position.set(-3,3,-3);scene.add(fill);
  const podium=new THREE.Mesh(new THREE.CylinderGeometry(1.15,1.45,.25,32),new THREE.MeshStandardMaterial({color:0x304b39,roughness:.85}));
  podium.position.set(1.8,-.14,0);scene.add(podium);
  const root=cloneSkeleton(model);
  root.scale.setScalar(2.48/1.70000017);
  root.rotation.y=Math.PI;
  root.position.set(1.8,0,0);
  root.traverse(node=>{if(node.isMesh)node.frustumCulled=false;});
  scene.add(root);
  const camera=new THREE.PerspectiveCamera(38,window.innerWidth/window.innerHeight,.1,35);
  camera.position.set(0,2.65,7.4);camera.lookAt(0,1.3,0);
  function draw(){camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix();renderer.render(scene,camera);}
  function dispose(){scene.remove(root);scene.remove(podium);podium.geometry.dispose();podium.material.dispose();}
  return {draw,dispose};
}
