import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSurvivalUI} from '../src/ui/survival-ui.js';
import {WORKBENCH_RECIPES} from '../src/ui/workbench-ui.js';
import {CAMPFIRE_RECIPES} from '../src/ui/campfire-ui.js';
import {RECIPES,createSurvival} from '../src/gameplay/survival.js';
import {craftAvailability} from '../src/gameplay/crafting.js';
import {createWildlifeWorld,validWildlife,wildlifeDecision} from '../src/world/wildlife.js';

let count=0;
const check=(name,fn)=>{fn();console.log(`OK v2.36 ${++count}: ${name}`);};
class FakeElement{
 constructor(tag='div'){
  this.tagName=tag;this.children=[];this.dataset={};this.attributes={};this.events={};
  this.className='';this.hidden=false;this.disabled=false;this._text='';this.title='';this.value='';
  this.style={};const classes=new Set();this.classList={
   add:(...names)=>names.forEach(n=>classes.add(n)),remove:(...names)=>names.forEach(n=>classes.delete(n)),
   toggle:(name,force)=>{if(force===undefined?classes.has(name):!force){classes.delete(name);return false;}classes.add(name);return true;},
   contains:name=>classes.has(name)
  };
 }
 appendChild(node){this.children.push(node);node.parentNode=this;return node;}
 append(...children){children.forEach(node=>this.appendChild(node));}
 get options(){return this.children.filter(node=>node.tagName==='option');}
 set textContent(text){this._text=String(text);}
 get textContent(){return this._text;}
 setAttribute(name,value){this.attributes[name]=String(value);}
 addEventListener(name,cb){this.events[name]=cb;}
 querySelectorAll(selector){
  const match=selector.match(/^\.([\w-]+)/);if(!match)return [];
  const klass=match[1],visibleOnly=selector.includes(':not([hidden])');const matches=[];
  function scan(node){for(const child of node.children){
   if((child.className.split(' ').includes(klass)||child.classList.contains(klass))&&(!visibleOnly||!child.hidden))matches.push(child);
   scan(child);
  }}scan(this);return matches;
 }
}
function makeUI(){
 const nodes=new Map();const old=globalThis.document;
 globalThis.document={createElement:tag=>new FakeElement(tag),getElementById:id=>{
  if(!nodes.has(id))nodes.set(id,new FakeElement());return nodes.get(id);
 }};
 const state=createSurvival();
 const ui=createSurvivalUI({getState:()=>state,getBag:()=>Array(36).fill(null),
  getRotation:()=>0,getCraftStatus:(id,cost)=>craftAvailability(state,id,{cost}),
  onClose:()=>{},onCraft:()=>{},onRotate:()=>{},onDismantle:()=>{},onRepair:()=>{},onConsume:()=>{}
 });
 return {ui,nodes,restore(){globalThis.document=old;}};
}
check('mochila abre e atualiza sem consultar cartões exclusivos da bancada',()=>{
 const {ui,nodes,restore}=makeUI();try{
  assert.doesNotThrow(()=>ui.open());
  assert.doesNotThrow(()=>ui.update(true));
  assert.equal(ui.isOpen,true);
  const cards=nodes.get('recipe-list').querySelectorAll('.craft-card');
  assert.equal(cards.length,Object.keys(RECIPES).length-WORKBENCH_RECIPES.length-CAMPFIRE_RECIPES.length);
  assert.ok(cards.length>0);
  ui.close();assert.doesNotThrow(()=>ui.update());
 }finally{restore();}
});
check('mochila pode abrir e fechar várias vezes sem travar HUD',()=>{
 const {ui,restore}=makeUI();try{
  for(let i=0;i<10;i++){ui.open();ui.update();ui.close();ui.update();}
 }finally{restore();}
});
check('todas as receitas exclusivas continuam reservadas à bancada',()=>{
 const src=readFileSync(new URL('../src/ui/survival-ui.js',import.meta.url),'utf8');
 assert.match(src,/for\(const \[id,c\] of Object.entries\(recipeCards\)\)/);
 assert.match(src,/if\(CRAFT_STATIONS\[id\] && CRAFT_STATIONS\[id\]!=='hand'\)continue/);
 assert.ok(WORKBENCH_RECIPES.length>=10);
});
class Geom{constructor(...args){this.args=args;}dispose(){}}
class Material{constructor(args){this.args=args;}}
class Node{
 constructor(){this.children=[];this.position={x:0,y:0,z:0,set(x,y,z){Object.assign(this,{x,y,z});}};
  this.rotation={x:0,y:0,z:0};this.scale={x:1,y:1,z:1,set(x,y,z){Object.assign(this,{x,y,z});}};this.visible=true;
 }
 add(child){this.children.push(child);}
}
class Mesh extends Node{constructor(geometry,material){super();this.geometry=geometry;this.material=material;}}
const THREE={Group:Node,Mesh,MeshStandardMaterial:Material,SphereGeometry:Geom,BoxGeometry:Geom};
function fauna(options={}){
 const scene={add(){},remove(){}};
 return createWildlifeWorld({THREE,scene,getGroundHeight:()=>0,isPositionFree:()=>true,onHunt:()=>{},...options});
}
check('coelho apresenta cabeça, orelhas, patas e cauda articuladas',()=>{
 const f=fauna();f.restore([{type:'rabbit',x:4,z:0,heading:0,hp:2}]);
 const a=f.animals[0];assert.equal(a.rig.ears.length,2);assert.equal(a.rig.legs.length,4);
 const before=a.group.position.y;
 for(let i=0;i<10;i++)f.update(.06,{x:4,z:5});
 assert.equal(a.behavior,'flee');assert.ok(Math.hypot(a.x-4,a.z-5)>5,'Coelho se distancia após virar');assert.ok(a.group.position.y>=before);
 assert.ok(Math.abs(a.rig.head.rotation.x)>0);
});
check('javali se defende aproximando-se do jogador, sem fugir automaticamente',()=>{
 const f=fauna();f.restore([{type:'boar',x:5,z:0,hp:5,heading:0}]);
 const a=f.animals[0],before=a.x;
 for(let i=0;i<18;i++)f.update(.06,{x:0,z:0});
 assert.equal(a.behavior,'defend');assert.ok(a.x<before,`Javali não avançou: ${a.x} >= ${before}`);
 assert.equal(a.rig.legs.length,4);assert.equal(a.rig.mane.length,5);
});
check('coelho foge com visão, javali não persegue de longe',()=>{
 assert.equal(wildlifeDecision('rabbit',7,true),'flee');
 assert.equal(wildlifeDecision('rabbit',7,false),'forage');
 assert.equal(wildlifeDecision('boar',6,true),'defend');
 assert.equal(wildlifeDecision('boar',12,true),'wander');
 const f=fauna({canSee:()=>false});f.restore([{type:'boar',x:6,z:0,hp:5,heading:0}]);
 f.update(.05,{x:0,z:0});assert.equal(f.animals[0].behavior,'wander');
});
check('animais preservam saves e respeitam obstáculos',()=>{
 const f=fauna({isPositionFree:()=>false});f.restore([{type:'rabbit',x:1,z:0,hp:2,heading:0},{type:'boar',x:6,z:0,hp:5,heading:1.2}]);
 const s=f.serialize();for(let i=0;i<15;i++)f.update(.05,{x:0,z:0});
 assert.deepEqual(f.serialize().map(a=>[a.x,a.z]),s.map(a=>[a.x,a.z]));
 assert.ok(validWildlife(f.serialize()));
});
check('versão e cache do módulo corrigido são novos',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(main,/survival-ui\.js\?v=2\.41\.0-ecosystem/);
 assert.match(main,/wildlife\.js\?v=2\.41\.0-ecosystem/);
 assert.match(html,/2\.36\.0-wildlife-inventory|2\.37\.0-campfire-ui|2\.38\.0-save-profiling|2\.39\.0-wildlife-quests|2\.40\.0-fauna-exploration|2\.41\.0-ecosystem/);
});
console.log(`v2.36.0: ${count} regressões aprovadas`);
