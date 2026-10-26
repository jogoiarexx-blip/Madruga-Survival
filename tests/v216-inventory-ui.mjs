import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {INVENTORY_SECTIONS,INVENTORY_DRAG_TYPE,canPlaceOnHotbar,inventoryMatches,getQuickSlot,inventoryCategory} from '../src/gameplay/inventory-ui-logic.js';
import {RESOURCES} from '../src/gameplay/survival.js';
import {defaultHotbar,assignHotbarSlot,HOTBAR_CONSUMABLES} from '../src/gameplay/consumable-hotbar.js';
import {createConsumableHotbarUI} from '../src/ui/consumable-hotbar-ui.js';
let checks=0;
function check(name,cb){cb();checks++;console.log('OK v2.16',checks,name);}
check('cada recurso aparece em exatamente uma categoria',()=>{
 const keys=Object.values(INVENTORY_SECTIONS).flat();
 assert.equal(new Set(keys).size,keys.length);
 assert.deepEqual([...keys].sort(),Object.keys(RESOURCES).sort());
 for(const key of keys)assert.ok(inventoryCategory(key));
});
check('filtro por categoria e busca são independentes do estoque',()=>{
 assert.equal(inventoryMatches('water',{category:'basics'}),true);
 assert.equal(inventoryMatches('water',{category:'food'}),false);
 assert.equal(inventoryMatches('medicalKit',{category:'support',query:'médico'}),true);
 assert.equal(inventoryMatches('wood',{category:'all',query:'Madeira'}),true);
 assert.equal(inventoryMatches('__proto__',{category:'all'}),false);
});
check('somente nove consumíveis são elegíveis a hotbar',()=>{
 for(const name of HOTBAR_CONSUMABLES)assert.equal(canPlaceOnHotbar(name),true);
 for(const name of ['wood','iron','repairKit','__proto__',42,null])assert.equal(canPlaceOnHotbar(name),false);
});
check('atribuição rápida usa slot vazio, sem substituir outros',()=>{
 const old=defaultHotbar();assert.equal(getQuickSlot(old,'berries'),0);
 assert.equal(getQuickSlot(old,'stew'),-1);
 const withEmpty=assignHotbarSlot(old,3,null);
 assert.equal(getQuickSlot(withEmpty,'stew'),3);
 assert.deepEqual(old,defaultHotbar());
 assert.equal(getQuickSlot(withEmpty,'iron'),-1);
});
class FakeElement{
 constructor(tag='div'){
  this.tagName=tag;this.children=[];this.dataset={};this.attributes={};this.listeners={};
  this.classList={toggle(){},add(){},remove(){}};
  this.value='';this.disabled=false;this.title='';this._text='';
 }
 append(...nodes){this.children.push(...nodes);for(const n of nodes)n.parentNode=this;}
 appendChild(child){this.append(child);return child;}
 setAttribute(k,v){this.attributes[k]=v;} getAttribute(k){return this.attributes[k]??null;}
 addEventListener(k,cb){this.listeners[k]=cb;}
 set textContent(v){this._text=String(v);}get textContent(){return this._text;}
 focus(){this.focused=true;}
}
check('clique/toque em alvo selecionado configura atalho sem consumir item',()=>{
 const root={'consumable-hotbar':new FakeElement(),'hotbar-config':new FakeElement()};
 const old=globalThis.document;
 globalThis.document={getElementById:id=>root[id],createElement:t=>new FakeElement(t)};
 try{
  let slots=defaultHotbar(),selected='stew',used=0;
  const ui=createConsumableHotbarUI({getSlots:()=>slots,getInventory:()=>({stew:4}),onUse:()=>used++,
   onAssign:(index,item)=>{const next=assignHotbarSlot(slots,index,item);if(!next)return false;slots=next;return true;},
   getSelectedItem:()=>selected,onSelectSlot:index=>{const next=assignHotbarSlot(slots,index,selected);if(!next)return false;slots=next;selected=null;return true;}});
  const target=root['hotbar-config'].children[2].children[2];
  assert.equal(target.tagName,'button');target.listeners.click();
  assert.equal(slots[2],'stew');assert.equal(used,0);assert.equal(selected,null);
  ui.update();assert.equal(target.getAttribute('aria-label'),'Colocar item selecionado no atalho 6');
 }finally{globalThis.document=old;}
});
check('arrastar item válido define somente o atalho e rejeita carga maliciosa',()=>{
 const root={'consumable-hotbar':new FakeElement(),'hotbar-config':new FakeElement()};
 const old=globalThis.document;globalThis.document={getElementById:id=>root[id],createElement:t=>new FakeElement(t)};
 try{
  const items={water:3,iron:9};let slots=defaultHotbar(),changed=0;
  createConsumableHotbarUI({getSlots:()=>slots,getInventory:()=>items,onUse:()=>{},
   onAssign:(idx,key)=>{const next=assignHotbarSlot(slots,idx,key);if(!next)return false;slots=next;changed++;return true;}});
  const target=root['hotbar-config'].children[3].children[2];
  const makeEvent=item=>({preventDefault(){},dataTransfer:{types:[INVENTORY_DRAG_TYPE],getData:()=>item}});
  target.listeners.dragover(makeEvent('water'));
  target.listeners.drop(makeEvent('water'));
  assert.equal(slots[3],'water');assert.equal(changed,1);assert.equal(items.water,3);
  target.listeners.drop(makeEvent('iron'));
  target.listeners.drop(makeEvent('__proto__'));
  assert.equal(changed,1);
 }finally{globalThis.document=old;}
});
check('DOM real contém busca, filtros, slots e painel de equipamentos',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../src/ui/survival-ui.js',import.meta.url),'utf8');
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../styles/main.css',import.meta.url),'utf8');
 for(const id of ['inventory-search','inventory-category-tabs','inventory-selection-help','inventory-items','hotbar-config','equipment-main-value'])
  assert.ok(html.includes(`id="${id}"`));
 for(const fragment of ['dragstart','onQuickAssign','inventoryMatches','aria-pressed','getSelectedItem'])assert.ok(ui.includes(fragment));
 for(const fragment of ['getQuickSlot(hotbarSlots,key)','onSelectSlot:index','onQuickAssign:quickAssignInventoryItem'])assert.ok(main.includes(fragment));
 assert.ok(css.includes('prefers-reduced-motion:reduce'));
});
console.log(`v2.16: ${checks} novos grupos de verificações passaram`);
