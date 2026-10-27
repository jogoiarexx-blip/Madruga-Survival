import {isGlb,readModelCache,writeModelCache} from '../render/model-binary-cache.js';
export const CHAVES_URL='./assets/models/Chaves_Rig_Revisado.glb';
export const CHAVES_PARTS_MANIFEST='./assets/models/chaves-parts/manifest.json';
export async function loadChaves({GLTFLoader,fetcher=fetch,onProgress=()=>{},cache=true}={}){
  // GitHub Pages: GLB publicado em fragmentos gzip; ZIP offline: GLB original.
  const github=typeof location!=='undefined'&&/(^|\.)github\.io$/.test(location.hostname);
  if(!github){
    try{return await new GLTFLoader().loadAsync(CHAVES_URL);}catch(error){console.warn('[Chaves] GLB local não disponível:',error);}
  }
  const response=await fetcher(CHAVES_PARTS_MANIFEST);
  if(!response.ok)throw Error('Chaves: manifesto indisponível HTTP '+response.status);
  const manifest=await response.json();
  if(!Number.isInteger(manifest.byteLength)||manifest.byteLength<10000||manifest.byteLength>30000000||
    !Number.isInteger(manifest.compressedByteLength)||manifest.compressedByteLength<1000||
    !Array.isArray(manifest.parts)||!manifest.parts.length||manifest.parts.length>40||
    !/^[0-9a-f]{64}$/.test(manifest.sha256||''))throw Error('Chaves: manifesto inválido');
  if(cache){
    const hit=await readModelCache('chaves',manifest,manifest.byteLength,{validate:isGlb});
    if(hit){onProgress(manifest.parts.length,manifest.parts.length);return new GLTFLoader().parseAsync(hit.buffer,'./assets/models/');}
  }
  const decoded=new Array(manifest.parts.length);let next=0,done=0;
  async function worker(){
    while(next<decoded.length){
      const index=next++,name=manifest.parts[index];
      if(!/^part\d{2}\.b64$/.test(name))throw Error('Chaves: parte inválida');
      let error;
      for(let tries=0;tries<3;tries++){
        try{
          const part=await fetcher(CHAVES_PARTS_MANIFEST.replace('manifest.json',name));
          if(!part.ok)throw Error('HTTP '+part.status);
          const b64=(await part.text()).replace(/\s/g,'');
          const raw=atob(b64),bytes=new Uint8Array(raw.length);
          for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
          decoded[index]=bytes;error=null;break;
        }catch(e){error=e;}
      }
      if(error)throw error;
      onProgress(++done,decoded.length);
    }
  }
  await Promise.all(Array.from({length:Math.min(4,decoded.length)},worker));
  const packed=new Uint8Array(manifest.compressedByteLength);let offset=0;
  for(const part of decoded){if(offset+part.byteLength>packed.length)throw Error('Chaves: gzip excedeu tamanho');packed.set(part,offset);offset+=part.byteLength;}
  if(offset!==packed.length)throw Error('Chaves: partes incompletas');
  if(typeof DecompressionStream!=='function')throw Error('Navegador precisa suportar DecompressionStream gzip');
  const buffer=await new Response(new Blob([packed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  const bytes=new Uint8Array(buffer);
  if(bytes.length!==manifest.byteLength||!isGlb(bytes))throw Error('Chaves: GLB inválido');
  if(globalThis.crypto?.subtle){
    const hash=await globalThis.crypto.subtle.digest('SHA-256',buffer);
    const hex=[...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');
    if(hex!==manifest.sha256)throw Error('Chaves: SHA-256 não confere');
  }
  if(cache)await writeModelCache('chaves',manifest,bytes);
  return new GLTFLoader().parseAsync(buffer,'./assets/models/');
}
