import {createSpiderLegPlant} from './spider-leg-plant.js?v=2.11.0-spider';
import {getSpiderVariant} from '../gameplay/spider-variants.js?v=2.13.0';

// Aranha Sombria: modelo original do usuário, com 72 ossos e cinco clipes.
// O mesmo GLB é reutilizado por todos os inimigos; cada aranha recebe seu próprio rig e mixer.
export const SPIDER_GLB='./assets/models/aranha_sombria_animada.glb';
export const SPIDER_PARTS='./assets/models/aranha-parts/manifest.json';
export const SPIDER_CLIPS=Object.freeze(['Idle','Walk','Jump','Attack','WebShot']);
export const SPIDER_DURATIONS=Object.freeze({Idle:3,Walk:1.2,Jump:1.6,Attack:1.12,WebShot:1.45});

export function verifySpiderClips(animations){
  const names=new Set((animations||[]).map(clip=>clip.name));
  return SPIDER_CLIPS.every(name=>names.has(name));
}

export async function loadSpiderParts({GLTFLoader,fetcher=fetch,atobFn=atob,manifestUrl=SPIDER_PARTS}){
  const response=await fetcher(manifestUrl);
  if(!response.ok)throw new Error('Manifesto da aranha indisponível');
  const manifest=await response.json();
  if(!Number.isInteger(manifest.byteLength)||manifest.byteLength<100000||manifest.byteLength>25000000||
     !Array.isArray(manifest.parts)||manifest.parts.length<1||manifest.parts.length>60)
    throw new Error('Manifesto da aranha inválido');
  // Baixar até cinco partes em paralelo: evita dezenas de esperas em série no Pages.
  // Guardar a posição original para reconstruir o arquivo sem reordenar seus bytes.
  const parts=new Array(manifest.parts.length);
  let cursor=0;
  async function worker(){
    while(cursor<manifest.parts.length){
      const index=cursor++,part=manifest.parts[index];
      if(!/^part\d{2}\.b64$/.test(part))throw new Error('Parte desconhecida da aranha');
      const r=await fetcher(manifestUrl.replace(/manifest\.json$/,part));
      if(!r.ok)throw new Error('Parte faltando: '+part);
      const data=atobFn((await r.text()).replace(/\s/g,''));
      const block=new Uint8Array(data.length);
      for(let i=0;i<data.length;i++)block[i]=data.charCodeAt(i);
      parts[index]=block;
    }
  }
  await Promise.all(Array.from({length:Math.min(5,parts.length)},()=>worker()));
  const bytes=new Uint8Array(manifest.byteLength);let offset=0;
  for(const block of parts){
    if(!block||offset+block.length>bytes.length)throw new Error('Tamanho da aranha excedido');
    bytes.set(block,offset);offset+=block.length;
  }
  if(offset!==bytes.length)throw new Error('Pacote da aranha truncado');
  let glb=bytes;
  if(manifest.compression==='gzip'){
    if(typeof DecompressionStream!=='function')throw new Error('Navegador sem descompressão gzip');
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    glb=new Uint8Array(await new Response(stream).arrayBuffer());
  }else if(manifest.compression)throw new Error('Compressão de modelo desconhecida');
  if(glb.length<100000||glb.length>25000000||String.fromCharCode(...glb.subarray(0,4))!=='glTF')throw new Error('GLB de aranha truncado');
  if(globalThis.crypto?.subtle&&/^[0-9a-f]{64}$/.test(manifest.sha256||'')){
    const digest=await crypto.subtle.digest('SHA-256',glb);
    const hash=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
    if(hash!==manifest.sha256)throw new Error('Checksum da aranha não confere');
  }
  return new GLTFLoader().parseAsync(glb.buffer,'./assets/models/');
}

export function createSpiderModelManager({THREE,GLTFLoader,cloneSkeleton,getGroundHeight,url=SPIDER_GLB}){
 let asset=null,loading=null,failed=false;
 const active=new Set(),corpses=new Map();
 function preload(){
   if(asset)return Promise.resolve(true);
   if(failed)return Promise.resolve(false);
   if(loading)return loading;
   // Pages usa as mesmas partes de texto que os modelos do Madruga e do zumbi.
   const isPages=typeof location!=='undefined'&&/(^|\.)github\.io$/.test(location.hostname);
   const tryDirect=()=>new GLTFLoader().loadAsync(url);
   const load=isPages?loadSpiderParts({GLTFLoader}).catch(tryDirect):tryDirect().catch(()=>loadSpiderParts({GLTFLoader}));
   loading=load.then(gltf=>{
     if(!gltf?.scene||!verifySpiderClips(gltf.animations))throw new Error('Aranha sem rig ou cinco clipes');
     asset=gltf;for(const e of active)mount(e);return true;
   }).catch(error=>{failed=true;console.warn('Aranha Sombria indisponível; inimigo mantém forma provisória.',error);return false;});
   return loading;
 }
 function mount(enemy){
   if(!asset||!enemy||enemy.type!=='spider'||enemy.spiderVisual||enemy.hp<=0)return false;
   const model=cloneSkeleton(asset.scene);
   if(!model)return false;
   // A geometria original vai de y=0 a y=1,7. A base deve tocar o terreno.
   const profile=getSpiderVariant(enemy.spiderVariant),tintedMaterials=[];
   const scale=enemy.size/1.7;
   model.scale.setScalar(scale);model.position.y=-enemy.size/2;model.name=`Aranha_${enemy.spiderVariant||'shadow'}_Rig72`;
   model.traverse(node=>{if(node.isMesh){
     node.castShadow=true;node.receiveShadow=false;node.frustumCulled=false;node.userData.sharedZombieGeometry=true;
     // O clone do esqueleto compartilha materiais: cada espécie recebe seu próprio,
     // sem tingir também todas as outras aranhas que usam o mesmo GLB.
     const tint=material=>{if(!material)return material;const copy=material.clone();
       if(copy.color)copy.color.multiply(new THREE.Color(profile.tint));
       if(profile.glow&&copy.emissive){copy.emissive.setHex(profile.glow);copy.emissiveIntensity=Math.max(.12,copy.emissiveIntensity||0);}
       tintedMaterials.push(copy);return copy;};
     node.material=Array.isArray(node.material)?node.material.map(tint):tint(node.material);
   }});
   for(const child of enemy.mesh.children)child.visible=false;
   enemy.mesh.material.visible=false;enemy.mesh.add(model);
   const mixer=new THREE.AnimationMixer(model);const actions={};
   const footPlant=createSpiderLegPlant({THREE,model,getGroundHeight});
   for(const clip of asset.animations)actions[clip.name]=mixer.clipAction(clip);
   // Os efeitos de teia são animados pelo clipe WebShot, não por um mesh duplicado.
   const visual={model,mixer,actions,current:null,lock:0,actionTime:0,flash:0,recoil:0,dead:false,
     mixerAccumulator:0,rotationTiltX:0,rotationTiltZ:0,footPlant,
     play(name,{once=false,speed=1,blend=.17}={}){
       const next=actions[name];if(!next)return false;
       if(!once&&this.current===name){next.setEffectiveTimeScale(speed);return true;}
       const prev=this.current&&actions[this.current];
       if(prev&&prev!==next)prev.fadeOut(blend);
       next.reset().setEffectiveWeight(1).setEffectiveTimeScale(speed).fadeIn(blend);
       next.setLoop(once?THREE.LoopOnce:THREE.LoopRepeat,once?1:Infinity);
       next.clampWhenFinished=once;next.play();this.current=name;return true;
     },
     attack(kind='Attack'){
       const duration=SPIDER_DURATIONS[kind]||SPIDER_DURATIONS.Attack;
       this.play(kind,{once:true,blend:.11});this.lock=duration;this.actionTime=0;
     },
     jump(){this.play('Jump',{once:true,blend:.12});this.lock=SPIDER_DURATIONS.Jump;this.actionTime=0;},
     hurt(strength=1){
       this.flash=Math.max(this.flash,.24);
       this.recoil=Math.max(this.recoil,.07*Math.max(.6,Math.min(2.0,strength)));
     },
     interrupt(){this.lock=0;this.play('Idle',{blend:.13});},
     die(){this.lock=3;this.play('Idle',{blend:.10});this.dead=true;},
     update(dt,moving,near=true,pace=1,slope={x:0,z:0},groundIK=near){
       if(!Number.isFinite(dt)||dt<=0||!this.model)return;
       const step=Math.min(.1,dt);
       this.lock=Math.max(0,this.lock-step);this.actionTime+=step;
       if(this.dead){
         this.model.rotation.z=Math.min(1.35,this.model.rotation.z+step*2.8);
         this.model.rotation.x*=Math.exp(-8*step);
         this.model.position.y=-enemy.size/2-Math.min(.22,this.model.rotation.z*.15);
       }else{
         const wanted=moving?'Walk':'Idle';
         const cadence=Math.max(.7,Math.min(1.45,pace||1));
         if(this.lock<=0)this.play(wanted,{speed:moving?cadence:1});
         // O salto desloca o collider pela IA; não somar outra altura ao rig.
         // Recuo em golpe recebido, sem deslocar o collider nem alterar material
         // compartilhado do GLB (outras aranhas não devem piscar juntas).
         this.recoil*=Math.exp(-13*step);
         this.model.position.y=-enemy.size/2+this.recoil;
         const blend=1-Math.exp(-9*step);
         this.rotationTiltX+=(Math.max(-.23,Math.min(.23,slope.x||0))-this.rotationTiltX)*blend;
         this.rotationTiltZ+=(Math.max(-.23,Math.min(.23,slope.z||0))-this.rotationTiltZ)*blend;
         this.model.rotation.x=this.rotationTiltX;
         if(this.flash>0){
           this.flash=Math.max(0,this.flash-step);
           this.model.rotation.z=this.rotationTiltZ+Math.sin(this.flash*40)*.075;
         }else this.model.rotation.z+=(this.rotationTiltZ-this.model.rotation.z)*blend;
       }
       // Reduz trabalho com muitos ossos longe da câmera sem perder tempo do clipe.
       // O mixer distante avança em blocos, não em câmera lenta.
       this.mixerAccumulator+=step;
       const interval=near?0:.13;
       if(this.mixerAccumulator>=interval){
         const advanced=this.mixerAccumulator;
         this.mixer.update(advanced);this.mixerAccumulator=0;
         // Aplicar o CCD depois da animação e só para criaturas próximas, no chão.
         this.footPlant?.update({dt:advanced,clip:this.current,moving,near:groundIK&&!this.dead,action:actions[this.current]});
       }
     },
     dispose(){this.footPlant?.reset();this.mixer.stopAllAction();this.mixer.uncacheRoot(this.model);this.model.parent?.remove(this.model);for(const m of tintedMaterials)m.dispose();this.model=null;}
   };
   enemy.spiderVisual=visual;visual.play('Idle');return true;
 }
 function attach(e){if(!e||e.type!=='spider')return false;active.add(e);if(!asset&&!failed)void preload();return mount(e);}
 function defeat(e){if(!e?.spiderVisual||corpses.has(e))return false;e.spiderVisual.die();corpses.set(e,1.5);return true;}
 function updateCorpses(dt,removeMesh){for(const [e,t] of corpses){e.spiderVisual?.update(dt,false);if(t>dt){corpses.set(e,t-dt);continue;}corpses.delete(e);dispose(e);removeMesh(e.mesh);}}
 function dispose(e){corpses.delete(e);active.delete(e);if(e?.spiderVisual){e.spiderVisual.dispose();e.spiderVisual=null;}}
 return {preload,attach,defeat,updateCorpses,dispose,get loaded(){return !!asset},get failed(){return failed}};
}
