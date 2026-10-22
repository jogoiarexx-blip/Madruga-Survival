import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadRev2Parts,ZOMBIE_PARTS_MANIFEST} from '../src/characters/zombie-models.js';
const root=new URL('../assets/models/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('rev2-parts/manifest.json',root),'utf8'));
const direct=readFileSync(new URL('zumbi_animado_REV2.glb',root));
assert.equal(manifest.parts.length,17);
assert.equal(manifest.byteLength,direct.length);
const fetcher=async url=>{
 const key=url.split('/').at(-1);
 const raw=key==='manifest.json'?JSON.stringify(manifest):readFileSync(new URL('rev2-parts/'+key,root),'utf8');
 return {ok:true,json:async()=>JSON.parse(raw),text:async()=>raw};
};
let parsed=null;
class GLTFLoader{async parseAsync(buffer){parsed=Buffer.from(buffer);return {scene:{},animations:[{name:'Parado'}]}}}
const loaded=await loadRev2Parts({GLTFLoader,fetcher,atobFn:text=>Buffer.from(text,'base64').toString('latin1'),manifestUrl:ZOMBIE_PARTS_MANIFEST});
assert.ok(loaded.scene);
assert.deepEqual(parsed,direct);
console.log('OK GLB REV2 reconstruído em 17 partes corresponde byte a byte ao original');
