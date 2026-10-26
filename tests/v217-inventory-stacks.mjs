import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSurvival} from '../src/gameplay/survival.js';
import {createBag,restoreBag,validBag,bagTotals,reconcileBag,moveBagStack,splitBagStack,sortBag,BAG_SIZE} from '../src/gameplay/inventory-slots.js';
import {validateSave} from '../src/gameplay/save-system.js';
let n=0;const check=(description,run)=>{run();console.log(`OK v2.17 ${++n}: ${description}`);};
const stock=()=>createSurvival().inventory;
const sum=bag=>Object.values(bagTotals(bag)).reduce((a,b)=>a+b,0);
check('mochila cria exatamente 36 slots com quantidades antigas preservadas',()=>{
 const inventory=stock(),bag=createBag(inventory);
 assert.equal(bag.length,BAG_SIZE);assert.equal(bag.filter(Boolean).length,5);
 assert.ok(validBag(bag,inventory));assert.equal(sum(bag),Object.values(inventory).reduce((a,b)=>a+b,0));
});
check('troca de pilhas diferentes não altera nenhum total',()=>{
 const inventory=stock(),old=createBag(inventory);
 const result=moveBagStack(old,0,1);
 assert.ok(validBag(result,inventory));assert.equal(result[0].item,'stone');assert.equal(result[1].item,'wood');
 assert.equal(old[0].item,'wood');
});
check('mover entre posição vazia, juntar pilhas e dividir em duas',()=>{
 const inventory=stock(),bag=createBag(inventory);
 const placed=moveBagStack(bag,0,30);
 assert.ok(validBag(placed,inventory));assert.equal(placed[0],null);assert.equal(placed[30].count,2);
 const split=splitBagStack(placed,30,31);
 assert.ok(validBag(split,inventory));assert.equal(split[30].count,1);assert.equal(split[31].count,1);
 const merged=moveBagStack(split,31,30);
 assert.ok(validBag(merged,inventory));assert.equal(merged[31],null);assert.equal(merged[30].count,2);
});
check('divisão de pilha com uma unidade, fora do intervalo ou sobre posição ocupada é recusada',()=>{
 const b=createBag(stock());
 assert.equal(splitBagStack(b,1,28),null);assert.equal(splitBagStack(b,0,1),null);
 for(const bad of [-1,36,NaN,2.4,'5',null])assert.equal(moveBagStack(b,0,bad),null);
 assert.equal(moveBagStack(b,0,0),null);
 assert.equal(moveBagStack(b,0,30,0),null);
 assert.equal(moveBagStack(b,0,30,999),null);
 assert.equal(moveBagStack(b,0,1,1),null);
});
check('somas não mudam ao transferir 400 movimentos aleatórios',()=>{
 const inventory=stock();inventory.wood=999;inventory.berries=387;inventory.stone=450;
 let slots=createBag(inventory);let seed=1234567;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
 for(let i=0;i<400;i++){
   const a=random()%BAG_SIZE,b=random()%BAG_SIZE;
   const next=(i%3===0?splitBagStack(slots,a,b):moveBagStack(slots,a,b));
   if(next)slots=next;
   assert.ok(validBag(slots,inventory),'não pode criar ou perder itens');
 }
});
check('reconciliar coleta, gasto e baú respeita mudanças do estoque oficial',()=>{
 const inventory=stock();let slots=createBag(inventory);
 inventory.wood+=120;inventory.water=0;inventory.iron=7;
 slots=reconcileBag(slots,inventory);assert.ok(validBag(slots,inventory));
 inventory.wood=1;inventory.iron=0;inventory.berries=0;
 slots=reconcileBag(slots,inventory);assert.ok(validBag(slots,inventory));
 assert.ok(!slots.some(s=>s?.item==='berries'));
});
check('organizar junta pilhas e mantém todos os recursos',()=>{
 const inventory=stock();inventory.wood=99;
 let slots=createBag(inventory);
 slots=splitBagStack(slots,0,30);slots=splitBagStack(slots,0,31);
 assert.ok(validBag(slots,inventory));
 slots=sortBag(slots);assert.ok(validBag(slots,inventory));
 assert.equal(slots.filter(s=>s?.item==='wood').length,1);
});
check('migração: ausente cria grade; save adulterado é rejeitado',()=>{
 const inventory=stock(),old=restoreBag(undefined,inventory);
 assert.ok(validBag(old,inventory));
 const forged=structuredClone(old);forged[0].count+=100;
 assert.equal(restoreBag(forged,inventory),null);
 forged[0].count=inventory.wood;forged[0].item='__proto__';
 assert.equal(restoreBag(forged,inventory),null);
 const short=old.slice(0,35);assert.equal(restoreBag(short,inventory),null);
});
check('salvamento completo persiste organização e rejeita quantidades forjadas',()=>{
 const inventory=stock(),s=createSurvival();const slots=moveBagStack(createBag(inventory),0,30);
 const doc={version:2,seed:201,graphicsQuality:'medium',level:1,xp:0,kills:0,health:100,maxHealth:100,
 wave:1,elapsed:0,currentWeapon:0,player:{x:0,z:0,yaw:0},survival:s,resources:[],buildings:[],
 healthPacks:[],speedBoosts:[],enemies:[],inventorySlots:slots};
 const good=validateSave(doc);assert.ok(good);assert.equal(good.inventorySlots[30].item,'wood');
 assert.ok(validBag(good.inventorySlots,good.survival.inventory));
 doc.inventorySlots[30].count=999;assert.equal(validateSave(doc),null);
 delete doc.inventorySlots;assert.ok(validateSave(doc));
});
check('HTML e main conectam os botões, persistência e atualizações sem modificar survival.inventory',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../src/ui/survival-ui.js',import.meta.url),'utf8');
 for(const id of ['inventory-bag-actions','inventory-sort','inventory-split-toggle','inventory-items'])assert.ok(html.includes(`id="${id}"`));
 for(const text of ['inventorySlots=reconcileBag','inventorySlots,player:','inventorySlots=data.inventorySlots','onBagMove:changeBagPosition','onBagSort:organizeBag'])assert.ok(main.includes(text));
 for(const text of ['dragstart','dragover','drop','splitMode','onBagMove','getBag','inventoryMatches','onQuickAssign',"splitMode?'split':'move'"])assert.ok(ui.includes(text));
});
console.log(`v2.17: ${n} grupos de validação aprovados`);
