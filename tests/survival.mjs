import assert from 'node:assert/strict';
import {createSurvival,advanceSurvival,addResource,useConsumable,canAfford,
 spendRecipe,isNight,cycleClock,restoreSurvival,DAY_SECONDS} from '../src/gameplay/survival.js';
const test=(label,fn)=>{fn();console.log('OK sobrevivência:',label);};
test('início jogável com suprimentos, fome e sede',()=>{
 const s=createSurvival();assert.equal(s.days,1);assert.equal(s.inventory.berries,2);
 assert.equal(s.inventory.water,2);assert.equal(s.hunger,85);
});
test('dia/noite e relógio são coerentes',()=>{
 const s=createSurvival();assert.equal(isNight(s),false);
 s.time=DAY_SECONDS*.90;assert.equal(isNight(s),true);
 assert.match(cycleClock(s),/^\d\d:\d\d$/);
 advanceSurvival(s,.1);assert.equal(s.days,1);
 s.time=DAY_SECONDS-.02;advanceSurvival(s,.1);assert.equal(s.days,2);
});
test('corrida consome energia e descanso a regenera',()=>{
 const s=createSurvival();const start=s.stamina;
 advanceSurvival(s,.1,{sprinting:true,moving:true});assert.ok(s.stamina<start);
 const afterRun=s.stamina;advanceSurvival(s,.1,{});assert.ok(s.stamina>afterRun);
});
test('frio noturno sem fogueira e abrigo causa dano gradual',()=>{
 const s=createSurvival();s.time=DAY_SECONDS*.9;s.warmth=.2;
 const exposed=advanceSurvival(s,.1,{});
 assert.equal(s.warmth,0);assert.ok(exposed.damage>0);
 const sheltered=advanceSurvival(s,.1,{sheltered:true});assert.ok(s.warmth>0);
 assert.equal(sheltered.damage,0);
});
test('água, frutas e carne assada são consumíveis; carne crua não',()=>{
 const s=createSurvival();s.thirst=12;s.hunger=22;
 assert.equal(useConsumable(s,'meat'),false);
 assert.equal(useConsumable(s,'water'),true);assert.equal(s.thirst,52);
 assert.equal(useConsumable(s,'berries'),true);assert.ok(s.hunger>22);
 addResource(s,'cooked');assert.equal(useConsumable(s,'cooked'),true);
});
test('fogueira/abrigo somente com ingredientes e sem custos negativos',()=>{
 const s=createSurvival();assert.equal(canAfford(s,'campfire'),false);
 addResource(s,'wood',2);addResource(s,'stone',3);
 assert.ok(canAfford(s,'campfire'));assert.ok(spendRecipe(s,'campfire'));
 assert.equal(s.inventory.wood,0);assert.equal(s.inventory.stone,0);
 assert.equal(spendRecipe(s,'campfire'),false);
});
test('restauração rejeita valores forjados e mantém inventário tipado',()=>{
 const s=createSurvival();assert.deepEqual(restoreSurvival(s),s);
 assert.equal(restoreSurvival({...s,thirst:-100}),null);
 assert.equal(restoreSurvival({...s,inventory:{...s.inventory,wood:Infinity}}),null);
 assert.equal(restoreSurvival({...s,crafted:{hammer:'false',spear:false}}),null);
});
