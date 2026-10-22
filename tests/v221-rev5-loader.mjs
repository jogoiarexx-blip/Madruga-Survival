import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadPlayerRev5Parts} from '../src/characters/player-rev5.js';
let passed=0;
const test=async(label,fn)=>{await fn();passed++;console.log('OK REV5 loader',passed,label)};
function fixture({failure=false}={}){
 const payload=Buffer.alloc(1050006);payload.write('glTF');
 const slices=[payload.subarray(0,350002),payload.subarray(350002,700004),payload.subarray(700004)];
 let active=0,maxActive=0,partRetry=0;
 const manifestUrl='./assets/models/rev5-parts/manifest.json';
 const manifest={byteLength:payload.byteLength,parts:['part00.b64','part01.b64','part02.b64']};
 const progress=[];
 const fetcher=async url=>{
   if(url===manifestUrl)return {ok:true,json:async()=>manifest};
   const ix=manifest.parts.findIndex(p=>url.endsWith(p));
   assert.ok(ix>=0,'URL de parte');
   active++;maxActive=Math.max(maxActive,active);
   await new Promise(resolve=>setImmediate(resolve));active--;
   if(ix===1&&partRetry++===0)return {ok:false,status:503};
   if(failure&&ix===2)return {ok:false,status:404};
   return {ok:true,text:async()=>slices[ix].toString('base64')};
 };
 const GLTFLoader=class{parseAsync(bytes){
   assert.equal(Buffer.from(bytes).subarray(0,4).toString(),'glTF');
   assert.equal(bytes.byteLength,payload.length);
   return Promise.resolve({scene:{},animations:[]});
 }};
 return {GLTFLoader,fetcher,atobFn:s=>Buffer.from(s,'base64').toString('latin1'),manifestUrl,
   onProgress:(done,total)=>progress.push([done,total]),progress,
   get maxActive(){return maxActive},get partRetry(){return partRetry}};
}
await test('baixa partes em paralelo e reconstrói um GLB',async()=>{
 const f=fixture(),res=await loadPlayerRev5Parts(f);
 assert.ok(res.scene);assert.equal(f.progress.length,3);assert.ok(f.maxActive>=2);
 assert.deepEqual(f.progress.map(p=>p[0]).sort(),[1,2,3]);
});
await test('recupera falha temporária',async()=>{const f=fixture();await loadPlayerRev5Parts(f);assert.ok(f.partRetry>=2)});
await test('avisa sobre parte ausente após tentativas',async()=>{const f=fixture({failure:true});await assert.rejects(loadPlayerRev5Parts(f),/part02\\.b64/)});
await test('main possui banner de estado e botão retry',()=>{
 const s=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(s,/showPlayerModelStatus/);assert.match(s,/modelRetry\\.addEventListener\\('click'/);
});
console.log('REV5 loader:',passed,'testes.');
