// Cache persistente de GLBs já reconstruídos. Nunca armazena saves nem dados de jogo.
// CacheStorage é opcional: no modo privado/quota cheia faz download normalmente.
const CACHE_NAME='madruga-models-sha-v1';
const VALID_SHA=/^[a-f0-9]{64}$/;
const GLB_MAGIC=[103,108,84,70];
export function isGlb(bytes){
  return bytes?.byteLength>=12&&GLB_MAGIC.every((value,index)=>bytes[index]===value);
}
export function modelCacheKey(kind,manifest,expectedLength){
  const sha=manifest?.sha256;
  if(!/^[a-z0-9-]{2,30}$/.test(kind)||!VALID_SHA.test(sha||'')||
     !Number.isInteger(expectedLength)||expectedLength<12||expectedLength>30000000)return null;
  return new URL('../.madruga-model-cache/'+kind+'-'+sha+'-'+expectedLength+'.bin',import.meta.url).href;
}
function asBytes(bytes){
  if(bytes instanceof Uint8Array)return bytes;
  if(bytes instanceof ArrayBuffer)return new Uint8Array(bytes);
  return null;
}
async function digestValid(bytes,sha){
  if(!globalThis.crypto?.subtle)return true; // conteúdo só entra depois do checksum da origem.
  const hash=await globalThis.crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('')===sha;
}
export async function readModelCache(kind,manifest,expectedLength,{cacheStorage=globalThis.caches,
  validate=()=>true}={}){
  const key=modelCacheKey(kind,manifest,expectedLength);
  if(!key||!cacheStorage?.open)return null;
  try{
    const cache=await cacheStorage.open(CACHE_NAME);
    const hit=await cache.match(key);
    if(!hit)return null;
    const bytes=new Uint8Array(await hit.arrayBuffer());
    if(bytes.byteLength===expectedLength&&validate(bytes)&&await digestValid(bytes,manifest.sha256))return bytes;
    await cache.delete(key);
  }catch(error){console.warn('[ModelCache] leitura indisponível, baixando novamente:',error?.message||error);}
  return null;
}
export async function writeModelCache(kind,manifest,bytes,{cacheStorage=globalThis.caches}={}){
  const data=asBytes(bytes);
  const key=modelCacheKey(kind,manifest,data?.byteLength);
  if(!key||!cacheStorage?.open)return false;
  try{
    // Nunca persistir bytes que não correspondem ao SHA declarado.
    if(!await digestValid(data,manifest.sha256))return false;
    const cache=await cacheStorage.open(CACHE_NAME);
    await cache.put(key,new Response(data,{headers:{'Content-Type':'application/octet-stream'}}));
    // Após gravar versão nova de um modelo, liberar o armazenamento da anterior.
    const entries=await cache.keys();
    for(const entry of entries){
      if(entry.url!==key&&entry.url.includes('/.madruga-model-cache/'+kind+'-'))await cache.delete(entry);
    }
    return true;
  }catch(error){console.warn('[ModelCache] gravação ignorada:',error?.message||error);return false;}
}
