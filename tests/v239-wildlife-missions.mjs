import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {advanceBoarCharge,BOAR_WINDUP} from '../src/world/boar-charge.js';
import {steerAroundAllies} from '../src/gameplay/enemy-group-steering.js';
import {createMissionProgress,restoreMissionProgress,recordMissionEvent,currentMission,advanceMission,MISSIONS} from '../src/gameplay/mission-progress.js';
import {createSurvival} from '../src/gameplay/survival.js';
import {validateSave} from '../src/gameplay/save-system.js';
let n=0;
function test(label,fn){fn();console.log('OK v2.39 '+(++n)+': '+label);}
const next=(a,dt,distance,dx=0,dz=-distance,seen=true)=>advanceBoarCharge(a,{dt,distance,playerDx:dx,playerDz:dz,canSee:seen});
test('javali anuncia o golpe antes de poder causar dano',()=>{
 const a={heading:Math.PI};let r=next(a,.016,5);assert.equal(r.phase,'windup');assert.equal(r.hit,false);
 for(let i=0;i<6;i++){r=next(a,.10,1.2);assert.equal(r.hit,false);}
 assert.ok(a.chargeLeft>0);assert.equal(BOAR_WINDUP,.72);
 for(let i=0;i<2;i++)r=next(a,.1,1.2);
 assert.equal(r.phase,'charge');assert.equal(r.hit,true);
 assert.equal(next(a,.05,1.1).hit,false,'Não causa mais de um impacto na mesma investida');
});
test('jogador que desvia da investida não toma dano',()=>{
 const a={heading:Math.PI};next(a,.05,5);
 for(let i=0;i<8;i++)next(a,.1,5);
 const r=next(a,.05,1.2,1.2,0);
 assert.equal(r.phase,'charge');assert.equal(r.hit,false);
});
test('javali sem visão não inicia investida e descansa após o golpe',()=>{
 const a={heading:0};assert.equal(next(a,.1,5,0,-5,false).phase,'idle');
 next(a,.1,5);for(let i=0;i<16;i++)next(a,.1,5);
 assert.equal(a.chargePhase,'rest');assert.ok(a.attackDelay>0);
});
test('inimigos próximos se separam e não empurram aliados mortos',()=>{
 const a={mesh:{id:1,position:{x:0,z:0}},hp:3,type:'normal'};
 const b={mesh:{id:2,position:{x:0.5,z:1}},hp:3,type:'normal'};
 const withAlly=steerAroundAllies(a,[a,b],0,1);
 assert.ok(withAlly.x<0,JSON.stringify(withAlly));
 const dead=steerAroundAllies(a,[a,{...b,hp:0}],0,1);
 assert.deepEqual(dead,{x:0,z:1});
});
test('separação de grupo tem limite e movimento normalizado',()=>{
 const a={mesh:{id:10,position:{x:0,z:0}},hp:1,type:'normal'};
 const group=[a,...Array.from({length:50},(_,i)=>({mesh:{id:11+i,position:{x:.2+i*.005,z:.2}},hp:1,type:'normal'}))];
 const result=steerAroundAllies(a,group,0,1);assert.ok(Math.abs(Math.hypot(result.x,result.z)-1)<1e-9);
 assert.ok(Number.isFinite(result.x)&&Number.isFinite(result.z));
});
test('missões têm etapas, progresso e recompensas sem repetição',()=>{
 const state=createMissionProgress();const context={firesBuilt:true,hasFarm:true,guardRecruited:false};
 assert.equal(advanceMission(state,context).id,'campfire');assert.equal(state.stage,1);
 assert.equal(advanceMission(state,context).id,'farm');assert.equal(advanceMission(state,context),null);
 recordMissionEvent(state,'hunt');recordMissionEvent(state,'hunt');
 assert.equal(advanceMission(state,context).id,'hunt');
 recordMissionEvent(state,'cook',3);assert.equal(advanceMission(state,context).id,'cook');
 recordMissionEvent(state,'defeat',5);assert.equal(advanceMission(state,context).id,'defend');
 assert.equal(advanceMission(state,context),null);
 context.guardRecruited=true;assert.equal(advanceMission(state,context).id,'ally');
 assert.equal(state.stage,6);assert.equal(currentMission(state,context).id,'survey');
});
test('estados malformados são rejeitados, saves antigos migrados',()=>{
 assert.deepEqual(restoreMissionProgress(undefined),createMissionProgress());
 for(const data of [{stage:-1,hunt:0,cook:0,defeat:0},{stage:0,hunt:-4,cook:0,defeat:0},{stage:0,hunt:0,cook:0,defeat:NaN}])
 assert.equal(restoreMissionProgress(data),null);
 const saved=createMissionProgress();assert.equal(recordMissionEvent(saved,'hack',1),false);
 assert.equal(recordMissionEvent(saved,'hunt',-100),false);
 assert.equal(saved.hunt,0);
});
test('validador de checkpoint mantém progresso das missões sem alterar save v2',()=>{
 const data={version:2,seed:10,graphicsQuality:'medium',level:1,xp:0,kills:0,health:100,maxHealth:100,wave:1,elapsed:10,currentWeapon:0,
  player:{x:0,z:0,yaw:0},survival:createSurvival(),resources:[],buildings:[],healthPacks:[],speedBoosts:[],enemies:[]};
 assert.equal(validateSave(data).missions,undefined);
 const good={...data,missions:{stage:3,hunt:2,cook:1,defeat:0}};
 assert.equal(validateSave(good).missions.stage,3);
 assert.equal(validateSave({...good,missions:{...good.missions,stage:99}}),null);
});
test('interface exibe missão e módulo de animais não aplica dano instantâneo',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const wild=readFileSync(new URL('../src/world/wildlife.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(main,/advanceMission\(missionProgress,context\)/);
 assert.match(main,/missions:missionProgress/);assert.match(main,/recordMissionEvent\(missionProgress,'cook'/);
 assert.match(wild,/if\(boar\?\.hit\)onHurt\(8/);assert.doesNotMatch(wild,/onHurt\(5,a.group.position\)/);
 assert.match(html,/2\.41\.0-ecosystem|2\.42\.0-soundscape|2\.43\.0-foley|2\.44\.0-quiet-builds|2\.45\.0-stable-play|2\.47\.0-multi-floor|2\.48\.0-interactive-fishing|2\.49\.0-fish-lod-rig|2\.50\.0-fishing-polish/);
});
console.log('v2.39.0: '+n+' regressões aprovadas');
