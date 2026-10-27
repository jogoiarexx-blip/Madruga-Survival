import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {loadSpiderParts,SPIDER_DURATIONS} from '../src/characters/spider-model.js';
import {spiderJumpHeight,spiderTerrainSlope,createSpiderAI} from '../src/gameplay/spider-ai.js';
import {createProjectileSystem} from '../src/gameplay/projectiles.js';
let passed=0;
const test=(name,fn)=>{fn();passed++;console.log(`OK v2.8 ${passed}: ${name}`);};
test('salto inicia/termina no chão e tem arco sem altura negativa',()=>{
  assert.equal(spiderJumpHeight(0),0);
  assert.ok(Math.abs(spiderJumpHeight(SPIDER_DURATIONS.Jump))<1e-8);
  assert.ok(spiderJumpHeight(.8)>.49);
  for(let t=-.5;t<2;t+=.05)assert.ok(spiderJumpHeight(t)>=0);
});
test('alinhamento das patas acompanha declive sem girar o collider',()=>{
  const flat=spiderTerrainSlope(0,0,0,()=>0);assert.ok(Math.abs(flat.x)<1e-10&&Math.abs(flat.z)<1e-10);
  const front=spiderTerrainSlope(0,0,0,(x,z)=>z*.5);
  assert.ok(front.x<-.2&&front.z===0);
  const side=spiderTerrainSlope(0,0,0,(x,z)=>x*.1);
  assert.ok(side.z>0&&side.z<.2);
  const steep=spiderTerrainSlope(0,0,0,(x,z)=>z*100);
  assert.ok(Math.abs(steep.x)<=.23);
});
function makeEnemy(){
  return {mesh:{position:{x:0,y:0,z:0},rotation:{y:0,z:0},scale:{set(){}},id:4},
    type:'spider',speed:3.6,size:1.55,damage:10,hp:6,knockback:0,
    spiderBrain:{cooldown:0,action:null,actionTime:0,hit:false},
    spiderVisual:{clips:[],update(dt,moving,near,pace,slope){this.slope=slope;this.clips.push('update')},jump(){this.clips.push('Jump')},attack(name){this.clips.push(name)}}};
}
test('salto físico avança o collider com arco e aterrissa sem flutuar',()=>{
  const enemy=makeEnemy(),player={position:{x:3.5,z:0}};
  const ai=createSpiderAI({player,getGroundHeight:()=>0,resolveCollision:(x,z)=>({x,z}),damagePlayer:()=>true,throwProjectile:()=>{}});
  ai.update(enemy,.05,2.25);assert.equal(enemy.spiderBrain.action,'Jump');
  let apex=0;
  for(let i=0;i<32;i++){ai.update(enemy,.05,.4);apex=Math.max(apex,enemy.mesh.position.y);}
  assert.ok(enemy.mesh.position.x>1,'salto aproxima a aranha do jogador');
  assert.ok(apex>enemy.size/2+.45,'o collider sobe no salto');
  assert.ok(Math.abs(enemy.mesh.position.y-enemy.size/2)<1e-7,'termina no solo');
});
test('salto não atravessa paredes e não causa ataques duplicados',()=>{
  let hits=0;const enemy=makeEnemy(),player={position:{x:3.5,z:0}};
  const ai=createSpiderAI({player,getGroundHeight:()=>0,resolveCollision:(x,z)=>({x:Math.min(.5,x),z}),damagePlayer:()=>{hits++;return true},throwProjectile:()=>{}});
  ai.update(enemy,.05,2.25);
  for(let i=0;i<32;i++)ai.update(enemy,.05,.4);
  assert.ok(enemy.mesh.position.x<=.5);assert.equal(hits,0);
});
test('atualização visual recebe os declives do chão',()=>{
  const enemy=makeEnemy(),player={position:{x:20,z:0}};
  const ai=createSpiderAI({player,getGroundHeight:(x,z)=>z*.2,resolveCollision:(x,z)=>({x,z}),damagePlayer:()=>true,throwProjectile:()=>{}});
  ai.update(enemy,.1,0);assert.ok(enemy.spiderVisual.slope.x<0);
});
class Vec{
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
  clone(){return new Vec(this.x,this.y,this.z)}
  add(v){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this;}
  sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this;}
  normalize(){const n=this.length()||1;return this.multiplyScalar(1/n)}
  length(){return Math.hypot(this.x,this.y,this.z)}
  multiplyScalar(n){this.x*=n;this.y*=n;this.z*=n;return this;}
  addScaledVector(v,n){this.x+=v.x*n;this.y+=v.y*n;this.z+=v.z*n;return this;}
  applyAxisAngle(){return this;}
  copy(v){this.x=v.x;this.y=v.y;this.z=v.z;return this;}
}
function projectilesFor({wall=Infinity,canDamage=true}={}){
  const player={position:new Vec(3,0,0)};let slows=0,hits=0,removed=0;
  const THREE={Vector3:Vec,IcosahedronGeometry:class{},MeshStandardMaterial:class{},
    Mesh:class {constructor(){this.position=new Vec();this.rotation={y:0}}}};
  const projectiles=createProjectileSystem({THREE,scene:{add(){}},player,
    allColliders:[],isPositionFree:x=>x<wall,damagePlayer:()=>{hits++;return canDamage},
    removeMesh:()=>removed++,isGameActive:()=>true,onWebHit:()=>slows++});
  projectiles.throwProjectile({mesh:{position:new Vec(0,0,0)},type:'spider'});
  return {projectiles,run:()=>{for(let i=0;i<12;i++)projectiles.update(.1)},get slows(){return slows},get hits(){return hits},get removed(){return removed}};
}
test('teia não aplica lentidão quando a esquiva bloqueia o dano',()=>{
  const r=projectilesFor({canDamage:false});r.run();assert.equal(r.hits,1);assert.equal(r.slows,0);assert.equal(r.removed,1);
});
test('teia causa apenas uma lentidão em impacto válido',()=>{
  const r=projectilesFor({canDamage:true});r.run();assert.equal(r.hits,1);assert.equal(r.slows,1);
});
test('projétil não atravessa paredes finas em quadros longos',()=>{
  const r=projectilesFor({wall:1.1});r.run();assert.equal(r.hits,0);assert.equal(r.slows,0);assert.equal(r.removed,1);
});
test('cache-busting da v2.8 aplicado ao HTML e imports',()=>{
  const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  assert.match(index,/data-build="(?:2\.(?:8|9|10|11)\.0-spider|2\.12\.0-nests|2\.13\.0-cave|2\.14\.0-cave|2\.15\.0-hotbar|2\.16\.0-inventory|2\.17\.0-bag|2\.18\.0-bag-chest|2\.19\.0-gear|2\.20\.0-build-wheel|2\.21\.0-menu|2\.22\.0-gpu|2\.23\.0-goblin|2\.24\.0-goblin-ik|2\.25\.0-menu-hud|2\.27\.0-recovery|2\.28\.0-model-cache|2\.29\.0-enemy-pool|2\.29\.1-goblin-visible)"/);
  assert.match(main,/spider-model\.js\?v=(?:2\.(?:8|9|10|11)\.0-spider|2\.12\.0-nests|2\.13\.0-cave|2\.14\.0)/);
  assert.match(main,/projectiles\.js\?v=(?:2\.(?:8|9|10|11)\.0-spider|2\.12\.0-nests|2\.13\.0-cave|2\.14\.0-cave|2\.15\.0-hotbar|2\.16\.0-inventory|2\.17\.0-bag|2\.18\.0-bag-chest|2\.19\.0-gear|2\.20\.0-build-wheel|2\.21\.0-menu|2\.22\.0-gpu|2\.23\.0-goblin|2\.24\.0-goblin-ik|2\.25\.0-menu-hud|2\.27\.0-recovery|2\.28\.0-model-cache|2\.29\.0-enemy-pool|2\.29\.1-goblin-visible)/);
});
{
  // Concurrency: GLB sintético com 8 fragmentos e fetches de latência artificial.
  const contents=randomBytes(144000);contents.write('glTF',0,'ascii');
  const chunks=Array.from({length:8},(_,i)=>contents.subarray(i*18000,(i+1)*18000).toString('base64'));
  const manifest={byteLength:contents.length,parts:chunks.map((_,i)=>`part${String(i).padStart(2,'0')}.b64`)};
  let active=0,maxConcurrent=0;
  const fetcher=async url=>{
    if(url.endsWith('manifest.json'))return {ok:true,json:async()=>manifest};
    const index=manifest.parts.indexOf(url.split('/').pop());assert.ok(index>=0);
    active++;maxConcurrent=Math.max(maxConcurrent,active);
    await new Promise(resolve=>setTimeout(resolve,2));active--;
    return {ok:true,text:async()=>chunks[index]};
  };
  class Loader{async parseAsync(buffer){assert.deepEqual(Buffer.from(buffer),contents);return {scene:true};}}
  const out=await loadSpiderParts({GLTFLoader:Loader,fetcher,atobFn:s=>Buffer.from(s,'base64').toString('binary')});
  assert.ok(out.scene);assert.ok(maxConcurrent>1&&maxConcurrent<=5);passed++;
  console.log(`OK v2.8 ${passed}: partes paralelas preservam bytes e limite de conexão`);
}
console.log(`v2.8: ${passed} testes de física, desempenho e projéteis aprovados`);
