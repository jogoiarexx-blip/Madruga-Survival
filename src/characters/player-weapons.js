// Empunhadura: origem na palma, +Y aponta para a ponta do equipamento.
export const RIGHT_HAND_GRIP=Object.freeze({x:0,y:-0.72,z:0.04});
export const IDLE_GRIP_POSES=Object.freeze([
  Object.freeze({x:0.24,y:0,z:-0.56}),
  Object.freeze({x:0.21,y:0,z:-0.48}),
  Object.freeze({x:0.29,y:0,z:-0.71})
]);
export function createPlayerWeaponRig(THREE,rightArm){
  const weapon=new THREE.Group();weapon.name='Madruga-WeaponGrip';
  weapon.position.set(RIGHT_HAND_GRIP.x,RIGHT_HAND_GRIP.y,RIGHT_HAND_GRIP.z);
  rightArm.add(weapon);
  const wood=new THREE.MeshStandardMaterial({color:0x86552c,roughness:.85});
  const dark=new THREE.MeshStandardMaterial({color:0x50341e,roughness:.9});
  const metal=new THREE.MeshStandardMaterial({color:0xaebdc5,roughness:.43,metalness:.64});
  const tip=new THREE.MeshStandardMaterial({color:0xe2e5dd,roughness:.34,metalness:.72});
  const grip=new THREE.MeshStandardMaterial({color:0x3b2c22,roughness:.94});
  function part(root,geometry,material,x,y,z){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;root.add(m);return m;}
  function shaft(root,r0,r1,len,y,material=wood){return part(root,new THREE.CylinderGeometry(r1,r0,len,10),material,0,y,0);}
  function wrap(root,y){return part(root,new THREE.CylinderGeometry(.068,.068,.095,12),grip,0,y,0);}
  const broom=new THREE.Group();broom.name='Cabo de vassoura';weapon.add(broom);
  shaft(broom,.047,.042,1.51,.62);part(broom,new THREE.CylinderGeometry(.052,.052,.07,12),dark,0,1.39,0);wrap(broom,.035);
  const hammer=new THREE.Group();hammer.name='Marreta reforçada';weapon.add(hammer);
  shaft(hammer,.06,.053,1.08,.36,dark);wrap(hammer,.04);wrap(hammer,.22);
  const hammerHead=part(hammer,new THREE.BoxGeometry(.72,.28,.31),metal,0,.95,0);
  for(const side of [-1,1])part(hammer,new THREE.BoxGeometry(.06,.30,.33),tip,side*.365,.95,0);
  const spear=new THREE.Group();spear.name='Lança da floresta';weapon.add(spear);
  shaft(spear,.043,.033,1.74,.73);wrap(spear,.025);wrap(spear,.18);
  part(spear,new THREE.CylinderGeometry(.075,.09,.12,12),metal,0,1.61,0);
  const spearHead=part(spear,new THREE.ConeGeometry(.16,.50,12),tip,0,1.91,0);
  part(spear,new THREE.BoxGeometry(.32,.055,.06),metal,0,1.68,0);
  const models=[broom,hammer,spear];let activeIndex=0;
  function equipWeaponVisual(index){
    if(!Number.isInteger(index)||index<0||index>=models.length)return false;
    activeIndex=index;models.forEach((m,i)=>{m.visible=i===index});
    const pose=IDLE_GRIP_POSES[index];weapon.rotation.set(pose.x,pose.y,pose.z);
    return true;
  }
  equipWeaponVisual(0);
  return {weapon,hammerHead,spearHead,weaponModels:models,equipWeaponVisual,get activeWeaponIndex(){return activeIndex}};
}
