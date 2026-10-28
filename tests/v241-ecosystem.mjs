import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GUARD_ORDERS,nextGuardOrder,normalizeGuardOrder} from '../src/gameplay/guard-orders.js';
import {restoreGuard} from '../src/characters/villager-guard.js';
import {selectGuardWork} from '../src/gameplay/guard-work.js';
import {nearLakeShore,insideLake,keepOutsideLake,lakeTerrainDrop,LAKE} from '../src/world/fishing-lake.js';
import {segmentBlockedByCircles} from '../src/world/line-of-sight.js';
import {missionWaypoint} from '../src/gameplay/mission-navigation.js';
import {STRUCTURE_TYPES,collidesWithStructure,lineBlockedByStructure} from '../src/world/building-rules.js';
import {RECIPES} from '../src/gameplay/survival.js';
import {validateSave} from '../src/gameplay/save-system.js';
import {validExplorationSave} from '../src/world/exploration.js';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
let checks=0;
function check(name,fn){fn();console.log('OK v2.41 '+(++checks)+': '+name);}
check('Chaves aceita ordem de coleta sem invalidar saves antigos',()=>{
  assert.equal(nextGuardOrder('patrol'),'gather');
  assert.equal(nextGuardOrder('gather'),'follow');
  assert.equal(normalizeGuardOrder('gather'),'gather');
  assert.equal(restoreGuard({recruited:true,hp:80,x:1,z:2}).mode,'defend');
});
check('Chaves escolhe cultivo e recursos disponíveis sem minério ou estoque cheio',()=>{
 const plot={type:'farmPlot',x:2,z:3,crop:{planted:true,growth:125,water:0}};
 const nodes=[{type:'iron',x:1,z:1,cooldown:0},{type:'wood',x:4,z:4,cooldown:0}];
 const a=selectGuardWork({x:0,z:0},{x:0,z:0},nodes,[plot],{wood:1,iron:1,vegetables:0,seeds:2,water:3});
 assert.equal(a.kind,'farm');assert.equal(a.action,'harvest');
 const b=selectGuardWork({x:0,z:0},{x:0,z:0},nodes,[],{wood:999,iron:0});
 assert.equal(b,null);
});
check('Lagoa permite pesca na margem e impede entrar pela área central',()=>{
 assert.equal(insideLake(LAKE.x,LAKE.z),true);
 assert.equal(nearLakeShore({x:LAKE.x+LAKE.radius+1,z:LAKE.z}),true);
 assert.equal(nearLakeShore({x:LAKE.x,z:LAKE.z}),false);
 assert.ok(lakeTerrainDrop(LAKE.x,LAKE.z)>1.5);
 assert.equal(lakeTerrainDrop(LAKE.x+LAKE.radius+LAKE.shore+3,LAKE.z),0);
 const p=keepOutsideLake(LAKE.x,LAKE.z,.5);
 assert.ok(Math.hypot(p.x-LAKE.x,p.z-LAKE.z)>=LAKE.radius+.499);
});
check('Linha de visão é bloqueada por troncos no caminho, não por objetos distantes',()=>{
 const a={x:0,z:0},b={x:12,z:0};
 assert.equal(segmentBlockedByCircles(a,b,[{x:6,z:0,radius:1}]),true);
 assert.equal(segmentBlockedByCircles(a,b,[{x:6,z:5,radius:1}]),false);
});
check('Minimapa omite recursos e árvores e marca missão ativa',()=>{
 const s=source('src/ui/minimap.js');
 assert.doesNotMatch(s,/for\(const n of resources\)/);
 assert.doesNotMatch(s,/treeColliders\.forEach/);
 assert.match(s,/missionTarget/);assert.match(s,/if\(lake\)/);
});
check('Missão indica destino físico de exploração sem inventar local',()=>{
 const sites=[{id:'cabana',x:20,z:12,discovered:true,containers:[{opened:true}]},
              {id:'posto',x:35,z:-30,discovered:false,containers:[{opened:false}]}];
 assert.equal(missionWaypoint('medical',{player:{x:0,z:0},sites}).id,'posto');
 assert.equal(missionWaypoint('survey',{player:{x:0,z:0},sites}).id,'posto');
 assert.equal(missionWaypoint('hunt',{player:{x:0,z:0},sites}),null);
});
check('Janela construível abre para visão mas mantém bloqueio de passagem',()=>{
 assert.ok(STRUCTURE_TYPES.includes('window'));
 assert.ok(RECIPES.window.cost.wood>0);
 const window={type:'window',x:0,z:0,rotation:0,open:true};
 assert.equal(collidesWithStructure(window,0,0,.4),true);
 assert.equal(lineBlockedByStructure(window,{x:0,z:-3},{x:0,z:3}),false);
 assert.equal(lineBlockedByStructure({...window,open:false},{x:0,z:-3},{x:0,z:3}),true);
});
check('Saves aceitam novas janelas e dados antigos dos locais',()=>{
 assert.equal(validExplorationSave([{id:'posto',discovered:true,ambushed:false,opened:[]}]),true);
 assert.equal(validExplorationSave([{id:'posto',discovered:true,ambushed:false,opened:[],windowOpen:true,doorOpen:false}]),true);
 assert.equal(validExplorationSave([{id:'posto',discovered:true,ambushed:false,opened:[],doorOpen:1}]),false);
});
check('LOD de árvores alterna geometria com histerese',()=>{
 const visibility=source('src/render/visibility.js');
 assert.match(visibility,/lod\.distant\.visible=far/);
 assert.match(visibility,/const limit=lod\.far\?29:35/);
 assert.match(source('src/world/forest.js'),/distantLeafGeometry/);
});
check('Percepção de fauna combina visão e ruídos sem ataques invisíveis',()=>{
 const wildlife=source('src/world/wildlife.js');
 assert.match(wildlife,/const hasVisual=close&&canSee/);
 assert.match(wildlife,/a\.noiseLeft>0/);
 assert.match(wildlife,/a\.type==='boar'&&informed&&!hasVisual\?'investigate'/);
 assert.match(source('src/main.js'),/zombieSenses\.hear/);
});
check('Entradas de ruínas abrem por F e são persistidas',()=>{
 const a=source('src/world/exploration.js');
 assert.match(a,/function toggleFixture\(/);
 assert.match(a,/function blocksWalls\(/);
 assert.match(a,/doorOpen:s\.doorOpen,windowOpen:s\.windowOpen/);
 assert.match(source('src/main.js'),/exploration\.toggleFixture\(player\.position\)/);
});
check('Integração da versão e módulos não remove recursos antigos',()=>{
 assert.equal(JSON.parse(source('package.json')).version,'2.48.0');
 assert.match(source('index.html'),/2\.41\.0-ecosystem|2\.42\.0-soundscape|2\.43\.0-foley|2\.44\.0-quiet-builds|2\.45\.0-stable-play|2\.47\.0-multi-floor|2\.48\.0-interactive-fishing|2\.48\.0-interactive-fishing/);
 assert.match(source('src/main.js'),/resources\.harvestTarget/);
 assert.match(source('src/main.js'),/tryFish\(survival,elapsed,nearFishingWater\(\)/);
});
console.log(`v2.41.0: ${checks} verificações aprovadas`);
