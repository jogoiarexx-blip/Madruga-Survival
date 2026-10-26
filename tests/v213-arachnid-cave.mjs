import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSurvival,restoreSurvival,RECIPES} from '../src/gameplay/survival.js';
import {craftItem,craftAvailability} from '../src/gameplay/crafting.js';
import {validateSave,writeSave,readSave} from '../src/gameplay/save-system.js';
import {SPIDER_VARIANTS,chooseSpiderVariant} from '../src/gameplay/spider-variants.js';
import {CAVE_CENTER,CAVE_RADIUS,CRYSTAL_NODES,validCaveSave,crystalAvailable,takeCaveCrystal,caveEntryFromNests,createArachnidCave} from '../src/world/arachnid-cave.js';
let tested=0;const test=(label,fn)=>{fn();console.log('OK v2.13',++tested,label)};
const base=()=>({version:2,seed:55,graphicsQuality:'medium',level:1,xp:0,kills:0,
  health:100,maxHealth:100,wave:1,elapsed:0,currentWeapon:0,player:{x:0,z:0,yaw:0},
  survival:createSurvival(),resources:[],buildings:[],healthPacks:[],speedBoosts:[],enemies:[]});
const mem=()=>{let v=null;return {getItem(){return v},setItem(k,x){v=x}}};
test('mundo subterrâneo tem quatro jazidas: três básicas e uma após a rainha',()=>{
 assert.equal(CRYSTAL_NODES.length,4);assert.equal(CRYSTAL_NODES.filter(n=>n.requiresBoss).length,1);
 assert.equal(CRYSTAL_NODES.reduce((s,n)=>s+n.amount,0),5);
});
test('rainha usa modelo anterior, sem entrar no spawn aleatório',()=>{
 assert.equal(SPIDER_VARIANTS.matriarch.hp,48);
 assert.ok(SPIDER_VARIANTS.matriarch.size>SPIDER_VARIANTS.weaver.size);
 for(let day=1;day<=8;day++)for(let i=0;i<100;i++)assert.notEqual(chooseSpiderVariant({day,night:true,threat:5,roll:i/100}),'matriarch');
});
test('saves antigos sem caverna são aceitos',()=>{
 assert.equal(validCaveSave(undefined),true);
 assert.ok(validateSave(base()));
});
test('save da caverna é validado e persistido com seed anterior',()=>{
 const st=mem(),s=base();s.arachnidCave={inside:true,bossDefeated:false,collected:[0,2]};
 assert.equal(writeSave(st,s),true);assert.deepEqual(readSave(st).arachnidCave,s.arachnidCave);
});
test('IDs inválidos, duplicação e valores incorretos são rejeitados',()=>{
 const state={inside:false,bossDefeated:true,collected:[0]};
 for(const x of [{...state,collected:[1,1]},{...state,collected:[9]},{...state,inside:'true'},{...state,bossDefeated:5},[]]){
   assert.equal(validCaveSave(x),false);assert.equal(validateSave({...base(),arachnidCave:x}),null);
 }
});
test('cristal de chefe está bloqueado antes da vitória',()=>{
 const st={inside:true,bossDefeated:false,collected:[]},inv=createSurvival().inventory;
 assert.equal(crystalAvailable(CRYSTAL_NODES[3],st),false);
 assert.equal(takeCaveCrystal(st,CRYSTAL_NODES[3],inv).ok,false);assert.equal(inv.caveCrystal,0);
});
test('coleta é única, não duplica após repetição',()=>{
 const st={inside:true,bossDefeated:false,collected:[]},inv=createSurvival().inventory;
 assert.equal(takeCaveCrystal(st,CRYSTAL_NODES[0],inv).ok,true);
 assert.equal(takeCaveCrystal(st,CRYSTAL_NODES[0],inv).ok,false);
 assert.equal(inv.caveCrystal,1);assert.deepEqual(st.collected,[0]);
});
test('mochila cheia não apaga cristal',()=>{
 const st={inside:true,bossDefeated:true,collected:[]},inv=createSurvival().inventory;
 inv.caveCrystal=998;assert.equal(takeCaveCrystal(st,CRYSTAL_NODES[3],inv).ok,false);
 assert.equal(st.collected.length,0);assert.equal(inv.caveCrystal,998);
});
test('cristal da rainha só fica disponível depois da derrota',()=>{
 const st={inside:true,bossDefeated:true,collected:[]},inv=createSurvival().inventory;
 assert.equal(takeCaveCrystal(st,CRYSTAL_NODES[3],inv).ok,true);
 assert.equal(inv.caveCrystal,2);
});
test('portal usa colônia das tecelãs e não surge sem ninho',()=>{
 assert.deepEqual(caveEntryFromNests([{id:'tecelas',x:10,z:20}]),{x:15.5,z:24.5});
 assert.equal(caveEntryFromNests([]),null);
});
test('melhoria de lança exige pré-requisito e estação',()=>{
 const s=createSurvival();for(const key of Object.keys(s.inventory))s.inventory[key]=90;
 assert.equal(craftAvailability(s,'crystalSpear',{workbench:true}).ok,false);
 s.crafted.hammer=s.crafted.spear=s.crafted.ironSpear=s.crafted.hardenedSpear=true;
 assert.equal(craftItem(s,'crystalSpear',1,{workbench:false}).ok,false);
 assert.equal(craftItem(s,'crystalSpear',1,{workbench:true}).ok,true);
 assert.equal(s.inventory.caveCrystal,90-RECIPES.crystalSpear.cost.caveCrystal);
 assert.equal(craftAvailability(s,'crystalSpear',{workbench:true}).ok,false);
});
test('estado da nova arma migra saves anteriores',()=>{
 const s=createSurvival();delete s.inventory.caveCrystal;delete s.crafted.crystalSpear;
 assert.equal(restoreSurvival(s)?.crafted.crystalSpear,false);
 assert.equal(restoreSurvival(s)?.inventory.caveCrystal,0);
});
test('não permite melhoria de cristal sem lança temperada em save',()=>{
 const s=base();s.survival.crafted.crystalSpear=true;
 assert.equal(validateSave(s),null);
});
// Simulação da integração 3D para detectar ciclo duplicado e sincronização visual.
class Vec{constructor(){this.x=this.y=this.z=0}set(x,y,z){this.x=x;this.y=y;this.z=z}}
class Node{constructor(){this.position=new Vec();this.scale=new Vec();this.scale.set(1,1,1);this.rotation=new Vec();this.children=[];this.visible=true}add(x){this.children.push(x)}traverse(fn){fn(this);for(const c of this.children)c.traverse(fn)}}
class Mesh extends Node{constructor(g,m){super();this.geometry=g;this.material=m}}
class Geom{dispose(){}}
class Material{constructor(p){Object.assign(this,p)}}
const THREE={Group:Node,Mesh,MeshStandardMaterial:Material,DodecahedronGeometry:Geom,CylinderGeometry:Geom,OctahedronGeometry:Geom,
 ConeGeometry:Geom,SphereGeometry:Geom,RingGeometry:Geom,MeshBasicMaterial:Material,DoubleSide:2,
 PointLight:class extends Node {}};
const scene={children:[],add(n){this.children.push(n)},remove(n){const i=this.children.indexOf(n);if(i>=0)this.children.splice(i,1)}};
const world=createArachnidCave({THREE,scene,getGroundHeight:()=>0});
test('caverna modelada uma vez com marcação de entrada e boss inicialmente bloqueado',()=>{
 world.generate([{id:'tecelas',x:42,z:24}]);
 assert.equal(scene.children.length,2);assert.equal(world.inside,false);
 assert.equal(world.nearPortal({x:47.5,z:28.5}),true);
 assert.equal(world.nearestCrystal({x:CAVE_CENTER.x-3,z:CAVE_CENTER.z+4}),null);
});
test('entrar ativa caverna e saída; novo generate não duplica geometria',()=>{
 const p=world.enter();assert.equal(world.inside,true);assert.ok(world.nearExit(p));
 assert.equal(world.nearestCrystal({x:CAVE_CENTER.x-3,z:CAVE_CENTER.z+4})?.id,0);
 world.generate([{id:'tecelas',x:42,z:24}]);assert.equal(scene.children.length,2);
});
test('colheita e boss aparecem após restaurar checkpoint',()=>{
 world.enter();const pos={x:CAVE_CENTER.x-3,z:CAVE_CENTER.z+4},s=createSurvival();
 assert.equal(world.harvest(pos,s.inventory).ok,true);
 const state=world.serialize();assert.deepEqual(state.collected,[0]);
 world.restore({inside:false,bossDefeated:false,collected:[]});assert.equal(world.inside,false);
 assert.equal(world.restore(state),true);assert.equal(world.nearestCrystal(pos),null);
 assert.equal(world.defeatBoss(),true);assert.equal(world.defeatBoss(),false);
 assert.equal(world.nearestCrystal({x:CAVE_CENTER.x,z:CAVE_CENTER.z+1})?.id,3);
});
test('movimento na área e estado da rainha aparecem no código integrado',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 for(const key of ['arachnidCave.nearPortal','arachnidCave.nearExit','arachnidCave.harvest',"spiderVariant==='matriarch'",'arachnidCave:arachnidCave.serialize()','arachnidCave.restore(data.arachnidCave)'])assert.ok(main.includes(key),key);
});
console.log(`v2.13: ${tested} testes aprovados`);
