// Vara, linha e boia procedurais de baixo custo, criadas uma vez e animadas sem alocação por frame.
export function createFishingVisual({THREE,scene,getGroundHeight}){
 const root=new THREE.Group();root.visible=false;
 const brown=new THREE.MeshStandardMaterial({color:0x7e5734,roughness:1});
 const tip=new THREE.Mesh(new THREE.CylinderGeometry(.019,.042,1.75,5),brown);
 tip.position.set(.42,1.40,.08);tip.rotation.z=-.18;root.add(tip);
 const grip=new THREE.Mesh(new THREE.CylinderGeometry(.055,.058,.32,6),new THREE.MeshStandardMaterial({color:0x322b23}));
 grip.position.set(.16,.76,.08);grip.rotation.z=-.18;root.add(grip);
 const lineBuffer=new Float32Array(6);const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.BufferAttribute(lineBuffer,3));
 const line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:0xd4e2e5,transparent:true,opacity:.72}));root.add(line);
 const buoy=new THREE.Mesh(new THREE.SphereGeometry(.105,8,6),new THREE.MeshStandardMaterial({color:0xed7446,roughness:.4}));root.add(buoy);
 const ring=new THREE.Mesh(new THREE.RingGeometry(.17,.215,16),new THREE.MeshBasicMaterial({color:0xcdebf0,transparent:true,opacity:.5,side:THREE.DoubleSide,depthWrite:false}));
 ring.rotation.x=-Math.PI/2;root.add(ring);
 scene.add(root);
 function update({phase='idle',player,heading=0,elapsed=0,water}={}){
  root.visible=phase!=='idle'&&phase!=='caught'&&!!player;
  if(!root.visible)return;
  const lake=water&&Number.isFinite(water.x)&&Number.isFinite(water.z);
  const vx=lake?water.x-player.x:-Math.sin(heading),vz=lake?water.z-player.z:-Math.cos(heading);
  const magnitude=Math.hypot(vx,vz)||1;
  const dx=vx/magnitude,dz=vz/magnitude;
  const nearX=player.x,nearZ=player.z;
  const targetX=player.x+dx*3.0,targetZ=player.z+dz*3.0;
  root.position.set(nearX,getGroundHeight(nearX,nearZ),nearZ);
  root.rotation.y=Math.atan2(dx,dz);
  const waterY=lake?water.y:getGroundHeight(targetX,targetZ)-.04;
  const floatY=waterY-root.position.y+Math.sin(elapsed*5)*.04;
  // O modelo é local ao jogador; x para a direita, z positivo para a frente.
  buoy.position.set(0,floatY,3.0);ring.position.set(0,floatY-.085,3.0);
  const scale=.82+.1*Math.sin(elapsed*4);ring.scale.set(scale,scale,scale);
  const tipX=.42+Math.sin(-.18)*.875,tipY=1.40+Math.cos(-.18)*.875;
  lineBuffer[0]=tipX;lineBuffer[1]=tipY;lineBuffer[2]=.08;
  lineBuffer[3]=0;lineBuffer[4]=floatY;lineBuffer[5]=3.0;
  geometry.attributes.position.needsUpdate=true;
  tip.rotation.x=phase==='bite'?-.18:phase==='reeling'?Math.sin(elapsed*19)*.06:0;
 }
 return {update,hide(){root.visible=false;},dispose(){scene.remove(root);geometry.dispose();line.material.dispose();brown.dispose();grip.material.dispose();buoy.geometry.dispose();buoy.material.dispose();ring.geometry.dispose();ring.material.dispose();tip.geometry.dispose();grip.geometry.dispose();}};
}
