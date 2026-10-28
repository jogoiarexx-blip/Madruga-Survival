import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {collectCargo,cargoCount,depositCargo,handoffCargo,validGuardCargo,GUARD_CARGO_LIMIT} from '../src/gameplay/guard-cargo.js';
import {selectGuardWork} from '../src/gameplay/guard-work.js';
import {restoreGuard,validGuard} from '../src/characters/villager-guard.js';
import {walkSurfaceHeight,PLATFORM_HEIGHT} from '../src/world/build-walk-surface.js';
import {snapTargets} from '../src/world/build-snapping.js';
import {STRUCTURE_TYPES,preparePlacement,canPlaceAmong} from '../src/world/building-rules.js';
import {RECIPES,createSurvival} from '../src/gameplay/survival.js';
import {craftCategory,craftAvailability} from '../src/gameplay/crafting.js';
import {validateSave} from '../src/gameplay/save-system.js';
import {defaultHotbar} from '../src/gameplay/consumable-hotbar.js';
import {createBag} from '../src/gameplay/inventory-slots.js';
import {totalStored,validChestItems} from '../src/gameplay/storage.js';
let done=0;
const test=(name,fn)=>{fn();console.log('✓ v2.46 '+(++done)+' '+name);};
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Chaves transporta em carga própria, máximo 18 e sem tocar na mochila',()=>{
 const cargo={},inventory={wood:3};
 assert.equal(collectCargo(cargo,'wood',12),12);
 assert.equal(collectCargo(cargo,'stone',12),6);
 assert.equal(collectCargo(cargo,'iron',5),0);
 assert.equal(cargoCount(cargo),18);assert.equal(inventory.wood,3);assert.equal(validGuardCargo(cargo),true);
 assert.equal(validGuardCargo({wood:19}),false);
});
test('depósito respeita espaço, preserva o restante e jamais duplica',()=>{
 const cargo={wood:8,stone:4},chest={berries:75};
 assert.equal(depositCargo(cargo,chest),5);
 assert.equal(totalStored(chest),80);assert.equal(cargoCount(cargo),7);
 assert.equal(depositCargo(cargo,chest),0);
 assert.equal(depositCargo(cargo,{hack:1}),0);
 const chest2={};assert.equal(depositCargo(cargo,chest2),7);
 assert.equal(totalStored(chest2),7);assert.equal(cargoCount(cargo),0);
 assert.equal(validChestItems(chest2),true);
});
test('baú cheio causa entrega presencial limitada a 999 por item',()=>{
 const cargo={wood:7,stone:3},inventory={wood:998,stone:10};
 assert.equal(handoffCargo(cargo,inventory),4);
 assert.deepEqual(inventory,{wood:999,stone:13});assert.deepEqual(cargo,{wood:6});
});
test('ordem de trabalho encontra baú e seleciona depósito ao lotar carga',()=>{
 const pos={x:10,z:2},base={x:0,z:0};
 const chest={type:'chest',x:3,z:0,items:{wood:10}};
 const nodes=[{x:12,z:2,cooldown:0,type:'wood'}];
 const inv={wood:5,seeds:0,water:0};
 const result=selectGuardWork(pos,base,nodes,[chest],inv,{cargo:{wood:7},player:{x:5,z:5}});
 assert.equal(result.kind,'deposit');assert.equal(result.target,chest);
 const hand=selectGuardWork(pos,base,nodes,[{...chest,items:{wood:80}}],inv,
   {cargo:{wood:7},player:{x:5,z:5}});
 assert.equal(hand.kind,'handoff');assert.equal(hand.x,5);
});
test('cargo é salvo no guard sem quebrar as partidas antigas',()=>{
 const old={recruited:true,hp:70,x:2,z:3,mode:'gather'};
 assert.deepEqual(restoreGuard(old),old);
 assert.deepEqual(restoreGuard({...old,cargo:{wood:8}}).cargo,{wood:8});
 assert.equal(validGuard({...old,cargo:{stone:19}}),false);
 assert.equal(validGuard({...old,cargo:{silver:1}}),false);
});
test('encaixe reconhece janelas junto ao piso e paredes existentes',()=>{
 const floor={type:'floor',x:0,z:0,rotation:0};
 const candidates=snapTargets('window',0,[floor],{x:0,z:1.4});
 assert.ok(candidates.some(a=>a.label==='borda do piso'&&Math.abs(a.z-1.5)<1e-6));
 const wall={type:'wall',x:0,z:1.5,rotation:0};
 assert.ok(snapTargets('window',0,[wall],{x:3,z:1.5}).some(a=>a.label==='continuação da parede'));
});
test('escada e plataforma disponíveis, sem custo oculto ou sobreposição',()=>{
 assert.ok(STRUCTURE_TYPES.includes('stairs')&&STRUCTURE_TYPES.includes('loft'));
 assert.equal(craftCategory('stairs'),'build');assert.equal(craftCategory('loft'),'build');
 assert.equal(RECIPES.stairs.cost.wood,7);assert.equal(RECIPES.loft.cost.wood,9);
 const plan=preparePlacement('loft',3.1,0,1);
 assert.equal(plan.x,3);assert.equal(plan.rotation,1);
 assert.equal(canPlaceAmong([{type:'loft',x:0,z:0,rotation:0}],{type:'loft',x:0,z:0,rotation:0}),false);
});
test('escada tem elevação gradual e platô exige acesso pelo alto',()=>{
 const staircase=[{type:'stairs',x:0,z:0,rotation:0}];
 assert.equal(walkSurfaceHeight(staircase,0,-1.4,0,0)>0,true);
 assert.ok(walkSurfaceHeight(staircase,0,0,0,1.3)>1.0);
 assert.ok(Math.abs(walkSurfaceHeight(staircase,0,1.4,0,2.6)-PLATFORM_HEIGHT*2.9/3)<.02);
 const platform=[{type:'loft',x:0,z:3,rotation:0}];
 assert.equal(walkSurfaceHeight(platform,0,3,0,0),0);
 assert.equal(walkSurfaceHeight(platform,0,3,0,2.6),PLATFORM_HEIGHT);
 assert.equal(walkSurfaceHeight(platform,20,3,0,2.6),0);
});
test('encaixe da plataforma se alinha com extremidade da escada',()=>{
 const stairs={type:'stairs',x:0,z:0,rotation:0};
 const a=snapTargets('loft',0,[stairs],{x:0,z:3});
 assert.ok(a.some(v=>v.x===0&&v.z===3&&v.rotation===0));
 const p=snapTargets('stairs',0,[{type:'loft',x:0,z:3}],{x:0,z:0});
 assert.ok(p.some(v=>v.x===0&&v.z===0));
});
test('save v2 aceita escadas e carga, sem mudar chave de armazenamento',()=>{
 const s=createSurvival();const seed={version:2,seed:1,graphicsQuality:'medium',level:1,xp:0,kills:0,health:100,maxHealth:100,wave:1,elapsed:0,currentWeapon:0,
  player:{x:0,z:0,yaw:0},survival:s,hotbar:defaultHotbar(),inventorySlots:createBag(s.inventory),resources:[],healthPacks:[],speedBoosts:[],enemies:[],buildings:[
  {type:'stairs',x:3,z:0,rotation:0,hp:90},{type:'loft',x:3,z:3,rotation:0,hp:100}],
  guard:{recruited:true,hp:70,x:3,z:0,mode:'gather',cargo:{wood:8}}};
 const validated=validateSave(seed);
 assert.ok(validated,'save v2 com escada e carga do Chaves deve passar');
 assert.equal(validated.guard.cargo.wood,8);
 assert.equal(validated.buildings.length,2);
 assert.equal(validateSave({...seed,guard:{...seed.guard,cargo:{wood:999}}}),null);
 const saveSource=source('src/gameplay/save-system.js');
 assert.match(saveSource,/restoreGuard\(data.guard\)/);
 assert.match(saveSource,/STRUCTURE_TYPES\.includes\(b.type\)/);
 assert.match(source('src/characters/villager-guard.js'),/guardCargo=\{\.\.\.\(parsed\.cargo\|\|\{\}\)\}/);
});
test('menu, texto e build wheel apresentam nova versão',()=>{
 assert.equal(JSON.parse(source('package.json')).version,'2.49.0');
 assert.match(source('index.html'),/2\.47\.0-multi-floor|2\.48\.0-interactive-fishing|2\.49\.0-fish-lod-rig/);
 assert.match(source('src/ui/build-wheel-ui.js'),/stairs:'🪜',loft:'🏗️'/);
 assert.match(source('src/world/buildings.js'),/function walkHeight\(/);
});
console.log(`v2.46: ${done} testes novos aprovados`);
