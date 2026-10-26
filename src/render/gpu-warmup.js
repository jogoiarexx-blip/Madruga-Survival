// Preparação gráfica não bloqueante para Three.js r160.
// Não cria contexto WebGL, chama render() ou agenda qualquer tarefa no menu.
const MAP_KEYS=['map','normalMap','roughnessMap','metalnessMap','emissiveMap','aoMap',
  'alphaMap','bumpMap','displacementMap','lightMap','envMap','specularMap'];
export function collectTextures(root){
  const textures=new Set();
  root?.traverse?.(node=>{
    if(!node.isMesh&&!node.isPoints&&!node.isLine)return;
    for(const material of (Array.isArray(node.material)?node.material:[node.material])){
      if(!material)continue;
      for(const key of MAP_KEYS){const tex=material[key];if(tex?.isTexture)textures.add(tex);}
    }
  });
  return [...textures];
}
export function createGpuWarmup({getRenderer,getScene,getCamera,isActive=()=>true,
  nextFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve)),onProgress=()=>{}}){
  const prepared=new WeakSet(),pending=new WeakMap(),uploaded=new WeakSet();
  async function prepare(root,label='Cena'){
    if(!root||!isActive())return false;
    if(prepared.has(root))return true;
    if(pending.has(root))return pending.get(root);
    const task=(async()=>{
      const renderer=getRenderer(),scene=getScene(),camera=getCamera();
      if(!renderer||!scene||!camera)return false;
      try{
        onProgress({label,phase:'shaders'});
        // Fallback síncrono deliberadamente omitido: pode travar o primeiro frame
        // por um longo período em GPUs sem compilação paralela.
        if(typeof renderer.compileAsync==='function'){
          if(root===scene)await renderer.compileAsync(scene,camera);
          else await renderer.compileAsync(root,camera,scene);
        }
        const textures=collectTextures(root);
        for(let i=0;i<textures.length;i++){
          if(!isActive())return false;
          const texture=textures[i];
          if(uploaded.has(texture))continue;
          // No máximo uma nova textura por frame, evitando um pico de upload.
          await nextFrame();
          if(!isActive())return false;
          if(typeof renderer.initTexture==='function')renderer.initTexture(texture);
          uploaded.add(texture);
          onProgress({label,phase:'textures',done:i+1,total:textures.length});
        }
        prepared.add(root);
        onProgress({label,phase:'ready'});
        return true;
      }catch(error){
        console.warn('[GPU warmup] Preparação opcional falhou:',label,error);
        onProgress({label,phase:'failed'});
        return false;
      }
    })();
    pending.set(root,task);
    try{return await task;}finally{pending.delete(root);}
  }
  return {prepare};
}
