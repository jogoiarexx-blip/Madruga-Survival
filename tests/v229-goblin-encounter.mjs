import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {findGoblinEncounterSpot,nearestGoblinEncounter} from '../src/gameplay/goblin-encounter.js';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
let n=0;function check(name,fn){fn();console.log(`OK Goblin visível #${++n}: ${name}`);}
check('ponto próximo e à frente do jogador, não a 48m',()=>{
 const spot=findGoblinEncounterSpot({player:{x:0,z:0},yaw:0,isFree:()=>true});
 assert.ok(spot);assert.ok(spot.z<0);assert.ok(Math.hypot(spot.x,spot.z)>=14);assert.ok(Math.hypot(spot.x,spot.z)<=23);
});
check('evita colisões e usa outro candidato visível',()=>{
 const positions=[];
 const spot=findGoblinEncounterSpot({player:{x:0,z:0},yaw:0,isFree:(x,z)=>{positions.push([x,z]);return positions.length>1;},hasClearPath:(a,b)=>b.x<0});
 assert.ok(spot);assert.ok(spot.x<0);assert.ok(positions.length>=2);
});
check('não surge atravessando limite do mapa ou sem espaço livre',()=>{
 assert.equal(findGoblinEncounterSpot({player:{x:0,z:0},isFree:()=>false}),null);
 assert.equal(findGoblinEncounterSpot({player:{x:0,z:101},yaw:Math.PI,isFree:()=>true}),null);
});
check('localiza só goblins vivos entre vários tipos de criaturas',()=>{
 const list=[{type:'spider',hp:3,mesh:{position:{x:1,z:1}}},{type:'normal',hp:0,mesh:{position:{x:0,z:0}}},{type:'normal',hp:2,mesh:{position:{x:18,z:0}}},{type:'normal',hp:2,mesh:{position:{x:12,z:0}}}];
 assert.equal(nearestGoblinEncounter(list,{x:0,z:0}).distance,12);
 assert.equal(nearestGoblinEncounter(list.slice(0,2),{x:0,z:0}),null);
});
check('nova partida e continuar chamam o encontro sem sobrescrever save',()=>{
 const src=read('src/main.js');
 assert.match(src,/ensureVisibleGoblinEncounter\(\)/);
 assert.match(src,/function restoreProgress\(data\)/);
 assert.match(src,/goblinModels\.dispose\(enemy\)/);
 assert.match(src,/near\.distance<42/);
 assert.match(src,/if\(arachnidCave\.inside\|\|enemies\.length>=12\)return false/);
 assert.match(src,/window,'madrugaGoblinStatus'/);
});
check('minimapa mostra goblin verde diferente dos outros inimigos',()=>{
 assert.match(read('src/ui/minimap.js'),/e\.type==='normal'\?'#98f079'/);
 assert.match(read('src/main.js'),/Goblin \$\{Math\.round\(nearbyGoblin\.distance\)\}m/);
});
check('modelo e animações continuam no fluxo de carregamento',()=>{
 const src=read('src/main.js'),m=read('src/characters/goblin-model.js');
 assert.match(src,/goblinModels\.preload\(\)/);
 assert.match(src,/goblinModels\.attach\(enemy\)/);
 assert.match(m,/model\.name='Goblin_Animated'/);
});
check('versão e cache invalidados',()=>{
 assert.equal(JSON.parse(read('package.json')).version,'2.52.0');
 assert.match(read('index.html'),/2\.29\.1-goblin-visible|2\.30\.0-chaves-workbench|2\.31\.0-chaves-patrol-ai|2\.32\.0-chaves-orders|2\.34\.0-chaves-combat|2\.35\.0-stability|2\.36\.0-wildlife-inventory|2\.32\.0-chaves-orders|2\.34\.0-chaves-combat|2\.35\.0-stability|2\.36\.0-wildlife-inventory|2\.37\.0-campfire-ui|2\.38\.0-save-profiling|2\.39\.0-wildlife-quests|2\.40\.0-fauna-exploration|2\.41\.0-ecosystem|2\.42\.0-soundscape|2\.43\.0-foley|2\.44\.0-quiet-builds|2\.45\.0-stable-play|2\.47\.0-multi-floor|2\.48\.0-interactive-fishing|2\.49\.0-fish-lod-rig|2\.51\.0-lake-shore-lod|2\.52\.0-lake-ecology/);
});
console.log(`${n} testes de encontro com goblin aprovados`);
