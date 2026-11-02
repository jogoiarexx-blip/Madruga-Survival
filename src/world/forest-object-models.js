import {createForestBillboards} from './forest-billboards.js?v=2.57.1-webp-scale';
// Vegetacao GLB importada: cada malha do modelo vira um InstancedMesh para
// todas as copias da mesma especie. O LOD geometrico original continua disponivel
// para longe, falha de rede e maquinas fracas. Nao altera obstaculos/saves.
export const FOREST_OBJECT_MODELS=Object.freeze([
  Object.freeze({id:'tree1',url:'./assets/models/Objetos/arvore%201.glb',height:5.5}),
  Object.freeze({id:'tree2',url:'./assets/models/Objetos/arvore%202.glb',height:5.5}),
  Object.freeze({id:'tree3',url:'./assets/models/Objetos/arvore%203.glb',height:5.5}),
  Object.freeze({id:'bush',url:'./assets/models/Objetos/arbusto%201.glb',height:1.55})
]);
export function forestTreeVariant(x,z){
  // Nao consome a sequencia RNG do mapa, preservando os locais de saves antigos.
  const a=Math.round(x*100),b=Math.round(z*100);
  return ((Math.imul(a,73856093)^Math.imul(b,19349663))>>>0)%3;
}
export function forestObjectRange(quality,type){
  if(type==='bush')return quality==='low'?10:quality==='high'?20:15;
  return quality==='low'?17:quality==='high'?26:22;
}
// Limites por especie evitam extrapolar o orcamento de triangulos em aparelhos fracos.
export function forestGlbInRange(distanceSq,range,wasGlb=false){
  if(!Number.isFinite(distanceSq)||distanceSq<0)return false;
  const limit=Math.max(0,range+(wasGlb?1.5:-1.5));
  return distanceSq<=limit*limit;
}
export function forestObjectCap(quality,id){
  const cap={
    low:{tree1:1,tree2:3,tree3:1,bush:1},
    medium:{tree1:4,tree2:8,tree3:4,bush:4},
    high:{tree1:9,tree2:14,tree3:9,bush:8}
  };
  return (cap[quality]||cap.medium)[id]||0;
}
export function createForestObjectModels({THREE,GLTFLoader,scene,trees,bushPositions,bushFallback,
  onStatus=()=>{}}){
  const sources=new Map(FOREST_OBJECT_MODELS.map(s=>[s.id,{spec:s,batches:[],loaded:false,error:null,loading:false,failed:false}]));
  const billboards=createForestBillboards({THREE,scene,trees,bushPositions});
  let pending=null;
  let billboardsRequested=false;
  let syncElapsed=Infinity;
  let lastGlbTrees=new Set(),lastGlbBushes=new Set();
  const dummy=new THREE.Object3D();
  function hideProceduralTree(tree,hide){
    const lod=tree.userData?.lod;
    if(!lod)return;
    if(lod.trunk)lod.trunk.visible=!hide;
    for(const child of lod.detailedLeaves)child.visible=!hide&&!lod.far;
    if(lod.distant)lod.distant.visible=!hide&&lod.far;
  }
  function loadOne(source){
    return new Promise(resolve=>{
      if(!GLTFLoader){source.error='GLTFLoader indisponivel';resolve(false);return;}
      new GLTFLoader().load(source.spec.url,gltf=>{
        try{
          const root=gltf.scene;
          root.updateMatrixWorld(true);
          const bounds=new THREE.Box3().setFromObject(root);
          const height=bounds.max.y-bounds.min.y;
          if(!(height>.001&&Number.isFinite(height)))throw Error('GLB sem dimensoes validas');
          const factor=source.spec.height/height;
          const midX=(bounds.min.x+bounds.max.x)*.5,midZ=(bounds.min.z+bounds.max.z)*.5;
          const normalize=new THREE.Matrix4()
            .makeScale(factor,factor,factor)
            .multiply(new THREE.Matrix4().makeTranslation(-midX,-bounds.min.y,-midZ));
          const objects=[];
          root.traverse(node=>{
            if(node.isSkinnedMesh)throw Error('Vegetacao precisa de geometria estatica');
            if(node.isMesh && node.geometry){
              // Preserva UV, textura/material e transformacoes internas do GLB.
              const geometry=node.geometry.clone();
              geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(normalize,node.matrixWorld));
              objects.push({geometry,material:node.material});
            }
          });
          if(!objects.length)throw Error('GLB sem malhas renderizaveis');
          const capacity=source.spec.id==='bush'?bushPositions.length:
            trees.filter(t=>t.userData.modelVariant===source.spec.id).length;
          if(!capacity){source.loaded=true;resolve(true);return;}
          for(const object of objects){
            const batch=new THREE.InstancedMesh(object.geometry,object.material,capacity);
            batch.name='forest_object_'+source.spec.id;
            batch.count=0;
            batch.frustumCulled=false; // apenas instancias no raio de LOD sao enviadas.
            batch.castShadow=false;batch.receiveShadow=false;
            batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            scene.add(batch);source.batches.push(batch);
          }
          source.loaded=true;
          onStatus(source.spec.id,'ready',objects.length);
          resolve(true);
        }catch(error){
          source.error=String(error);onStatus(source.spec.id,'fallback',0);
          console.warn('[Forest GLB] Fallback procedural',source.spec.url,error);
          resolve(false);
        }
      },undefined,error=>{
        source.error=String(error);
        console.warn('[Forest GLB] Download indisponivel',source.spec.url,error);
        onStatus(source.spec.id,'fallback',0);resolve(false);
      });
    });
  }
  async function preload(){
    if(pending)return pending;
    pending=(async()=>{
      // Sequencial para nao fazer quatro decodificacoes pesadas juntas.
      for(const source of sources.values())await loadOne(source);
      syncElapsed=Infinity;
      return [...sources.values()].filter(s=>s.loaded).length;
    })();
    return pending;
  }
  // O WebP eh pequeno: carregamos primeiro. Os quatro GLBs de ~30 MiB sao
  // baixados somente quando o jogador entra no raio detalhado.
  function maybeLoadRealModel(position,quality){
    if(!billboardsRequested)return;
    if(!GLTFLoader||[...sources.values()].some(s=>s.loading))return;
    for(const source of sources.values()){
      if(source.loaded||source.failed||source.loading)continue;
      const radius=forestObjectRange(quality,source.spec.id)+7;
      const radiusSq=radius*radius;
      const entries=source.spec.id==='bush'?bushPositions:
        trees.filter(t=>t.userData.modelVariant===source.spec.id);
      const nearby=entries.some(item=>{
        const x=item.position?.x??item.x,z=item.position?.z??item.z;
        return (x-position.x)**2+(z-position.z)**2<radiusSq;
      });
      if(!nearby)continue;
      source.loading=true;
      void loadOne(source).then(ok=>{source.loading=false;source.failed=!ok;})
        .catch(error=>{source.loading=false;source.failed=true;console.warn('[Floresta]',error);});
      break; // decodifica so um GLB por vez
    }
  }
  function update(position,quality='medium',dt=0,force=false,viewer=position){
    syncElapsed+=Math.max(0,dt);
    if(!force&&syncElapsed<.2)return false;
    syncElapsed=0;
    maybeLoadRealModel(position,quality);
    const chosenTrees=new Set(),chosenBushes=new Set();
    for(const source of sources.values()){
      if(!source.loaded||!source.batches.length)continue;
      const nearRange=forestObjectRange(quality,source.spec.id);
      // Histerese de 1,5 m evita trocar WebP/GLB repetidamente na borda do LOD.
      const cap=forestObjectCap(quality,source.spec.id);
      let count=0;
      if(source.spec.id==='bush'){
        const nearest=bushPositions.map(shrub=>({
          shrub,d2:(shrub.x-position.x)**2+(shrub.z-position.z)**2
        })).filter(record=>forestGlbInRange(record.d2,nearRange,lastGlbBushes.has(record.shrub)))
          .sort((a,b)=>a.d2-b.d2).slice(0,cap);
        for(const {shrub} of nearest){
          chosenBushes.add(shrub);
          dummy.position.set(shrub.x,shrub.y,shrub.z);
          dummy.rotation.set(0,shrub.rotation,0);
          dummy.scale.setScalar(shrub.scale);
          dummy.updateMatrix();
          for(const batch of source.batches)batch.setMatrixAt(count,dummy.matrix);
          count++;
        }
      }else{
        const nearest=trees.filter(tree=>{
          if(tree.userData.modelVariant!==source.spec.id||!tree.visible)return false;
          const d2=(tree.position.x-position.x)**2+(tree.position.z-position.z)**2;
          return forestGlbInRange(d2,nearRange,lastGlbTrees.has(tree));
        }).sort((a,b)=>
          ((a.position.x-position.x)**2+(a.position.z-position.z)**2)-
          ((b.position.x-position.x)**2+(b.position.z-position.z)**2)).slice(0,cap);
        for(const tree of nearest){
          chosenTrees.add(tree);
          dummy.position.copy(tree.position);
          dummy.rotation.set(0,tree.rotation.y,0);
          dummy.scale.setScalar(tree.userData.modelScale||1);
          dummy.updateMatrix();
          for(const batch of source.batches)batch.setMatrixAt(count,dummy.matrix);
          count++;
        }
      }
      for(const batch of source.batches){
        batch.count=count;
        if(count)batch.instanceMatrix.needsUpdate=true;
        batch.castShadow=quality==='high'&&source.spec.id!=='bush';
      }
    }
    lastGlbTrees=chosenTrees;lastGlbBushes=chosenBushes;
    const images=billboards.update(viewer,{glbTrees:chosenTrees,glbBushes:chosenBushes,quality});
    for(const tree of trees)hideProceduralTree(tree,
      chosenTrees.has(tree)||images.trees.has(tree));
    // Só os arbustos sem GLB e sem WebP usam a geometria antiga.
    for(const batch of bushFallback){
      let fallbackCount=0;
      for(const shrub of bushPositions){
        if(shrub.materialIndex!==batch.userData?.forestBushMaterial||
          chosenBushes.has(shrub)||images.bushes.has(shrub))continue;
        batch.setMatrixAt(fallbackCount++,shrub.originalMatrix);
      }
      batch.count=fallbackCount;
      batch.visible=fallbackCount>0;
      if(fallbackCount)batch.instanceMatrix.needsUpdate=true;
    }
    return true;
  }
  async function preloadBillboards(){billboardsRequested=true;return billboards.preload();}
  return {preload,preloadBillboards,update,
    get billboardStatus(){return billboards.status;},
    get stats(){return Object.fromEntries([...sources].map(([id,s])=>[id,{
      loaded:s.loaded,error:s.error,drawCalls:s.batches.length,
      instances:s.batches[0]?.count||0}]))}};
}
