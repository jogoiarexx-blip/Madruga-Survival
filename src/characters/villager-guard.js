// NPC aliado: recruta com F, patrulha as construções, defende e pode ser reanimado.
export const GUARD_MAX_HP=80;
export function validGuard(data){
 return !!data&&typeof data==='object'&&typeof data.recruited==='boolean'&&
  Number.isInteger(data.hp)&&data.hp>=0&&data.hp<=GUARD_MAX_HP&&
  Number.isFinite(data.x)&&Math.abs(data.x)<=109&&Number.isFinite(data.z)&&Math.abs(data.z)<=109;
}
export function createGuardState(){return {recruited:false,hp:GUARD_MAX_HP,x:4,z:2};}
export function restoreGuard(data){return data===undefined?createGuardState():validGuard(data)?{recruited:data.recruited,hp:data.hp,x:data.x,z:data.z}:null;}
export function interactGuard(state,inventory){
 if(!state.recruited){state.recruited=true;return '🛡 Aldeão recrutado! Ele defenderá sua base.';}
 if(state.hp===0){
   if((inventory.berries||0)<2||(inventory.water||0)<1)return 'O guarda caiu! Para reanimá-lo: 2 frutas e 1 água.';
   inventory.berries-=2;inventory.water-=1;state.hp=50;
   return '💚 O aldeão voltou para defender a base!';
 }
 return `🛡 Guarda de prontidão · ${state.hp}/${GUARD_MAX_HP} de vida`;
}
export function createVillagerGuard({THREE,scene,getGroundHeight,resolveCollision,getStructures,getEnemies,canSee,attackEnemy}){
 let state=createGuardState(),timer=0,step=0;
 const model=new THREE.Group();
 const tunic=new THREE.MeshStandardMaterial({color:0x4b79a6,roughness:.9});
 const skin=new THREE.MeshStandardMaterial({color:0xe2b58c,roughness:.88});
 const brown=new THREE.MeshStandardMaterial({color:0x60412d,roughness:1});
 const steel=new THREE.MeshStandardMaterial({color:0xb8bcc0,metalness:.30,roughness:.65});
 function box(parent,w,h,d,mat,x,y,z){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);mesh.castShadow=true;parent.add(mesh);return mesh;}
 box(model,.75,.87,.42,tunic,0,1.17,0);
 box(model,.49,.48,.49,skin,0,1.86,0);
 box(model,.56,.19,.56,brown,0,2.15,0);
 box(model,.63,.12,.63,steel,0,2.22,0);
 const limbs=[];
 for(const side of [-1,1]){
   const arm=new THREE.Group();arm.position.set(side*.47,1.38,0);model.add(arm);
   box(arm,.20,.65,.23,skin,0,-.33,0);limbs.push(arm);
   const leg=new THREE.Group();leg.position.set(side*.21,.82,0);model.add(leg);
   box(leg,.23,.72,.26,brown,0,-.37,0);limbs.push(leg);
 }
 box(limbs[2],.14,.7,.14,steel,0,-.65,-.20); // arma de guarda
 model.position.set(state.x,getGroundHeight(state.x,state.z),state.z);scene.add(model);
 function getState(){return {...state};}
 function setState(data){const parsed=restoreGuard(data);if(!parsed)return false;state=parsed;
  model.position.set(state.x,getGroundHeight(state.x,state.z),state.z);model.visible=true;model.rotation.z=state.hp>0?0:Math.PI*.48;return true;}
 function nearby(pos,radius=2.9){return Math.hypot(model.position.x-pos.x,model.position.z-pos.z)<radius;}
 function interact(inventory){const message=interactGuard(state,inventory);model.visible=true;model.rotation.z=state.hp>0?0:Math.PI*.48;return message;}
 function damage(amount){if(!state.recruited||state.hp<=0)return false;
   state.hp=Math.max(0,state.hp-Math.max(0,Math.round(amount)));model.visible=true;model.rotation.z=state.hp>0?0:Math.PI*.48;return true;}
 function update(dt,elapsed,playerPosition){
   if(state.hp<=0)return;
   let patrol={x:4,z:2};
   if(state.recruited){
     const built=getStructures();
     if(built.length){const p=built[0];patrol={x:p.x+2.0,z:p.z+1.6};}
     else patrol={x:playerPosition.x+1.7,z:playerPosition.z+1.7};
   }
   const candidates=state.recruited?getEnemies().filter(e=>e.hp>0&&e.type!=='boss'&&Math.hypot(e.mesh.position.x-state.x,e.mesh.position.z-state.z)<10.5):[];
   const target=candidates.sort((a,b)=>Math.hypot(a.mesh.position.x-state.x,a.mesh.position.z-state.z)-Math.hypot(b.mesh.position.x-state.x,b.mesh.position.z-state.z))[0];
   const destination=target?.mesh.position||patrol;
   const dx=destination.x-state.x,dz=destination.z-state.z,dist=Math.hypot(dx,dz);
   const moving=dist>(target?2.9:2.5);
   if(moving){const move=Math.min(dist-(target?2.5:2.2),dt*(target?4.1:3.3));
     const next=resolveCollision(state.x+dx/dist*move,state.z+dz/dist*move,.42);
     state.x=next.x;state.z=next.z;
   }
   model.position.set(state.x,getGroundHeight(state.x,state.z),state.z);
   if(dist>.03)model.rotation.y=Math.atan2(dx,dz);
   step+=dt*(moving?8:2.4);
   limbs[1].rotation.x=Math.sin(step)*.55*(moving?1:.08);
   limbs[3].rotation.x=-limbs[1].rotation.x;
   limbs[0].rotation.x=-limbs[1].rotation.x*.5;
   limbs[2].rotation.x=target?-.85:-limbs[3].rotation.x*.4;
   timer=Math.max(0,timer-dt);
   if(target&&dist<3.6&&timer<=0&&(!canSee||canSee(model.position,target.mesh.position))){
     timer=1.1;attackEnemy(target,2);limbs[2].rotation.x=-1.6;
   }
 }
 return {model,getState,setState,nearby,interact,damage,update,get recruited(){return state.recruited},get hp(){return state.hp},get alive(){return state.hp>0},get position(){return model.position}};
}
