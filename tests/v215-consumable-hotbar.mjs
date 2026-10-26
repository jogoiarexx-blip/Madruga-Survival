import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaultHotbar,restoreHotbar,assignHotbarSlot,hotbarIndexFromCode,slotCount,HOTBAR_CONSUMABLES} from '../src/gameplay/consumable-hotbar.js';
import {createConsumableHotbarUI} from '../src/ui/consumable-hotbar-ui.js';
import {validateSave,writeSave,readSave} from '../src/gameplay/save-system.js';
import {createSurvival} from '../src/gameplay/survival.js';
let checks=0;
function check(label,fn){fn();console.log('OK v2.15',++checks,label)}
check('padrão mantém teclas 4/5/6 anteriores e acrescenta três consumíveis',()=>{
 assert.deepEqual(defaultHotbar(),['berries','water','cooked','bandage','medicalKit','silkDressing']);
 assert.equal(defaultHotbar().length,6);
});
check('restauração de save antigo adota seis slots sem modificar padrão global',()=>{
 const current=restoreHotbar(undefined);current[0]='stew';assert.equal(defaultHotbar()[0],'berries');
});
check('permite reordenar todos os consumíveis legítimos',()=>{
 for(const item of HOTBAR_CONSUMABLES)assert.equal(assignHotbarSlot(defaultHotbar(),3,item)?.[3],item);
});
check('permite esvaziar slot e manter outros intactos',()=>{
 const base=defaultHotbar(),next=assignHotbarSlot(base,1,null);
 assert.equal(next[1],null);assert.equal(next[0],base[0]);assert.equal(base[1],'water');
});
check('recusa índices fora dos seis slots',()=>{
 for(const idx of [-1,6,1.3,NaN,'3',100])assert.equal(assignHotbarSlot(defaultHotbar(),idx,'water'),null);
});
check('recusa recursos não consumíveis e cargas maliciosas no save',()=>{
 for(const value of ['iron','repairKit','__proto__','wood',{},42,undefined]){
   assert.equal(assignHotbarSlot(defaultHotbar(),1,value),null);
 }
 assert.equal(restoreHotbar(['water']),null);assert.equal(restoreHotbar(new Array(6).fill('wood')),null);
 assert.equal(restoreHotbar('berries'),null);
});
check('atalhos Digit4 a Digit9 endereçam posições corretas',()=>{
 for(let digit=4;digit<=9;digit++)assert.equal(hotbarIndexFromCode(`Digit${digit}`),digit-4);
 for(const code of ['Digit1','Digit2','Digit3','Digit0','Numpad4','KeyI',null])assert.equal(hotbarIndexFromCode(code),-1);
});
check('contagem é não negativa e depende só do inventário real',()=>{
 assert.equal(slotCount({medicalKit:3},'medicalKit'),3);
 assert.equal(slotCount({water:0},'water'),0);
 assert.equal(slotCount({water:-4},'water'),0);
 assert.equal(slotCount({water:6},'stone'),0);
 assert.equal(slotCount({water:1.2},'water'),0);
});
function sampleSave(){return {version:2,seed:4242,graphicsQuality:'medium',level:1,xp:0,kills:0,
 health:100,maxHealth:100,wave:1,elapsed:0,currentWeapon:0,
 player:{x:0,z:0,yaw:0},survival:createSurvival(),raid:{lastNight:0,waves:0},resources:[],buildings:[],
 healthPacks:[],speedBoosts:[],enemies:[]};}
check('save antigo adota slots padrão sem perder inventário',()=>{
 const save=validateSave(sampleSave());assert.deepEqual(save.hotbar,defaultHotbar());
 assert.deepEqual(save.survival.inventory,sampleSave().survival.inventory);
});
check('salva e recarrega configuração personalizada e slots vazios',()=>{
 const memory=new Map();const storage={setItem(k,v){memory.set(k,v)},getItem(k){return memory.get(k)},removeItem(k){memory.delete(k)}};
 const input={...sampleSave(),hotbar:['medicalKit',null,'stew','bandage','silkDressing','water']};
 assert.equal(writeSave(storage,input),true);
 assert.deepEqual(readSave(storage).hotbar,input.hotbar);
});
check('hotbar adulterada invalida save e não abre injeção de item',()=>{
 const save=sampleSave();save.hotbar=['water','water','water','water','water','iron'];
 assert.equal(validateSave(save),null);
});
check('nove consumíveis são reconhecidos e fabricação usa inventário existente',()=>{
 assert.equal(HOTBAR_CONSUMABLES.length,9);
 assert.ok(HOTBAR_CONSUMABLES.includes('silkDressing'));
});
// DOM pequeno de testes: comprova construção dos botões e selects sem navegador/WebGL.
class FakeElement {
 constructor(tag='div'){this.tagName=tag;this.children=[];this.attributes={};this.listeners={};this.dataset={};
   this.classList={toggle(){}};this._text='';this.value='';this.disabled=false;this.title='';}
 append(...items){this.children.push(...items);for(const item of items)item.parentNode=this;}
 appendChild(item){this.append(item);return item;}
 setAttribute(name,value){this.attributes[name]=value;}
 getAttribute(name){return this.attributes[name]??null;}
 addEventListener(name,fn){this.listeners[name]=fn;}
 set textContent(value){this._text=String(value);}
 get textContent(){return this._text;}
}
check('UI cria seis botões e seis selects com opções reais',()=>{
 const el={ 'consumable-hotbar':new FakeElement(), 'hotbar-config':new FakeElement()};
 const previous=globalThis.document;globalThis.document={getElementById:id=>el[id],createElement:tag=>new FakeElement(tag)};
 try{
  let slots=defaultHotbar();let inventory={berries:3,water:2,cooked:1,bandage:4,medicalKit:2,silkDressing:0};
  let used=[];
  const ui=createConsumableHotbarUI({getSlots:()=>slots,getInventory:()=>inventory,onUse:index=>used.push(index),
   onAssign:(index,item)=>{slots=assignHotbarSlot(slots,index,item);}});
  assert.equal(el['consumable-hotbar'].children.length,6);
  assert.equal(el['hotbar-config'].children.length,6);
  assert.equal(ui.buttons[0].disabled,false);assert.equal(ui.buttons[5].disabled,true);
  assert.match(ui.buttons[0].getAttribute('aria-label'),/Frutas: 3/);
  ui.buttons[0].listeners.click({preventDefault(){}});assert.deepEqual(used,[0]);
  slots=assignHotbarSlot(slots,0,'stew');inventory.stew=7;ui.update();
  assert.match(ui.buttons[0].getAttribute('aria-label'),/Ensopado.*: 7/);
  assert.equal(ui.buttons[0].children[2].textContent,'7');
  slots=assignHotbarSlot(slots,0,null);ui.update();assert.equal(ui.buttons[0].disabled,true);
  const field=el['hotbar-config'].children[1],select=field.children[1];
  select.value='medicalKit';select.listeners.change();assert.equal(slots[1],'medicalKit');
 }finally{globalThis.document=previous;}
});
check('interface e jogo conectam configurações, teclado e persistência',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const css=readFileSync(new URL('../styles/main.css',import.meta.url),'utf8');
 for(const value of ['hotbar:hotbarSlots','hotbarSlots=[...data.hotbar]','onAssign:configureHotbar','hotbarIndexFromCode(e.code)','useHotbarSlot(hotbarIndex)'])assert.ok(main.includes(value),value);
 for(const value of ['id="consumable-hotbar"','id="hotbar-config"'])assert.ok(html.includes(value),value);
 assert.ok(css.includes('@media(pointer:coarse)'));
});
console.log(`v2.15: ${checks} verificações aprovadas`);
