// Verificações unitárias da substituição real do rig por GLB REV4.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createZombieModelManager,ZOMBIE_GLB_URL,ZOMBIE_ANIMATIONS} from '../src/characters/zombie-models.js';
import {isZombieType,ZOMBIE_TYPES} from '../src/gameplay/zombie-variants.js';
import {animateEnemy} from '../src/characters/enemy-animation.js';

let checks=0; const test=async(label,fn)=>{await fn();checks++;console.log('OK REV4 '+checks+': '+label)};
class Color{constructor(n){this.value=n}lerp(_,a){this.lerpAmount=a;return this}}
class Material{constructor(name){this.name=name;this.color=new Color(0x776655);this.visible=true}clone(){return new Material(this.name)}dispose(){this.disposed=true}}
class Node{constructor(){this.position={set(...a){this.values=a}};this.scale={setScalar(v){this.value=v}};this.material=new Material('body');this.children=[];this.userData={};this.isMesh=false;this.parent=null}
 add(o){this.children.push(o);o.parent=this}remove(o){this.children.splice(this.children.indexOf(o),1);o.parent=null}
 traverse(fn){fn(this);for(const c of this.children)c.traverse(fn)}}
class Mesh extends Node{constructor(name='skin'){super();this.material=new Material(name);this.geometry={id:'shared'};this.isMesh=true}}
class Mixer{constructor(root){this.root=root;this.last=0;this.actions=new Map();this.stopped=false}
 clipAction(clip){if(!this.actions.has(clip.name))this.actions.set(clip.name,{name:clip.name,reset(){return this},setEffectiveTimeScale(){return this},setEffectiveWeight(){return this},fadeIn(){return this},fadeOut(){return this},setLoop(){return this},play(){return this}});return this.actions.get(clip.name)}
 update(dt){this.last+=dt}stopAllAction(){this.stopped=true}uncacheRoot(){}}
const THREE={Color,AnimationMixer:Mixer,LoopOnce:1,LoopRepeat:2};
const clips=['Idle','Shuffle','Run','LimpWalk','Walk','Attack','Flail','Hurt','LungeAttack'].map(name=>({name}));
let loadCalls=0, shouldFail=false, resolver=()=>{};
class Loader{loadAsync(url){loadCalls++;assert.equal(url,ZOMBIE_GLB_URL);
 return shouldFail?Promise.reject(new Error('sem modelo')):new Promise(resolve=>{resolver=()=>resolve({scene:new Node(),animations:clips})});}}
function cloneSkeleton(){const model=new Node();model.add(new Mesh('skin'));model.add(new Mesh('shirt'));return model}
function makeEnemy(type){const mesh=new Mesh(),oldChild=new Node();mesh.add(oldChild);return {type,mesh,size:ZOMBIE_TYPES[type].size,hp:ZOMBIE_TYPES[type].hp}}
await test('GLB original tem estrutura e 29 animações exigidas',()=>{
 const filename=new URL('../assets/models/zumbi_geometrico_REV4.glb',import.meta.url);
 const b=readFileSync(filename);assert.equal(b.toString('ascii',0,4),'glTF');assert.ok(b.length>1_000_000);
 const chunk=b.readUInt32LE(12);const doc=JSON.parse(b.subarray(20,20+chunk).toString('utf8'));
 assert.equal(doc.skins[0].joints.length,40);assert.equal(doc.animations.length,29);
 assert.ok(doc.animations.some(a=>a.name==='LungeAttack'));
});
await test('carrega uma vez, coloca REV4 no zumbi já nascido, não altera criatura comum',async()=>{
 const manager=createZombieModelManager({THREE,scene:new Node(),GLTFLoader:Loader,cloneSkeleton});
 const a=makeEnemy('zombie'),b=makeEnemy('zombie_runner');
 assert.equal(manager.attach(a),false);manager.attach(b);const before=loadCalls;
 const task=manager.preload();resolver();assert.equal(await task,true);assert.equal(manager.loaded,true);
 assert.equal(loadCalls,before);assert.ok(a.rev4Visual?.model);assert.ok(b.rev4Visual?.model);
 assert.equal(a.mesh.material.visible,false);assert.equal(a.mesh.children[0].visible,false);
 assert.notEqual(a.rev4Visual.model,b.rev4Visual.model);
 assert.equal(a.rev4Visual.walk,'Shuffle');assert.equal(b.rev4Visual.walk,'Run');
 manager.attach({type:'normal'});assert.equal(manager.count,2);
 a.rev4Visual.update(.03,true);assert.equal(a.rev4Visual.current,'Shuffle');
 a.rev4Visual.attack();assert.equal(a.rev4Visual.current,'Attack');
 for(let i=0;i<45;i++)a.rev4Visual.update(.016,true);
 assert.equal(a.rev4Visual.current,'Shuffle');
 assert.equal(manager.defeat(a),true);assert.equal(a.rev4Visual.current,'Death');
 let removed=0;for(let i=0;i<42;i++)manager.updateCorpses(.05,()=>removed++);
 assert.equal(removed,1);assert.equal(manager.count,1);assert.equal(a.rev4Visual,null);
 manager.dispose(b);assert.equal(manager.count,0);
});
await test('tóxico e gigante preservam os tipos e clipes próprios',()=>{
 assert.ok(isZombieType('zombie_toxic')&&isZombieType('zombie_brute'));
 assert.equal(ZOMBIE_ANIMATIONS.zombie_toxic,'LimpWalk');assert.equal(ZOMBIE_ANIMATIONS.zombie_brute,'Walk');
});
await test('animação procedural não sobrescreve o GLB montado',()=>{
 let called=0;const enemy={rev4Visual:{update(dt,moving,near){called++;assert.equal(dt,.016);assert.equal(moving,true);assert.equal(near,true);}}};
 animateEnemy(enemy,1,true,.016,true);assert.equal(called,1);
});
await test('falha de carregamento preserva modelo low-poly e não causa exceção',async()=>{
 shouldFail=true;const manager=createZombieModelManager({THREE,scene:new Node(),GLTFLoader:Loader,cloneSkeleton});
 const enemy=makeEnemy('zombie_brute');
 const originalWarn=console.warn;let warned=false;console.warn=()=>{warned=true};
 try{manager.attach(enemy);assert.equal(await manager.preload(),false)}finally{console.warn=originalWarn}
 assert.equal(warned,true);
 assert.equal(manager.failed,true);assert.equal(enemy.rev4Visual,undefined);assert.equal(enemy.mesh.material.visible,true);
 shouldFail=false;manager.dispose(enemy);
});
console.log(`REV4: ${checks} verificações aprovadas.`);
