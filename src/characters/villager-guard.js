import {loadChaves} from './chaves-loader.js';
import {createGuardNavigator} from '../gameplay/guard-navigation.js';
import {guardTarget,createGuardShotController,CHAVES_SHOT_RANGE} from '../gameplay/guard-combat.js';
import {roundedBoxGeometry} from '../render/geometry-detail.js';
import {DEFAULT_GUARD_ORDER,normalizeGuardOrder,nextGuardOrder,GUARD_ORDER_NAMES,guardWaypoint,canEngageInOrder,distanceXZ} from '../gameplay/guard-orders.js';
// NPC aliado: recruta com F, patrulha as construções, defende e pode ser reanimado.
export const GUARD_MAX_HP=80;
export function validGuard(data){
 return !!data&&typeof data==='object'&&typeof data.recruited==='boolean'&&
  Number.isInteger(data.hp)&&data.hp>=0&&data.hp<=GUARD_MAX_HP&&
  Number.isFinite(data.x)&&Math.abs(data.x)<=109&&Number.isFinite(data.z)&&Math.abs(data.z)<=109&&
  (data.mode===undefined||Object.keys(GUARD_ORDER_NAMES).includes(data.mode));
}
export function createGuardState(){return {recruited:false,hp:GUARD_MAX_HP,x:4,z:2,mode:DEFAULT_GUARD_ORDER};}
export function restoreGuard(data){return data===undefined?createGuardState():validGuard(data)?{recruited:data.recruited,hp:data.hp,x:data.x,z:data.z,mode:normalizeGuardOrder(data.mode)}:null;}
export function interactGuard(state,inventory){
 if(!state.recruited){state.recruited=true;return '🛡 Chaves recrutado! Ele defenderá sua base.';}
 if(state.hp===0){
   if((inventory.berries||0)<2||(inventory.water||0)<1)return 'O Chaves caiu! Para reanimá-lo: 2 frutas e 1 água.';
   inventory.berries-=2;inventory.water-=1;state.hp=50;
   return '💚 O Chaves voltou para defender a base!';
 }
 return `🛡 Chaves de prontidão · ${state.hp}/${GUARD_MAX_HP} de vida`;
}
export function createVillagerGuard({THREE,GLTFLoader,scene,getGroundHeight,resolveCollision,isPositionFree=null,getStructures,getEnemies,canSee,attackEnemy,onStatus=()=>{},onBeforeMount=async()=>{}}){
 let state=createGuardState(),step=0,patrolIndex=0,patrolPause=0,shotFxTime=0;
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
 let chavesVisual=null,mixer=null,activeAction=null,actions={},loadPromise=null,muzzleNode=null;
 const shotController=createGuardShotController();
 // Replaneja quando o alvo muda ou uma construção bloqueia a rota.
 const navigator=createGuardNavigator({
   resolveCollision,isFree:isPositionFree||((x,z,r)=>{const p=resolveCollision(x,z,r);return Math.hypot(p.x-x,p.z-z)<.015;}),getGroundHeight
 });
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
     muzzleNode=root.getObjectByName('Muzzle')||null;
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
 // Um traçante por tiro com geometria reutilizável; efeito só no disparo confirmado.
 // Testes legados e dispositivos sem renderizador avançado usam o modo seguro.
 const graphicsReady=!!(THREE.BufferGeometry&&THREE.BufferAttribute&&THREE.Line&&THREE.LineBasicMaterial&&THREE.SphereGeometry&&THREE.MeshBasicMaterial&&THREE.Vector3);
 const tracerGeometry=graphicsReady?new THREE.BufferGeometry():null;
 if(tracerGeometry)tracerGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(6),3));
 const tracer=graphicsReady?new THREE.Line(tracerGeometry,new THREE.LineBasicMaterial({color:0xffe0a0,transparent:true,opacity:.9,depthWrite:false})):null;
 if(tracer){tracer.name='Chaves_tiro_tracante';tracer.frustumCulled=false;tracer.visible=false;scene.add(tracer);}
 const muzzleFlash=graphicsReady?new THREE.Mesh(new THREE.SphereGeometry(.13,8,6),new THREE.MeshBasicMaterial({color:0xffe0a0,transparent:true,opacity:.9,depthWrite:false})):null;
 if(muzzleFlash){muzzleFlash.name='Chaves_luz_disparo';muzzleFlash.visible=false;scene.add(muzzleFlash);}
 const shotOrigin=graphicsReady?new THREE.Vector3():null;
 function showShot(target){
   if(!graphicsReady)return;
   model.updateMatrixWorld(true);
   if(muzzleNode)muzzleNode.getWorldPosition(shotOrigin);
   else shotOrigin.set(model.position.x,model.position.y+1.55,model.position.z+.35);
   const end=target.mesh.position;
   const points=tracerGeometry.attributes.position;
   points.setXYZ(0,shotOrigin.x,shotOrigin.y,shotOrigin.z);
   points.setXYZ(1,end.x,end.y+Math.min(1.2,(target.size||2)*.45),end.z);
   points.needsUpdate=true;tracer.visible=true;
   muzzleFlash.position.copy(shotOrigin);muzzleFlash.visible=true;
   shotFxTime=.11;
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
 function setState(data){const parsed=restoreGuard(data);if(!parsed)return false;state=parsed;shotController.cancel();navigator.reset();patrolIndex=0;patrolPause=0;shotFxTime=0;if(tracer)tracer.visible=false;if(muzzleFlash)muzzleFlash.visible=false;
  model.position.set(state.x,getGroundHeight(state.x,state.z),state.z);model.visible=true;model.rotation.z=state.hp>0?0:Math.PI*.48;return true;}
 function nearby(pos,radius=2.9){return Math.hypot(model.position.x-pos.x,model.position.z-pos.z)<radius;}
 function interact(inventory){const message=interactGuard(state,inventory);model.visible=true;model.rotation.z=state.hp>0?0:Math.PI*.48;return message;}
 function damage(amount){if(!state.recruited||state.hp<=0)return false;
   state.hp=Math.max(0,state.hp-Math.max(0,Math.round(amount)));if(state.hp===0)shotController.cancel();model.visible=true;model.rotation.z=state.hp>0?0:Math.PI*.48;return true;}
 function cycleOrder(){
   if(!state.recruited||state.hp<=0)return null;
   state.mode=nextGuardOrder(state.mode);navigator.reset();patrolIndex=0;patrolPause=0;shotController.cancel();
   return GUARD_ORDER_NAMES[state.mode];
 }
 function update(dt,elapsed,playerPosition){
   shotFxTime=Math.max(0,shotFxTime-dt);if(tracer)tracer.visible=shotFxTime>0;if(muzzleFlash)muzzleFlash.visible=shotFxTime>.04;
   if(state.hp<=0){shotController.cancel();if(mixer)mixer.update(dt);return;}
   // Um disparo marcado atinge somente quando o clipe chega ao gatilho.
   // A linha de visão, o alcance e a vida do inimigo são checados NOVAMENTE.
   shotController.update(dt,model.position,{canSee:canSee||(()=>true),
     onHit:target=>{showShot(target);attackEnemy(target,2);},range:CHAVES_SHOT_RANGE});
   const structures=state.recruited?getStructures():[];
   const order=normalizeGuardOrder(state.mode);
   let patrol=state.recruited?guardWaypoint(order,playerPosition,structures,patrolIndex):{x:4,z:2};
   if(state.recruited&&order==='patrol'){
     if(patrolPause>0)patrolPause=Math.max(0,patrolPause-dt);
     else if(distanceXZ(model.position,patrol)<1.1){
       patrolIndex=(patrolIndex+1)%4;patrolPause=.6;patrol=guardWaypoint(order,playerPosition,structures,patrolIndex);
     }
   }
   // O aliado só enfrenta inimigos próximos ao jogador ou à base comandada.
   // Assim não sai perseguindo alvos que aparecem do outro lado do mundo.
   const target=state.recruited?guardTarget(getEnemies(),model.position,
     {detectionRange:13,canSee:(from,to)=>(!canSee||canSee(from,to))&&
       canEngageInOrder(to,order,playerPosition,structures)}):null;
   const destination=target?.mesh.position||patrol;
   const dx=destination.x-state.x,dz=destination.z-state.z,dist=Math.hypot(dx,dz);
   const moveLimit=target?7.8:2.5;
   const moving=dist>(target?moveLimit:order==='follow'?1.8:order==='patrol'?1.1:2.5) &&
     !shotController.isShooting && !(order==='patrol'&&!target&&patrolPause>0);
   const beforeX=state.x,beforeZ=state.z;
   if(moving&&dist>.001){
     const next=navigator.navigate(state,destination,dt,target?4.1:3.3,
       {stopAt:target?7.5:order==='follow'?1.5:order==='patrol'?.6:2.2});
     state.x=next.x;state.z=next.z;
   }else navigator.reset();
   // Adere ao solo, com suavização apenas visual (não altera o save/collider).
   const groundY=getGroundHeight(state.x,state.z);
   const followY=Number.isFinite(model.position.y)?model.position.y:groundY;
   model.position.set(state.x,followY+(groundY-followY)*Math.min(1,Math.max(0,dt)*12),state.z);
   const movedDistance=Math.hypot(state.x-beforeX,state.z-beforeZ);
   const actuallyMoving=movedDistance>.001;
   if(target && dist<=CHAVES_SHOT_RANGE && dist>.03)model.rotation.y=Math.atan2(dx,dz);
   else if(actuallyMoving)model.rotation.y=Math.atan2(state.x-beforeX,state.z-beforeZ);
   else if(dist>.03)model.rotation.y=Math.atan2(dx,dz);
   // O tiro é disparado no instante real do clipe (0,46 s); não se inicia
   // uma segunda animação antes de a primeira terminar.
   if(target && dist<=CHAVES_SHOT_RANGE && shotController.ready){
      if(shotController.begin(target))playAnimation('Shoot');
   }else if(!shotController.isShooting){
      playAnimation(actuallyMoving&&target?'Running':actuallyMoving?'Walking':'Aim_Idle');
   }
   if(mixer)mixer.update(dt);
   step+=dt*(actuallyMoving?8:2.4);
   limbs[1].rotation.x=Math.sin(step)*.55*(actuallyMoving?1:.08);
   limbs[3].rotation.x=-limbs[1].rotation.x;
   limbs[0].rotation.x=-limbs[1].rotation.x*.5;
   limbs[2].rotation.x=target?-.85:-limbs[3].rotation.x*.4;
 }

 return {model,getState,setState,nearby,interact,cycleOrder,damage,update,preload,get mode(){return normalizeGuardOrder(state.mode)},get visualLoaded(){return !!chavesVisual},get recruited(){return state.recruited},get hp(){return state.hp},get alive(){return state.hp>0},get position(){return model.position}};
}
