import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {modelCacheKey,isGlb,readModelCache,writeModelCache} from '../src/render/model-binary-cache.js';
let count=0;
async function test(name,callback){await callback();console.log(`OK v2.28 #${++count} ${name}`);}
function mockStorage(){
 const data=new Map();
 const cache={
   match:async key=>data.get(key)?.clone()||undefined,
   put:async(key,resp)=>{data.set(key,resp.clone());},
   keys:async()=>[...data.keys()].map(url=>({url})),
   delete:async key=>data.delete(typeof key==='string'?key:key.url)
 };
 return {data,storage:{open:async()=>cache}};
}
const bytes=Uint8Array.from([103,108,84,70,2,0,0,0,12,0,0,0]);
const digest=data=>createHash('sha256').update(data).digest('hex');
const mk=data=>({sha256:digest(data),byteLength:data.length,parts:['part00.b64']});
await test('chave exige SHA-256 real e tamanho limitado',()=>{
 assert.ok(modelCacheKey('rev5',mk(bytes),bytes.length));
 assert.equal(modelCacheKey('rev5',{sha256:'x'},bytes.length),null);
 assert.equal(modelCacheKey('rev5',mk(bytes),45_000_000),null);
 assert.equal(isGlb(bytes),true);
 assert.equal(isGlb(Uint8Array.of(1,2,3,4)),false);
});
await test('cache miss e armazenamento do arquivo reconstruído',async()=>{
 const {storage}=mockStorage(),manifest=mk(bytes);
 assert.equal(await readModelCache('rev5',manifest,bytes.length,{cacheStorage:storage,validate:isGlb}),null);
 assert.equal(await writeModelCache('rev5',manifest,bytes,{cacheStorage:storage}),true);
 assert.deepEqual(await readModelCache('rev5',manifest,bytes.length,{cacheStorage:storage,validate:isGlb}),bytes);
});
await test('cache corrompido é invalidado e novo download pode ocorrer',async()=>{
 const {storage,data}=mockStorage(),manifest=mk(bytes);
 await writeModelCache('rev5',manifest,bytes,{cacheStorage:storage});
 const key=modelCacheKey('rev5',manifest,bytes.length);
 data.set(key,new Response(Uint8Array.from([...bytes.slice(0,-1),55])));
 assert.equal(await readModelCache('rev5',manifest,bytes.length,{cacheStorage:storage,validate:isGlb}),null);
 assert.equal(data.has(key),false);
});
await test('modelo novo elimina apenas revisão antiga do mesmo personagem',async()=>{
 const {storage,data}=mockStorage(),old=mk(bytes);
 const changed=Uint8Array.from([...bytes]);changed[5]=8;
 await writeModelCache('rev5',old,bytes,{cacheStorage:storage});
 await writeModelCache('zombie-rev2',old,bytes,{cacheStorage:storage});
 await writeModelCache('rev5',mk(changed),changed,{cacheStorage:storage});
 assert.equal(data.size,2);
 assert.equal(await readModelCache('rev5',old,bytes.length,{cacheStorage:storage}),null);
 assert.deepEqual(await readModelCache('zombie-rev2',old,bytes.length,{cacheStorage:storage}),bytes);
});
await test('quotas e modo privado fazem fallback sem quebrar loading',async()=>{
 const failing={open:async()=>{throw Error('QuotaExceededError')}};
 const old=console.warn;console.warn=()=>{};
 try{
 assert.equal(await readModelCache('rev5',mk(bytes),bytes.length,{cacheStorage:failing}),null);
 assert.equal(await writeModelCache('rev5',mk(bytes),bytes,{cacheStorage:failing}),false);
 assert.equal(await readModelCache('rev5',mk(bytes),bytes.length,{cacheStorage:null}),null);
 }finally{console.warn=old;}
});
await test('não permite gravar checksum incompatível',async()=>{
 const {storage,data}=mockStorage(),altered=Uint8Array.from([...bytes]);altered[3]=0;
 assert.equal(await writeModelCache('rev5',mk(bytes),altered,{cacheStorage:storage}),false);
 assert.equal(data.size,0);
});
await test('quatro modelos utilizam cache sem pré-carregamento no menu',()=>{
 const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
 for(const mod of ['player-rev5','zombie-models','spider-model','goblin-model']){
   const src=read('src/characters/'+mod+'.js');
   assert.match(src,/readModelCache\(/);assert.match(src,/writeModelCache\(/);
 }
 const main=read('src/main.js');
 assert.match(main,/await adventureLoader\.start\(stages\)/);
 assert.match(main,/onError:recoverFromFrameError/);
 assert.match(read('index.html'),/2\.28\.0-model-cache|2\.29\.0-enemy-pool|2\.29\.1-goblin-visible|2\.30\.0-chaves-workbench|2\.31\.0-chaves-patrol-ai|2\.32\.0-chaves-orders|2\.34\.0-chaves-combat|2\.35\.0-stability|2\.36\.0-wildlife-inventory|2\.32\.0-chaves-orders|2\.34\.0-chaves-combat|2\.35\.0-stability|2\.36\.0-wildlife-inventory|2\.37\.0-campfire-ui|2\.38\.0-save-profiling|2\.39\.0-wildlife-quests|2\.40\.0-fauna-exploration|2\.41\.0-ecosystem|2\.42\.0-soundscape|2\.43\.0-foley|2\.44\.0-quiet-builds|2\.45\.0-stable-play|2\.47\.0-multi-floor|2\.48\.0-interactive-fishing|2\.49\.0-fish-lod-rig|2\.51\.0-lake-shore-lod/);
 assert.equal(JSON.parse(read('package.json')).version,'2.51.0');
});
console.log(`v2.28: ${count} verificações de cache aprovadas`);
