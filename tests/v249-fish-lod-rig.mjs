import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {visibleFishCount,sampleFishSwim,SCHOOL_COUNT} from '../src/world/fish-school.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
let checks=0;function test(name,fn){fn();console.log('✓ v2.49 '+(++checks)+' '+name);}
test('LOD alto usa peixes instanciados perto da lagoa',()=>{
 assert.equal(visibleFishCount(10,'high'),SCHOOL_COUNT);
 assert.equal(visibleFishCount(10,'medium'),15);
 assert.equal(visibleFishCount(10,'low'),8);
});
test('LOD intermediário reduz o cardume em todas as qualidades',()=>{
 assert.equal(visibleFishCount(40,'high'),6);assert.equal(visibleFishCount(40,'medium'),6);
 assert.equal(visibleFishCount(34,'low'),3);
});
test('LOD distante elimina peixes invisíveis',()=>{
 for(const q of ['low','medium','high'])assert.equal(visibleFishCount(100,q),0);
 assert.equal(visibleFishCount(Infinity),0);
});
test('trajetórias são determinísticas e limitadas à água',()=>{
 for(const t of [0,1.2,49.7,300])for(let i=0;i<SCHOOL_COUNT;i++){
  const a=sampleFishSwim(i,t),b=sampleFishSwim(i,t);
  assert.deepEqual(a,b);assert.ok(Math.hypot(a.x,a.z)<12.6);
  assert.ok(a.y<0&&a.y>-.5);
  assert.ok(Number.isFinite(a.heading));
 }
});
test('caudas e direção variam com o tempo sem sortear números por frame',()=>{
 const a=sampleFishSwim(5,1),b=sampleFishSwim(5,3);
 assert.notEqual(a.heading,b.heading);assert.notEqual(a.tail,b.tail);
});
test('cardume usa InstancedMesh em vez de criar peixes individualmente a cada frame',()=>{
 const s=read('src/world/fish-school-visual.js');
 assert.match(s,/new THREE.InstancedMesh/);assert.match(s,/setMatrixAt/);
 assert.match(s,/elapsed-lastUpdate<\.09/);assert.match(s,/root.visible=count>0/);
});
test('lagoa mantém água e juncos com LOD e cardume próprio',()=>{
 const s=read('src/world/fishing-lake.js');
 assert.match(s,/createFishSchoolVisual/);assert.match(s,/school.update/);
 assert.match(s,/reed.geometry===reedGeo/);
});
test('vara acompanha mão REV5 e fallback do avatar original',()=>{
 const s=read('src/characters/player-rev5.js'),v=read('src/world/fishing-visual.js');
 assert.match(s,/getFishingGrip/);assert.match(s,/fishingLeftArm.rotation.x/);
 assert.match(v,/usedHand/);assert.match(v,/waterY/);assert.match(v,/hasSplash/);
});
test('respingos são ligados à fisgada e ao recolhimento, sem assets externos',()=>{
 const s=read('src/main.js');
 for(const token of ["fishingVisual.splash('bite')","fishingVisual.splash('hook')","fishingVisual.splash('caught')","fishingLake.update(player.position,graphicsQuality,elapsed)"])assert.ok(s.includes(token),token);
});
test('v2.49 preserva pesca por Y, cooldown e formato dos saves',()=>{
 const main=read('src/main.js');assert.match(main,/if \(e\.code === 'KeyY'\) fishNearby\(\)/);
 assert.match(read('src/gameplay/fishing-session.js'),/export const BITE_WINDOW=1\.55/);
 assert.equal(JSON.parse(read('package.json')).version,'2.49.0');
});
console.log('v2.49.0: '+checks+' testes de pesca visual aprovados');
