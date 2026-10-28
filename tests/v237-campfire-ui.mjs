import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CRAFT_STATIONS,craftAvailability,craftItem} from '../src/gameplay/crafting.js';
import {createSurvival,RECIPES} from '../src/gameplay/survival.js';
import {CAMPFIRE_RECIPES,createCampfireUI} from '../src/ui/campfire-ui.js';
import {createSurvivalUI} from '../src/ui/survival-ui.js';
import {buildingInteractionLabel} from '../src/ui/building-interaction-label.js';
let count=0;
const test=(name,fn)=>{fn();console.log(`OK v2.37 ${++count}: ${name}`);};
class Element{
 constructor(tagName='div'){
  this.tagName=tagName;this.children=[];this.dataset={};this.attributes={};this.events={};
  this.className='';this.hidden=false;this.disabled=false;this.title='';this._text='';this.value='';this.style={};
  const classes=new Set();this.classList={add:(...xs)=>xs.forEach(v=>classes.add(v)),remove:(...xs)=>xs.forEach(v=>classes.delete(v)),contains:v=>classes.has(v),toggle:(v,on)=>{const enabled=on??!classes.has(v);if(enabled)classes.add(v);else classes.delete(v);return enabled;}};
 }
 appendChild(child){this.children.push(child);child.parentNode=this;return child;}
 append(...nodes){nodes.forEach(node=>this.appendChild(node));}
 get options(){return this.children.filter(node=>node.tagName==='option');}
 set textContent(s){this._text=String(s);}
 get textContent(){return this._text;}
 setAttribute(k,v){this.attributes[k]=String(v);}
 addEventListener(event,fn){this.events[event]=fn;}
 querySelectorAll(selector){
  const match=selector.match(/^\.([\w-]+)/);if(!match)return [];
  const found=[],onlyVisible=selector.includes(':not([hidden])');
  const scan=node=>{for(const child of node.children){if((child.className.split(' ').includes(match[1])||child.classList.contains(match[1]))&&(!onlyVisible||!child.hidden))found.push(child);scan(child);}};
  scan(this);return found;
 }
}
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
function fakeDocument(){const original=globalThis.document,nodes=new Map();globalThis.document={
 createElement:tag=>new Element(tag),getElementById:id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);}
};return {nodes,restore:()=>{globalThis.document=original;}};}

test('todas as receitas da fogueira ficam na sua interface exclusiva',()=>{
 assert.deepEqual(CAMPFIRE_RECIPES.slice().sort(),['cooked','grilledFish','stew'].sort());
 for(const id of CAMPFIRE_RECIPES)assert.equal(CRAFT_STATIONS[id],'campfire');
 assert.equal(buildingInteractionLabel({type:'campfire'}),'Cozinhar na fogueira');
});
test('mochila abre, atualiza e não exibe nenhum cartão de comida da fogueira',()=>{
 const d=fakeDocument();try{
  const state=createSurvival();
  const ui=createSurvivalUI({getState:()=>state,getBag:()=>Array(36).fill(null),getRotation:()=>0,
   getCraftStatus:id=>craftAvailability(state,id),onClose:()=>{},onCraft:()=>{},onRotate:()=>{},onDismantle:()=>{},onRepair:()=>{},onConsume:()=>{}});
  ui.open();ui.update(true);
  const all=d.nodes.get('recipe-list').querySelectorAll('.craft-card');
  const filtered=Object.keys(RECIPES).filter(id=>!CRAFT_STATIONS[id]);
  assert.equal(all.length,filtered.length);
  for(const id of CAMPFIRE_RECIPES)assert.ok(all.every(x=>!x.textContent.includes(RECIPES[id].label)));
  ui.close();ui.open();ui.update(true);
 }finally{d.restore();}
});
test('F na fogueira abre só a cozinha e permite fechar',()=>{
 const d=fakeDocument();try{
  let closed=0;const ui=createCampfireUI({getStatus:()=>({ok:false,reason:'Ingredientes insuficientes'}),onCraft:()=>false,onClose:()=>closed++});
  assert.equal(ui.isOpen,false);ui.open();assert.equal(ui.isOpen,true);
  assert.equal(d.nodes.get('campfire-recipes').children.length,3);
  assert.equal(d.nodes.get('campfire-panel').attributes['aria-hidden'],'false');
  assert.equal(d.nodes.get('campfire-recipes').children[0].disabled,true);
  d.nodes.get('campfire-close').onclick();assert.equal(ui.isOpen,false);assert.equal(closed,1);
  assert.equal(d.nodes.get('campfire-panel').attributes['aria-hidden'],'true');
 }finally{d.restore();}
});
test('cozinha habilita apenas receitas viáveis, respeita saldo e atualização após preparo',()=>{
 const d=fakeDocument();try{
  const state=createSurvival();state.inventory.meat=2;state.inventory.wood=3;
  let cooked=0;const ui=createCampfireUI({
   getStatus:id=>craftAvailability(state,id,{campfire:true}),
   onCraft:id=>{const result=craftItem(state,id,1,{campfire:true});if(result.ok)cooked++;return result.ok;},onClose:()=>{}
  });
  ui.open();const buttons=d.nodes.get('campfire-recipes').children;
  assert.equal(buttons[0].disabled,false);assert.equal(buttons[1].disabled,true);
  buttons[0].onclick();assert.equal(cooked,1);assert.equal(state.inventory.cooked,1);
  assert.equal(state.inventory.meat,1);assert.equal(state.inventory.wood,2);
  assert.match(d.nodes.get('campfire-message').textContent,/preparado/);
 }finally{d.restore();}
});
test('não cozinha à distância ou pela mochila, nem mistura bancada com fogueira',()=>{
 const main=read('src/main.js');
 assert.match(main,/item\.type==='campfire'\)\{return openCampfire\(\)/);
 assert.match(main,/CRAFT_STATIONS\[recipe\]==='campfire'&&\(!campfireUI\.isOpen\|\|!buildings\.near\('campfire',player\.position,6\)\)/);
 assert.match(main,/CRAFT_STATIONS\[recipe\]==='workbench'&&\(!workbenchUI\.isOpen\|\|!buildings\.near\('workbench',player\.position,6\)\)/);
 assert.match(main,/e\.code === 'Escape' && campfireUI\.isOpen/);
 assert.match(read('src/ui/survival-ui.js'),/CRAFT_STATIONS\[id\] && CRAFT_STATIONS\[id\]!=='hand'/);
});
test('fogão não altera inventário pronto; HTML, cache e scripts consistentes',()=>{
 const html=read('index.html');const pkg=JSON.parse(read('package.json'));
 for(const id of ['campfire-panel','campfire-recipes','campfire-close','campfire-stock','campfire-message'])assert.ok(html.includes(`id="${id}"`));
 assert.match(html,/data-build="2\.37\.0-campfire-ui|2\.38\.0-save-profiling|2\.39\.0-wildlife-quests|2\.40\.0-fauna-exploration|2\.41\.0-ecosystem|2\.42\.0-soundscape|2\.43\.0-foley|2\.44\.0-quiet-builds|2\.45\.0-stable-play|2\.46\.0-build-logistics"/);
 assert.equal(pkg.version,'2.46.0');
 assert.ok(pkg.scripts.test.includes('v237-campfire-ui.mjs'));
 assert.match(read('src/main.js'),/onClose:\(\)=>\{if\(gameActive\)resumeGame\(\);\}/);
 assert.match(html,/id="use-cooked"/);
});
console.log(`v2.37.0: ${count} novos testes aprovados`);
