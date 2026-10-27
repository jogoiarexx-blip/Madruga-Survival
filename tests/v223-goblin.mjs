import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {GOBLIN_MOVES,startGoblinAttack,advanceGoblinAttack,goblinHitTest,chooseGoblinMove} from '../src/gameplay/goblin-combat.js';
import {GOBLIN_GLB_URL,GOBLIN_HEIGHT,createGoblinModelManager} from '../src/characters/goblin-model.js';
let count=0;
async function test(name,fn){await fn();console.log(`OK Goblin ${++count}: ${name}`);}
const path=new URL('../assets/models/goblin_animado.glb',import.meta.url);
const raw=readFileSync(path);
const text=relative=>readFileSync(new URL(relative,import.meta.url),'utf8');
function structure(raw){
 assert.equal(raw.toString('utf8',0,4),'glTF');
 assert.equal(raw.readUInt32LE(4),2);assert.equal(raw.readUInt32LE(8),raw.length);
 let ptr=12,json=null,binLength=0;
 while(ptr<raw.length){const l=raw.readUInt32LE(ptr);const type=raw.readUInt32LE(ptr+4);ptr+=8;
   if(type===0x4E4F534A)json=JSON.parse(raw.subarray(ptr,ptr+l).toString('utf8'));
   if(type===0x004E4942)binLength=l;
   ptr+=l;
 }
 assert.equal(ptr,raw.length);assert.equal(json.buffers[0].byteLength,binLength);
 return json;
}
const g=structure(raw);
await test('arquivo GLB válido e modelo original rigado mantido',()=>{
 assert.ok(raw.length>12_000_000);assert.equal(g.skins.length,1);
 assert.equal(g.skins[0].joints.length,46);assert.equal(g.meshes.length,1);
 assert.equal(g.images.length,3);assert.equal(g.materials.length,1);
});
await test('seis animações originais preservadas na mesma ordem',()=>{
 assert.deepEqual(g.animations.slice(0,6).map(a=>a.name),[
  'Running','Walking','Arise','Dead','Triple_Combo_Attack','Unsteady_Walk']);
});
await test('nove clipes adicionais, nomeados e animando todo o rig',()=>{
 assert.deepEqual(g.animations.slice(6).map(a=>a.name),[
   'Idle','Idle_Alert','Attack_Quick','Attack_Heavy','Attack_Combo','Hurt','Guard','Dodge','Death_Quick']);
 for(const clip of g.animations.slice(6)){
   assert.equal(clip.channels.length,92);
   const targets=new Set(clip.channels.map(c=>c.target.node));assert.equal(targets.size,46);
   assert.ok(clip.samplers.every(s=>s.interpolation==='LINEAR'));
 }
});
await test('todos os acessos de clipes gerados apontam dentro do buffer GLB',()=>{
 for(const a of g.animations.slice(6))for(const sampler of a.samplers){
   for(const idx of [sampler.input,sampler.output]){
     const accessor=g.accessors[idx],bv=g.bufferViews[accessor.bufferView];
     const width={SCALAR:1,VEC3:3,VEC4:4}[accessor.type];
     assert.ok(bv.byteOffset>=0 && bv.byteOffset+bv.byteLength<=g.buffers[0].byteLength);
     assert.equal(bv.byteLength,accessor.count*width*4);
   }
 }
});
await test('sequência alterna ataque rápido, pesado e combo',()=>{
 const e={type:'normal',hp:3,mesh:{rotation:{y:0}}};
 assert.equal(chooseGoblinMove(e),'quick');
 const list=[];for(let i=0;i<12;i++){
   list.push(chooseGoblinMove(e));e.goblinComboCount=i+1;
 }
 assert.deepEqual(list,['quick','quick','heavy','quick','quick','combo','quick','quick','heavy','quick','quick','combo']);
});
await test('não aplica dano imediato; golpe rápido só conecta após 0,43 s',()=>{
 const e={type:'normal',hp:2,mesh:{rotation:{y:0}}},hits=[];
 assert.equal(startGoblinAttack(e),true);
 for(let i=0;i<4;i++)advanceGoblinAttack(e,.10,x=>hits.push(x));
 assert.equal(hits.length,0);
 advanceGoblinAttack(e,.05,x=>hits.push(x));assert.equal(hits.length,1);
 assert.equal(hits[0].move,'quick');assert.equal(hits[0].damageMultiplier,.92);
});
await test('combo pode produzir dois contatos e se encerra uma única vez',()=>{
 const e={type:'normal',hp:2,goblinComboCount:5,mesh:{rotation:{y:1}}},hits=[];
 assert.equal(startGoblinAttack(e,'building',{x:1,z:0}),true);
 assert.equal(e.goblinAttack.move,'combo');
 for(let i=0;i<25;i++)advanceGoblinAttack(e,.1,x=>hits.push(x));
 assert.equal(hits.length,2);assert.equal(hits[0].kind,'building');
 assert.equal(e.goblinAttack,null);
});
await test('hitbox respeita distância, cone frontal e linha de visão',()=>{
 const e={type:'normal',mesh:{position:{x:0,z:0}},attackFacingYaw:0};
 assert.equal(goblinHitTest(e,{x:0,z:1}),true);
 assert.equal(goblinHitTest(e,{x:0,z:3}),false);
 assert.equal(goblinHitTest(e,{x:0,z:-1}),false);
 assert.equal(goblinHitTest(e,{x:0,z:1},{hasLineOfSight:()=>false}),false);
});
await test('não dispara outro ataque sobreposto nem ataca morto',()=>{
 const e={type:'normal',hp:2,mesh:{rotation:{y:0}}};
 assert.equal(startGoblinAttack(e),true);assert.equal(startGoblinAttack(e),false);
 const dead={type:'normal',hp:0,mesh:{rotation:{y:0}}};
 assert.equal(startGoblinAttack(dead),false);
});
await test('modelo só baixa sob demanda e falha mantém fallback',async()=>{
 let calls=0;
 class Loader{loadAsync(){calls++;return Promise.reject(Error('offline'));}}
 const manager=createGoblinModelManager({THREE:{},GLTFLoader:Loader,cloneSkeleton:()=>{}});
 assert.equal(calls,0);
 assert.equal(manager.loaded,false);
 const oldWarn=console.warn;console.warn=()=>{};
 try{assert.equal(manager.attach({type:'normal',hp:2}),false);assert.equal(calls,0);
 assert.equal(await manager.preload(),false);assert.equal(calls,1);
 assert.equal(await manager.preload(),false);assert.equal(calls,1);
 }finally{console.warn=oldWarn;}
});
await test('animações de impacto coincidem com os marcadores do GLB',()=>{
 for(const move of Object.values(GOBLIN_MOVES)){
   const clip=g.animations.find(c=>c.name===move.clip);
   assert.ok(clip);assert.equal(clip.extras.impactAtSeconds,move.clip==='Attack_Combo'?1.02:move.impacts[0].at);
   assert.ok(move.impacts.every(x=>x.at<clip.extras.durationSeconds));
 }
});
await test('jogo substitui apenas o tipo normal; outros preservados',()=>{
 const src=text('../src/main.js');const factory=text('../src/characters/enemy-factory.js');
 const ai=text('../src/gameplay/enemy-ai.js');const combat=text('../src/gameplay/combat.js');
 assert.match(src,/goblinModels\.attach\(enemy\)/);
 assert.match(src,/goblinModels\.preload\(\)/);
 assert.match(src,/goblinModels\.updateCorpses/);
 assert.match(src,/goblinModels\.defeat\(deceased\)/);
 assert.match(ai,/advanceGoblinAttack\(enemy,dt/);
 assert.match(ai,/startGoblinAttack\(enemy/);
 assert.match(combat,/enemy\.goblinVisual\?\.hurt/);
 assert.match(factory,/type==='normal'/);
 assert.ok(!factory.includes("type === 'goblin'"));
 assert.ok(statSync(path).size>0);assert.equal(GOBLIN_HEIGHT,1.6);
 assert.ok(GOBLIN_GLB_URL.endsWith('goblin_animado.glb'));
});
await test('versão e testes atualizados, mantendo save e demais inimigos',()=>{
 const pkg=JSON.parse(text('../package.json'));
 assert.ok(['2.23.0','2.24.0','2.25.0','2.26.0','2.26.1','2.27.0','2.28.0','2.29.0','2.29.1','2.30.0','2.31.0','2.32.0','2.33.0','2.34.0','2.35.0','2.36.0','2.37.0','2.38.0'].includes(pkg.version));assert.match(pkg.scripts.test,/v223-goblin.mjs/);
 assert.match(text('../index.html'),/data-build="(?:2\.2[34]\.0-goblin(?:-ik)?|2\.25\.0-menu-hud|2\.27\.0-recovery|2\.28\.0-model-cache|2\.29\.0-enemy-pool|2\.29\.1-goblin-visible|2\.30\.0-chaves-workbench|2\.31\.0-chaves-patrol-ai|2\.32\.0-chaves-orders|2\.34\.0-chaves-combat|2\.35\.0-stability|2\.36\.0-wildlife-inventory|2\.32\.0-chaves-orders|2\.34\.0-chaves-combat|2\.35\.0-stability|2\.36\.0-wildlife-inventory|2\.37\.0-campfire-ui|2\.38\.0-save-profiling)"/);
 assert.match(text('../src/gameplay/save-system.js'),/normal:2/);
 assert.match(text('../src/main.js'),/spawnEnemy\('spider'/);
});
console.log(`${count} testes do goblin aprovados`);
