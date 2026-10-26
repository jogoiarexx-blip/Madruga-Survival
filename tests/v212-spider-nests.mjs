import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSurvival,restoreSurvival,RECIPES} from '../src/gameplay/survival.js';
import {craftItem,craftAvailability} from '../src/gameplay/crafting.js';
import {validateSave,writeSave,readSave} from '../src/gameplay/save-system.js';
import {NEST_SPECS,spiderNestLayout,validSpiderNestSave,nestLoot,takeNestEgg,tickNest,createSpiderNestWorld} from '../src/world/spider-nests.js';
let passed=0;function test(name,fn){fn();passed++;console.log('OK v2.12',passed,name)}
const base=()=>({version:2,seed:42,graphicsQuality:'medium',level:1,xp:0,kills:0,
 health:100,maxHealth:100,wave:1,elapsed:0,currentWeapon:0,player:{x:0,z:0,yaw:0},
 survival:createSurvival(),resources:[],buildings:[],healthPacks:[],speedBoosts:[],enemies:[]});
const mem=()=>{const m=new Map();return {getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v)};};
const rich=()=>{const x=createSurvival();for(const k of Object.keys(x.inventory))x.inventory[k]=100;return x;};
test('três ninhos de espécies diferentes',()=>{
 assert.deepEqual(NEST_SPECS.map(x=>x.variant),['shadow','hunter','weaver']);
 assert.equal(new Set(NEST_SPECS.map(x=>x.id)).size,3);
});
test('distribuição pelo seed reproduzível em 256 mundos',()=>{
 for(let i=0;i<256;i++){const list=spiderNestLayout(i);
  assert.equal(list.length,3,`seed ${i}`);
  assert.deepEqual(list,spiderNestLayout(i));
  for(const n of list)assert.ok(Math.hypot(n.x+4,n.z+5)>19);
 }
});
test('área totalmente bloqueada não gera ninhos falsos',()=>assert.deepEqual(spiderNestLayout(42,()=>false),[]));
test('recompensa de cada ovo corresponde ao tipo de ninho',()=>{
 assert.deepEqual(nestLoot('weaver'),{spiderSilk:3,chitin:1});
 assert.deepEqual(nestLoot('hunter'),{spiderSilk:2,chitin:2});
});
test('colhe um ovo por interação e nunca abaixo de zero',()=>{
 const n={variant:'shadow',eggs:1},inv=createSurvival().inventory;
 assert.equal(takeNestEgg(n,inv).ok,true);assert.equal(n.eggs,0);
 assert.equal(takeNestEgg(n,inv).ok,false);assert.equal(inv.spiderSilk,2);
});
test('mochila cheia impede consumo e duplicação',()=>{
 const n={variant:'shadow',eggs:3},inv=createSurvival().inventory;inv.spiderSilk=998;
 assert.equal(takeNestEgg(n,inv).ok,false);assert.equal(n.eggs,3);assert.equal(inv.spiderSilk,998);
});
test('ovos só eclodem com jogador perto',()=>{
 const n={id:'x',variant:'shadow',x:0,z:0,eggs:2,hatchTimer:0.2,webCooldown:0};
 assert.equal(tickNest(n,.25,28).length,0);assert.equal(n.eggs,2);
 assert.equal(tickNest(n,.25,12)[0].type,'hatch');assert.equal(n.eggs,1);
});
test('limite de criaturas suspende eclosão sem apagar ovos',()=>{
 const n={id:'x',variant:'shadow',x:0,z:0,eggs:2,hatchTimer:0,webCooldown:0};
 assert.deepEqual(tickNest(n,.1,6,{canHatch:false}),[]);assert.equal(n.eggs,2);
});
test('teia no chão aplica lentidão só com colisão e respeita cooldown',()=>{
 const n={id:'x',variant:'shadow',x:0,z:0,eggs:2,hatchTimer:45,webCooldown:0};
 assert.equal(tickNest(n,.1,3,{webDistance:.6})[0].type,'web');
 assert.deepEqual(tickNest(n,.1,3,{webDistance:.6}),[]);
 assert.deepEqual(tickNest(n,.1,3,{webDistance:.6,canTrip:false}),[]);
});
test('ninho sem ovos não gera novas teias ou aranhas',()=>{
 const n={id:'x',variant:'shadow',x:0,z:0,eggs:0,hatchTimer:0,webCooldown:0};
 assert.deepEqual(tickNest(n,.1,0,{webDistance:0}),[]);
});
test('validação rejeita saves com IDs repetidos ou valores adulterados',()=>{
 assert.equal(validSpiderNestSave(undefined),true);
 const a={id:'bosque',eggs:2,hatchTimer:12,webCooldown:1};
 assert.equal(validSpiderNestSave([a]),true);
 assert.equal(validSpiderNestSave([a,a]),false);
 assert.equal(validSpiderNestSave([{...a,eggs:900}]),false);
 assert.equal(validSpiderNestSave([{...a,hatchTimer:Infinity}]),false);
 assert.equal(validSpiderNestSave([{...a,id:'x'}]),false);
});
test('novo save passa e mantém ovos, antigos sem ninhos passam',()=>{
 const store=mem(),save=base();assert.ok(writeSave(store,save));
 const n={id:'bosque',eggs:1,hatchTimer:4,webCooldown:0};
 save.spiderNests=[n];assert.ok(writeSave(store,save));
 assert.deepEqual(readSave(store).spiderNests,[n]);
 save.spiderNests=[{...n,eggs:-5}];assert.equal(validateSave(save),null);
});
test('recursos e progressão antigos migram para v2.12',()=>{
 const old=createSurvival();for(const key of ['spiderSilk','chitin','silkDressing'])delete old.inventory[key];
 delete old.crafted.chitinPadding;
 const s=restoreSurvival(old);assert.ok(s);assert.equal(s.inventory.spiderSilk,0);
 assert.equal(s.inventory.chitin,0);assert.equal(s.crafted.chitinPadding,false);
});
test('reforço de quitina exige bancada, é único e consome materiais',()=>{
 const s=rich(),before=s.inventory.chitin;
 assert.equal(craftItem(s,'chitinPadding').ok,false);
 assert.equal(craftItem(s,'chitinPadding',1,{workbench:true}).ok,true);
 assert.equal(s.inventory.chitin,before-RECIPES.chitinPadding.cost.chitin);
 assert.equal(craftAvailability(s,'chitinPadding',{workbench:true}).ok,false);
});
test('curativo de seda é fabricável em lote e bloqueia mochila cheia',()=>{
 const s=rich();s.inventory.silkDressing=0;
 assert.equal(craftItem(s,'silkDressing',3,{workbench:true}).produced,3);
 s.inventory.silkDressing=999;assert.equal(craftItem(s,'silkDressing',1,{workbench:true}).ok,false);
});
class Vec {constructor(){this.x=this.y=this.z=0}set(x,y,z){this.x=x;this.y=y;this.z=z;}}
class Group {constructor(){this.position=new Vec();this.rotation=new Vec();this.children=[];this.visible=true;}add(x){this.children.push(x)}traverse(fn){fn(this);for(const c of this.children)c.traverse(fn)}}
class Mesh extends Group{constructor(g,m){super();this.geometry=g;this.material=m;this.scale=new Vec()}}
class Geom{dispose(){}}
const THREE={Group,Mesh,MeshStandardMaterial:class{constructor(p){Object.assign(this,p)}},CylinderGeometry:Geom,TorusGeometry:Geom,BoxGeometry:Geom,IcosahedronGeometry:Geom,DoubleSide:2};
const scene={children:[],add(n){this.children.push(n)},remove(n){this.children.splice(this.children.indexOf(n),1)}};
const world=createSpiderNestWorld({THREE,scene,getGroundHeight:()=>0});
test('ninhos e ovos são geometria 3D leve e visível',()=>{
 const list=world.generate(123);assert.equal(list.length,3);assert.equal(scene.children.length,1);
 assert.equal(list.reduce((sum,n)=>sum+n.eggMeshes.length,0),9);
});
test('gerar mais uma vez não duplica mundo nem objetos',()=>{
 world.generate(123);assert.equal(scene.children.length,1);assert.equal(world.nests.length,3);
});
test('colheita oculta ovo, mantém progresso e é restaurável',()=>{
 const n=world.nests[0],inv=createSurvival().inventory,p={x:n.x,z:n.z};
 const res=world.harvest(p,inv);assert.ok(res.ok);assert.equal(n.eggs,2);
 assert.equal(n.eggMeshes.filter(e=>e.visible).length,2);
 const data=world.serialize();world.generate(123);world.restore(data);
 assert.equal(world.nests[0].eggs,2);
});
test('atualização do mundo aciona eventos e respeita lotação',()=>{
 const n=world.nests[0];n.hatchTimer=0;
 const p={x:n.x+5,z:n.z};const events=world.update(.1,p,{canHatch:false});
 assert.equal(events.filter(e=>e.type==='hatch').length,0);
 const once=world.update(.1,p,{canHatch:true});assert.equal(once.filter(e=>e.type==='hatch').length,1);
});
test('código integra HUD, save, coleta, spawn e cura',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 for(const needle of ['spiderNests.generate(worldSeed)','spiderNests.serialize()','spiderNests.restore(data.spiderNests)',
 'spiderNests.harvest(player.position,survival.inventory)','spiderNests.update(dt,player.position','spawnEnemy(\'spider\',event.variant)',
 "if(type==='silkDressing')",'survival.crafted.chitinPadding'])assert.ok(main.includes(needle),needle);
});
console.log(`v2.12: ${passed} novos testes aprovados`);
