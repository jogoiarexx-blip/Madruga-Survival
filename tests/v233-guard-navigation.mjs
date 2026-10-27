import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGuardNavigator,findGuardPath,segmentIsWalkable} from '../src/gameplay/guard-navigation.js';
import {createGuardState,restoreGuard} from '../src/characters/villager-guard.js';
let passed=0;
function test(name,fn){fn();console.log('✓ v2.33',++passed,name);}
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const rect=(x,z,r)=>!(x>-1-r && x<1+r && z>-4-r && z<4+r);
const resolve=(x,z)=>({x,z});
const flat=()=>0;
test('A* evita paredes extensas e só produz segmentos livres',()=>{
 const from={x:-8,z:0},to={x:8,z:0};
 const path=findGuardPath(from,to,{isFree:rect});
 assert.ok(path.length>=2,'deve contornar parede');
 let prev=from;
 for(const p of path){assert.ok(segmentIsWalkable(prev,p,{isFree:rect}));prev=p;}
});
test('Chaves contorna parede sem entrar na geometria em cada frame',()=>{
 const nav=createGuardNavigator({isFree:rect,resolveCollision:resolve,getGroundHeight:flat});
 let p={x:-8,z:0},goal={x:8,z:0};let ticks=0,maxStep=0;
 for(;ticks<270;ticks++){
  const n=nav.navigate(p,goal,.04,3.3,{stopAt:1.5});
  maxStep=Math.max(maxStep,dist(p,n));p={x:n.x,z:n.z};
  assert.ok(rect(p.x,p.z,.42),'nunca atravessa a parede');
  if(dist(p,goal)<1.6)break;
 }
 assert.ok(ticks<270,`atrasou depois de ${ticks} ticks`);
 assert.ok(maxStep<=.134,'não pode teleportar');
 assert.ok(nav.plannedRoutes<30,'não recalcular rota continuamente');
});
test('replaneja quando uma parede é construída no trajeto',()=>{
 let obstacle=false;const isFree=(x,z,r)=>!obstacle||rect(x,z,r);
 const nav=createGuardNavigator({isFree,resolveCollision:resolve});
 let p={x:-8,z:0};const goal={x:8,z:0};
 for(let i=0;i<30;i++){const n=nav.navigate(p,goal,.04,3.3,{stopAt:1});p={x:n.x,z:n.z};}
 obstacle=true;
 for(let i=0;i<260;i++){
  const before=p,n=nav.navigate(p,goal,.04,3.3,{stopAt:1});p={x:n.x,z:n.z};
  assert.ok(isFree(p.x,p.z,.42),'não pode atravessar nova parede');
  assert.ok(dist(before,p)<=.134,'não pode saltar para além do obstáculo');
  if(dist(p,goal)<1.1)break;
 }
 assert.ok(dist(p,goal)<1.1,`rota dinâmica não chegou: ${JSON.stringify(p)}`);
});
test('pontos altos/declives abruptos são rejeitados',()=>{
 const stairs=(x,z)=>x>0?5:0;
 assert.equal(segmentIsWalkable({x:-1,z:0},{x:1,z:0},{isFree:()=>true,getGroundHeight:stairs}),false);
 assert.ok(findGuardPath({x:-3,z:0},{x:3,z:0},{isFree:(x,z)=>x<0,getGroundHeight:stairs}).every(v=>v.x<0));
});
test('alvo alterado, ordens e checkpoints não prendem navegação anterior',()=>{
 const n=createGuardNavigator({isFree:()=>true,resolveCollision:resolve});
 n.navigate({x:0,z:0},{x:15,z:0},.05,3.3);
 const r=n.navigate({x:.165,z:0},{x:-15,z:0},.05,3.3);
 assert.ok(r.x<.165,'troca a direção sem seguir waypoint anterior');
 n.reset();assert.equal(n.pendingPoints,0);
 assert.equal(restoreGuard({...createGuardState(),mode:'follow'}).mode,'follow');
 assert.equal(restoreGuard({recruited:true,hp:80,x:0,z:0}).mode,'defend');
});
test('não move através de obstáculos sem saída, evita NaN',()=>{
 const area=(x,z)=>Math.hypot(x,z)<.65;
 const nav=createGuardNavigator({isFree:area,resolveCollision:resolve});
 let p={x:0,z:0};
 for(let i=0;i<100;i++){
  const n=nav.navigate(p,{x:12,z:0},.04,3.3);p={x:n.x,z:n.z};
  assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.z));
  assert.ok(area(p.x,p.z));
 }
});
test('movimento desacelera perto do alvo e limita picos de dt',()=>{
 const n=createGuardNavigator({isFree:()=>true,resolveCollision:resolve});
 const p=n.navigate({x:0,z:0},{x:4,z:0},4,3.3,{stopAt:1.5});
 assert.ok(p.x<=.166); // dt limitado a 50 ms
 assert.equal(n.navigate({x:2.5,z:0},{x:4,z:0},.04,3.3,{stopAt:1.5}).moved,false);
});
test('integração invoca navegação com colisão de construções e suavização do solo',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const guard=readFileSync(new URL('../src/characters/villager-guard.js',import.meta.url),'utf8');
 assert.match(main,/createVillagerGuard\(\{THREE,GLTFLoader,scene,getGroundHeight,resolveCollision,isPositionFree,/);
 assert.match(guard,/navigator\.navigate\(state,destination,dt/);
 assert.match(guard,/navigator\.reset\(\)/);
 assert.match(guard,/getGroundHeight\(state\.x,state\.z\)/);
 assert.match(guard,/actuallyMoving/);
});
console.log('v2.33',passed,'testes de navegação aprovados');
