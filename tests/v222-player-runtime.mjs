import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadPlayerRev5Resilient,createPlayerRev5} from '../src/characters/player-rev5.js';
let checks=0;
const test=async(name,fn)=>{await fn();console.log('OK v2.2.2',++checks,name)};
await test('falha na primeira origem não impede carregar modelo pela segunda',async()=>{
 const tried=[],events=[],result={scene:{},animations:[]};
 const loadParts=async({manifestUrl})=>{tried.push(manifestUrl);if(tried.length===1)throw Error('404 do Pages');return result};
 assert.equal(await loadPlayerRev5Resilient({GLTFLoader:class{},manifests:['pages','raw','cdn'],loadParts,
   onStatus:(message,state)=>events.push({message,state})}),result);
 assert.deepEqual(tried,['pages','raw']);
 assert.ok(events.some(e=>e.message.includes('origem 2/3')));
});
await test('todas as origens indisponíveis produzem erro rastreável',async()=>{
 await assert.rejects(loadPlayerRev5Resilient({GLTFLoader:class{},
  manifests:['pages','raw'],loadParts:async()=>{throw Error('sem rede')}}),/fonte 1: sem rede.*fonte 2: sem rede/);
});
class Node{
 constructor(name=''){this.name=name;this.children=[];this.parent=null;this.visible=true;this.isMesh=false;
  this.scale={setScalar(v){this.value=v}};this.position={set(){},y:0};this.rotation={set(){},y:0,z:0};}
 add(node){node.parent?.remove(node);node.parent=this;this.children.push(node)}
 remove(node){this.children=this.children.filter(n=>n!==node);node.parent=null;}
 traverse(f){f(this);for(const child of this.children)child.traverse(f)}
 getObjectByName(n){let found=null;this.traverse(x=>{if(x.name===n)found=x});return found;}
}
class Action{constructor(){this.time=0;this.playing=false}reset(){return this}setLoop(){return this}setEffectiveWeight(){return this}setEffectiveTimeScale(){return this}play(){this.playing=true;return this}isRunning(){return this.playing}stopFading(){return this}crossFadeFrom(){return this}stop(){this.playing=false;return this}}
class Mixer{constructor(){this.timeScale=1;this.actions=new Map()}clipAction(clip){if(!this.actions.has(clip.name))this.actions.set(clip.name,new Action());return this.actions.get(clip.name)}addEventListener(){}update(){}stopAllAction(){}uncacheRoot(){}}
const THREE={Group:Node,Vector3:class{},Quaternion:class{},AnimationMixer:Mixer,LoopOnce:1,LoopRepeat:2};
const clips=['Idle','Walking','Running','SwordAttack_REV3','CastMagic','Jump','HitReact','Death'].map(name=>({name,duration:1}));
function model(){const scene=new Node('scene'),hand=new Node('mixamorigLeftHand');hand.isBone=true;scene.add(hand);return {scene,animations:clips};}
await test('avatar antigo fica oculto durante carregamento e após sucesso',async()=>{
 let done;
 const player=new Node(),avatar=new Node('antigo'),hand=new Node(),weapon=new Node();player.add(avatar);avatar.add(hand);hand.add(weapon);
 const Loader=class{loadAsync(){return new Promise(resolve=>done=resolve)}};
 const ctrl=createPlayerRev5({THREE,GLTFLoader:Loader,player,avatar,weapon});
 const loading=ctrl.preload();
 assert.equal(avatar.visible,false,'avatar antigo não pode aparecer durante download');
 assert.equal(ctrl.visualVisible,false,'novo modelo só fica visível quando estiver pronto');
 done(model()); assert.equal(await loading,true);
 assert.equal(ctrl.loaded,true);assert.equal(avatar.visible,false);assert.equal(ctrl.visualVisible,true);
 assert.equal(ctrl.model.name,'Striped_Wanderer_REV5');assert.equal(weapon.parent.name,'mixamorigLeftHand');
 ctrl.update(.016,{speed:4});assert.equal(ctrl.animator.activeName,'Walking');
});
await test('falha retorna avatar antigo e expõe motivo',async()=>{
 const messages=[],player=new Node(),avatar=new Node(),arm=new Node(),weapon=new Node();player.add(avatar);avatar.add(arm);arm.add(weapon);
 const Loader=class{loadAsync(){return Promise.reject(Error('model not found'))}};
 const ctrl=createPlayerRev5({THREE,GLTFLoader:Loader,player,avatar,weapon,onStatus:(text,state)=>messages.push({text,state})});
 const original=console.warn;console.warn=()=>{};
 try{assert.equal(await ctrl.preload(),false)}finally{console.warn=original}
 assert.equal(avatar.visible,true);assert.equal(ctrl.loaded,false);
 assert.equal(messages.at(-1).state,'error');assert.ok(messages.at(-1).text.includes('model not found'));
});
await test('main disponibiliza diagnóstico e invalida cache da revisão',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(main,/window,'madrugaRev5Status'/);
 assert.match(main,/player-rev5\.js\?v=(?:2\.2\.8-weapons-craft|2\.4\.0-combat|2\.5\.0-exploration|2\.6\.0-craft-progression|2\.7\.0-spider|2\.8\.0-spider|2\.9\.0-spider|2\.10\.0-spider|2\.11\.0-spider)/);
 assert.match(html,/data-build="(?:2\.2\.8-weapons-craft|2\.3\.0-perception|2\.4\.0-combat|2\.5\.0-exploration|2\.6\.0-craft-progression|2\.7\.0-spider|2\.8\.0-spider|2\.9\.0-spider|2\.10\.0-spider|2\.11\.0-spider|2\.12\.0-nests|2\.13\.0-cave|2\.14\.0-cave|2\.15\.0-hotbar|2\.16\.0-inventory|2\.17\.0-bag|2\.18\.0-bag-chest|2\.19\.0-gear|2\.20\.0-build-wheel|2\.21\.0-menu|2\.22\.0-gpu|2\.23\.0-goblin|2\.24\.0-goblin-ik|2\.25\.0-menu-hud|2\.27\.0-recovery|2\.28\.0-model-cache|2\.29\.0-enemy-pool|2\.29\.1-goblin-visible|2\.30\.0-chaves-workbench|2\.31\.0-chaves-patrol-ai|2\.32\.0-chaves-orders|2\.34\.0-chaves-combat|2\.35\.0-stability)"/);
});
console.log('v2.2.2',checks,'testes aprovados');
