import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeGuardWorkPreferences,validGuardWorkPreferences,guardCanCollect} from '../src/gameplay/guard-work-preferences.js';
import {selectGuardWork} from '../src/gameplay/guard-work.js';
import {validGuard,restoreGuard} from '../src/characters/villager-guard.js';
import {walkSurfaceHeight,PLATFORM_HEIGHT} from '../src/world/build-walk-surface.js';
import {snapTargets} from '../src/world/build-snapping.js';
import {collidesWithStructure,canPlaceAmong,STRUCTURE_TYPES} from '../src/world/building-rules.js';
import {RECIPES,createSurvival} from '../src/gameplay/survival.js';
import {validateSave} from '../src/gameplay/save-system.js';
import {maxBuildingHP} from '../src/gameplay/base-defense.js';
let checks=0;const test=(name,fn)=>{fn();console.log('✓ v2.47 '+(++checks)+' '+name);};
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('saves antigos ativam todas as prioridades do Chaves',()=>{
 const old={recruited:true,hp:60,x:3,z:5,mode:'gather'};
 assert.deepEqual(restoreGuard(old),old);
 assert.equal(normalizeGuardWorkPreferences().wood,true);
 assert.equal(normalizeGuardWorkPreferences().farm,true);
});
test('filtros só aceitam booleanos de recursos conhecidos',()=>{
 assert.equal(validGuardWorkPreferences({wood:false,berries:true,farm:false}),true);
 assert.equal(validGuardWorkPreferences({iron:true}),false);
 assert.equal(validGuardWorkPreferences({wood:'false'}),false);
 assert.equal(validGuard({...restoreGuard({recruited:true,hp:80,x:4,z:2}),workPreferences:{wood:false}}),true);
 assert.equal(validGuard({recruited:true,hp:80,x:4,z:2,workPreferences:{iron:true}}),false);
 assert.equal(guardCanCollect({wood:false},'wood'),false);
 assert.equal(guardCanCollect({wood:false},'stone'),true);
});
test('Chaves ignora madeira desmarcada e busca apenas pedra',()=>{
 const nodes=[{x:2,z:1,type:'wood',cooldown:0},{x:3,z:0,type:'stone',cooldown:0}];
 const pref={wood:false,stone:true,farm:false};
 const target=selectGuardWork({x:2,z:1},{x:0,z:0},nodes,[],{wood:0,stone:0},{preferences:pref});
 assert.equal(target.target.type,'stone');
 assert.equal(selectGuardWork({x:2,z:1},{x:0,z:0},nodes,[],{wood:0,stone:0},{preferences:{wood:false,stone:false,farm:false}}),null);
});
test('desativar coleta não impede Chaves de depositar carga antiga',()=>{
 const chest={type:'chest',x:2,z:0,items:{}};
 const task=selectGuardWork({x:0,z:0},{x:0,z:0},[],[chest],{wood:0},{cargo:{wood:8},preferences:{wood:false,farm:false}});
 assert.equal(task.kind,'deposit');
});
test('a agricultura respeita filtro independente da escolha de sementes',()=>{
 const plot={type:'farmPlot',x:2,z:0,crop:{planted:false}};
 const inv={seeds:3,water:4};
 assert.equal(selectGuardWork({x:0,z:0},{x:0,z:0},[],[plot],inv,{preferences:{farm:false}}),null);
 assert.equal(selectGuardWork({x:0,z:0},{x:0,z:0},[],[plot],inv,{preferences:{farm:true}}).action,'plant');
});
test('plataforma usa elevação da âncora no terreno inclinado',()=>{
 const terrain=(x,z)=>z*.11;
 const loft=[{type:'loft',x:3,z:3,rotation:0}];
 const expected=terrain(3,3)+PLATFORM_HEIGHT;
 assert.equal(walkSurfaceHeight(loft,3,2,terrain(3,2),expected,terrain),expected);
 assert.equal(walkSurfaceHeight(loft,3,3,terrain(3,3),0,terrain),terrain(3,3));
});
test('escadas conectam as plataformas sem degrau alto na saída',()=>{
 const terrain=()=>.4,structures=[{type:'stairs',x:0,z:0,rotation:0},{type:'loft',x:0,z:3,rotation:0}];
 const a=walkSurfaceHeight(structures,0,1.48,.4,3,terrain),b=walkSurfaceHeight(structures,0,1.52,.4,3,terrain);
 assert.ok(Math.abs(a-b)<.06,`Transição com salto de ${Math.abs(a-b).toFixed(2)} m`);
});
test('guarda-corpo só impede passagem no andar superior',()=>{
 const s={type:'railing',x:0,z:0,rotation:0,group:{position:{y:.5}}};
 assert.equal(collidesWithStructure(s,0,0,.45,.5),false);
 assert.equal(collidesWithStructure(s,0,0,.45,3.1),true);
});
test('guarda-corpo encaixa na borda de plataforma superior',()=>{
 const p=snapTargets('railing',0,[{type:'loft',x:0,z:0}],{x:0,z:1.5});
 assert.ok(p.some(t=>t.x===0&&t.z===1.5));
 assert.equal(canPlaceAmong([{type:'railing',x:0,z:1.5,rotation:0}],{type:'railing',x:0,z:1.5,rotation:0}),false);
});
test('telhado plano encaixa com cobertura e impede sobreposição',()=>{
 assert.ok(STRUCTURE_TYPES.includes('roofFlat')&&STRUCTURE_TYPES.includes('railing'));
 assert.equal(maxBuildingHP('roofFlat'),80);assert.equal(maxBuildingHP('railing'),75);
 assert.ok(RECIPES.roofFlat.cost.wood>0&&RECIPES.railing.cost.wood>0);
 assert.equal(canPlaceAmong([{type:'roof',x:3,z:0}],{type:'roofFlat',x:3,z:0}),false);
 assert.equal(canPlaceAmong([{type:'roof',x:3,z:0}],{type:'roofFlat',x:6,z:0}),true);
 assert.ok(snapTargets('roofFlat',0,[{type:'roof',x:3,z:0}],{x:6,z:0}).length>0);
});
test('guard prefs e guarda-corpo são válidos no formato atual de save',()=>{
 const data={version:2,seed:1,graphicsQuality:'medium',level:1,xp:0,kills:0,health:100,maxHealth:100,wave:1,elapsed:0,currentWeapon:0,
  player:{x:0,z:0,yaw:0},survival:createSurvival(),resources:[],buildings:[{type:'railing',x:0,z:0,rotation:0,hp:75},{type:'roofFlat',x:3,z:0,rotation:0,hp:80}],healthPacks:[],speedBoosts:[],enemies:[],guard:{recruited:true,hp:80,x:4,z:2,mode:'gather',workPreferences:{wood:false,water:true,farm:false}}};
 const result=validateSave(data);assert.ok(result);assert.equal(result.guard.workPreferences.wood,false);
 assert.equal(validateSave({...data,guard:{...data.guard,workPreferences:{wood:3}}}),null);
});
test('painel real, hotkeys e arquivos de v2.47 integrados',()=>{
 assert.equal(JSON.parse(source('package.json')).version,'2.52.0');
 assert.match(source('index.html'),/id="pause-guard-work"/);
 assert.match(source('index.html'),/2\.47\.0-multi-floor|2\.48\.0-interactive-fishing|2\.49\.0-fish-lod-rig|2\.51\.0-lake-shore-lod|2\.52\.0-lake-ecology/);
 assert.match(source('src/main.js'),/createGuardWorkUI/);
 assert.match(source('src/main.js'),/preferences:guard\.workPreferences/);
 assert.match(source('src/main.js'),/player\.position\.y\)/);
 assert.match(source('src/ui/guard-work-ui.js'),/getPreferences/);
});
console.log(`v2.47.0: ${checks} novos testes aprovados`);
