import assert from 'node:assert/strict';
import {createSurvival,DAY_SECONDS} from '../src/gameplay/survival.js';
import {CHEST_CAPACITY,validChestItems,transferItem,sleepInBed,totalStored} from '../src/gameplay/storage.js';
import {writeSave,readSave,validateSave} from '../src/gameplay/save-system.js';
const ok=(label,fn)=>{fn();console.log('OK baú/descanso:',label);};
ok('guarda, retira e mantém a contagem sem criar itens',()=>{
 const s=createSurvival();s.inventory.wood=24;
 const chest={items:{}};
 assert.equal(transferItem(s,chest,'wood','store',5),5);
 assert.equal(s.inventory.wood,19);assert.equal(chest.items.wood,5);
 assert.equal(transferItem(s,chest,'wood','take',1),1);
 assert.equal(s.inventory.wood,20);assert.equal(chest.items.wood,4);
 assert.equal(s.inventory.wood+chest.items.wood,24);
});
ok('recusa estourar capacidade e respeita máximo de 999 na mochila',()=>{
 const s=createSurvival();s.inventory.wood=100;const chest={items:{stone:79}};
 assert.equal(transferItem(s,chest,'wood','store',99),1);
 assert.equal(totalStored(chest.items),CHEST_CAPACITY);
 assert.equal(transferItem(s,chest,'wood','store',1),0);
 s.inventory.wood=999;assert.equal(transferItem(s,chest,'wood','take',1),0);
});
ok('rejeita itens maliciosos e mudanças de quantidade inválida',()=>{
 const s=createSurvival();const c={items:{}};
 assert.equal(validChestItems({wood:-1}),false);
 assert.equal(validChestItems({water:55,wood:50}),false);
 assert.equal(validChestItems({hacked:1}),false);
 assert.equal(transferItem(s,c,'bogus','store',1),0);
 assert.equal(transferItem(s,c,'water','store',0),0);
});
ok('cama só funciona à noite e avança até amanhecer',()=>{
 const s=createSurvival();assert.equal(sleepInBed(s).ok,false);
 s.time=DAY_SECONDS*.9;const r=sleepInBed(s);
 assert.equal(r.ok,true);assert.equal(s.days,2);
 assert.ok(Math.abs(s.time-DAY_SECONDS*1.24)<1e-7);
 assert.equal(s.stamina,100);
 assert.equal(sleepInBed(s).ok,false);
});
ok('dormir antes da madrugada não pula dois dias e exige comida',()=>{
 const s=createSurvival();s.time=DAY_SECONDS*1.10;s.hunger=14;
 assert.equal(sleepInBed(s).ok,false);s.hunger=50;
 assert.equal(sleepInBed(s).ok,true);assert.equal(s.days,2);
 assert.ok(Math.abs(s.time-DAY_SECONDS*1.24)<1e-7);
});
const save=()=>({seed:1,graphicsQuality:'low',level:1,xp:0,kills:0,health:90,maxHealth:100,wave:1,
 elapsed:10,currentWeapon:0,player:{x:0,z:0,yaw:0},survival:createSurvival(),
 resources:[],healthPacks:[],speedBoosts:[],enemies:[],
 buildings:[{type:'floor',x:3,z:3,rotation:0},{type:'wall',x:6,z:3,rotation:1},
 {type:'door',x:3,z:6,rotation:0,open:true},{type:'bed',x:6,z:6,rotation:2},
 {type:'chest',x:0,z:3,rotation:3,items:{wood:12,stone:5}}]});
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)}};
ok('salva e reabre cama, porta, baú e itens sem perder saves anteriores',()=>{
 const db=storage();assert.equal(writeSave(db,save()),true);
 assert.deepEqual(readSave(db).buildings,save().buildings);
 const legacy=save();legacy.buildings=[{type:'campfire',x:1,z:1},{type:'shelter',x:9,z:9}];
 assert.equal(writeSave(db,legacy),true);
 assert.deepEqual(readSave(db).buildings,legacy.buildings);
});
ok('save rejeita baús forjados e portas com rotações inválidas',()=>{
 const s=save();s.buildings[4].items={wood:82};assert.equal(validateSave({version:2,...s}),null);
 s.buildings[4].items={wood:12};s.buildings[2].rotation=9;
 assert.equal(validateSave({version:2,...s}),null);
});
