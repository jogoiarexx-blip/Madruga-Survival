// Goblin REV2: visual animado do inimigo interno 'normal'. Mantém save, drop,
// collider e tipo antigo; substitui somente a representação simplificada.
import {createGoblinFootPlant} from './goblin-foot-plant.js';
import {GOBLIN_MOVES} from '../gameplay/goblin-combat.js';

export const GOBLIN_GLB_URL='./assets/models/goblin_animado.glb';
export const GOBLIN_PARTS_MANIFEST='./assets/models/goblin-parts/manifest.json';
// GitHub Pages usa gzip em partes; os ZIPs locais continuam contendo o GLB completo.
// A transferência paralela é limitada para preservar memória de aparelhos móveis.
export async function loadGoblinParts({GLTFLoader,fetcher=fetch,atobFn=atob,
  manifestUrl=GOBLIN_PARTS_MANIFEST,decompress=async compressed=>{
    if(typeof DecompressionStream!=='function')throw Error('gzip não suportado neste navegador');
    return new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  }}={}){
  const res=await fetcher(manifestUrl);
  if(!res.ok)throw Error('Manifesto do goblin não encontrado');
  const manifest=await res.json();
  if(!Number.isInteger(manifest.byteLength)||manifest.byteLength<1000||manifest.byteLength>25000000||
    !Number.isInteger(manifest.glbByteLength)||manifest.glbByteLength<1000000||manifest.glbByteLength>30000000||
    !Array.isArray(manifest.parts)||manifest.parts.length<1||manifest.parts.length>100||
    manifest.encoding!=='gzip+b64')throw Error('Manifesto do goblin inválido');
  if(manifest.parts.some(name=>!/^part\d{3}\.b64$/.test(name))||new Set(manifest.parts).size!==manifest.parts.length)
    throw Error('Partes do goblin inválidas');
  const compressed=new Uint8Array(manifest.byteLength);
  let cursor=0;
  // 4 downloads por vez; os dados retornam em ordem para reconstrução exata.
  for(let start=0;start<manifest.parts.length;start+=4){
    const entries=await Promise.all(manifest.parts.slice(start,start+4).map(async name=>{
      const p=await fetcher(manifestUrl.replace(/manifest\.json$/,name));
      if(!p.ok)throw Error('Parte do goblin não encontrada: '+name);
      return atobFn((await p.text()).replace(/\s+/g,''));
    }));
    for(const bytes of entries){
      if(cursor+bytes.length>compressed.length)throw Error('Parte do goblin excede o tamanho declarado');
      for(let k=0;k<bytes.length;k++)compressed[cursor++]=bytes.charCodeAt(k);
    }
  }
  if(cursor!==compressed.length)throw Error('Goblin incompleto');
  if(typeof crypto!=='undefined'&&crypto.subtle&&/^[0-9a-f]{64}$/.test(manifest.sha256||'')){
    const digest=await crypto.subtle.digest('SHA-256',compressed);
    const actual=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
    if(actual!==manifest.sha256)throw Error('Checksum do goblin inválido');
  }
  const bytes=await decompress(compressed);
  const glb=bytes instanceof ArrayBuffer?bytes:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
  if(glb.byteLength!==manifest.glbByteLength||new Uint8Array(glb,0,4).some((b,i)=>b!==[103,108,84,70][i]))
    throw Error('GLB do goblin reconstruído incorretamente');
  return new GLTFLoader().parseAsync(glb,'./assets/models/');
}
export const GOBLIN_HEIGHT=1.6;
export const GOBLIN_SOURCE_HEIGHT=1.7;

export function createGoblinModelManager({THREE,GLTFLoader,cloneSkeleton,url=GOBLIN_GLB_URL,
  deferPreload=true,getGroundHeight=()=>0,onBeforeMount=async()=>{}}){
  let asset=null,loading=null,failed=false;
  const active=new Set(),corpses=new Map();
  function preload(){
    if(asset)return Promise.resolve(true);
    if(failed)return Promise.resolve(false);
    if(loading)return loading;
    const github=typeof location!=='undefined'&&/(^|\.)github\.io$/.test(location.hostname);
    const load=github?loadGoblinParts({GLTFLoader}).catch(()=>new GLTFLoader().loadAsync(url)):
      new GLTFLoader().loadAsync(url).catch(()=>loadGoblinParts({GLTFLoader}));
    loading=load.then(async gltf=>{
      const clips=new Set(gltf.animations?.map(c=>c.name));
      for(const name of ['Walking','Running','Idle','Attack_Quick','Attack_Heavy','Attack_Combo','Hurt','Death_Quick'])
        if(!clips.has(name))throw new Error(`Animação goblin ausente: ${name}`);
      if(!gltf.scene)throw new Error('Modelo goblin ausente');
      try{await onBeforeMount(gltf.scene,'Goblin');}catch(err){console.warn('Pré-aquecimento do goblin ignorado:',err);}
      asset=gltf;
      for(const enemy of active)mount(enemy);
      return true;
    }).catch(error=>{
      failed=true;
      console.warn('Goblin GLB indisponível: mantendo o visual procedural verde.',error);
      return false;
    });
    return loading;
  }
  function mount(enemy){
    if(!asset||!enemy||enemy.type!=='normal'||enemy.hp<=0||enemy.goblinVisual)return false;
    const model=cloneSkeleton(asset.scene);
    if(!model)return false;
    const scale=GOBLIN_HEIGHT/GOBLIN_SOURCE_HEIGHT;
    model.scale.setScalar(scale);
    // Malha original vai de Y=0 a Y=1.70. A base do collider fica no solo.
    model.position.set(0,-enemy.size/2,0);
    model.rotation.y=0;model.name='Goblin_Animated';
    model.traverse(node=>{
      if(!node.isMesh)return;
      node.castShadow=true;node.receiveShadow=false;node.frustumCulled=false;
      node.userData.sharedGoblinGeometry=true;
      node.userData.sharedGoblinMaterial=true;
    });
    for(const child of enemy.mesh.children)child.visible=false;
    enemy.mesh.material.visible=false;
    enemy.mesh.add(model);
    const mixer=new THREE.AnimationMixer(model);
    const actions={};for(const clip of asset.animations)actions[clip.name]=mixer.clipAction(clip);
    const footPlant=createGoblinFootPlant({THREE,model,getGroundHeight});
    const visual={model,mixer,actions,footPlant,current:null,hold:0,time:0,accumulator:0,dead:false,
      play(name,{once=false,fade=.15,speed=1}={}){
        const action=actions[name]||actions.Idle;
        if(!action)return;
        if(!once&&this.current===name){action.setEffectiveTimeScale(speed);return;}
        const previous=this.current?actions[this.current]:null;
        if(previous&&previous!==action)previous.fadeOut(fade);
        action.reset().setEffectiveWeight(1).setEffectiveTimeScale(speed).fadeIn(fade);
        action.setLoop(once?THREE.LoopOnce:THREE.LoopRepeat,once?1:Infinity);
        action.clampWhenFinished=once;
        action.play();this.current=name;
      },
      attack(move){
        const clip={quick:'Attack_Quick',heavy:'Attack_Heavy',combo:'Attack_Combo'}[move]||'Attack_Quick';
        this.play(clip,{once:true,fade:.08});
        this.hold=(GOBLIN_MOVES[move]?.duration||.91)+.04;
        this.footPlant?.reset();
      },
      hurt(){
        if(this.dead||this.hold>.12)return;
        this.play('Hurt',{once:true,fade:.09});this.hold=.48;this.footPlant?.reset();
      },
      die(){
        this.dead=true;this.hold=2;
        this.play('Death_Quick',{once:true,fade:.10});this.footPlant?.reset();
      },
      update(dt,moving,near=true,pace=1,footIKNear=true){
        if(!this.model)return;
        const step=Math.max(0,Math.min(.08,dt));this.time+=step;
        if(!this.dead)this.hold=Math.max(0,this.hold-step);
        const wanted=moving?(pace>1.08?'Running':'Walking'):(footIKNear?'Idle_Alert':'Idle');
        if(!this.dead&&this.hold===0){
          const speed=moving?(wanted==='Running'?1.12:Math.max(.8,Math.min(1.8,1.3*pace))):1;
          this.play(wanted,{speed});
        }
        // Atualização afastada em lotes; não alonga o tempo das animações.
        this.accumulator+=step;
        if(near||this.accumulator>=.12){
          this.mixer.update(this.accumulator);this.accumulator=0;
          if(near&&footIKNear&&this.footPlant){
            this.footPlant.update({dt:step,moving,clip:this.current,action:actions[this.current]});
          }else this.footPlant?.reset();
        }
      },
      dispose(){
        this.footPlant?.reset();this.mixer.stopAllAction();this.mixer.uncacheRoot?.(this.model);
        this.model?.parent?.remove(this.model);this.model=null;
      }
    };
    enemy.goblinVisual=visual;visual.play('Idle');
    return true;
  }
  function attach(enemy){
    if(!enemy||enemy.type!=='normal')return false;
    active.add(enemy);
    if(!deferPreload&&!asset&&!failed)void preload();
    return mount(enemy);
  }
  function defeat(enemy){
    if(!enemy?.goblinVisual||corpses.has(enemy))return false;
    enemy.goblinAttack=null;enemy.goblinVisual.die();corpses.set(enemy,1.72);
    return true;
  }
  function updateCorpses(dt,clearMesh){
    for(const [enemy,left] of corpses){
      enemy.goblinVisual?.update(dt,false,true);
      if(left>dt){corpses.set(enemy,left-dt);continue;}
      corpses.delete(enemy);dispose(enemy);clearMesh(enemy.mesh);
    }
  }
  function dispose(enemy){
    if(!enemy)return;
    corpses.delete(enemy);active.delete(enemy);
    if(enemy.goblinVisual){enemy.goblinVisual.dispose();enemy.goblinVisual=null;}
  }
  return {preload,attach,defeat,updateCorpses,dispose,
    get loaded(){return !!asset},get failed(){return failed},get count(){return active.size}};
}
