import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {goblinContactWeight,createGoblinFootPlant} from '../src/characters/goblin-foot-plant.js';
import {loadGoblinParts,GOBLIN_PARTS_MANIFEST,createGoblinModelManager} from '../src/characters/goblin-model.js';
let count=0;
async function test(name,fn){await fn();console.log(`OK Goblin IK ${++count}: ${name}`);}
const text=rel=>readFileSync(new URL(rel,import.meta.url),'utf8');
await test('contatos alternam entre pé direito e esquerdo',()=>{
 assert.ok(goblinContactWeight(.25,'right')>.9);
 assert.equal(goblinContactWeight(.25,'left'),0);
 assert.ok(goblinContactWeight(.75,'left')>.9);
 assert.equal(goblinContactWeight(.75,'right'),0);
});
await test('fases repetem a cada ciclo e entradas ruins são ignoradas',()=>{
 assert.equal(goblinContactWeight(.25,'right'),goblinContactWeight(1.25,'right'));
 assert.equal(goblinContactWeight(NaN,'left'),0);
 assert.equal(goblinContactWeight(Infinity,'right'),0);
});
await test('IK desativa com dados de rig incompletos ou sem terreno',()=>{
 assert.equal(createGoblinFootPlant({THREE:{},model:{}}),null);
 assert.equal(createGoblinFootPlant({THREE:{Vector3:class{},Quaternion:class{}},model:{getObjectByName:()=>null},getGroundHeight:()=>0}),null);
});
await test('inimigo visual mantém fallback quando GLB não pode ser baixado',async()=>{
 class Loader{loadAsync(){return Promise.reject(new Error('offline'));}}
 const manager=createGoblinModelManager({THREE:{},GLTFLoader:Loader,cloneSkeleton:()=>null});
 const old=console.warn;console.warn=()=>{};
 try{assert.equal(await manager.preload(),false);assert.equal(manager.failed,true);}finally{console.warn=old;}
});
await test('carregamento respeita limite e formato do manifesto',async()=>{
 class Loader{}
 await assert.rejects(loadGoblinParts({GLTFLoader:Loader,fetcher:async()=>({ok:true,json:async()=>({byteLength:1,glbByteLength:2,parts:[]})})}),/Manifesto/);
 assert.match(GOBLIN_PARTS_MANIFEST,/goblin-parts/);
});
await test('arquivo original mantém esqueleto, animações e material',()=>{
 const raw=readFileSync(new URL('../assets/models/goblin_animado.glb',import.meta.url));
 assert.equal(raw.toString('utf8',0,4),'glTF');
 const jsonLen=raw.readUInt32LE(12),g=JSON.parse(raw.subarray(20,20+jsonLen).toString());
 assert.equal(g.skins[0].joints.length,46);assert.equal(g.animations.length,15);assert.equal(g.materials.length,1);
});
await test('pacote de partes reconstrói byte a byte o goblin animado',async()=>{
 const base=new URL('../assets/models/goblin-parts/',import.meta.url);
 const manifest=JSON.parse(readFileSync(new URL('manifest.json',base)));
 assert.equal(manifest.encoding,'gzip+b64');
 assert.ok(manifest.parts.length>1&&manifest.parts.length<100);
 const data=Buffer.concat(manifest.parts.map(name=>Buffer.from(readFileSync(new URL(name,base),'utf8').trim(),'base64')));
 assert.equal(data.length,manifest.byteLength);
 assert.equal(createHash('sha256').update(data).digest('hex'),manifest.sha256);
 const decoded=gunzipSync(data),glb=readFileSync(new URL('../assets/models/goblin_animado.glb',import.meta.url));
 assert.equal(decoded.length,manifest.glbByteLength);
 assert.deepEqual(decoded,glb);
});
await test('carregador das partes verifica checksum e cria GLTF sem download inteiro',async()=>{
 const base=new URL('../assets/models/goblin-parts/',import.meta.url);
 class Loader{parseAsync(bytes){return Promise.resolve({scene:{},bytes:bytes.byteLength});}}
 const fakeFetch=async url=>{
  const file=url.split('/').pop();
  assert.match(file,/^manifest\.json$|^part\d{3}\.b64$/);
  const contents=readFileSync(new URL(file,base),'utf8');
  return {ok:true,json:async()=>JSON.parse(contents),text:async()=>contents};
 };
 const result=await loadGoblinParts({GLTFLoader:Loader,fetcher:fakeFetch,
   atobFn:b64=>Buffer.from(b64,'base64').toString('latin1'),
   decompress:async bytes=>gunzipSync(bytes).buffer.slice(gunzipSync(bytes).byteOffset,gunzipSync(bytes).byteOffset+gunzipSync(bytes).byteLength)});
 assert.ok(result.bytes>13_000_000);
});
await test('IA envia movimento real, contato e pausas do goblin',()=>{
 const ai=text('../src/gameplay/enemy-ai.js');const anim=text('../src/characters/enemy-animation.js');
 assert.match(ai,/enemy\.goblinVisual\)\?actualMoving:moving/);
 assert.match(anim,/enemy.goblinVisual.update\(dt,moving,near,pace,footIKNear\)/);
 const model=text('../src/characters/goblin-model.js');
 assert.match(model,/footPlant.update/);assert.match(model,/footPlant\?\.reset/);
 assert.match(model,/GOBLIN_MOVES\[move\]/);
});
await test('projeto identificado como v2.24 e testes novos registrados',()=>{
 const pkg=JSON.parse(text('../package.json'));
 assert.ok(['2.24.0','2.25.0','2.26.0','2.26.1','2.27.0','2.28.0','2.29.0','2.29.1','2.30.0','2.31.0','2.32.0','2.33.0'].includes(pkg.version));assert.match(pkg.scripts.test,/v224-goblin-foot-plant/);
 assert.match(text('../index.html'),/data-build="(?:2\.24\.0-goblin-ik|2\.25\.0-menu-hud|2\.27\.0-recovery|2\.28\.0-model-cache|2\.29\.0-enemy-pool|2\.29\.1-goblin-visible|2\.30\.0-chaves-workbench|2\.31\.0-chaves-patrol-ai|2\.32\.0-chaves-orders|2\.33\.0-chaves-navigation|2\.32\.0-chaves-orders|2\.33\.0-chaves-navigation)"/);
});
console.log(`${count} verificações v2.24 aprovadas`);
