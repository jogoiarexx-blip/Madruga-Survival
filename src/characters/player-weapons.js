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
  // Fibras/braçadeira formam uma vassoura reconhecível, mesmo em modo low-poly.
  part(broom,new THREE.CylinderGeometry(.10,.048,.14,12),metal,0,1.44,0);
  for(let i=0;i<9;i++){
    const a=i*Math.PI*2/9,r=.075;
    part(broom,new THREE.CylinderGeometry(.008,.015,.31,5),i%2?wood:dark,
      Math.cos(a)*r,1.655,Math.sin(a)*r);
  }
  const broomArmor=new THREE.Group();broomArmor.name='Cabo - proteção de ferro';broom.add(broomArmor);
  for(let i=0;i<4;i++){
    const collar=part(broomArmor,new THREE.CylinderGeometry(.061,.061,.045,10),metal,0,.08+i*.16,0);
    collar.rotation.y=i*.2;
  }
  part(broomArmor,new THREE.BoxGeometry(.095,.18,.06),metal,0,1.31,.015);
  const hammer=new THREE.Group();hammer.name='Marreta reforçada';weapon.add(hammer);
  shaft(hammer,.06,.053,1.08,.36,dark);wrap(hammer,.04);wrap(hammer,.22);
  const hammerHead=part(hammer,new THREE.BoxGeometry(.72,.28,.31),metal,0,.95,0);
  for(const side of [-1,1])part(hammer,new THREE.BoxGeometry(.06,.30,.33),tip,side*.365,.95,0);
  // Faces laterais reforçadas, com rebites discretos.
  for(const z of [-.16,.16])for(const x of [-.22,.22])
    part(hammer,new THREE.CylinderGeometry(.035,.035,.018,8),dark,x,.95,z);
  const spear=new THREE.Group();spear.name='Lança da floresta';weapon.add(spear);
  shaft(spear,.043,.033,1.74,.73);wrap(spear,.025);wrap(spear,.18);
  part(spear,new THREE.CylinderGeometry(.075,.09,.12,12),metal,0,1.61,0);
  const spearHead=part(spear,new THREE.ConeGeometry(.16,.50,12),tip,0,1.91,0);
  part(spear,new THREE.BoxGeometry(.32,.055,.06),metal,0,1.68,0);
  // Peças adicionais acionadas pelo craft, sem duplicar os modelos das armas.
  const iron=new THREE.MeshStandardMaterial({color:0xcad2d7,roughness:.38,metalness:.75});
  const weave=new THREE.MeshStandardMaterial({color:0x8a7855,roughness:.95});
  const hammerIron=new THREE.Group();hammerIron.name='Marreta - cabeça de ferro';hammer.add(hammerIron);
  for(const side of [-1,1]){
    part(hammerIron,new THREE.BoxGeometry(.16,.35,.35),iron,side*.30,.95,0);
  }
  const spearIron=new THREE.Group();spearIron.name='Lança - ponta de ferro';spear.add(spearIron);
  part(spearIron,new THREE.ConeGeometry(.17,.56,12),iron,0,1.91,0);
  const spearTempered=new THREE.Group();spearTempered.name='Lança - lâmina temperada';spear.add(spearTempered);
  for(const side of [-1,1]){
    const tooth=part(spearTempered,new THREE.ConeGeometry(.06,.21,5),tip,side*.15,1.71,0);
    tooth.rotation.z=side*-.65;
  }
  const hammerSpikes=new THREE.Group();hammerSpikes.name='Marreta - cravos';hammer.add(hammerSpikes);
  for(const side of [-1,1])for(const z of [-.10,.10]){
    const spike=part(hammerSpikes,new THREE.ConeGeometry(.08,.23,7),tip,side*.40,.95,z);
    spike.rotation.z=side*-.5*Math.PI;
  }
  const grips=[];
  for(const model of [hammer,spear]){
    const bands=new THREE.Group();bands.name='Trançado reforçado';model.add(bands);
    for(let i=0;i<5;i++){
      const ring=part(bands,new THREE.TorusGeometry(.062,.012,5,12),weave,0,.045+i*.07,0);
      ring.rotation.x=Math.PI/2;
    }
    grips.push(bands);
  }
  function setWeaponUpgrades(crafted={}){
    broomArmor.visible=!!crafted.armoredBroom;
    hammerSpikes.visible=!!crafted.spikedHammer;
    spearTempered.visible=!!crafted.hardenedSpear;
    hammerIron.visible=!!crafted.ironHammer;
    spearIron.visible=!!crafted.ironSpear;
    spearHead.visible=!crafted.ironSpear;
    grips.forEach(group=>{group.visible=!!crafted.reinforcedGrip});
  }
  setWeaponUpgrades();
  // Normaliza o volume visual ao redor da empunhadura: mais leve no REV5
  // e no avatar de reserva, sem mudar hitboxes, dano ou upgrades.
  const models=[broom,hammer,spear];
  const proportions=[.72,.78,.68];
  models.forEach((mesh,index)=>mesh.scale?.setScalar?.(proportions[index]));
  let activeIndex=0;
  function equipWeaponVisual(index){
    if(!Number.isInteger(index)||index<0||index>=models.length)return false;
    activeIndex=index;models.forEach((m,i)=>{m.visible=i===index});
    const pose=IDLE_GRIP_POSES[index];weapon.rotation.set(pose.x,pose.y,pose.z);
    return true;
  }
  equipWeaponVisual(0);
  return {weapon,hammerHead,spearHead,weaponModels:models,equipWeaponVisual,setWeaponUpgrades,get activeWeaponIndex(){return activeIndex}};
}
