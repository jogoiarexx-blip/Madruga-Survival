// Teste de integração legado migrado do script inline da v0.1 para módulos ES atuais.
import assert from 'node:assert/strict';
import {createSurvival,canAfford,spendRecipe,addResource,useConsumable,advanceSurvival,restoreSurvival} from './src/gameplay/survival.js';
import {createMissionProgress,currentMission,advanceMission,recordMissionEvent} from './src/gameplay/mission-progress.js';
import {DEFAULT_GUARD_ORDER,normalizeGuardOrder,nextGuardOrder} from './src/gameplay/guard-orders.js';
let checks=0;const test=(title,fn)=>{fn();console.log(`OK legacy-app ${++checks}: ${title}`);};
test('construção não consome materiais insuficientes',()=>{
 const state=createSurvival();assert.equal(canAfford(state,'campfire'),false);
 const before=state.inventory.wood;assert.equal(spendRecipe(state,'campfire'),false);
 assert.equal(state.inventory.wood,before);
});
test('recursos adquiridos e crafting descontam quantidades certas',()=>{
 const state=createSurvival();for(let i=0;i<15;i++)addResource(state,'wood');for(let i=0;i<12;i++)addResource(state,'stone');
 assert.equal(canAfford(state,'campfire'),true);
 assert.equal(spendRecipe(state,'campfire'),true);
 assert.ok(state.inventory.wood<17);
});
test('comida e água afetam indicadores e gastam item',()=>{
 const state=createSurvival();state.thirst=24;const n=state.inventory.water;
 assert.equal(useConsumable(state,'water'),true);
 assert.equal(state.thirst,64);assert.equal(state.inventory.water,n-1);
});
test('missões avançam sem repetir prêmios',()=>{
 const progress=createMissionProgress();
 assert.equal(currentMission(progress,{firesBuilt:false}).id,'campfire');
 const done=advanceMission(progress,{firesBuilt:true});
 assert.equal(done.id,'campfire');assert.equal(advanceMission(progress,{firesBuilt:true}),null);
});
test('ordens do Chaves continuam compatíveis',()=>{
 assert.equal(normalizeGuardOrder('modo-desconhecido'),DEFAULT_GUARD_ORDER);
 assert.equal(nextGuardOrder('patrol'),'gather');
});
test('salvamento de sobrevivência válido após 5 minutos simulados',()=>{
 const s=createSurvival();for(let i=0;i<3000;i++)advanceSurvival(s,.1,{moving:true});
 assert.ok(restoreSurvival(s));assert.ok(s.time>300);
});
console.log(`legacy app: ${checks} verificações atuais`);
