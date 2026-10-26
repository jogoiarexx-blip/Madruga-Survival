import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSurvival,restoreSurvival,RECIPES,advanceSurvival} from '../src/gameplay/survival.js';
import {craftAvailability,craftItem,craftBatchPreview,CRAFT_STATIONS,materialStock} from '../src/gameplay/crafting.js';
import {lootForContainer,EXPLORATION_SITES,canTakeLoot} from '../src/world/exploration.js';
import {repairBuildingWithKit,maxBuildingHP} from '../src/gameplay/base-defense.js';
import {validateSave} from '../src/gameplay/save-system.js';
let n=0;function test(label,fn){fn();console.log('OK v2.6',++n,label);}
const rich=()=>{const state=createSurvival();for(const key of Object.keys(state.inventory))state.inventory[key]=100;return state;};
test('Quatro receitas integradas com materiais válidos',()=>{
 for(const id of ['reinforcedVest','trailBoots','medicalKit','repairKit']){
  assert.equal(CRAFT_STATIONS[id],'workbench');
  for(const [key,amount] of Object.entries(RECIPES[id].cost)){assert.ok(Object.hasOwn(createSurvival().inventory,key));assert.ok(amount>0);}
 }
});
test('Sem bancada não fabrica nem consome materiais',()=>{
 const s=rich(),before=structuredClone(s);
 for(const id of ['reinforcedVest','trailBoots','medicalKit','repairKit'])assert.equal(craftItem(s,id).ok,false);
 assert.deepEqual(s,before);
});
test('Colete é único e protege 20% em golpes de combate',()=>{
 const s=rich(),before=s.inventory.scrap;
 assert.equal(craftItem(s,'reinforcedVest',1,{workbench:true}).ok,true);
 assert.equal(s.crafted.reinforcedVest,true);
 assert.equal(s.inventory.scrap,before-RECIPES.reinforcedVest.cost.scrap);
 assert.equal(craftItem(s,'reinforcedVest',1,{workbench:true}).ok,false);
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(main,/isGearEquipped\(survival,'vest'\)\?\.80:1/);
});
test('Botas reduzem consumo real de energia durante corrida',()=>{
 const s=createSurvival(),t=createSurvival();
 s.crafted.trailBoots=true;
 for(let j=0;j<30;j++){
  advanceSurvival(s,.1,{sprinting:true,moving:true,trailBoots:s.crafted.trailBoots});
  advanceSurvival(t,.1,{sprinting:true,moving:true});
 }
 assert.ok(s.stamina>t.stamina);
 assert.ok(s.stamina<100);
});
test('Botas fabricadas uma vez somente',()=>{
 const s=rich();assert.equal(craftItem(s,'trailBoots',1,{workbench:true}).ok,true);
 assert.equal(s.crafted.trailBoots,true);
 assert.equal(craftAvailability(s,'trailBoots',{workbench:true}).ok,false);
});
test('Kits podem ser fabricados em lotes atômicos',()=>{
 const s=rich();s.inventory.medicalKit=0;s.inventory.repairKit=0;
 const medical=craftBatchPreview(s,'medicalKit',3,{workbench:true});assert.equal(medical.ok,true);
 assert.equal(craftItem(s,'medicalKit',3,{workbench:true}).produced,3);
 assert.equal(s.inventory.medicalKit,3);
 assert.equal(craftItem(s,'repairKit',2,{workbench:true}).produced,2);
 assert.equal(s.inventory.repairKit,2);
});
test('Kits bloqueiam produção quando mochila cheia',()=>{
 const s=rich();s.inventory.medicalKit=999;const before=structuredClone(s);
 assert.equal(craftItem(s,'medicalKit',1,{workbench:true}).ok,false);
 assert.deepEqual(s,before);
});
test('Kit de manutenção recupera até 95 HP da estrutura',()=>{
 const s=rich(),b={type:'wall',hp:20};
 s.inventory.repairKit=1;
 assert.equal(repairBuildingWithKit(b,s),true);
 assert.equal(b.hp,115);assert.equal(s.inventory.repairKit,0);
 assert.equal(repairBuildingWithKit(b,s),false);
});
test('Kit de manutenção respeita HP máximo e não gasta em construção íntegra',()=>{
 const s=rich();s.inventory.repairKit=1;
 const b={type:'wall',hp:130};
 assert.equal(repairBuildingWithKit(b,s),true);assert.equal(b.hp,maxBuildingHP('wall'));
 assert.equal(repairBuildingWithKit(b,s),false);assert.equal(s.inventory.repairKit,0);
});
test('Construção falsa não consome kits',()=>{
 const s=rich(),a=s.inventory.repairKit;
 assert.equal(repairBuildingWithKit({type:'hacked',hp:20},s),false);
 assert.equal(s.inventory.repairKit,a);
});
test('Loot determinístico garante componentes para progressão (amostra de 64 mundos)',()=>{
 for(let seed=0;seed<64;seed++){
  const all={scrap:0,cloth:0};
  for(const spec of EXPLORATION_SITES)for(const chest of spec.containers){
   const drop=lootForContainer(seed,spec.id,chest.id);
   assert.equal(Object.keys(drop).length,2);
   for(const [key,number] of Object.entries(drop)){
     assert.ok(Object.hasOwn(createSurvival().inventory,key));
     if(key in all)all[key]+=number;
   }
   assert.deepEqual(drop,lootForContainer(seed,spec.id,chest.id));
  }
  assert.ok(all.scrap>=15,`seed ${seed} scrap=${all.scrap}`);
  assert.ok(all.cloth>=12,`seed ${seed} cloth=${all.cloth}`);
 }
});
test('Mochila cheia não consome loot de componentes',()=>{
 const s=createSurvival();s.inventory.scrap=999;
 assert.equal(canTakeLoot(s.inventory,{scrap:1,cloth:2}),false);
});
test('Saves antigos migram recursos e novos equipamentos',()=>{
 const old=createSurvival();delete old.inventory.scrap;delete old.inventory.cloth;
 delete old.inventory.medicalKit;delete old.inventory.repairKit;
 delete old.crafted.reinforcedVest;delete old.crafted.trailBoots;
 const newSave=restoreSurvival(old);assert.ok(newSave);
 assert.equal(newSave.inventory.scrap,0);assert.equal(newSave.inventory.cloth,0);
 assert.equal(newSave.crafted.reinforcedVest,false);assert.equal(newSave.crafted.trailBoots,false);
});
test('Saves de equipamentos novos são preservados e dados forjados bloqueados',()=>{
 const s=rich();s.crafted.trailBoots=true;s.crafted.reinforcedVest=true;
 assert.equal(restoreSurvival(s).crafted.trailBoots,true);
 const hacked=structuredClone(s);hacked.crafted.reinforcedVest=3;
 assert.equal(restoreSurvival(hacked),null);
});
test('Baús podem fornecer tecido para fabricação sem movimentação manual',()=>{
 const s=createSurvival();s.inventory.scrap=7;s.inventory.iron=4;
 const chest={items:{cloth:5}};
 assert.equal(materialStock(s,'cloth',[chest]),5);
 assert.equal(craftItem(s,'reinforcedVest',1,{workbench:true,chests:[chest]}).ok,true);
 assert.equal(chest.items.cloth,0);
});
test('UI e lógica de consumo dos kits conectadas à jogabilidade',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../src/ui/survival-ui.js',import.meta.url),'utf8');
 for(const id of ['use-medicalKit','repair-kit-build'])assert.ok(html.includes('id="'+id+'"'));
 assert.match(main,/if\(type==='medicalKit'\)/);
 assert.match(main,/poisonTimer=0/);
 assert.match(main,/onRepairKit:\(\)=>repairNear\(true\)/);
 assert.match(ui,/onRepairKit\(\)/);
});
console.log('v2.6: '+n+' testes especializados aprovados.');
