import {loadChaves} from './chaves-loader.js';
import {guardTarget,createGuardShotController,CHAVES_SHOT_RANGE} from '../gameplay/guard-combat.js';
import {roundedBoxGeometry} from '../render/geometry-detail.js';
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
 if(!state.recruited){state.recruited=true;return '🛡 Chaves recrutado! Ele defenderá sua base.';}
 if(state.hp===0){
   if((inventory.berries||0)<2||(inventory.water||0)<1)return 'O Chaves caiu! Para reanimá-lo: 2 frutas e 1 água.';
   inventory.berries-=2;inventory.water-=1;state.hp=50;
   return '💚 O Chaves voltou para defender a base!';
 }
 return `🛡 Chaves de prontidão · ${state.hp}/${GUARD_MAX_HP} de vida`;
}
export function createVillagerGuard({THREE,GLTFLoader,scene,getGroundHeight,resolveCollision,getStructures,getEnemies,canSee,attackEnemy,onStatus=()=>{},onBeforeMount=async()=>{}}){
 let state=createGuardState(),step=0;
 const model=new THREE.Group();
 const tunic=new THREE.MeshStandardMaterial({color:0x4b79a6,roughness:.9});
 const skin=new THREE.MeshStandardMaterial({color:0xe2b58c,roughness:.88});
 const brown=new THREE.MeshStandardMaterial({color:0x60412d,roughness:1});
 const steel=new THREE.MeshStandardMaterial({color:0xb8bcc0,metalness:.30,roughness:.65});
 function box(parent,w,h,d,mat,x,y,z){const mesh=new THREE.Mesh(roundedBoxGeometry(THREE,w,h,d,Math.min(w,h,d)*.14,3),mat);mesh.position.set(x,y,z);mesh.castShadow=true;parent.add(mesh);return mesh;}
 box(model,.75,.87,.42,tunic,0,1.17,0);
 box(model,.49,.48,.49,skin,0,1.86,0);
 box(model,.56,.19,.56,brown,0,2.15,0);
 box(model,.63,.12,.63,steel,0,2.22,0);
 let chavesVisual=null,mixer=null,activeAction=null,actions={},loadPromise=null;
 const shotController=createGuardShotController();
 async function preload(){
   if(chavesVisual)return true;
   if(loadPromise)return loadPromise;
   if(!GLTFLoader)return false;
   onStatus('Carregando modelo do Chaves…','loading');
   loadPromise=loadChaves({GLTFLoader,onProgress:(done,total)=>onStatus('Chaves: '+done+'/'+total+' partes','loading')}).then(async gltf=>{
     const root=gltf.scene;
     root.traverse(node=>{if(node.isMesh){node.castShadow=true;node.receiveShadow=false;if(node.isSkinnedMesh)node.frustumCulled=false;}});
     try{await onBeforeMount(root,'Chaves aliado');}catch(error){console.warn('[Chaves] Preparação ignorada:',error);}
     root.updateMatrixWorld(true);
     const bounds=new THREE.Box3().setFromObject(root);
     const height=bounds.max.y-bounds.min.y;
     if(!Number.isFinite(height)||height<=0)throw Error('Altura do Chaves inválida');
     // Preserva rig e animações; normaliza para a altura do NPC do jogo.
     const wrapper=new THREE.Group();wrapper.name='Chaves_Rig_Revisado';
     const factor=1.82/height;wrapper.scale.setScalar(factor);
     root.position.set(-(bounds.min.x+bounds.max.x)/2,-bounds.min.y,-(bounds.min.z+bounds.max.z)/2);
     wrapper.add(root);model.add(wrapper);
     mixer=new THREE.AnimationMixer(root);
     actions=Object.fromEntries((gltf.animations||[]).map(clip=>[clip.name,mixer.clipAction(clip)]));
     chavesVisual=wrapper;
     for(const child of fallbackVisuals)child.visible=false;
     onStatus('Chaves carregado com rig e '+(gltf.animations?.length||0)+' animações','ready');
     return true;
   }).catch(error=>{loadPromise=null;console.warn('[Chaves] Usando aliado visual simplificado:',error);
     onStatus('Chaves: visual provisório (modelo não carregado)','error');return false;});
   return loadPromise;
 }
 function playAnimation(name){
   if(!chavesVisual)return;
   const next=actions[name]||actions.Aim_Idle||actions.Walking;
   if(!next||next===activeAction)return;
   if(activeAction)activeAction.fadeOut(.18);
   activeAction=next;next.reset().fadeIn(.18).play();
   if(name==='Shoot'){next.setLoop(THREE.LoopOnce,1);next.clampWhenFinished=true;}
   else {next.setLoop(THREE.LoopRepeat,Infinity);next.clampWhenFinished=false;}
 }
 const fallbackVisuals=[];
 const limbs=[];
 for(const side of [-1,1]){
   const arm=new THREE.Group();arm.position.set(side*.47,1.38,0);model.add(arm);
   box(arm,.20,.65,.23,skin,0,-.33,0);limbs.push(arm);
   const leg=new THREE.Group();leg.position.set(side*.21,.82,0);model.add(leg);
   box(leg,.23,.72,.26,brown,0,-.37,0);limbs.push(leg);
 }
 box(limbs[2],.14,.7,.14,steel,0,-.65,-.20); // arma de Chaves
 // Todas as peças antigas ficam invisíveis após GLB pronto.
 fallbackVisuals.push(...model.children);
 model.position.set(state.x,getGroundHeight(state.x,state.z),state.z);scene.add(model);
 function getState(){return {...state};}
 function setState(data){const parsed=restoreGuard(data);if(!parsed)return false;state=parsed;shotController.cancel();
  model.position.set(state.x,getGroundHeight(state.x,state.z),state.z);model.visible=true;model.rotation.z=state.hp>0?0:Math.PI*.48;return true;}
 function nearby(pos,radius=2.9){return Math.hypot(model.position.x-pos.x,model.position.z-pos.z)<radius;}
 function interact(inventory){const message=interactGuard(state,inventory);model.visible=true;model.rotation.z=state.hp>0?0:Math.PI*.48;return message;}
 function damage(amount){if(!state.recruited||state.hp<=0)return false;
   state.hp=Math.max(0,state.hp-Math.max(0,Math.round(amount)));if(state.hp===0)shotController.cancel();model.visible=true;model.rotation.z=state.hp>0?0:Math.PI*.48;return true;}
 function update(dt,elapsed,playerPosition){
   if(state.hp<=0){shotController.cancel();if(mixer)mixer.update(dt);return;}
   // Um disparo marcado atinge somente quando o clipe chega ao gatilho.
   // A linha de visão, o alcance e a vida do inimigo são checados NOVAMENTE.
   shotController.update(dt,model.position,{canSee:canSee||(()=>true),
     onHit:target=>attackEnemy(target,2),range:CHAVES_SHOT_RANGE});
   let patrol={x:4,z:2};
   if(state.recruited){
     const built=getStructures();
     if(built.length){const p=built[0];patrol={x:p.x+2.0,z:p.z+1.6};}
     else patrol={x:playerPosition.x+1.7,z:playerPosition.z+1.7};
   }
   // Reaproveita os objetos existentes: nunca interfere na vida nem no spawn.
   const target=state.recruited?guardTarget(getEnemies(),model.position,
     {detectionRange:13,canSee:canSee||(()=>true)}):null;
   const destination=target?.mesh.position||patrol;
   const dx=destination.x-state.x,dz=destination.z-state.z,dist=Math.hypot(dx,dz);
   const moveLimit=target?7.8:2.5;
   const moving=dist>moveLimit && !shotController.isShooting;
   if(moving&&dist>.001){
     const move=Math.min(dist-(target?7.5:2.2),dt*(target?4.1:3.3));
     const next=resolveCollision(state.x+dx/dist*move,state.z+dz/dist*move,.42);
     state.x=next.x;state.z=next.z;
   }
   model.position.set(state.x,getGroundHeight(state.x,state.z),state.z);
   if(dist>.03)model.rotation.y=Math.atan2(dx,dz);
   // O tiro é disparado no instante real do clipe (0,46 s); não se inicia
   // uma segunda animação antes de a primeira terminar.
   if(target && dist<=CHAVES_SHOT_RANGE && shotController.ready){
      if(shotController.begin(target))playAnimation('Shoot');
   }else if(!shotController.isShooting){
      playAnimation(moving&&target?'Running':moving?'Walking':'Aim_Idle');
   }
   if(mixer)mixer.update(dt);
   step+=dt*(moving?8:2.4);
   limbs[1].rotation.x=Math.sin(step)*.55*(moving?1:.08);
   limbs[3].rotation.x=-limbs[1].rotation.x;
   limbs[0].rotation.x=-limbs[1].rotation.x*.5;
   limbs[2].rotation.x=target?-.85:-limbs[3].rotation.x*.4;
 }

 return {model,getState,setState,nearby,interact,damage,update,preload,get visualLoaded(){return !!chavesVisual},get recruited(){return state.recruited},get hp(){return state.hp},get alive(){return state.hp>0},get position(){return model.position}};
}
