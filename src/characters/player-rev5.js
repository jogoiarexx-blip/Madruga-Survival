import {createPlayerGearVisuals} from './player-gear-visual.js';
// Player REV5: replaces the on-screen procedural avatar with the original rigged
// Striped Wanderer. The existing player Group remains the physics/camera/save root.
// All GLB animations are driven by gameplay actions, not by demo timers.
import {WandererAnimator} from './wanderer/WandererAnimator.js';
import {PLAYER_ATTACK_DURATIONS,sampleRiggedWeaponMotion} from './player-attack-pose.js?v=2.2.8-weapons-craft';
import {repairRev5GlbMetadata} from './rev5-glb-compat.js?v=2.2.3-material-fix';

export const PLAYER_REV5_URL='./assets/models/Striped_Wanderer_REV5_Optimized.glb';
export const PLAYER_REV5_ORIGINAL_URL='./assets/models/Striped_Wanderer_REV5.glb';
// GitHub Pages hosts the unchanged binary as textual parts to avoid large uploads.
// Local ZIP still loads the original GLB directly.
export const PLAYER_REV5_PARTS_MANIFEST='./assets/models/rev5-parts/manifest.json';
export const PLAYER_REV5_MIRRORS=Object.freeze([
  PLAYER_REV5_PARTS_MANIFEST,
  'https://raw.githubusercontent.com/jogoiarexx-blip/Madruga-Survival/main/assets/models/rev5-parts/manifest.json',
  'https://cdn.jsdelivr.net/gh/jogoiarexx-blip/Madruga-Survival@main/assets/models/rev5-parts/manifest.json'
]);
// Download the published GLB parts concurrently, retrying transient failures.
export async function loadPlayerRev5Parts({GLTFLoader,fetcher=fetch,atobFn=atob,
  manifestUrl=PLAYER_REV5_PARTS_MANIFEST,onProgress=()=>{},parallelism=6,retries=3}={}){
  const response=await fetcher(manifestUrl);
  if(!response.ok)throw Error('Manifesto REV5 indisponível (HTTP '+response.status+')');
  const manifest=await response.json();
  if(!Number.isInteger(manifest.byteLength)||manifest.byteLength<1_000_000||manifest.byteLength>20_000_000||
    !Array.isArray(manifest.parts)||!manifest.parts.length||manifest.parts.length>32)
    throw Error('Manifesto REV5 inválido');
  const parts=new Array(manifest.parts.length);
  let nextIndex=0,completed=0;
  async function readPart(index){
    const name=manifest.parts[index];
    if(!/^part\d{2}\.b64$/.test(name))throw Error('Nome de parte REV5 inválido: '+name);
    const url=manifestUrl.replace(/manifest\.json$/,name);
    let lastError;
    for(let attempt=0;attempt<Math.max(1,retries);attempt++){
      try{
        const part=await fetcher(url);
        if(!part.ok)throw Error(name+' HTTP '+part.status);
        const encoded=(await part.text()).replace(/\s+/g,'');
        const decoded=atobFn(encoded);
        if(!decoded.length)throw Error(name+' vazio');
        return decoded;
      }catch(error){lastError=error;}
    }
    throw Error('Falha ao carregar '+name+' após '+Math.max(1,retries)+' tentativas: '+String(lastError?.message||lastError));
  }
  async function worker(){
    while(nextIndex<parts.length){
      const index=nextIndex++;
      parts[index]=await readPart(index);
      onProgress(++completed,parts.length);
    }
  }
  await Promise.all(Array.from({length:Math.min(parts.length,Math.max(1,parallelism))},worker));
  const bytes=new Uint8Array(manifest.byteLength);
  let at=0;
  for(const part of parts){
    if(at+part.length>bytes.length)throw Error('REV5 excedeu tamanho indicado no manifesto');
    for(let i=0;i<part.length;i++)bytes[at++]=part.charCodeAt(i);
  }
  if(at!==bytes.length||String.fromCharCode(...bytes.subarray(0,4))!=='glTF')
    throw Error('REV5 reconstruído incompleto');
  if(globalThis.crypto?.subtle&&/^[0-9a-f]{64}$/.test(manifest.sha256||'')){
    const hash=await globalThis.crypto.subtle.digest('SHA-256',bytes.buffer);
    const hex=Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join('');
    if(hex!==manifest.sha256)throw Error('SHA-256 REV5 não confere');
  }
  return new GLTFLoader().parseAsync(repairRev5GlbMetadata(bytes.buffer),'./assets/models/');
}
// Three independent locations for the same 17 published binary fragments.
export async function loadPlayerRev5Resilient({GLTFLoader,loadParts=loadPlayerRev5Parts,
  manifests=PLAYER_REV5_MIRRORS,onStatus=()=>{}}={}){
  const errors=[];
  for(let i=0;i<manifests.length;i++){
    const manifestUrl=manifests[i];
    onStatus('Carregando REV5, origem '+(i+1)+'/'+manifests.length+'…','loading');
    try{
      return await loadParts({GLTFLoader,manifestUrl,
        onProgress:(done,total)=>onStatus('REV5 '+(i+1)+'/'+manifests.length+': '+done+'/'+total+' partes','loading')});
    }catch(error){
      const description=String(error?.message||error);
      console.warn('[REV5] Falha na fonte '+manifestUrl+': '+description);
      errors.push('fonte '+(i+1)+': '+description);
    }
  }
  throw new Error('REV5 não carregou nas '+manifests.length+' fontes: '+errors.join(' | '));
}
export const PLAYER_REV5_SOURCE_HEIGHT=1.70000017;
export const PLAYER_REV5_TARGET_HEIGHT=2.48;
export const PLAYER_REV5_SCALE=PLAYER_REV5_TARGET_HEIGHT/PLAYER_REV5_SOURCE_HEIGHT;
// MadrugaCraft's attack forward axis is -Z; the model's rig forward is +Z.
export const PLAYER_REV5_YAW=Math.PI;

// GLTFLoader r160 sanitizes reserved ':' in rig names. Never confuse thumb
// bones with the actual hand.
export function findRev5Hand(root,side='Left') {
  const normalized=s=>String(s||'').replace(/[^a-zA-Z0-9]/g,'').toLowerCase();
  const target=normalized('mixamorig'+side+'Hand');
  const direct=['mixamorig'+side+'Hand','mixamorig:'+side+'Hand',side+'Hand'];
  for(const name of direct){
    const match=root?.getObjectByName?.(name);
    if(match?.isBone)return match;
  }
  let found=null;
  root?.traverse?.(node=>{
    if(!found && node.isBone && normalized(node.name)===target)found=node;
  });
  if(found)return found;
  root?.traverse?.(node=>{
    if(found || !node.isSkinnedMesh || !node.skeleton?.bones)return;
    found=node.skeleton.bones.find(bone=>bone.isBone&&normalized(bone.name)===target)||null;
  });
  return found;
}

export function createPlayerRev5({THREE,GLTFLoader,player,avatar,weapon,fallbackRig={},onStatus=()=>{},url=PLAYER_REV5_URL}) {
  let loaded=false,failed=false,promise=null,animator=null,meshRoot=null,magic=null,sword=null;
  let equipped=0,castLeft=0,handMount=null,swingIndex=0,comboWindow=0,weaponTime=0,queuedComboStep=null;
  let restingGrip=null;
  let gearVisuals=null,desiredGear={vest:false,padding:false,boots:false};
  function setGear(equipped){
    desiredGear={...desiredGear,...equipped};
    if(!gearVisuals&&THREE.BoxGeometry&&THREE.MeshStandardMaterial){
      gearVisuals=createPlayerGearVisuals(THREE,fallbackRig);
      if(meshRoot)gearVisuals.bind(meshRoot);
    }
    gearVisuals?.set(desiredGear);
  }
  const weaponParent=weapon?.parent,weaponStartY=weapon?.position?.y ?? -1.17;
  const display=new THREE.Group();
  display.name='Player_REV5_Visual';
  display.visible=false;
  display.rotation.y=PLAYER_REV5_YAW;
  display.scale.setScalar(PLAYER_REV5_SCALE);
  player.add(display);

  function equip(index){
    equipped=index;
    if(!loaded)return;
    if(sword)sword.visible=false;
    if(!weapon)return;
    weapon.visible=true;
    if(handMount===meshRoot){
      weapon.position.set(.48,1.08,.22);
      weapon.rotation.set(0,0,-.12);
    }else{
      // The GLB sword prop is *actually* a child of LeftHand despite its name.
      // Reuse the authored position/quaternion rather than inventing a -0.43 offset.
      const pos=sword?.position;
      weapon.position.set(pos?.x??.01406238,pos?.y??-.01078378,pos?.z??.07972427);
      if(sword?.quaternion && weapon.quaternion?.copy)weapon.quaternion.copy(sword.quaternion);
      else weapon.rotation.set(0,0,-.12);
    }
    // Guarda apenas a transformação local do acessório para animação aditiva.
    restingGrip={position:{x:weapon.position.x||0,y:weapon.position.y||0,z:weapon.position.z||0},
      rotation:{x:weapon.rotation.x||0,y:weapon.rotation.y||0,z:weapon.rotation.z||0}};
    // The player GLB has a separate scene scale of 1.459x.
    // Cancel that scale for the procedural weapon geometry (and grip radius).
    weapon.scale.setScalar(1/PLAYER_REV5_SCALE);
  }
  function setComboStep(step){queuedComboStep=Number.isInteger(step)?Math.max(0,Math.min(2,step)):0;}
  function attack(){if(!loaded)return false;
    // Only use authored single-hit clips: multi-hit combo clips would create
    // visually misleading hits that do not exist in the collision system.
    const names=equipped===0?['Attack','SwordAttack_REV3','SwordAttack_Refined']:
      equipped===1?['SwordAttack_Refined','Attack','SwordAttack_REV3']:
                   ['SwordAttack_REV3','SwordAttack_Refined','Attack'];
    if(comboWindow<=0)swingIndex=0;
    const stage=queuedComboStep===null?swingIndex%3:queuedComboStep;
    queuedComboStep=null;
    const preferred=names[stage];
    const name=animator.actions.has(preferred)?preferred:
      (animator.actions.has(names[0])?names[0]:'SwordAttack_REV3');
    swingIndex=stage+1;
    comboWindow=.92;
    if(animator.activeName===name&&animator.current?.isRunning())animator.current.stop();
    const started=animator.play(name,.07);
    if(started){
      const duration=animator.clips.get(name)?.duration;
      const target=(PLAYER_ATTACK_DURATIONS[equipped]??.36)*(stage===2?1.12:stage===1?.94:1);
      if(duration>0&&target>0)animator.actions.get(name)?.setEffectiveTimeScale(duration/target);
    }
    // O dano da jogabilidade deve ocorrer no instante real do contato do clip.
    return started?{hitPhase:name==='SwordAttack_REV3'?.54:name==='Attack'?.55:.34,clip:name}:false;
  }
  function special(){if(!loaded)return false;
    castLeft=1.55;
    if(magic)magic.visible=true;
    animator.cast();return true;
  }
  function jump(){if(!loaded)return false;animator.play('Jump',.1);return true;}
  function hurt(){if(!loaded)return false;animator.play('HitReact',.1);return true;}
  function die(){if(!loaded)return false;animator.play('Death',.08);return true;}
  function preload(){
    if(loaded)return Promise.resolve(true);
    if(promise)return promise;
    failed=false;
    // Do not show the legacy character while fetching the replacement.
    avatar.visible=false;
    display.visible=false;
    onStatus('Carregando Striped Wanderer REV5…','loading');
    const github=typeof location!=='undefined' && /(^|\.)github\.io$/.test(location.hostname);
    const load=github?loadPlayerRev5Resilient({GLTFLoader,onStatus}):
      new GLTFLoader().loadAsync(url)
        .catch(()=>new GLTFLoader().loadAsync(PLAYER_REV5_ORIGINAL_URL))
        // Clones do repositório podem conter apenas as 17 partes do GLB.
        .catch(originalError=>loadPlayerRev5Resilient({GLTFLoader,onStatus,manifests:[PLAYER_REV5_PARTS_MANIFEST]})
          .catch(partsError=>{throw Error('REV5 local: '+String(originalError?.message||originalError)+
            ' | partes: '+String(partsError?.message||partsError));}));
    promise=load.then(gltf=>{
      if(!gltf?.scene||!Array.isArray(gltf.animations))throw Error('Modelo REV5 inválido');
      for(const name of ['Idle','Walking','Running','SwordAttack_REV3','CastMagic','Jump','HitReact','Death']){
        if(!gltf.animations.some(c=>c.name===name))throw Error('Animação REV5 ausente: '+name);
      }
      meshRoot=gltf.scene;
      meshRoot.name='Striped_Wanderer_REV5';
      meshRoot.traverse(o=>{
        if(!o.isMesh)return;
        o.castShadow=true;
        o.receiveShadow=false;
        if(o.isSkinnedMesh)o.frustumCulled=false;
      });
      sword=meshRoot.getObjectByName('REV4_Sword_RightHand');
      magic=meshRoot.getObjectByName('REV4_Magic_LeftHand');
      if(sword)sword.visible=false;
      if(magic)magic.visible=false;
      // Find sanitized Three.js bone name; never reject a valid GLB just because
      // its original rig named the bone with a colon.
      const hand=findRev5Hand(meshRoot,'Left');
      handMount=hand||meshRoot;
      if(!hand)console.warn('[Player REV5] Osso da mão não encontrado; arma ancorada temporariamente ao corpo.');
      animator=new WandererAnimator(THREE,gltf,()=>{},()=>{},
        {enableFootIK:false});
      animator.play('Idle',0);
      // Gameplay equipment follows the rig hand, or visual fallback root.
      if(weapon)handMount.add(weapon);
      display.add(meshRoot);
      gearVisuals?.bind(meshRoot);
      display.visible=true;
      loaded=true;
      equip(equipped);
      // Hard replacement: never render both player bodies simultaneously.
      avatar.visible=false;
      onStatus('Personagem REV5 carregado com 45 ossos e 17 animações.','ready');
      return true;
    }).catch(err=>{
      failed=true;
      loaded=false;
      promise=null; // permite repetir o download sem recarregar a partida
      if(weaponParent && weapon?.parent!==weaponParent){
        weaponParent.add(weapon);
        weapon.position.y=weaponStartY;weapon.scale.setScalar(1);weapon.rotation.set(.24,0,-.56);
      }
      if(meshRoot?.parent===display)display.remove(meshRoot);
      handMount=null;
      animator?.dispose();animator=null;
      display.visible=false;
      avatar.visible=true;
      console.warn('Falha ao carregar jogador REV5; usando avatar original.',err);
      onStatus('Não foi possível carregar REV5: '+String(err?.message||err),'error');
      return false;
    });
    return promise;
  }
  function update(dt,{speed=0,sprinting=false,grounded=true,attackProgress=null,attackStep=0}={}){
    if(!loaded)return;
    comboWindow=Math.max(0,comboWindow-dt);weaponTime+=dt;
    const move=speed>.28;
    const wanted=!grounded?'Idle':!move?'Idle':sprinting?'Running':'Walking';
    animator.locomotion(wanted);
    if(['Idle','Walking','Running'].includes(animator.activeName)){
      // Walking/Running are in-place; do not move root motion into collision.
      const pace=!move?1:sprinting?Math.max(.85,Math.min(1.5,speed/6.8)):
        Math.max(.8,Math.min(1.45,speed/3.5));
      if(Math.abs(animator.speed-pace)>.045)animator.setSpeed(pace);
    } else if(animator.speed!==1)animator.setSpeed(1);
    if(castLeft>0){castLeft=Math.max(0,castLeft-dt);if(castLeft===0&&magic)magic.visible=false;}
    animator.update(dt);
    if(weapon&&restingGrip){
      const motion=sampleRiggedWeaponMotion(equipped,attackProgress===null?0:attackProgress,
        Math.min(1,speed/5),weaponTime,attackStep);
      weapon.position.set(restingGrip.position.x+motion.x,restingGrip.position.y+motion.y,restingGrip.position.z+motion.z);
      weapon.rotation.set(restingGrip.rotation.x+motion.pitch,restingGrip.rotation.y,restingGrip.rotation.z+motion.roll);
    }
  }
  function dispose(){
    gearVisuals?.dispose();gearVisuals=null;
    if(animator)animator.dispose();
    if(meshRoot)display.remove(meshRoot);
    handMount=null;restingGrip=null;
    avatar.visible=true;
    display.visible=false;
    if(weaponParent && weapon?.parent!==weaponParent){weaponParent.add(weapon);weapon.position.y=weaponStartY;weapon.scale.setScalar(1);weapon.rotation.set(.24,0,-.56);}
    loaded=false;
  }
  return {preload,update,equip,setGear,attack,setComboStep,special,jump,hurt,die,dispose,
    get loaded(){return loaded},get failed(){return failed},get animator(){return animator},
    get model(){return meshRoot},get handMount(){return handMount},get visualVisible(){return display.visible},
    get oldVisualVisible(){return avatar.visible}};
}
