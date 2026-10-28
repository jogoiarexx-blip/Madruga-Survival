import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {findGuardFiringPosition} from '../src/gameplay/guard-firing-position.js';
import {createGuardShotController} from '../src/gameplay/guard-combat.js';
import {canEngageInOrder} from '../src/gameplay/guard-orders.js';
let passed=0;const t=(name,fn)=>{fn();console.log(`✓ v2.34 ${++passed}: ${name}`)};
const euclidean=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const wall=(a,b)=>{ // obstáculo vertical: -1 < x < 1, -2 < z < 2
  const dx=b.x-a.x;
  if(Math.abs(dx)<.0001)return a.x>-1&&a.x<1&&Math.min(a.z,b.z)<2&&Math.max(a.z,b.z)>-2;
  for(const x of [-1,0,1]){
    const q=(x-a.x)/dx;
    if(q>=0&&q<=1){const z=a.z+(b.z-a.z)*q;if(z>-2&&z<2)return true;}
  }
  return false;
};
const free=(x,z,r)=>!(x>-1-r&&x<1+r&&z>-2-r&&z<2+r);
t('repositioning chooses a clear firing position near building',()=>{
 const origin={x:-4,z:0},enemy={x:4,z:0};
 const spot=findGuardFiringPosition(origin,enemy,{isFree:free,canSee:(a,b)=>!wall(a,b)});
 assert.ok(spot, 'should find a firing position');
 assert.ok(free(spot.x,spot.z,.42));assert.ok(!wall(spot,enemy));
 assert.ok(euclidean(spot,enemy)<=11);assert.ok(euclidean(spot,origin)<=12);
});
t('no possible firing point means no shot through opaque wall',()=>{
 assert.equal(findGuardFiringPosition({x:0,z:0},{x:5,z:0},{isFree:()=>false}),null);
 assert.equal(findGuardFiringPosition({x:0,z:0},{x:5,z:0},{canSee:()=>false}),null);
});
t('respects order leash',()=>{
 const origin={x:-4,z:0},enemy={x:4,z:0};
 assert.equal(findGuardFiringPosition(origin,enemy,{withinTerritory:()=>false}),null);
 const f=findGuardFiringPosition(origin,enemy,{isFree:free,canSee:(a,b)=>!wall(a,b),
   withinTerritory:p=>canEngageInOrder(p,'defend',{x:90,z:90},[{x:-3,z:-1}],{radius:14})});
 assert.ok(f);
});
t('bounded and safe even for malformed input',()=>{
 assert.equal(findGuardFiringPosition(null,{x:0,z:0}),null);
 assert.equal(findGuardFiringPosition({x:NaN,z:0},{x:1,z:2}),null);
 let calls=0;findGuardFiringPosition({x:0,z:0},{x:4,z:0},{isFree:()=>{calls++;return true;}});
 assert.ok(calls<=36);
});
t('shot still verifies line of sight at impact time',()=>{
 const shot=createGuardShotController();const enemy={hp:20,mesh:{position:{x:5,z:0}}};
 let damage=0;assert.ok(shot.begin(enemy));
 shot.update(.3,{x:0,z:0},{canSee:()=>true,onHit:()=>damage++});
 shot.update(.2,{x:0,z:0},{canSee:()=>false,onHit:()=>damage++});
 assert.equal(damage,0);
});
t('HUD shows activity but hides it when Chaves is not recruited',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const css=readFileSync(new URL('../styles/main.css',import.meta.url),'utf8');
 assert.match(main,/guard\.activity/);
 assert.match(main,/classList\.toggle\('hidden',!active\)/);
 assert.match(html,/id="guard-activity"/);
 assert.match(css,/#guard-activity\[data-activity="blocked"\]/);
});
t('AI uses navigation for repositioning instead of shooting across buildings',()=>{
 const guard=readFileSync(new URL('../src/characters/villager-guard.js',import.meta.url),'utf8');
 assert.match(guard,/findGuardFiringPosition\(/);
 assert.match(guard,/navigator\.navigate\(state,destination,dt/);
 assert.match(guard,/repositionCooldown=\.65/);
 assert.match(guard,/shotController\.update\(dt,model\.position/);
 assert.match(guard,/get activity\(\)/);
});
t('version cache and test suite updated',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
 assert.equal(pkg.version,'2.46.0');assert.match(html,/2\.34\.0-chaves-combat|2\.35\.0-stability|2\.36\.0-wildlife-inventory|2\.37\.0-campfire-ui|2\.38\.0-save-profiling|2\.39\.0-wildlife-quests|2\.40\.0-fauna-exploration|2\.41\.0-ecosystem|2\.42\.0-soundscape|2\.43\.0-foley|2\.44\.0-quiet-builds|2\.45\.0-stable-play|2\.46\.0-build-logistics/);
 assert.match(pkg.scripts.test,/v234-chaves-firing\.mjs/);
});
console.log(`v2.34: ${passed} verificações aprovadas`);
