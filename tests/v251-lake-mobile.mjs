import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LAKE,shorelineRadiusAt,lakeEdgeDistance,insideLake,nearLakeShore,keepOutsideLake,lakeTerrainDrop} from '../src/world/fishing-lake.js';
import {visibleFishCount,SCHOOL_COUNT,fishBodyScale,fishUpdateInterval,sampleFishSwim} from '../src/world/fish-school.js';
import {useDetailedWater} from '../src/world/lake-water-material.js';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
let n=0;const check=(desc,fn)=>{fn();console.log('OK v2.51 '+(++n)+' '+desc)};
check('contorno irregular é suave, fechado e determinístico',()=>{
 assert.equal(shorelineRadiusAt(0),shorelineRadiusAt(2*Math.PI));
 const radii=Array.from({length:360},(_,i)=>shorelineRadiusAt(i*Math.PI/180));
 assert.ok(Math.max(...radii)-Math.min(...radii)>.8);
 assert.ok(Math.max(...radii)-Math.min(...radii)<2);
 assert.ok(radii.every(r=>r>13&&r<16.4));
 for(let i=0;i<360;i++)assert.ok(Math.abs(radii[i]-radii[(i+1)%360])<.09);
});
check('água e colisão concordam em todos os ângulos da borda',()=>{
 for(let k=0;k<64;k++){
  const a=k*2*Math.PI/64,r=shorelineRadiusAt(a),x=Math.cos(a),z=Math.sin(a);
  assert.ok(Math.abs(lakeEdgeDistance(LAKE.x+x*r,LAKE.z+z*r))<1e-9);
  assert.equal(insideLake(LAKE.x+x*(r-.1),LAKE.z+z*(r-.1)),true);
  assert.equal(insideLake(LAKE.x+x*(r+.1),LAKE.z+z*(r+.1)),false);
  assert.equal(nearLakeShore({x:LAKE.x+x*(r+.5),z:LAKE.z+z*(r+.5)}),true);
  const q=keepOutsideLake(LAKE.x+x*(r-2),LAKE.z+z*(r-2),.5);
  assert.ok(lakeEdgeDistance(q.x,q.z)>=.499999);
 }
});
check('profundidade da lagoa suaviza a transição para a margem',()=>{
 assert.ok(lakeTerrainDrop(LAKE.x,LAKE.z)>1.6);
 for(const a of [0,1,2,3,4,5]){
  const x=Math.cos(a),z=Math.sin(a),r=shorelineRadiusAt(a);
  const h=[-3,-2,0,2,LAKE.shore+.1].map(d=>lakeTerrainDrop(LAKE.x+x*(r+d),LAKE.z+z*(r+d)));
  assert.ok(h.every((v,i)=>i===0||v<=h[i-1]+1e-8));
  assert.ok(h.every(v=>v>=0&&v<=1.65));
 }
});
check('LOD móvel limita população de peixes, atualizações e shader',()=>{
 assert.equal(visibleFishCount(10,'low'),5);
 assert.equal(visibleFishCount(10,'medium'),12);
 assert.equal(visibleFishCount(10,'high'),SCHOOL_COUNT);
 assert.equal(visibleFishCount(36,'low'),2);
 assert.equal(visibleFishCount(99,'low'),0);
 assert.ok(fishUpdateInterval('low')>fishUpdateInterval('medium'));
 assert.ok(fishUpdateInterval('medium')>fishUpdateInterval('high'));
 assert.equal(useDetailedWater(2,'low'),false);
});
check('tamanhos diferentes não causam aleatoriedade nem extrapolam a lagoa',()=>{
 const scales=Array.from({length:SCHOOL_COUNT},(_,i)=>fishBodyScale(i));
 assert.ok(new Set(scales.map(s=>s.length)).size>=8);
 assert.ok(scales.every(s=>s.length>=.6&&s.length<=2.4));
 for(const time of [0,1,50,1024])for(let i=0;i<SCHOOL_COUNT;i++){
  const f=sampleFishSwim(i,time);
  assert.deepEqual(f,sampleFishSwim(i,time));
  assert.ok(Math.hypot(f.x,f.z)<shorelineRadiusAt(Math.atan2(f.z,f.x))-1.1);
 }
});
check('cardumes preservam InstancedMesh com atualizações em lote',()=>{
 const s=source('src/world/fish-school-visual.js');
 assert.match(s,/new THREE.InstancedMesh/);assert.match(s,/fishBodyScale\(i\)/);
 assert.match(s,/fishUpdateInterval\(quality\)/);
 assert.match(s,/bodies\.instanceMatrix\.needsUpdate=true/);
});
check('juncos e pedras são instanciados e ocultos na qualidade baixa',()=>{
 const s=source('src/world/fishing-lake.js');
 assert.match(s,/const reeds=new THREE.InstancedMesh/);
 assert.match(s,/const pebbles=new THREE.InstancedMesh/);
 assert.match(s,/quality!=='low'&&d<44/);
 assert.match(s,/contourGeometry\(THREE,new THREE.CircleGeometry/);
 assert.match(s,/contourGeometry\(THREE,new THREE.RingGeometry/);
});
check('HUD e física da pesca utilizam a mesma margem irregular',()=>{
 assert.match(source('src/main.js'),/Math\.abs\(lakeEdgeDistance\(player\.position\.x,player\.position\.z\)\)/);
 assert.match(source('src/main.js'),/nearLakeShore\(player\.position\)/);
 assert.match(source('src/world/terrain.js'),/lakeTerrainDrop\(x,z\)/);
});
check('versão atual e cache de scripts estão sincronizados',()=>{
 assert.equal(JSON.parse(source('package.json')).version,'2.52.0');
 assert.match(source('index.html'),/2\.51\.0-lake-shore-lod|2\.52\.0-lake-ecology/);
 assert.match(source('src/main.js'),/v2\.52\.0/);
});
console.log('v2.51.0: '+n+' testes aprovados');
