// Adaptador REV2: usa o GLB original enviado pelo usuário, preservando IA,
// colisões e dano do MadrugaCraft. O modelo é carregado uma vez e clonado.
import {isZombieType,ZOMBIE_TYPES} from '../gameplay/zombie-variants.js';
import {createZombieFootPlant} from './zombie-foot-plant.js';

export const ZOMBIE_GLB_URL='./assets/models/zumbi_animado_REV2.glb';
// GitHub Pages pode hospedar o GLB em partes: evita limite de upload por requisição
// preservando exatamente os bytes do modelo original. O ZIP local usa GLB direto.
export const ZOMBIE_PARTS_MANIFEST='./assets/models/rev2-parts/manifest.json';
export async function loadRev2Parts({GLTFLoader,fetcher=fetch,atobFn=atob,manifestUrl=ZOMBIE_PARTS_MANIFEST}){
  const manifestResponse=await fetcher(manifestUrl);
  if(!manifestResponse.ok)throw new Error('Manifesto de zumbi não encontrado');
  const manifest=await manifestResponse.json();
  if(!Number.isInteger(manifest.byteLength)||manifest.byteLength<1000000||manifest.byteLength>20000000||
      !Array.isArray(manifest.parts)||manifest.parts.length<1||manifest.parts.length>40)
    throw new Error('Manifesto de zumbi inválido');
  const bytes=new Uint8Array(manifest.byteLength);
  let cursor=0;
  // Downloads sequenciais mantêm consumo de memória previsível em celulares.
  for(const name of manifest.parts){
    if(!/^part\d{2}\.b64$/.test(name))throw new Error('Nome de parte inválido');
    const response=await fetcher(manifestUrl.replace(/manifest\.json$/,name));
    if(!response.ok)throw new Error('Parte do zumbi ausente: '+name);
    const base64=(await response.text()).replace(/\s+/g,'');
    const decoded=atobFn(base64);
    if(cursor+decoded.length>bytes.length)throw new Error('Parte excede tamanho esperado do GLB');
    for(let i=0;i<decoded.length;i++)bytes[cursor++]=decoded.charCodeAt(i);
  }
  if(cursor!==bytes.length||String.fromCharCode(...bytes.subarray(0,4))!=='glTF')
    throw new Error('GLB reconstruído incompleto');
  if(globalThis.crypto?.subtle && /^[0-9a-f]{64}$/.test(manifest.sha256||'')){
    const hash=await crypto.subtle.digest('SHA-256',bytes.buffer);
    const hex=Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join('');
    if(hex!==manifest.sha256)throw new Error('Checksum do zumbi REV2 não confere');
  }
  return new GLTFLoader().parseAsync(bytes.buffer,'./assets/models/');
}

export const ZOMBIE_ANIMATIONS=Object.freeze({
  zombie:'Andar', zombie_runner:'Correr', zombie_toxic:'Andar', zombie_brute:'Andar'
});

const SOURCE_MIN_Y=-0.95159;
const SOURCE_HEIGHT=1.898523;
// Mantém o zumbi base aproximadamente na mesma altura visual do personagem do jogador.
// Jogador: aproximadamente 2,50 unidades incluindo o chapéu (topo em Y=2.505).
const BASE_MATCH_HEIGHT=2.58;
const BASE_SCALE=BASE_MATCH_HEIGHT/SOURCE_HEIGHT;
const STANDARD_SIZE=ZOMBIE_TYPES.zombie.size;

const LOCOMOTION_CLIP_SCALE=Object.freeze({
  zombie:2.10,
  zombie_runner:2.30,
  zombie_toxic:2.05,
  zombie_brute:1.75
});

export function createZombieModelManager({THREE,scene,GLTFLoader,cloneSkeleton,getGroundHeight,url=ZOMBIE_GLB_URL,deferPreload=false}) {
  let asset=null, loading=null, failed=false;
  const active=new Set();
  const corpses=new Map();

  function preload(){
    if(asset)return Promise.resolve(true);
    if(failed)return Promise.resolve(false);
    if(loading)return loading;
    const usingGithub=typeof location!=='undefined' && /(^|\.)github\.io$/.test(location.hostname);
    // Usa a transferência em partes apenas no GitHub Pages; no pacote local há o GLB direto.
    const load=usingGithub?loadRev2Parts({GLTFLoader}).catch(()=>new GLTFLoader().loadAsync(url)):
      // Também habilitar o rig original quando o clone local guarda só as partes.
      new GLTFLoader().loadAsync(url).catch(()=>loadRev2Parts({GLTFLoader}));
    loading=load.then(gltf=>{
      if(!gltf?.scene||!gltf.animations?.length)throw new Error('GLB sem malha ou animações');
      asset=gltf;
      for(const enemy of active) mount(enemy);
      return true;
    }).catch(error=>{
      failed=true;
      console.warn('Modelo do zumbi REV2 indisponível; visual simplificado temporário.',error);
      return false;
    });
    return loading;
  }

  const hasClip=name=>!!asset?.animations?.some(clip=>clip.name===name);
  const resolveClip=(...names)=>names.find(name=>name&&hasClip(name))||asset?.animations?.[0]?.name||null;
  const baseScaleFor = enemy => BASE_SCALE*(enemy.size/STANDARD_SIZE);
  const verticalOffsetFor = enemy => (-enemy.size/2) - (SOURCE_MIN_Y*baseScaleFor(enemy));

  function mount(enemy){
    if(!asset||!enemy||!isZombieType(enemy.type)||enemy.rev4Visual||enemy.hp<=0)return false;
    const model=cloneSkeleton(asset.scene);
    if(!model)return false;
    const scale=baseScaleFor(enemy);
    model.scale.setScalar(scale);
    model.position.set(0, verticalOffsetFor(enemy), 0);
    model.name='Zombie_REV2_'+enemy.type;
    // O GLB REV2 olha para +Z, assim como o mesh.lookAt() usado pela IA.
    model.rotation.y=0;
    model.traverse(node=>{
      if(!node.isMesh)return;
      node.userData.sharedZombieGeometry=true;
      node.castShadow=true;
      node.receiveShadow=false;
      node.frustumCulled=false;
    });
    const mixer=new THREE.AnimationMixer(model);
    const actions={};
    for(const clip of asset.animations)actions[clip.name]=mixer.clipAction(clip);
    const walk=resolveClip(ZOMBIE_ANIMATIONS[enemy.type],'Andar','Parado');
    const idle=resolveClip('Parado',walk);
    const hurtClip=resolveClip('Dano', 'Atacar', idle);
    const deathClip=resolveClip('Morrer','Dano', idle);
    const attackClip=resolveClip(
      enemy.type==='zombie' ? 'Morder' : null,
      enemy.type==='zombie_runner' ? 'Atacar' : null,
      enemy.type==='zombie_toxic' ? 'Agarrar' : null,
      enemy.type==='zombie_brute' ? 'Atacar' : null,
      'Atacar','Morder','Agarrar',walk,idle
    );
    const footPlant=createZombieFootPlant({THREE,model,getGroundHeight});
    const previousChildren=[...enemy.mesh.children];
    for(const child of previousChildren)child.visible=false;
    enemy.mesh.material.visible=false;
    enemy.mesh.add(model);
    const visual={model,mixer,actions,footPlant,current:null,hold:0,elapsed:0,walk,idle,attackClip,hurtClip,deathClip,
      locomotionScale:LOCOMOTION_CLIP_SCALE[enemy.type]||1,
      paceScale:1,
      action(name){return actions[name]||null;},
      setActionTimeScale(name,timeScale=1){
        const action=this.action(name);
        if(action)action.setEffectiveTimeScale(timeScale);
      },
      play(name,once=false,timeScale=1){
        const next=actions[name]||actions[idle];
        if(!next)return;
        if(!once&&this.current===name){next.setEffectiveTimeScale(timeScale);return;}
        const prev=this.current?actions[this.current]:null;
        if(prev&&prev!==next)prev.fadeOut(.13);
        next.reset().setEffectiveTimeScale(timeScale).setEffectiveWeight(1).fadeIn(.13);
        next.setLoop(once?THREE.LoopOnce:THREE.LoopRepeat,once?1:Infinity);
        next.clampWhenFinished=once;
        next.play();
        this.current=name;
      },
      attack(){this.play(this.attackClip,true,1);this.hold=this.attackClip==='Agarrar'?1.85:this.attackClip==='Morder'?1.28:1.10;},
      hurt(){if(this.hold>0)return;this.play(this.hurtClip,true,1);this.hold=.34;},
      update(dt,moving,near=true,pace=1,footIKNear=true){
        this.model.visible=!!near;
        if(!near)return;
        const step=Math.max(0,Math.min(.05,dt));
        this.hold=Math.max(0,this.hold-step);
        const wanted=moving?this.walk:this.idle;
        const locomotionPace=moving?Math.max(.82,Math.min(2.80,this.locomotionScale*Math.max(.65,Math.min(1.25,pace||1)))):1;
        if(this.hold<=0&&this.current!==wanted)this.play(wanted,false,wanted===this.walk?locomotionPace:1);
        else if(this.hold<=0&&this.current===wanted)this.setActionTimeScale(this.current,wanted===this.walk?locomotionPace:1);
        this.mixer.update(step);
        if(footIKNear && this.footPlant)this.footPlant.update({dt:step,moving,clip:this.current,action:actions[this.current]});
        else this.footPlant?.reset();
      },
      dispose(){
        this.footPlant?.reset();
        this.mixer.stopAllAction();
        this.mixer.uncacheRoot?.(this.model);
        this.model.parent?.remove(this.model);
        this.model=null;
      }
    };
    enemy.rev4Visual=visual;
    enemy.zombieVisual=visual;
    visual.play(idle);
    return true;
  }

  function attach(enemy){
    if(!enemy||!isZombieType(enemy.type))return false;
    active.add(enemy);
    if(!deferPreload&&!asset&&!failed)void preload();
    return mount(enemy);
  }
  function defeat(enemy){
    if(!enemy?.rev4Visual || corpses.has(enemy))return false;
    enemy.rev4Visual.play(enemy.rev4Visual.deathClip,true);
    corpses.set(enemy,2.20);
    return true;
  }
  function updateCorpses(dt,clearMesh){
    for(const [enemy,time] of corpses){
      enemy.rev4Visual?.mixer.update(Math.max(0,Math.min(dt,.05)));
      const remaining=time-dt;
      if(remaining>0){corpses.set(enemy,remaining);continue;}
      corpses.delete(enemy);
      dispose(enemy);
      clearMesh(enemy.mesh);
    }
  }
  function dispose(enemy){
    if(!enemy)return;
    corpses.delete(enemy);
    active.delete(enemy);
    if(enemy.rev4Visual){enemy.rev4Visual.dispose();enemy.rev4Visual=null;}
    enemy.zombieVisual=null;
  }
  return {preload,attach,defeat,updateCorpses,dispose,get loaded(){return !!asset},get failed(){return failed},get count(){return active.size}};
}
