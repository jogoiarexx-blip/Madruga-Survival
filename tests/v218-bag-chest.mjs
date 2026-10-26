import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSurvival,RESOURCES} from '../src/gameplay/survival.js';
import {createBag,validBag,moveBagStack,sortBag,reconcileBag} from '../src/gameplay/inventory-slots.js';
import {planStoreBagStack,planTakeFromChest} from '../src/gameplay/bag-storage.js';
import {validChestItems,totalStored} from '../src/gameplay/storage.js';
import {validateSave,writeSave,readSave} from '../src/gameplay/save-system.js';
let testCount=0;
const test=(description,fn)=>{fn();console.log(`OK v2.18 ${++testCount}: ${description}`);};
const fresh=()=>{const inventory=createSurvival().inventory;inventory.wood=250;inventory.stone=60;inventory.iron=100;return {inventory,bag:createBag(inventory),chest:{}};};
const globalCount=(inventory,chest)=>Object.fromEntries(Object.keys(RESOURCES).map(k=>[k,inventory[k]+(chest[k]||0)]));
const commit=(ctx,plan)=>{ctx.inventory=plan.inventory;ctx.bag=plan.bag;ctx.chest=plan.items;};
test('quantidade exata preserva todas as contagens ao dividir',()=>{
 const ctx=fresh();const ix=ctx.bag.findIndex(s=>s?.item==='wood');
 for(const amount of [1,7,49,80]){
   const empty=ctx.bag.indexOf(null);
   const result=moveBagStack(ctx.bag,ix,empty,amount);
   assert.ok(result);assert.ok(validBag(result,ctx.inventory));
   assert.equal(result[empty].count,amount);ctx.bag=result;
 }
});
test('quantidades zero, negativas, fracionadas e maiores que a pilha não mudam o estoque',()=>{
 const ctx=fresh();const src=ctx.bag.findIndex(x=>x?.item==='wood');const target=ctx.bag.indexOf(null);
 for(const bad of [0,-1,1.1,'2',NaN,Infinity,1000,251])assert.equal(moveBagStack(ctx.bag,src,target,bad),null);
 assert.ok(validBag(ctx.bag,ctx.inventory));
});
test('guardar apenas parte de uma pilha no baú preserva a soma total',()=>{
 const ctx=fresh();const before=globalCount(ctx.inventory,ctx.chest);const src=ctx.bag.findIndex(x=>x?.item==='wood');
 commit(ctx,planStoreBagStack(ctx.inventory,ctx.bag,ctx.chest,src,20));
 assert.equal(ctx.chest.wood,20);assert.equal(ctx.bag[src].count,230);
 assert.deepEqual(globalCount(ctx.inventory,ctx.chest),before);assert.ok(validBag(ctx.bag,ctx.inventory));
});
test('guardar mais que o baú comporta ou o slot possui não realiza movimento parcial',()=>{
 const ctx=fresh();ctx.chest={stone:78};const old=structuredClone(ctx);
 const src=ctx.bag.findIndex(x=>x?.item==='wood');
 assert.equal(planStoreBagStack(ctx.inventory,ctx.bag,ctx.chest,src,3),null);
 assert.equal(planStoreBagStack(ctx.inventory,ctx.bag,ctx.chest,src,81),null);
 assert.equal(planStoreBagStack(ctx.inventory,ctx.bag,ctx.chest,src,999),null);
 assert.deepEqual(ctx,old);
});
test('retirar pilha do baú atualiza a mochila física e não perde itens',()=>{
 const ctx=fresh();ctx.chest={chitin:35};const before=globalCount(ctx.inventory,ctx.chest);
 commit(ctx,planTakeFromChest(ctx.inventory,ctx.bag,ctx.chest,'chitin',12));
 assert.equal(ctx.chest.chitin,23);assert.equal(ctx.inventory.chitin,12);
 assert.equal(ctx.bag.filter(s=>s?.item==='chitin').reduce((n,s)=>n+s.count,0),12);
 assert.deepEqual(globalCount(ctx.inventory,ctx.chest),before);
});
test('retirada inválida não altera estoque e não estoura o limite por tipo',()=>{
 const ctx=fresh();ctx.chest={wood:5};
 ctx.inventory.wood=999;ctx.bag=reconcileBag(ctx.bag,ctx.inventory);
 assert.equal(planTakeFromChest(ctx.inventory,ctx.bag,ctx.chest,'wood',1),null);
 for(const bad of [0,-2,81,1.1,'1',NaN])assert.equal(planTakeFromChest(ctx.inventory,ctx.bag,ctx.chest,'wood',bad),null);
 assert.equal(planTakeFromChest(ctx.inventory,ctx.bag,ctx.chest,'__proto__',1),null);
});
test('comportamento do baú permanece válido com várias operações consecutivas',()=>{
 const ctx=fresh();ctx.chest={};
 const baseline=globalCount(ctx.inventory,ctx.chest);
 const src=ctx.bag.findIndex(s=>s?.item==='wood');
 for(let i=0;i<60;i++){
   const n=(i%7)+1;
   const plan=planStoreBagStack(ctx.inventory,ctx.bag,ctx.chest,src,n);
   if(plan)commit(ctx,plan);
   const take=planTakeFromChest(ctx.inventory,ctx.bag,ctx.chest,'wood',Math.min(n,ctx.chest.wood||0));
   if(take)commit(ctx,take);
   assert.ok(validChestItems(ctx.chest));assert.ok(validBag(ctx.bag,ctx.inventory));
   assert.equal(totalStored(ctx.chest)<=80,true);
   assert.deepEqual(globalCount(ctx.inventory,ctx.chest),baseline);
 }
});
test('400 trocas, divisões, depósitos e retiradas conservam os recursos',()=>{
 const ctx=fresh();let seed=7621;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
 const baseline=globalCount(ctx.inventory,ctx.chest);
 for(let i=0;i<400;i++){
   const from=random()%36,to=random()%36,qty=random()%18+1;
   let plan=null;
   if(i%4===0)ctx.bag=moveBagStack(ctx.bag,from,to,qty)||ctx.bag;
   else if(i%4===1)ctx.bag=moveBagStack(ctx.bag,from,to)||ctx.bag;
   else if(i%4===2)plan=planStoreBagStack(ctx.inventory,ctx.bag,ctx.chest,from,qty);
   else plan=planTakeFromChest(ctx.inventory,ctx.bag,ctx.chest,'wood',qty);
   if(plan)commit(ctx,plan);
   assert.ok(validBag(ctx.bag,ctx.inventory));assert.ok(validChestItems(ctx.chest));
   assert.deepEqual(globalCount(ctx.inventory,ctx.chest),baseline);
 }
 ctx.bag=sortBag(ctx.bag);assert.ok(validBag(ctx.bag,ctx.inventory));
});
test('depósito e retirada mantêm baú e posições ao salvar e reabrir o jogo',()=>{
 const ctx=fresh();
 const first=ctx.bag.findIndex(s=>s?.item==='wood');
 commit(ctx,planStoreBagStack(ctx.inventory,ctx.bag,ctx.chest,first,17));
 const state=createSurvival();state.inventory={...ctx.inventory};
 const doc={version:2,seed:201,graphicsQuality:'medium',level:1,xp:0,kills:0,health:100,maxHealth:100,
   wave:1,elapsed:0,currentWeapon:0,player:{x:0,z:0,yaw:0},survival:state,
   resources:[],buildings:[{x:5,z:3,type:'chest',rotation:0,open:false,items:ctx.chest}],
   healthPacks:[],speedBoosts:[],enemies:[],inventorySlots:ctx.bag};
 const valid=validateSave(doc);assert.ok(valid);assert.equal(valid.buildings[0].items.wood,17);
 let saved='';const storage={setItem(_,v){saved=v;},getItem(){return saved;}};
 assert.equal(writeSave(storage,doc),true);
 const loaded=readSave(storage);assert.ok(loaded);assert.ok(validBag(loaded.inventorySlots,loaded.survival.inventory));
 assert.equal(loaded.survival.inventory.wood,233);
 assert.equal(loaded.buildings[0].items.wood,17);
});
test('UI, controle numérico, baú próximo e equipamento visual aparecem no jogo real',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../src/ui/survival-ui.js',import.meta.url),'utf8');
 for(const id of ['inventory-nearby-chest','inventory-chest-resource','inventory-store-selected','inventory-chest-take',
   'equipment-slot-vest','equipment-slot-boots','equipment-slot-padding'])assert.ok(html.includes(`id="${id}"`),id);
 for(const check of ['planStoreBagStack','planTakeFromChest','getNearbyChest:closestAccessibleChest','onBagStore:storeSelectedStack','onChestTake:withdrawChestResource'])assert.ok(main.includes(check),check);
 for(const check of ["stackQuantity.type='number'",'onBagStore','onChestTake','dragover','getNearbyChest','equipment-visual-slot'])assert.ok((ui+html).includes(check),check);
});
console.log(`v2.18: ${testCount} grupos de testes concluídos`);
