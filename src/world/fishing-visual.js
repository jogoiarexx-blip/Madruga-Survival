// Vara ancorada à mão REV5, linha e água reativa. Geometrias reutilizadas por frame.
export function createFishingVisual({THREE,scene,getGroundHeight}){
 const root=new THREE.Group();root.visible=false;scene.add(root);
 const brown=new THREE.MeshStandardMaterial({color:0x8c6034,roughness:.88});
 const gripMat=new THREE.MeshStandardMaterial({color:0x332721,roughness:1});
 const tip=new THREE.Mesh(new THREE.CylinderGeometry(.015,.037,1.65,6),brown);
 tip.position.set(0,.72,.32);tip.rotation.x=.36;root.add(tip);
 const grip=new THREE.Mesh(new THREE.CylinderGeometry(.05,.052,.30,6),gripMat);
 grip.position.set(0,.04,.02);grip.rotation.x=.36;root.add(grip);
 const lineBuffer=new Float32Array(6),geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.BufferAttribute(lineBuffer,3));
 const lineMaterial=new THREE.LineBasicMaterial({color:0xe3e9e5,transparent:true,opacity:.84});
 const line=new THREE.Line(geometry,lineMaterial);root.add(line);
 const buoyMat=new THREE.MeshStandardMaterial({color:0xf17036,roughness:.48});
 const buoyGeo=new THREE.SphereGeometry(.11,8,6);
 const buoy=new THREE.Mesh(buoyGeo,buoyMat);root.add(buoy);
 const rippleGeo=new THREE.RingGeometry(.15,.20,24);
 const rippleMat=new THREE.MeshBasicMaterial({color:0xb5ecfb,transparent:true,opacity:.52,side:THREE.DoubleSide,depthWrite:false});
 const ring=new THREE.Mesh(rippleGeo,rippleMat);ring.rotation.x=-Math.PI/2;root.add(ring);
 const splashMat=new THREE.MeshBasicMaterial({color:0xc5edff,transparent:true,opacity:.82,depthWrite:false});
 const splashGeo=new THREE.SphereGeometry(.045,5,4);
 const drops=[];
 for(let i=0;i<6;i++){const drop=new THREE.Mesh(splashGeo,splashMat);drop.visible=false;root.add(drop);drops.push(drop);}
 const localGrip=new THREE.Vector3(),worldGrip=new THREE.Vector3();
 let splashTime=0,splashPower=0,lastElapsed=0;
 function splash(kind='bite'){
  splashTime=.62;splashPower=kind==='caught'?1.7:kind==='miss'?1.35:kind==='hook'?1:.75;
 }
 function update({phase='idle',player,heading=0,elapsed=0,water,hand}={}){
  const fishing=phase!=='idle'&&phase!=='caught';
  root.visible=(fishing||splashTime>0)&&!!player;
  if(!root.visible)return;
  tip.visible=grip.visible=line.visible=buoy.visible=fishing;
  const lake=water&&Number.isFinite(water.x)&&Number.isFinite(water.z);
  const vx=lake?water.x-player.x:-Math.sin(heading),vz=lake?water.z-player.z:-Math.cos(heading);
  const magnitude=Math.hypot(vx,vz)||1,dx=vx/magnitude,dz=vz/magnitude;
  // A base da vara acompanha o osso da mão (se carregado), sem alterar o rig original.
  const usedHand=hand&&Number.isFinite(hand.x)&&Number.isFinite(hand.y)&&Number.isFinite(hand.z);
  if(usedHand)root.position.set(hand.x,hand.y,hand.z);
  else root.position.set(player.x+Math.cos(heading)*.37,getGroundHeight(player.x,player.z)+1.2,player.z-Math.sin(heading)*.37);
  root.rotation.y=Math.atan2(dx,dz);
  const targetX=player.x+dx*3,targetZ=player.z+dz*3;
  const waterY=lake?water.y:getGroundHeight(targetX,targetZ)-.04;
  const floatY=waterY-root.position.y+Math.sin(elapsed*5)*.026;
  // Linha conectada ao topo da vara, não à origem do personagem.
  const tipY=1.47,tipZ=.63;
  const pull=phase==='reeling'?.095*Math.sin(elapsed*19):phase==='bite'?.17:0;
  tip.rotation.x=.36+pull;
  lineBuffer[0]=0;lineBuffer[1]=tipY;lineBuffer[2]=tipZ;
  lineBuffer[3]=0;lineBuffer[4]=floatY;lineBuffer[5]=3;
  geometry.attributes.position.needsUpdate=true;
  buoy.position.set(0,floatY,3);
  ring.position.set(0,floatY-.09,3);
  const delta=Math.max(0,Math.min(.10,elapsed-lastElapsed));lastElapsed=elapsed;
  splashTime=Math.max(0,splashTime-delta);
  const energized=splashTime>0;
  const pulse=energized?(1-splashTime/.62)*splashPower:0;
  const scale=energized?.9+pulse*2.4:.75+.14*Math.sin(elapsed*3.5);
  ring.scale.set(scale,scale,scale);
  rippleMat.opacity=energized?.64*(splashTime/.62):.32;
  const dropActive=energized&&splashTime>.12;
  for(let i=0;i<drops.length;i++){
   const drop=drops[i];drop.visible=dropActive;
   if(!dropActive)continue;
   const a=i*Math.PI/3,spread=(1-splashTime/.62)*.42*splashPower;
   drop.position.set(Math.cos(a)*spread,floatY+.025+Math.sin((1-splashTime/.62)*Math.PI)*.29*splashPower,3+Math.sin(a)*spread);
  }
 }
 return {update,splash,get hasSplash(){return splashTime>0;},hide(force=true){if(force){root.visible=false;splashTime=0;}},dispose(){scene.remove(root);geometry.dispose();lineMaterial.dispose();brown.dispose();gripMat.dispose();buoyGeo.dispose();buoyMat.dispose();rippleGeo.dispose();rippleMat.dispose();splashGeo.dispose();splashMat.dispose();tip.geometry.dispose();grip.geometry.dispose();}};
}
