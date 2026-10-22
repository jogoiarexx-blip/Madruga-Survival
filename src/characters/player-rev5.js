// Player REV5: replaces the on-screen procedural avatar with the original rigged
// Striped Wanderer. The existing player Group remains the physics/camera/save root.
// All GLB animations are driven by gameplay actions, not by demo timers.
import {WandererAnimator} from './wanderer/WandererAnimator.js';

export const PLAYER_REV5_URL='./assets/models/Striped_Wanderer_REV5.glb';
// GitHub Pages hosts the unchanged binary as textual parts to avoid large uploads.
// Local ZIP still loads the original GLB directly.
export const PLAYER_REV5_PARTS_MANIFEST='./assets/models/rev5-parts/manifest.json';
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
  return new GLTFLoader().parseAsync(bytes.buffer,'./assets/models/');
}
export const PLAYER_REV5_SOURCE_HEIGHT=1.70000017;
export const PLAYER_REV5_TARGET_HEIGHT=2.48;
export const PLAYER_REV5_SCALE=PLAYER_REV5_TARGET_HEIGHT/PLAYER_REV5_SOURCE_HEIGHT;
// MadrugaCraft's attack forward axis is -Z; the model's rig forward is +Z.
export const PLAYER_REV5_YAW=Math.PI;

export function createPlayerRev5({THREE,GLTFLoader,player,avatar,weapon,onStatus=()=>{},url=PLAYER_REV5_URL}) {
  let loaded=false,failed=false,promise=null,animator=null,meshRoot=null,magic=null,sword=null;
  let equipped=0,castLeft=0;
  const weaponParent=weapon?.parent,weaponStartY=weapon?.position?.y ?? -1.17;
  const display=new THREE.Group();
  display.name='Player_REV5_Visual';
  display.rotation.y=PLAYER_REV5_YAW;
  display.scale.setScalar(PLAYER_REV5_SCALE);
  player.add(display);

  function equip(index){
    equipped=index;
    if(!loaded)return;
    // The gameplay weapons follow the rigged hand; never show the GLB prop
    // and the game's weapon at the same time.
    if(sword)sword.visible=false;
    if(weapon){weapon.visible=true;weapon.position.set(0,-.43,.09);weapon.rotation.set(0,0,-.12);}
  }
  function attack(){if(!loaded)return false;
    // Shorter clip matches the existing quick melee cooldown better than the
    // ~2.8s refined showcase; weapon hitboxes remain owned by combat.js.
    animator.play('SwordAttack_REV3',.10);return true;
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
    onStatus('Carregando Striped Wanderer REV5…','loading');
    const github=typeof location!=='undefined' && /(^|\.)github\.io$/.test(location.hostname);
    const load=github?loadPlayerRev5Parts({GLTFLoader,onProgress:(done,total)=>
      onStatus('Carregando jogador REV5: '+done+'/'+total+' partes…','loading')}):
      new GLTFLoader().loadAsync(url);
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
      // The source sword is attached to LeftHand, despite its exported name.
      const hand=meshRoot.getObjectByName('mixamorig:LeftHand');
      if(!hand)throw Error('Rig REV5 sem mixamorig:LeftHand');
      animator=new WandererAnimator(THREE,gltf,()=>{},()=>{},
        {enableFootIK:false});
      animator.play('Idle',0);
      // Game equipment (broom/hammer/spear) remains fully functional.
      // Parenting transfers it from the procedural right arm to this GLB hand.
      hand.add(weapon);
      display.add(meshRoot);
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
        weapon.position.y=weaponStartY;weapon.rotation.z=-.12;
      }
      if(meshRoot?.parent===display)display.remove(meshRoot);
      avatar.visible=true;
      console.warn('Falha ao carregar jogador REV5; usando avatar original.',err);
      onStatus('Não foi possível carregar REV5: '+String(err?.message||err),'error');
      return false;
    });
    return promise;
  }
  function update(dt,{speed=0,sprinting=false,grounded=true}={}){
    if(!loaded)return;
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
  }
  function dispose(){
    if(animator)animator.dispose();
    if(meshRoot)display.remove(meshRoot);
    avatar.visible=true;
    if(weaponParent && weapon?.parent!==weaponParent){weaponParent.add(weapon);weapon.position.y=weaponStartY;}
    loaded=false;
  }
  return {preload,update,equip,attack,special,jump,hurt,die,dispose,
    get loaded(){return loaded},get failed(){return failed},get animator(){return animator},
    get model(){return meshRoot}};
}
