import assert from 'node:assert/strict';
import {createSurvival,restoreSurvival,RECIPES,canAfford,spendRecipe,DAY_SECONDS} from '../src/gameplay/survival.js';
import {canUseTool,useTool,makeTool,restoreTool,TOOL_MAX} from '../src/gameplay/tools.js';
import {createRaidState,planRaid,nightNumber,restoreRaid} from '../src/gameplay/raids.js';
import {damageBuilding,repairBuilding,raidTarget,maxBuildingHP} from '../src/gameplay/base-defense.js';
import {createResourceWorld} from '../src/world/resources.js';
import {createBuildingWorld} from '../src/world/buildings.js';
import {writeSave,readSave,validateSave} from '../src/gameplay/save-system.js';
import {readFileSync} from 'node:fs';
const check=(name,fn)=>{fn();console.log(`OK v1.2: ${name}`)};
const s=()=>createSurvival();
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}};
check('migra estado antigo sem perder ferramentas e inventário',()=>{
 const old=s();delete old.inventory.iron;delete old.durability;delete old.crafted.pickaxe;delete old.crafted.ironSpear;
 old.crafted.hammer=true;old.crafted.spear=true;
 const newSave=restoreSurvival(old);
 assert.equal(newSave.inventory.iron,0);assert.equal(newSave.durability.hammer,100);
 assert.equal(newSave.durability.spear,90);assert.equal(newSave.crafted.pickaxe,false);
});
check('durabilidade da picareta tem desgaste e reparo sem duplicar item',()=>{
 const state=s();assert.equal(canUseTool(state,'pickaxe'),false);
 assert.ok(makeTool(state,'pickaxe'));
 for(let i=0;i<20;i++)assert.ok(useTool(state,'pickaxe',4));
 assert.equal(state.durability.pickaxe,0);assert.equal(useTool(state,'pickaxe',4),false);
 assert.equal(canUseTool(state,'pickaxe'),false);
 assert.equal(restoreTool(state,'pickaxe'),true);assert.equal(state.durability.pickaxe,80);
 assert.equal(restoreTool(state,'pickaxe'),false);
});
check('receitas de ferro e reparo só gastam materiais suficientes',()=>{
 const state=s();assert.ok(RECIPES.workbench&&RECIPES.ironSpear&&RECIPES.repairPickaxe);
 assert.equal(canAfford(state,'ironSpear'),false);
 state.inventory.iron=10;state.inventory.wood=6;
 assert.ok(spendRecipe(state,'ironSpear'));
 assert.equal(state.inventory.iron,4);assert.equal(state.inventory.wood,4);
});
check('invasão só ocorre na segunda noite e não duplica na madrugada',()=>{
 const state=s(),raid=createRaidState();state.days=1;state.time=DAY_SECONDS*.8;
 assert.equal(planRaid(state,raid,3),null);
 state.days=2;state.time=DAY_SECONDS*1.78;
 const event=planRaid(state,raid,3);
 assert.ok(event&&event.count>=3);assert.equal(event.night,2);
 assert.equal(planRaid(state,raid,3),null);
 state.days=3;state.time=DAY_SECONDS*2.02;
 assert.equal(nightNumber(state),2);assert.equal(planRaid(state,raid,3),null);
 state.days=3;state.time=DAY_SECONDS*2.80;
 assert.equal(planRaid(state,raid,0),null);
 assert.equal(planRaid(state,raid,3).night,3);
 assert.deepEqual(restoreRaid(raid),{lastNight:3,waves:2});
});
check('invasores atacam parede e não apagam itens do baú',()=>{
 const point={x:0,z:0};
 const wall={type:'wall',x:3,z:0,hp:maxBuildingHP('wall')};
 const chest={type:'chest',x:1,z:0,hp:maxBuildingHP('chest'),items:{wood:9}};
 assert.equal(raidTarget([wall,chest],{x:3.1,z:0},point),wall);
 let state=s();state.inventory.wood=1;
 assert.equal(damageBuilding(wall,70).destroyed,false);
 assert.equal(wall.hp,70);
 assert.ok(repairBuilding(wall,state));assert.equal(wall.hp,115);assert.equal(state.inventory.wood,0);
 assert.equal(repairBuilding(wall,state),false);
 assert.equal(damageBuilding(wall,120).destroyed,true);
 assert.deepEqual(chest.items,{wood:9});
});
class G{dispose(){}}
class Mat{constructor(data){Object.assign(this,data)}clone(){return new Mat(this)}dispose(){}}
class Thing{constructor(){this.children=[];this.position={x:0,y:0,z:0,set(x,y,z){Object.assign(this,{x,y,z})}};this.rotation={x:0,y:0,z:0};this.scale={x:1,y:1,z:1};this.visible=true;}add(c){this.children.push(c)}traverse(f){f(this);this.children.forEach(c=>c.traverse(f))}}
class Group extends Thing{}
class Mesh extends Thing{constructor(geometry,material){super();this.geometry=geometry;this.material=material}}
class Light extends Thing{constructor(){super();this.intensity=1}}
const THREE={Group,Mesh,PointLight:Light,MeshStandardMaterial:Mat,MeshBasicMaterial:Mat,BoxGeometry:G,ConeGeometry:G,CylinderGeometry:G,DodecahedronGeometry:G,IcosahedronGeometry:G,SphereGeometry:G,TorusGeometry:G,DoubleSide:2};
const make=()=>{
 const scene={items:[],add(v){this.items.push(v)},remove(v){this.items.splice(this.items.indexOf(v),1)}};
 const args={THREE,scene,getGroundHeight:()=>0,isPositionFree:()=>true,findSpawnPoint:()=>({x:40,z:40})};
 return {...args,buildings:createBuildingWorld(args),resources:createResourceWorld(args)};
};
check('minério pede picareta e mantém geração determinística',()=>{
 const w=make().resources;w.generate(2026);
 assert.equal(w.nodes.filter(n=>n.type==='iron').length,20);
 const iron=w.nodes.find(n=>n.type==='iron');
 const pos={x:iron.x,z:iron.z};
 // Um veio isolado pode ser escolhido de maneira inequívoca para colher.
 const noTool=w.harvest(pos,false);assert.equal(noTool.requires,'pickaxe');assert.equal(iron.cooldown,0);
 const mined=w.harvest(pos,true);assert.equal(mined.type,'iron');assert.equal(mined.amount,2);assert.ok(iron.cooldown>0);
});
check('saves v1.1 de nós são compatíveis com 20 novos veios',()=>{
 const {resources:a}=make();a.generate(42);
 const old=a.serialize().filter(n=>n.type!=='iron');
 const {resources:b}=make();b.generate(42);
 assert.equal(b.restore(old),true);
 assert.equal(b.nodes.filter(n=>n.type==='iron'&&n.cooldown===0).length,20);
});
check('bancada pode ser construída, salva, danificada e reparada',()=>{
 const {buildings:b}=make();
 assert.ok(b.canPlace('workbench',6,0,{x:0,z:0}));
 const bench=b.place('workbench',6,0);assert.equal(bench.type,'workbench');
 assert.ok(b.isBlocked(bench.x,bench.z));
 assert.equal(b.damage(bench,45).destroyed,false);
 const stored=b.serialize(),{buildings:second}=make();second.restore(stored);
 assert.deepEqual(second.serialize(),stored);assert.equal(second.structures[0].hp,75);
 const supplies=s();supplies.inventory.stone=2;
 assert.ok(second.repair(second.structures[0],supplies));
 assert.equal(second.structures[0].hp,120);
 assert.equal(second.damage(second.structures[0],150).destroyed,true);
 assert.equal(second.structures.length,0);
});
check('novo save inclui vida da base, raiders e histórico sem corromper a v2',()=>{
 const sample={seed:2026,graphicsQuality:'medium',level:1,xp:0,kills:0,
 health:90,maxHealth:100,wave:1,elapsed:12,currentWeapon:0,
 player:{x:0,z:0,yaw:0},survival:s(),raid:{lastNight:2,waves:1},resources:[],
 buildings:[{type:'wall',x:6,z:6,rotation:0,hp:35},{type:'workbench',x:9,z:9,rotation:0,hp:90}],
 healthPacks:[],speedBoosts:[],enemies:[{type:'normal',x:15,z:5,hp:2,enraged:false,raider:true}]};
 const db=storage();assert.ok(writeSave(db,sample));assert.deepEqual(readSave(db),{version:2,...sample,hotbar:['berries','water','cooked','bandage','medicalKit','silkDressing']});
 const old={...sample};delete old.raid;old.buildings=[{type:'wall',x:6,z:6,rotation:0}];
 old.enemies=[{type:'normal',x:15,z:5,hp:2,enraged:false}];
 assert.deepEqual(validateSave({version:2,...old}).raid,{lastNight:0,waves:0});
 const invalid={...sample,buildings:[{type:'wall',x:6,z:6,rotation:0,hp:999}]};
 assert.equal(validateSave({version:2,...invalid}),null);
});
check('interface e comandos de defesa estão ligados ao jogo real',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 for(const pattern of [/planRaid\(survival/,/buildings\.damage\(/,/useTool\(survival,'pickaxe'/,/onRaidDamage/,/KeyT/,/canCraftAtPosition/])assert.match(main,pattern);
 for(const id of ['raid-alert','tool-status','repair-build'])assert.ok(html.includes(`id="${id}"`));
});
