// LOD por impostores WebP fotograficos (8 vistas do GLB original).
// Sprites reutilizam textura/material; nao modificam colisores, saves nem RNG.
export const FOREST_WEBP_VIEWS=8;
export const FOREST_WEBP_ROOT='./assets/vegetation/billboards/';
export const FOREST_WEBP_IDS=Object.freeze(['tree1','tree2','tree3','bush']);
export function forestWebpUrl(id,view){
  if(!FOREST_WEBP_IDS.includes(id)||!Number.isInteger(view)||view<0||view>=FOREST_WEBP_VIEWS)
    throw new RangeError('Vista WebP invalida');
  return FOREST_WEBP_ROOT+id+'-'+view+'.webp';
}
export function forestWebpView(viewer,object,rotation=0){
  const angle=Math.atan2(viewer.x-object.x,viewer.z-object.z)-rotation;
  const n=Math.round(angle/(Math.PI*2)*FOREST_WEBP_VIEWS);
  return ((n%FOREST_WEBP_VIEWS)+FOREST_WEBP_VIEWS)%FOREST_WEBP_VIEWS;
}
export function createForestBillboards({THREE,scene,trees,bushPositions}){
  const supported=Boolean(THREE.Sprite&&THREE.SpriteMaterial&&THREE.TextureLoader);
  const images=new Map(FOREST_WEBP_IDS.map(id=>[id,{materials:[],ready:false,loaded:0}]));
  let loading=null;
  function prepareSprite(id,element,tree){
    const image=images.get(id);
    if(!image.ready)return null;
    if(element.sprite)return element.sprite;
    const sprite=new THREE.Sprite(image.materials[0]);
    sprite.name='webp_forest_'+id;
    sprite.visible=false;sprite.frustumCulled=true;
    const height=tree?5.5*(element.userData?.modelScale||1):1.55*element.scale;
    const pos=tree?element.position:element;
    sprite.scale.set(height*(256/384),height,1);
    if(tree){
      sprite.position.set(0,height*.5,0);
      element.add(sprite);
    }else{
      sprite.position.set(pos.x,pos.y+height*.5,pos.z);
      scene.add(sprite);
    }
    element.sprite=sprite;
    return sprite;
  }
  async function preload(){
    if(loading)return loading;
    if(!supported)return 0;
    const loader=new THREE.TextureLoader();
    loading=(async()=>{
      for(const [id,entry] of images){
        const maps=await Promise.all(Array.from({length:FOREST_WEBP_VIEWS},(_,i)=>new Promise(resolve=>{
          loader.load(forestWebpUrl(id,i),texture=>resolve(texture),undefined,()=>resolve(null));
        })));
        // Nunca selecionar uma sequencia incompleta que produziria mudancas bruscas.
        if(maps.some(m=>!m)){
          for(const texture of maps)texture?.dispose?.();
          continue;
        }
        entry.materials=maps.map(texture=>{
          if(THREE.SRGBColorSpace)texture.colorSpace=THREE.SRGBColorSpace;
          texture.generateMipmaps=true;
          if(THREE.LinearMipmapLinearFilter)texture.minFilter=THREE.LinearMipmapLinearFilter;
          texture.needsUpdate=true;
          return new THREE.SpriteMaterial({
            map:texture,color:0xffffff,transparent:true,alphaTest:.29,
            depthWrite:true,fog:true
          });
        });
        entry.ready=true;entry.loaded=FOREST_WEBP_VIEWS;
      }
      return [...images.values()].filter(entry=>entry.ready).length;
    })();
    return loading;
  }
  function update(viewer,{glbTrees=new Set(),glbBushes=new Set(),quality='medium'}={}){
    const displayedTrees=new Set(),displayedBushes=new Set();
    const farRange=quality==='low'?70:quality==='high'?108:90;
    const farSq=farRange*farRange;
    for(const tree of trees){
      const id=tree.userData?.modelVariant;
      const entry=images.get(id);
      if(!entry?.ready)continue;
      const sprite=prepareSprite(id,tree,true);
      const dx=viewer.x-tree.position.x,dz=viewer.z-tree.position.z;
      const shown=tree.visible&&!glbTrees.has(tree)&&dx*dx+dz*dz<farSq;
      sprite.visible=shown;
      if(shown){
        sprite.material=entry.materials[forestWebpView(viewer,tree.position,tree.rotation?.y||0)];
        displayedTrees.add(tree);
      }
    }
    const entry=images.get('bush');
    if(entry?.ready){
      for(const shrub of bushPositions){
        const sprite=prepareSprite('bush',shrub,false);
        const dx=viewer.x-shrub.x,dz=viewer.z-shrub.z;
        const shown=!glbBushes.has(shrub)&&dx*dx+dz*dz<farSq;
        sprite.visible=shown;
        if(shown){
          sprite.material=entry.materials[forestWebpView(viewer,shrub,shrub.rotation||0)];
          displayedBushes.add(shrub);
        }
      }
    }
    return {trees:displayedTrees,bushes:displayedBushes};
  }
  return {preload,update,
    get status(){return Object.fromEntries([...images].map(([id,x])=>[id,{ready:x.ready,views:x.loaded}]))}};
}
