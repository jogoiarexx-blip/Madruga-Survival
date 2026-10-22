import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {repairRev5GlbMetadata} from '../src/characters/rev5-glb-compat.js';
import {loadPlayerRev5Parts} from '../src/characters/player-rev5.js';
const root=new URL('../assets/models/',import.meta.url);
const original=readFileSync(new URL('Striped_Wanderer_REV5.glb',root));
const manifest=JSON.parse(readFileSync(new URL('rev5-parts/manifest.json',root),'utf8'));
const doc=b=>{const a=Buffer.from(b);return JSON.parse(a.subarray(20,20+a.readUInt32LE(12)).toString('utf8'));};
const fix=b=>Buffer.from(repairRev5GlbMetadata(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)));
let count=0;
async function test(name,run){await run();console.log('OK REV5 material',++count,name);}
await test('reproduz o bug: material unlit sem extensionsUsed',()=>{
 const json=doc(original);
 assert.ok(json.materials.some(m=>m.extensions?.KHR_materials_unlit));
 assert.ok(!json.extensionsUsed?.includes('KHR_materials_unlit'));
 assert.equal(json.skins[0].joints.length,45);
 assert.equal(json.animations.length,17);
});
await test('declara extensão sem alterar ossos, animações e seção BIN',()=>{
 const after=fix(original),json=doc(after);
 assert.ok(json.extensionsUsed.includes('KHR_materials_unlit'));
 assert.equal(after.readUInt32LE(8),after.length);
 assert.ok(original.subarray(20+original.readUInt32LE(12)).equals(after.subarray(20+after.readUInt32LE(12))));
 assert.equal(json.animations.length,17);
 assert.equal(json.skins[0].joints.length,45);
 assert.deepEqual(json.materials,doc(original).materials);
});
await test('correção é idempotente',()=>{
 const once=fix(original),twice=fix(once);assert.ok(once.equals(twice));
});
await test('17 partes reconstituem bytes e hash original do REV5',()=>{
 const parts=Buffer.concat(manifest.parts.map(part=>Buffer.from(readFileSync(new URL('rev5-parts/'+part,root),'utf8'),'base64')));
 assert.equal(parts.length,manifest.byteLength);
 assert.equal(createHash('sha256').update(parts).digest('hex'),manifest.sha256);
 assert.ok(parts.equals(original));
});
await test('carregamento em partes entrega metadados corrigidos ao GLTFLoader',async()=>{
 const manifestUrl='rev5-parts/manifest.json';
 class FakeLoader {parseAsync(buffer){
   const json=doc(buffer);
   if(json.materials.some(m=>m.extensions?.KHR_materials_unlit) &&
      !json.extensionsUsed?.includes('KHR_materials_unlit'))
     throw TypeError("Cannot read properties of undefined (reading 'getMaterialType')");
   return Promise.resolve({scene:{},animations:json.animations});
 }}
 const fetcher=async url=>url===manifestUrl?{ok:true,json:async()=>manifest}:
   {ok:true,text:async()=>readFileSync(new URL('rev5-parts/'+url.split('/').at(-1),root),'utf8')};
 const result=await loadPlayerRev5Parts({GLTFLoader:FakeLoader,fetcher,manifestUrl,
   atobFn:s=>Buffer.from(s,'base64').toString('latin1')});
 assert.equal(result.animations.length,17);
});
console.log('REV5 material:',count,'novos testes.');
