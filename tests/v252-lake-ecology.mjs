import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LAKE,shorelineRadiusAt,lakeEdgeDistance,insideLake,keepOutsideLake} from '../src/world/fishing-lake.js';
import {HABITAT_PADS,HABITAT_CATTAILS,lakeHabitatSamples,habitatVisibility} from '../src/world/lake-habitat.js';
import {SCHOOL_COUNT,sampleFishSwim,visibleFishCount,fishUpdateInterval} from '../src/world/fish-school.js';
const text=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
let passed=0;function check(label,fn){fn();console.log(`OK v2.52 ${++passed}: ${label}`);}
check('lagoa preserva a mesma fronteira física antes e depois',()=>{
 for(let i=0;i<72;i++){
  const a=i*Math.PI/36,r=shorelineRadiusAt(a),x=LAKE.x+Math.cos(a)*r,z=LAKE.z+Math.sin(a)*r;
  assert.ok(Math.abs(lakeEdgeDistance(x,z))<1e-8);
  assert.equal(insideLake(x+Math.cos(a)*.01,z+Math.sin(a)*.01),false);
  const p=keepOutsideLake(LAKE.x+Math.cos(a)*(r-3),LAKE.z+Math.sin(a)*(r-3));
  assert.ok(lakeEdgeDistance(p.x,p.z)>.44);
 }
});
check('plantas flutuantes e taboas permanecem dentro de uma lagoa irregular',()=>{
 for(const kind of ['pad','cattail']){
  const plants=lakeHabitatSamples(24,shorelineRadiusAt,kind);
  assert.equal(plants.length,24);
  for(const p of plants){
   assert.ok(p.inside);assert.ok(p.shoreDistance>=.5);
   assert.ok(Math.hypot(p.x,p.z)<shorelineRadiusAt(Math.atan2(p.z,p.x))-.24);
  }
  assert.deepEqual(plants,lakeHabitatSamples(24,shorelineRadiusAt,kind));
 }
});
check('habitat limita a quantidade por distância e modo gráfico',()=>{
 assert.deepEqual(habitatVisibility(4,'low'),{pads:0,cattails:0});
 assert.deepEqual(habitatVisibility(15,'high'),{pads:HABITAT_PADS,cattails:HABITAT_CATTAILS});
 assert.deepEqual(habitatVisibility(33,'high'),{pads:9,cattails:12});
 assert.deepEqual(habitatVisibility(8,'medium'),{pads:9,cattails:12});
 assert.deepEqual(habitatVisibility(47,'high'),{pads:0,cattails:0});
 assert.deepEqual(habitatVisibility(Infinity,'high'),{pads:0,cattails:0});
});
check('peixes navegam de modo determinístico sem sair da lagoa',()=>{
 for(let t of [0,.3,8,55,500])for(let i=0;i<SCHOOL_COUNT;i++){
  const f=sampleFishSwim(i,t,LAKE.radius);
  assert.deepEqual(f,sampleFishSwim(i,t,LAKE.radius));
  assert.ok(Math.hypot(f.x,f.z)<LAKE.radius-2.9);
  assert.ok(f.y<-.25);
 }
});
check('susto faz um peixe afastar da linha sem salto instantâneo artificial',()=>{
 let moved=0;
 for(let i=0;i<SCHOOL_COUNT;i++){
  const old=sampleFishSwim(i,9,LAKE.radius),f=sampleFishSwim(i,9,LAKE.radius,{x:0,z:0,intensity:.4,radius:9});
  const dx=f.x-old.x,dz=f.z-old.z;
  moved+=Math.hypot(dx,dz);
  assert.ok(Math.hypot(dx,dz)<.7);
  assert.ok(Math.hypot(f.x,f.z)<LAKE.radius-2.9);
 }
 assert.ok(moved>1);
});
check('influência nula não muda o trajeto, mesmo com dados extremos',()=>{
 const normal=sampleFishSwim(3,22);
 assert.deepEqual(normal,sampleFishSwim(3,22,14.8,{x:0,z:0,intensity:0}));
 assert.deepEqual(normal,sampleFishSwim(3,22,14.8,{x:0,z:0,intensity:-1}));
 assert.ok(Number.isFinite(sampleFishSwim(3,22,14.8,{x:0,z:0,intensity:200,radius:0}).x));
});
check('LOD existente continua limitando peixes e quadros',()=>{
 assert.equal(visibleFishCount(12,'low'),5);
 assert.equal(visibleFishCount(12,'high'),SCHOOL_COUNT);
 assert.equal(visibleFishCount(99,'medium'),0);
 assert.ok(fishUpdateInterval('low')>fishUpdateInterval('medium'));
});
check('vegetação aquática permanece instanciada em duas malhas',()=>{
 const s=text('src/world/fishing-lake.js');
 assert.match(s,/new THREE.InstancedMesh\(padGeo,padMat,HABITAT_PADS\)/);
 assert.match(s,/new THREE.InstancedMesh\(catGeo,catMat,HABITAT_CATTAILS\)/);
 assert.match(s,/lilyPads.count=habitat.pads/);
 assert.match(s,/habitatVisibility\(d,quality\)/);
});
check('terreno costeiro agora possui mais subdivisões e tinta de transição',()=>{
 const s=text('src/world/terrain.js');
 assert.match(s,/PlaneGeometry\(240, 240, 96, 96\)/);
 assert.match(s,/lakeEdgeDistance\(x,z\)/);
 assert.match(s,/vertexColors: true/);
 assert.match(s,/setAttribute\('color'/);
});
check('pescaria sinaliza perigo ao cardume sem alterar save e recompensas',()=>{
 const main=text('src/main.js');
 assert.match(main,/fishingLake.update\(player.position,graphicsQuality,elapsed,fishingSession.state.phase!=='idle'\)/);
 assert.match(text('src/world/fish-school-visual.js'),/alarm\+=\(target-alarm\)/);
 assert.match(text('src/world/fish-school-visual.js'),/sampleFishSwim\(i,elapsed,radius,\{x:0,z:0,intensity:alarm/);
 assert.match(text('src/gameplay/fishing-session.js'),/phase/);
});
check('versão nova, HTML e scripts de testes estão sincronizados',()=>{
 const pkg=JSON.parse(text('package.json'));
 assert.equal(pkg.version,'2.52.0');
 assert.match(text('index.html'),/2\.52\.0-lake-ecology/);
 assert.match(text('src/main.js'),/v2\.52\.0/);
 assert.match(pkg.scripts.test,/v252-lake-ecology/);
});
console.log(`v2.52.0: ${passed} verificações concluídas`);
