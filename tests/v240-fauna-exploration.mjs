import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chooseRabbitEscape} from '../src/world/rabbit-navigation.js';
import {startBoarHitReaction,advanceBoarCharge,boarHitPose,BOAR_HIT_DURATION} from '../src/world/boar-charge.js';
import {MISSIONS,createMissionProgress,restoreMissionProgress,currentMission,advanceMission} from '../src/gameplay/mission-progress.js';
import {createSurvival} from '../src/gameplay/survival.js';
import {validateSave} from '../src/gameplay/save-system.js';
let count=0;function test(name,fn){fn();console.log('OK v2.40 '+(++count)+': '+name);}
const text=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const free=(x,z,r)=>!(x>-.2-r&&x<.8+r&&z>-4-r&&z<4+r);
test('coelho escolhe desvio lateral antes da parede',()=>{
  const result=chooseRabbitEscape({position:{x:-1.4,z:0},player:{x:-6,z:0},isFree:free});
  assert.equal(result.blocked,false);assert.ok(Math.abs(Math.sin(result.heading))<.95,'deve fugir tangente à parede');
  for(const d of [.65,1.35,2.4])assert.equal(free(-1.4+Math.sin(result.heading)*d,Math.cos(result.heading)*d,.45),true);
});
test('coelho preserva a fuga direta se corredor está desobstruído',()=>{
  const a=chooseRabbitEscape({position:{x:0,z:0},player:{x:0,z:6},isFree:()=>true});
  assert.equal(a.blocked,false);assert.ok(Math.cos(a.heading)<-.999);
});
test('coelho não atravessa uma área completamente cercada',()=>{
  const route=chooseRabbitEscape({position:{x:0,z:0},player:{x:-2,z:0},isFree:()=>false});
  assert.equal(route.blocked,true);
  assert.match(text('src/world/wildlife.js'),/a.escapeRest>0\|\|a.escapeBlocked\?0:5\.2/);
});
test('javali entra em reação de impacto e suspende investida',()=>{
  const animal={hp:4,heading:0,chargePhase:'charge',chargeLeft:.5,attackDelay:0};
  assert.equal(startBoarHitReaction(animal),true);
  assert.equal(animal.chargePhase,'rest');assert.equal(animal.staggerLeft,BOAR_HIT_DURATION);
  let r=advanceBoarCharge(animal,{dt:.1,distance:1,playerDx:0,playerDz:1});
  assert.equal(r.hit,false);assert.equal(r.speed,0);
});
test('reação do javali é limitada no tempo e não deforma malha permanentemente',()=>{
  const impact=boarHitPose(BOAR_HIT_DURATION*.5),settled=boarHitPose(0);
  assert.equal(impact.active,true);assert.ok(impact.squash>0&&impact.headDip>0);
  assert.deepEqual(settled,{active:false,pitch:0,headDip:0,squash:0,swell:0,lift:0});
  assert.equal(startBoarHitReaction({hp:0}),false);
});
test('fase da missão de exploração sucede as seis originais, sem reiniciar campanha',()=>{
  const saved={stage:6,hunt:2,cook:1,defeat:5};
  const restored=restoreMissionProgress(saved);assert.deepEqual(restored,saved);
  assert.equal(currentMission(restored,{sitesDiscovered:1})?.id,'survey');
  assert.equal(currentMission(restored,{sitesDiscovered:1})?.count,1);
  assert.equal(advanceMission(restored,{sitesDiscovered:2}).id,'survey');
  assert.equal(restored.stage,7);
});
test('expedição premia suprimentos e passagem entre etapas uma única vez',()=>{
  const p={stage:7,hunt:2,cook:1,defeat:5};
  assert.equal(advanceMission(p,{containersOpened:2}),null);
  const m=advanceMission(p,{containersOpened:3});
  assert.equal(m.id,'scavenge');assert.equal(m.items.scrap,4);assert.equal(m.items.bandage,2);
  assert.equal(advanceMission(p,{clinicDiscovered:false}),null);
  assert.equal(advanceMission(p,{clinicDiscovered:true}).id,'medical');
  assert.equal(p.stage,MISSIONS.length);assert.equal(advanceMission(p,{}),null);
});
test('campanha salva os objetivos de exploração sem mudar versão de checkpoint',()=>{
  const data={version:2,seed:10,graphicsQuality:'medium',level:1,xp:0,kills:0,health:100,maxHealth:100,wave:1,elapsed:10,currentWeapon:0,
    player:{x:0,z:0,yaw:0},survival:createSurvival(),resources:[],buildings:[],healthPacks:[],speedBoosts:[],enemies:[],
    missions:{stage:7,hunt:2,cook:1,defeat:5}};
  assert.equal(validateSave(data).missions.stage,7);
  assert.equal(validateSave({...data,missions:{...data.missions,stage:999}}),null);
  assert.match(text('src/main.js'),/sitesDiscovered:exploration.sites.filter/);
  assert.match(text('src/main.js'),/clinicDiscovered:exploration.sites.some/);
});
test('v2.40.0 isola atualização de fauna, UI de missões e cache',()=>{
  assert.equal(JSON.parse(text('package.json')).version,'2.50.0');
  assert.match(text('index.html'),/2\.41\.0-ecosystem|2\.42\.0-soundscape|2\.43\.0-foley|2\.44\.0-quiet-builds|2\.45\.0-stable-play|2\.47\.0-multi-floor|2\.48\.0-interactive-fishing|2\.49\.0-fish-lod-rig|2\.50\.0-fishing-polish/);
  assert.match(text('src/world/wildlife.js'),/startBoarHitReaction\(a\)/);
  assert.match(text('src/world/wildlife.js'),/chooseRabbitEscape/);
});
console.log('v2.40.0: '+count+' regressões aprovadas');
