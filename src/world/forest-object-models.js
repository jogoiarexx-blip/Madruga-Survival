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
  if(type==='bush')return quality==='low'?23:quality==='high'?48:36;
  return quality==='low'?25:quality==='high'?40:34;
}
export function createForestObjectModels({THREE,GLTFLoader,scene,trees,bushPositions,bushFallback,
  onStatus=()=>{}}){
  const sources=new Map(FOREST_OBJECT_MODELS.map(s=>[s.id,{spec:s,batches:[],loaded:false,error:null}]));
  let pending=null;
  let syncElapsed=Infinity;
  const dummy=new THREE.Object3D();
  function hideProceduralTree(tree,hide){
    const lod=tree.userData?.lod;
    if(!lod)return;
    if(lod.trunk)lod.trunk.visible=!hide;
    for(const child of lod.detailedLeaves)child.visible=!hide;
    // A copa distante fica sob responsabilidade do culling legado.
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
  function update(position,quality='medium',dt=0,force=false){
    syncElapsed+=Math.max(0,dt);
    if(!force&&syncElapsed<.2)return false;
    syncElapsed=0;
    for(const source of sources.values()){
      if(!source.loaded||!source.batches.length)continue;
      const nearRange=forestObjectRange(quality,source.spec.id);
      const rangeSq=nearRange*nearRange;
      let count=0;
      if(source.spec.id==='bush'){
        for(const shrub of bushPositions){
          const dx=shrub.x-position.x,dz=shrub.z-position.z;
          if(dx*dx+dz*dz>rangeSq)continue;
          dummy.position.set(shrub.x,shrub.y,shrub.z);
          dummy.rotation.set(0,shrub.rotation,0);
          dummy.scale.setScalar(shrub.scale);
          dummy.updateMatrix();
          for(const batch of source.batches)batch.setMatrixAt(count,dummy.matrix);
          count++;
        }
        // LOD de arbusto: so renderiza GLB na proximidade; nunca duplica o modelo antigo.
        for(const batch of bushFallback)batch.visible=false;
      }else{
        for(const tree of trees){
          if(tree.userData.modelVariant!==source.spec.id)continue;
          const dx=tree.position.x-position.x,dz=tree.position.z-position.z;
          const d2=dx*dx+dz*dz;
          const near=tree.visible&&d2<=rangeSq&&d2<=35*35;
          // Proximo = GLB real; distante = cone de LOD ja existente.
          hideProceduralTree(tree,near);
          if(!near)continue;
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
    return true;
  }
  return {preload,update,
    get stats(){return Object.fromEntries([...sources].map(([id,s])=>[id,{
      loaded:s.loaded,error:s.error,drawCalls:s.batches.length,
      instances:s.batches[0]?.count||0}]))}};
}
