// Adaptador REV4: o GLB original é carregado uma vez, clonado com SkeletonUtils,
// e utiliza a IA/colisões/dano do MadrugaCraft sem sobrepor controladores.
import {isZombieType,ZOMBIE_TYPES} from '../gameplay/zombie-variants.js';

export const ZOMBIE_GLB_URL='./assets/models/zumbi_geometrico_REV4.glb';
export const ZOMBIE_ANIMATIONS=Object.freeze({
  zombie:'Shuffle',zombie_runner:'Run',zombie_toxic:'LimpWalk',zombie_brute:'Walk'
});

export function createZombieModelManager({THREE,scene,GLTFLoader,cloneSkeleton,url=ZOMBIE_GLB_URL}) {
  let asset=null, loading=null, failed=false;
  const active=new Set();
  const corpses=new Map();

  function preload(){
    if(asset)return Promise.resolve(true);
    if(failed)return Promise.resolve(false);
    if(loading)return loading;
    loading=new GLTFLoader().loadAsync(url).then(gltf=>{
      if(!gltf?.scene||!gltf.animations?.length)throw new Error('GLB sem malha ou animações');
      asset=gltf;
      for(const enemy of active) mount(enemy);
      return true;
    }).catch(error=>{
      failed=true;
      console.warn('Modelo do zumbi REV4 indisponível; visual simplificado temporário.',error);
      return false;
    });
    return loading;
  }

  function mount(enemy){
    if(!asset||!enemy||!isZombieType(enemy.type)||enemy.rev4Visual||enemy.hp<=0)return false;
    const model=cloneSkeleton(asset.scene);
    if(!model)return false;
    // REV4 tem altura ~2.2m e base Y=0; collider existente usa seu centro.
    const scale=(enemy.size/.92)*.77;
    model.scale.setScalar(scale);
    model.position.set(0,-enemy.size/2,0);
    model.name='Zombie_REV4_'+enemy.type;
    // O SkinnedMesh e suas 29 partes coloridas são compartilhados em geometria
    // mas os materiais são próprios por zumbi para dar cor às variantes.
    const replacements=new Map();
    const skin=new THREE.Color(ZOMBIE_TYPES[enemy.type].skin);
    const shirt=new THREE.Color(ZOMBIE_TYPES[enemy.type].shirt);
    const eyes=new THREE.Color(ZOMBIE_TYPES[enemy.type].eyes);
    model.traverse(node=>{
      if(!node.isMesh)return;
      node.userData.sharedZombieGeometry=true;
      node.castShadow=true;
      node.receiveShadow=false;
      const recolor=(mat)=>{
        if(replacements.has(mat))return replacements.get(mat);
        const copy=mat.clone(),name=(copy.name||'').toLowerCase();
        if(name.includes('shirt')||name.includes('cloth'))copy.color.lerp(shirt,.48);
        else if(name.includes('skin'))copy.color.lerp(skin,.40);
        else if(name.includes('eye'))copy.color.lerp(eyes,.55);
        replacements.set(mat,copy);
        return copy;
      };
      node.material=Array.isArray(node.material)?node.material.map(recolor):recolor(node.material);
    });
    const mixer=new THREE.AnimationMixer(model);
    const actions={};
    for(const clip of asset.animations)actions[clip.name]=mixer.clipAction(clip);
    const previousChildren=[...enemy.mesh.children];
    for(const child of previousChildren)child.visible=false;
    enemy.mesh.material.visible=false;
    enemy.mesh.add(model);
    const visual={model,mixer,actions,current:null,hold:0,elapsed:0,walk:ZOMBIE_ANIMATIONS[enemy.type],
      play(name,once=false){
        const next=actions[name]||actions.Idle;
        if(!next||this.current===name && !once)return;
        const prev=this.current?actions[this.current]:null;
        if(prev&&prev!==next)prev.fadeOut(.13);
        next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(.13);
        next.setLoop(once?THREE.LoopOnce:THREE.LoopRepeat,once?1:Infinity);
        next.clampWhenFinished=once;
        next.play();this.current=name;
      },
      attack(){this.play(enemy.type==='zombie_runner'?'LungeAttack':enemy.type==='zombie_brute'?'Flail':'Attack',true);this.hold=.65;},
      hurt(){if(this.hold>0)return;this.play('Hurt',true);this.hold=.32;},
      update(dt,moving,near=true){
        // Esqueleto parado e invisível fora da região útil: poupa skinning e draw calls.
        this.model.visible=!!near;
        if(!near)return;
        const step=Math.max(0,Math.min(.05,dt));
        this.hold=Math.max(0,this.hold-step);
        const wanted=moving?this.walk:'Idle';
        if(this.hold<=0&&this.current!==wanted)this.play(wanted);
        this.mixer.update(step);
      },
      dispose(){this.mixer.stopAllAction();this.mixer.uncacheRoot(this.model);this.model.parent?.remove(this.model);
        const materials=new Set();this.model.traverse(o=>{if(!o.isMesh)return;
          for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)materials.add(m);
        });for(const m of materials)m.dispose();this.model=null;}
    };
    enemy.rev4Visual=visual;
    visual.play('Idle');
    return true;
  }

  function attach(enemy){
    if(!enemy||!isZombieType(enemy.type))return false;
    active.add(enemy);
    if(!asset&&!failed)void preload();
    return mount(enemy);
  }
  function defeat(enemy){
    if(!enemy?.rev4Visual || corpses.has(enemy))return false;
    enemy.rev4Visual.play('Death',true);
    corpses.set(enemy,1.90);
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
  }
  return {preload,attach,defeat,updateCorpses,dispose,get loaded(){return !!asset},get failed(){return failed},get count(){return active.size}};
}
