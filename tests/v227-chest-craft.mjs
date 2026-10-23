import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSurvival,RECIPES} from '../src/gameplay/survival.js';
import {craftAvailability,craftItem,eligibleCraftChests,materialStock,reserveCraftMaterials} from '../src/gameplay/crafting.js';
import {commitPlacement,beginPlacement} from '../src/gameplay/placement.js';
let checks=0;const test=(name,fn)=>{fn();console.log('OK craft v2.2.7',++checks,name)};
function chest(items){return {type:'chest',x:0,z:0,items:{...items}}}
test('baús válidos entram no estoque; inválidos e duplicados são descartados',()=>{
 const s=createSurvival(),c=chest({wood:6,stone:4});
 assert.equal(eligibleCraftChests([c,c,chest({wood:1000}),chest({gold:2})]).length,1);
 assert.equal(materialStock(s,'wood',[c,c]),s.inventory.wood+6);
 assert.equal(materialStock(s,'gold',[c]),0);
});
test('craft de marreta usa madeira da mochila e pedra do baú',()=>{
 const s=createSurvival(),box=chest({wood:3,stone:4});
 const status=craftAvailability(s,'hammer',{chests:[box]});
 assert.equal(status.ok,true);assert.equal(status.fromChests,true);
 const result=craftItem(s,'hammer',1,{chests:[box]});
 assert.equal(result.ok,true);assert.equal(result.fromChests,true);
 assert.equal(s.crafted.hammer,true);
 assert.equal(s.inventory.wood,0);assert.equal(s.inventory.stone,0);
 assert.equal(box.items.wood,2);assert.equal(box.items.stone,1);
});
test('criação de 5 bandagens combina recursos de vários baús',()=>{
 const s=createSurvival();s.inventory.fiber=1;s.inventory.water=1;
 const a=chest({fiber:9,water:2}),b=chest({fiber:5,water:2});
 const state=craftAvailability(s,'bandage',{chests:[a,b]});
 assert.ok(state.maxBatch>=5);
 const r=craftItem(s,'bandage',5,{chests:[a,b]});
 assert.equal(r.ok,true);assert.equal(s.inventory.bandage,5);
 assert.equal(s.inventory.fiber+a.items.fiber+b.items.fiber,0);
 assert.equal(s.inventory.water+a.items.water+b.items.water,0);
});
test('sem estoque suficiente não há débito parcial',()=>{
 const s=createSurvival(),c=chest({wood:3});
 const before=JSON.stringify([s.inventory,c.items]);
 const r=reserveCraftMaterials(s,{wood:6,stone:20},[c]);
 assert.equal(r.ok,false);assert.equal(JSON.stringify([s.inventory,c.items]),before);
 assert.equal(craftItem(s,'hammer',1,{chests:[c]}).ok,false);
 assert.equal(JSON.stringify([s.inventory,c.items]),before);
});
test('refund volta exatamente a cada origem e só pode acontecer uma vez',()=>{
 const s=createSurvival(),c=chest({wood:7,stone:7});
 const old=JSON.stringify([s.inventory,c.items]);
 const transaction=reserveCraftMaterials(s,{wood:5,stone:5},[c]);
 assert.equal(transaction.ok,true);assert.equal(transaction.refund(),true);
 assert.equal(JSON.stringify([s.inventory,c.items]),old);
 assert.equal(transaction.refund(),false);
 assert.equal(JSON.stringify([s.inventory,c.items]),old);
});
test('falha de posicionamento retorna materiais para baú e mochila',()=>{
 const s=createSurvival(),c=chest({wood:3,stone:5});
 const old=JSON.stringify([s.inventory,c.items]);
 let transaction;
 const plan=beginPlacement('campfire');
 const r=commitPlacement({plan,position:{x:0,z:0},yaw:0,canPlace:()=>true,
  canAfford:()=>craftAvailability(s,'campfire',{chests:[c]}).ok,
  spend:()=>{transaction=reserveCraftMaterials(s,RECIPES.campfire.cost,[c]);return transaction.ok},
  place:()=>null,refund:()=>transaction.refund()});
 assert.equal(r.ok,false);
 assert.equal(JSON.stringify([s.inventory,c.items]),old);
});
test('baú distante não é usado e melhoria exige bancada',()=>{
 const s=createSurvival(),c=chest({wood:40,stone:40,iron:40});
 assert.equal(craftAvailability(s,'hammer').ok,false);
 assert.equal(craftAvailability(s,'pickaxe',{chests:[c]}).ok,false);
 assert.equal(craftAvailability(s,'pickaxe',{chests:[c],workbench:true}).ok,true);
});
test('produção não estoura mochila nem consome material dos baús à toa',()=>{
 const s=createSurvival(),c=chest({fiber:70,water:10});s.inventory.bandage=998;
 const previous=JSON.stringify([s.inventory,c.items]);
 const r=craftItem(s,'bandage',5,{chests:[c]});
 assert.equal(r.ok,false);assert.equal(JSON.stringify([s.inventory,c.items]),previous);
});
test('os vínculos de interface e construção utilizam o mesmo fluxo transacional',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 for(const s of ['nearbyCraftChests()','hasConstructionMaterials','reservation?.refund()','chests:nearbyCraftChests()'])
  assert.ok(main.includes(s),s);
 assert.match(html,/baús a até 6 metros/);
});
console.log('QA v2.2.7:',checks,'testes');
