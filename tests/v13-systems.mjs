import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSurvival,restoreSurvival,RECIPES,addResource,useConsumable,canAfford,spendRecipe} from '../src/gameplay/survival.js';
import {makeCrop,validCrop,workCrop,advanceCrop,CROP_MATURITY} from '../src/gameplay/farming.js';
import {FISH_COOLDOWN,tryFish} from '../src/gameplay/fishing.js';
import {createBuildingWorld} from '../src/world/buildings.js';
import {createWildlifeWorld,MAX_ANIMALS,validWildlife} from '../src/world/wildlife.js';
import {validateSave,writeSave,readSave} from '../src/gameplay/save-system.js';
const test=(label,fn)=>{fn();console.log(`OK v1.3: ${label}`)};
test('migração v1.2 mantém materiais, horas, ferramentas e introduz receitas novas',()=>{
 const old=createSurvival();delete old.crafted.fishingRod;delete old.fishReadyAt;
 for(const k of ['seeds','vegetables','fish','grilledFish','stew'])delete old.inventory[k];
 old.inventory.iron=18;old.days=4;old.time=1500;
 const restored=restoreSurvival(old);
 assert.equal(restored.inventory.iron,18);assert.equal(restored.days,4);
 assert.equal(restored.fishReadyAt,0);assert.equal(restored.crafted.fishingRod,false);
 assert.equal(restored.inventory.seeds,0);assert.equal(restored.inventory.vegetables,0);
 assert.equal(restoreSurvival({...old,fishReadyAt:-1}),null);
});
test('agricultura planta, rega, amadurece, colhe sem criar recursos gratuitos',()=>{
 const c=makeCrop(),s=createSurvival();
 assert.equal(workCrop(c,s.inventory).ok,false);
 s.inventory.seeds=2;s.inventory.water=2;
 assert.equal(workCrop(c,s.inventory).action,'plant');assert.equal(s.inventory.seeds,1);
 assert.equal(workCrop(c,s.inventory).action,'water');assert.equal(s.inventory.water,1);
 for(let i=0;i<180;i++)advanceCrop(c,1);
 assert.ok(c.growth===CROP_MATURITY);assert.equal(workCrop(c,s.inventory).action,'harvest');
 assert.equal(s.inventory.vegetables,3);assert.equal(s.inventory.seeds,3);
 assert.equal(c.planted,false);assert.equal(workCrop(c,s.inventory).action,'plant');
 assert.equal(validCrop({...c,growth:Infinity}),false);
});
test('peixe exige vara e água, cooldown conserva inventário',()=>{
 const s=createSurvival();
 assert.equal(tryFish(s,0,true).ok,false);s.crafted.fishingRod=true;
 assert.equal(tryFish(s,0,false).ok,false);
 assert.equal(tryFish(s,0,true).ok,true);
 assert.equal(s.inventory.fish,1);assert.equal(tryFish(s,1,true).ok,false);
 assert.equal(tryFish(s,FISH_COOLDOWN,true).ok,true);assert.equal(s.inventory.fish,2);
 const state=restoreSurvival(s);assert.equal(state.fishReadyAt,FISH_COOLDOWN*2);
});
test('alimentos cozidos e colhidos repõem fome, sem consumir peixe cru',()=>{
 const s=createSurvival();s.hunger=0;s.thirst=5;
 s.inventory.vegetables=1;s.inventory.grilledFish=1;s.inventory.stew=1;s.inventory.fish=1;
 assert.equal(useConsumable(s,'fish'),false);
 assert.equal(useConsumable(s,'vegetables'),true);assert.equal(s.hunger,23);
 assert.equal(useConsumable(s,'grilledFish'),true);assert.equal(s.hunger,63);
 assert.equal(useConsumable(s,'stew'),true);assert.equal(s.hunger,100);
 assert.equal(s.thirst,22);assert.equal(s.inventory.stew,0);
 assert.ok(RECIPES.roof&&RECIPES.farmPlot&&RECIPES.grilledFish&&RECIPES.stew);
});
class Geom{dispose(){}}
class Material{constructor(obj){Object.assign(this,obj)}clone(){return new Material(this)}dispose(){}}
class Thing{
 constructor(){this.children=[];this.position={x:0,y:0,z:0,set(x,y,z){Object.assign(this,{x,y,z})}};
 this.rotation={x:0,y:0,z:0};this.scale={x:1,y:1,z:1,set(x,y,z){Object.assign(this,{x,y,z})}};this.visible=true;}
 add(o){this.children.push(o)}traverse(cb){cb(this);for(const c of this.children)c.traverse(cb)}
}
class Group extends Thing{}
class Mesh extends Thing{constructor(geo,mat){super();this.geometry=geo;this.material=mat}}
class Light extends Thing{}
const THREE={Group,Mesh,PointLight:Light,MeshStandardMaterial:Material,MeshBasicMaterial:Material,
 BoxGeometry:Geom,CylinderGeometry:Geom,ConeGeometry:Geom,TorusGeometry:Geom,DodecahedronGeometry:Geom,
 IcosahedronGeometry:Geom,SphereGeometry:Geom,DoubleSide:2};
const makeScene=()=>({items:[],add(item){this.items.push(item)},remove(item){this.items.splice(this.items.indexOf(item),1)}});
test('telhados encaixam em piso sem impedir movimentação e podem ser salvos',()=>{
 const scene=makeScene(),b=createBuildingWorld({THREE,scene,getGroundHeight:()=>0,isPositionFree:()=>true});
 const floor=b.place('floor',9,9),roof=b.place('roof',9,9);
 assert.ok(floor&&roof);assert.equal(b.covered({x:9,z:9}),true);
 assert.equal(b.isBlocked(9,9),false);assert.equal(b.canPlace('roof',9,9,{x:0,z:0}),false);
 assert.equal(b.canPlace('roof',12,9,{x:0,z:0}),true);
 const save=b.serialize();assert.equal(save[1].type,'roof');
 const b2=createBuildingWorld({THREE,scene:makeScene(),getGroundHeight:()=>0,isPositionFree:()=>true});
 assert.ok(b2.restore(save));assert.deepEqual(b2.serialize(),save);
});
test('canteiros em 3D persistem a colheita e não bloqueiam salvamento',()=>{
 const scene=makeScene(),b=createBuildingWorld({THREE,scene,getGroundHeight:()=>0,isPositionFree:()=>true});
 const plot=b.place('farmPlot',6,6);const s=createSurvival();s.inventory.seeds=1;
 workCrop(plot.crop,s.inventory);plot.crop.growth=124.5;b.update(1,1);
 assert.equal(plot.crop.growth,CROP_MATURITY);assert.ok(plot.plantMeshes.some(m=>m.visible));
 const serialized=b.serialize();const next=createBuildingWorld({THREE,scene:makeScene(),getGroundHeight:()=>0,isPositionFree:()=>true});
 next.restore(serialized);assert.deepEqual(next.serialize(),serialized);
 assert.equal(next.structures[0].crop.growth,CROP_MATURITY);
});
test('fauna real nasce da semente, movimenta, sofre ataque e derruba carne',()=>{
 const kills=[];const create=()=>createWildlifeWorld({THREE,scene:makeScene(),getGroundHeight:()=>0,isPositionFree:()=>true,onHunt:(...args)=>kills.push(args)});
 const a=create();a.generate(2026);assert.equal(a.animals.length,MAX_ANIMALS);
 const serialized=a.serialize();assert.ok(validWildlife(serialized));const b=create();b.generate(2026);
 assert.deepEqual(b.serialize(),serialized);
 b.update(0.02,{x:0,z:0});assert.ok(validWildlife(b.serialize()));
 const rabbit=b.animals.find(a=>a.type==='rabbit');
 const player={x:rabbit.x,z:rabbit.z+1};
 b.attack(player,0,2,1,3);assert.equal(kills.length,1);assert.deepEqual(kills[0],['rabbit',1]);
 assert.equal(b.animals.length,MAX_ANIMALS-1);assert.ok(validWildlife(b.serialize()));
 const save=b.serialize(),again=create();assert.ok(again.restore(save));assert.deepEqual(again.serialize(),save);
});
test('javali causa dano com origem válida, sem travar o jogo',()=>{
 const hurts=[],wild=createWildlifeWorld({THREE,scene:makeScene(),getGroundHeight:()=>0,isPositionFree:()=>true,
 onHunt:()=>{},onHurt:(amount,origin)=>hurts.push({amount,origin})});
 wild.restore([{type:'boar',x:2,z:0,hp:5,heading:0}]);
 wild.update(.01,{x:2,z:0});
 assert.equal(hurts.length,1);assert.equal(hurts[0].amount,5);
 assert.ok(Number.isFinite(hurts[0].origin.x));
});
test('save v1.2 migra sem fauna e v1.3 rejeita animais/culturas corrompidos',()=>{
 const state={version:2,seed:2026,graphicsQuality:'low',level:1,xp:0,kills:0,health:100,maxHealth:100,
  wave:1,elapsed:0,currentWeapon:0,player:{x:0,z:0,yaw:0},survival:createSurvival(),
  raid:{lastNight:0,waves:0},resources:[],buildings:[{type:'farmPlot',x:6,z:6,rotation:0,hp:60,crop:makeCrop()}],
  healthPacks:[],speedBoosts:[],enemies:[],wildlife:[{type:'rabbit',x:5,z:5,hp:2,heading:0}]};
 assert.ok(validateSave(state));
 const storage={m:new Map(),setItem(k,v){this.m.set(k,v)},getItem(k){return this.m.get(k)},removeItem(k){this.m.delete(k)}};
 assert.ok(writeSave(storage,state));assert.deepEqual(readSave(storage),state);
 assert.equal(validateSave({...state,wildlife:[{type:'boar',x:5,z:5,hp:900,heading:0}]}),null);
 assert.equal(validateSave({...state,buildings:[{...state.buildings[0],crop:{planted:true,growth:1e9,water:0}}]}),null);
 const old={...state};delete old.wildlife;old.buildings=[];assert.ok(validateSave(old));
});
test('controles de pesca, caça, agro e consumo estão ligados à interface',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 for(const re of [/onSwing:/,/wildlife\.update\(/,/wildlife\.serialize\(/,/tryFish\(/,/workCrop\(/,/buildings\.covered\(/,/addResource\(survival,'seeds'/])assert.match(main,re);
 for(const id of ['fish-now','use-vegetables','use-grilledFish','use-stew'])assert.ok(html.includes(`id="${id}"`));
});
