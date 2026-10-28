import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BUILD_WHEEL_TYPES,BUILD_WHEEL_ICONS,wheelStep,buildCostText,createBuildWheelUI} from '../src/ui/build-wheel-ui.js';
import {STRUCTURE_TYPES} from '../src/world/building-rules.js';
import {RECIPES,createSurvival} from '../src/gameplay/survival.js';
import {beginPlacement,commitPlacement} from '../src/gameplay/placement.js';
let count=0;function test(label,run){run();console.log(`OK v2.20 ${++count}: ${label}`);}
const source=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('roda exibe exatamente os tipos físicos de construção',()=>{
 assert.deepEqual(BUILD_WHEEL_TYPES,STRUCTURE_TYPES);
 assert.equal(BUILD_WHEEL_TYPES.length,13);
 assert.equal(new Set(BUILD_WHEEL_TYPES).size,13);
});
test('todas as estruturas têm descrição, ícone e custo válido',()=>{
 for(const type of BUILD_WHEEL_TYPES){
  assert.ok(RECIPES[type]?.label);assert.ok(BUILD_WHEEL_ICONS[type]);
  assert.ok(Object.entries(RECIPES[type].cost).every(([,n])=>Number.isInteger(n)&&n>0));
 }
});
test('navegação roda nos dois sentidos sem sair da faixa',()=>{
 assert.equal(wheelStep(0,-1),12);assert.equal(wheelStep(12,1),0);
 assert.equal(wheelStep(4,-27),3);
});
test('custo apresenta quantidade real e quantidade requerida',()=>{
 assert.match(buildCostText({wood:4,stone:2},{wood:3,stone:9}),/3\/4/);
 assert.match(buildCostText({wood:4,stone:2},{wood:3,stone:9}),/9\/2/);
 assert.equal(buildCostText({}), '');
});
class Element{
 constructor(tag='div'){
  this.tag=tag;this.children=[];this.dataset={};this.style={};this.listeners={};this.attrs={};
  this._classes=new Set();this.classList={add:(x)=>this._classes.add(x),remove:(x)=>this._classes.delete(x),
   toggle:(x,on)=>{if(on===undefined)on=!this._classes.has(x);if(on)this._classes.add(x);else this._classes.delete(x);return on;},
   contains:(x)=>this._classes.has(x)};
 }
 append(...items){this.children.push(...items);for(const item of items)item.parentNode=this;}
 setAttribute(k,v){this.attrs[k]=String(v)}
 getAttribute(k){return this.attrs[k]}
 addEventListener(k,cb){this.listeners[k]=cb}
 focus(){this.listeners.focus?.()}
 click(){this.listeners.click?.()}
}
function mount(getAvailability=(type)=>({ok:type==='floor',reason:'Sem itens',cost:RECIPES[type].cost,stock:{wood:0,stone:0}})){
 const old=globalThis.document,root=new Element('section');
 const elements={'build-wheel':root};
 globalThis.document={getElementById:id=>elements[id],createElement:tag=>new Element(tag)};
 let selected=null,closed=0;
 const ui=createBuildWheelUI({getAvailability,onSelect:type=>(selected=type,true),onClose:()=>closed++});
 const ring=root.children[0],buttons=ring.children.slice(1);
 return {ui,root,buttons,get selected(){return selected},get closed(){return closed},restore(){globalThis.document=old}};
}
test('construtor insere treze botões com etiquetas e posições radiais únicas',()=>{
 const t=mount();try{
  assert.equal(t.buttons.length,13);
  assert.equal(new Set(t.buttons.map(b=>b.style.left+','+b.style.top)).size,13);
  assert.ok(t.buttons.every(b=>b.attrs['aria-label'].startsWith('Construir')));
 }finally{t.restore()}
});
test('abrir e fechar mantém aria-hidden e foco inicial acessível',()=>{
 const t=mount();try{
  t.ui.open();assert.equal(t.ui.isOpen,true);assert.equal(t.root.attrs['aria-hidden'],'false');
  assert.equal(t.buttons.find(b=>b._classes.has('selected')).dataset.type,'floor');
  t.ui.close();assert.equal(t.ui.isOpen,false);assert.equal(t.root.attrs['aria-hidden'],'true');
 }finally{t.restore()}
});
test('teclas de direção percorrem botões; Enter envia estrutura escolhida',()=>{
 const t=mount();try{
  t.ui.open();assert.equal(t.ui.keydown('ArrowRight'),true);
  const current=t.buttons.find(b=>b._classes.has('selected')).dataset.type;
  assert.equal(t.ui.keydown('Enter'),true);assert.equal(t.selected,current);
  assert.equal(t.ui.keydown('KeyW'),false);
 }finally{t.restore()}
});
test('clique no botão da roda seleciona mesmo quando sem material, sem mutar estoque',()=>{
 const before=createSurvival().inventory;
 const t=mount();try{
  t.ui.open();t.buttons[3].click();assert.equal(t.selected,BUILD_WHEEL_TYPES[3]);
  assert.deepEqual(createSurvival().inventory,before);
  assert.equal(t.buttons[3].dataset.available,'false');
 }finally{t.restore()}
});
test('a roda apenas inicia planejamento, confirmação é a única operação com débito',()=>{
 const state=createSurvival();state.inventory.wood=10;state.inventory.stone=10;
 const plan=beginPlacement('campfire');assert.ok(plan);assert.equal(state.inventory.wood,10);
 const result=commitPlacement({plan,position:{x:0,z:0},yaw:0,structures:[],
  canPlace:()=>true,canAfford:()=>true,
  spend:()=>{state.inventory.wood-=4;state.inventory.stone-=4;return true;},
  place:()=>({type:'campfire'}),refund:()=>{state.inventory.wood+=4;state.inventory.stone+=4;}});
 assert.equal(result.ok,true);assert.equal(state.inventory.wood,6);
});
test('botões de toque, botão PC e modal coexistem com inventário',()=>{
 const html=source('../index.html'),touch=source('../src/input/touch-controls.js');
 for(const id of ['build-toggle','build-wheel','touch-build','pause-build-btn','inventory-toggle','inventory-panel'])assert.ok(html.includes(`id="${id}"`));
 assert.match(touch,/onBuild/);assert.match(touch,/touch-build/);
});
test('main captura Z, Escape e setas e encaminha a seleção ao placement original',()=>{
 const main=source('../src/main.js');
 for(const needle of ['createBuildWheelUI','KeyZ','buildWheelUI.keydown(e.code)','startPlacement(type)','controls.unlock()','pointerlockchange'])assert.ok(main.includes(needle),needle);
 assert.ok(main.includes('buildWheelUI.isOpen'));
});
test('styles reservam camada própria sobre o jogo e mantêm adaptações mobile',()=>{
 const css=source('../styles/main.css');
 for(const needle of ['#build-wheel{','z-index:165','#build-wheel-ring{','.build-wheel-option{','#touch-build{','@media(pointer:coarse)'])assert.ok(css.includes(needle));
});
console.log(`v2.20: ${count} verificações aprovadas`);
