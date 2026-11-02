// Impostores WebP de oito ângulos: normalizados pela silhueta alfa real do GLB.
// O topo acompanha a altura do modelo 3D e o ultimo pixel visivel repousa no solo.
// Nenhum canvas ou textura nova e criado no loop; mensuracao ocorre apenas no preload.
export const FOREST_WEBP_VIEWS=8;
export const FOREST_WEBP_ROOT='./assets/vegetation/billboards/';
export const FOREST_WEBP_IDS=Object.freeze(['tree1','tree2','tree3','bush']);
const SOURCE_WIDTH=256, SOURCE_HEIGHT=384;
const MIN_ALPHA=24;
const MAX_CANVAS_PIXELS=2048*2048;

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

// Recebe limites em pixels inclusivos (eixo Y para baixo). Centro horizontal
// segue o tronco/arbusto, nao as margens transparentes de cada vista.
export function forestSpriteMetrics(imageWidth,imageHeight,bounds,targetHeight){
  const w=Number.isFinite(imageWidth)&&imageWidth>0?imageWidth:SOURCE_WIDTH;
  const h=Number.isFinite(imageHeight)&&imageHeight>0?imageHeight:SOURCE_HEIGHT;
  const size=Number.isFinite(targetHeight)&&targetHeight>0?targetHeight:1;
  const valid=bounds&&[bounds.left,bounds.top,bounds.right,bounds.bottom].every(Number.isFinite)&&
    bounds.left>=0&&bounds.top>=0&&bounds.right<w&&bounds.bottom<h&&
    bounds.right>=bounds.left&&bounds.bottom>=bounds.top;
  const b=valid?bounds:{left:0,top:0,right:w-1,bottom:h-1};
  const visibleHeight=b.bottom-b.top+1;
  // Evita amplitudes extremas caso o encoder produza apenas alguns pixels alfa.
  const covered=Math.max(.25,Math.min(1,visibleHeight/h));
  const frameHeight=size/covered;
  return {
    width:frameHeight*w/h,height:frameHeight,
    centerX:Math.max(0,Math.min(1,(b.left+b.right+1)/(2*w))),
    centerY:Math.max(0,Math.min(1,(h-b.bottom-1)/h)),
    visibleHeight:frameHeight*visibleHeight/h,
    visibleWidth:frameHeight*(b.right-b.left+1)/h
  };
}

// Lê somente o alfa da textura já baixada. Reutiliza 1 canvas no preload;
// se o navegador bloquear leitura, mantem o tamanho original com fallback.
export function measureForestAlpha(image,canvas){
  const w=image?.naturalWidth||image?.width||0;
  const h=image?.naturalHeight||image?.height||0;
  if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||
    w*h>MAX_CANVAS_PIXELS||!canvas?.getContext)return null;
  try{
    canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    if(!ctx?.drawImage||!ctx?.getImageData)return null;
    ctx.clearRect(0,0,w,h);
    ctx.drawImage(image,0,0,w,h);
    const pixels=ctx.getImageData(0,0,w,h).data;
    let left=w,top=h,right=-1,bottom=-1;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      if(pixels[(y*w+x)*4+3]<MIN_ALPHA)continue;
      if(x<left)left=x;if(x>right)right=x;
      if(y<top)top=y;if(y>bottom)bottom=y;
    }
    return right>=left?{left,top,right,bottom}:null;
  }catch(_){return null;}
}

export function createForestBillboards({THREE,scene,trees,bushPositions}){
  const supported=Boolean(THREE.Sprite&&THREE.SpriteMaterial&&THREE.TextureLoader);
  const images=new Map(FOREST_WEBP_IDS.map(id=>[id,{materials:[],metrics:[],ready:false,loaded:0}]));
  let loading=null;
  function prepareSprite(id,element,tree){
    const image=images.get(id);
    if(!image.ready)return null;
    if(element.sprite)return element.sprite;
    const sprite=new THREE.Sprite(image.materials[0]);
    sprite.name='webp_forest_'+id;
    sprite.visible=false;sprite.frustumCulled=true;
    if(tree)element.add(sprite);else scene.add(sprite);
    element.sprite=sprite;
    element.forestWebpView=-1;
    return sprite;
  }
  function applyView(element,entry,index,tree){
    if(element.forestWebpView===index)return;
    const sprite=element.sprite;
    const targetHeight=tree?5.5*(element.userData?.modelScale||1):
      1.55*element.scale;
    const picture=entry.metrics[index];
    const m=forestSpriteMetrics(picture?.width,picture?.height,picture?.bounds,targetHeight);
    sprite.material=entry.materials[index];
    sprite.scale.set(m.width,m.height,1);
    if(sprite.center?.set){
      sprite.center.set(m.centerX,m.centerY);
      if(tree)sprite.position.set(0,0,0);
      else sprite.position.set(element.x,element.y,element.z);
    }else{
      // Compatibilidade com renderers/objetos de teste sem Sprite.center.
      const y=m.height*(.5-m.centerY);
      if(tree)sprite.position.set(0,y,0);
      else sprite.position.set(element.x,element.y+y,element.z);
    }
    element.forestWebpView=index;
  }
  async function preload(){
    if(loading)return loading;
    if(!supported)return 0;
    const loader=new THREE.TextureLoader();
    const canvas=typeof document!=='undefined'&&document.createElement?
      document.createElement('canvas'):null;
    loading=(async()=>{
      for(const [id,entry] of images){
        const maps=await Promise.all(Array.from({length:FOREST_WEBP_VIEWS},(_,i)=>new Promise(resolve=>{
          loader.load(forestWebpUrl(id,i),texture=>resolve(texture),undefined,()=>resolve(null));
        })));
        if(maps.some(m=>!m)){
          for(const texture of maps)texture?.dispose?.();
          continue;
        }
        entry.metrics=maps.map(texture=>{
          const image=texture.image;
          return {width:image?.naturalWidth||image?.width||SOURCE_WIDTH,
            height:image?.naturalHeight||image?.height||SOURCE_HEIGHT,
            bounds:measureForestAlpha(image,canvas)};
        });
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
      // Canvas temporario liberado depois da leitura; nenhum getImageData no RAF.
      if(canvas){canvas.width=0;canvas.height=0;}
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
        applyView(tree,entry,forestWebpView(viewer,tree.position,tree.rotation?.y||0),true);
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
          applyView(shrub,entry,forestWebpView(viewer,shrub,shrub.rotation||0),false);
          displayedBushes.add(shrub);
        }
      }
    }
    return {trees:displayedTrees,bushes:displayedBushes};
  }
  return {preload,update,
    get status(){return Object.fromEntries([...images].map(([id,x])=>[id,{ready:x.ready,views:x.loaded}]))}};
}
