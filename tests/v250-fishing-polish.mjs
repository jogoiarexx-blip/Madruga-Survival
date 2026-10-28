import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fishingMotion,catchDisplay,CAST_DURATION,CATCH_DURATION} from '../src/world/fishing-motion.js';
import {useDetailedWater,WATER_DETAIL_DISTANCE,createLakeWaterMaterial} from '../src/world/lake-water-material.js';
import {createFishingSession} from '../src/gameplay/fishing-session.js';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
let n=0;function test(label,fn){fn();console.log('OK v2.50 '+(++n)+' '+label);}
test('arremesso faz trajetória contínua da vara e da boia',()=>{
 const a=fishingMotion({phase:'waiting',age:0});
 const b=fishingMotion({phase:'waiting',age:CAST_DURATION/2});
 const c=fishingMotion({phase:'waiting',age:CAST_DURATION});
 assert.ok(a.lineReach<b.lineReach&&b.lineReach<c.lineReach);
 assert.ok(a.pitch<b.pitch);assert.ok(b.castArc>0);
 assert.equal(c.cast,1);assert.equal(c.lineReach,3);
});
test('recolhimento retrai a linha até a captura, variando a flexão da vara',()=>{
 const a=fishingMotion({phase:'reeling',age:3,elapsed:0,progress:1,tugs:5});
 const b=fishingMotion({phase:'reeling',age:3,elapsed:.3,progress:4,tugs:5});
 assert.ok(a.lineReach>b.lineReach);
 assert.notEqual(a.pitch,b.pitch);
 assert.ok(b.reel>a.reel);
});
test('inicialização malformada mantém valores de animação finitos',()=>{
 for(const phase of ['idle','waiting','bite','reeling','caught']){
  const v=fishingMotion({phase,age:NaN,elapsed:NaN,progress:Infinity,tugs:0});
  for(const value of Object.values(v))assert.ok(Number.isFinite(value));
 }
});
test('peixe capturado aparece temporariamente e some ao terminar a animação',()=>{
 for(const id of ['tilapia','traira','carpa']){
  assert.equal(catchDisplay({age:0,id}).visible,true);
  assert.equal(catchDisplay({age:CATCH_DURATION/2,id}).visible,true);
  assert.equal(catchDisplay({age:CATCH_DURATION,id}).visible,false);
 }
 assert.ok(catchDisplay({id:'carpa'}).length>catchDisplay({id:'tilapia'}).length);
 assert.ok(catchDisplay({id:'traira'}).length>catchDisplay({id:'tilapia'}).length);
});
test('shader de reflexos é seletivo por distância e qualidade',()=>{
 assert.equal(useDetailedWater(5,'low'),false);
 assert.equal(useDetailedWater(38,'medium'),true);
 assert.equal(useDetailedWater(41,'medium'),false);
 assert.equal(useDetailedWater(50,'high'),true);
 assert.equal(useDetailedWater(WATER_DETAIL_DISTANCE,'high'),false);
 assert.equal(useDetailedWater(Infinity,'high'),false);
});
test('shader usa material translúcido e uniform de tempo, sem câmeras de reflexão',()=>{
 class ShaderMaterial{constructor(options){Object.assign(this,options)}}
 const fake={ShaderMaterial,DoubleSide:2};
 const m=createLakeWaterMaterial(fake);
 assert.equal(m.depthWrite,false);assert.equal(m.transparent,true);
 assert.ok(m.uniforms.uTime);assert.match(m.fragmentShader,/cameraPosition/);
 assert.match(m.fragmentShader,/glint/);assert.match(m.fragmentShader,/foam/);
 assert.doesNotMatch(source('src/world/fishing-lake.js'),/WebGLRenderTarget/);
});
test('lagoa preserva cardumes e fallback leve para equipamentos fracos',()=>{
 const lake=source('src/world/fishing-lake.js');
 for(const token of ['createFishSchoolVisual','school.update','fallbackMaterial','detailedMaterial','useDetailedWater','uTime.value=elapsed'])assert.ok(lake.includes(token),token);
});
test('captura cria peixe visível apenas depois do sucesso, mantendo inventário e save',()=>{
 const main=source('src/main.js'),visual=source('src/world/fishing-visual.js');
 assert.match(main,/if\(caught\.ok\)fishingVisual\.showCatch\(species\)/);
 assert.match(main,/earnSkill\('fishing'/);
 assert.match(main,/saveProgress\(\)/);
 assert.match(visual,/catchTime=CATCH_DURATION/);
 assert.match(visual,/catchBody\.geometry\.dispose/);
});
test('mão REV5 e avatar alternativo preservam a animação da vara',()=>{
 const main=source('src/main.js'),rev5=source('src/characters/player-rev5.js'),vis=source('src/world/fishing-visual.js');
 assert.match(main,/playerRev5\.setFishing\(isFishing,fishingSession\.state\.phase\)/);
 assert.match(rev5,/fishingPhaseAge/);assert.match(rev5,/fishingRightArm\.rotation\.x/);
 assert.match(vis,/getGroundHeight\(player\.x,player\.z\)/);
 assert.match(vis,/rodPivot\.rotation\.x=motion\.pitch/);
});
test('pesca existente não é alterada; versão e invalidadores de cache são coerentes',()=>{
 const f=createFishingSession(()=>.1);
 assert.equal(f.state.phase,'idle');
 assert.match(source('src/main.js'),/fishingSession\.tick/);
 assert.equal(JSON.parse(source('package.json')).version,'2.52.0');
 assert.match(source('index.html'),/2\.51\.0-lake-shore-lod|2\.52\.0-lake-ecology/);
});
console.log('v2.51.0: '+n+' testes aprovados');
