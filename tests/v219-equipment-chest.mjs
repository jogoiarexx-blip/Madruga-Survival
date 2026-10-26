import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSurvival,restoreSurvival} from '../src/gameplay/survival.js';
import {isGearEquipped,setGearEquipped,equipNewCraft,normalizeGear} from '../src/gameplay/gear-loadout.js';
import {createBag,validBag} from '../src/gameplay/inventory-slots.js';
import {planStoreBagStack,planTakeFromChest} from '../src/gameplay/bag-storage.js';
import {createPlayerGearVisuals} from '../src/characters/player-gear-visual.js';
import {validChestItems} from '../src/gameplay/storage.js';
import {validateSave,writeSave,readSave} from '../src/gameplay/save-system.js';
let n=0;function test(desc,fn){fn();console.log(`OK v2.19 ${++n}: ${desc}`);}
const owned=()=>{const s=createSurvival();s.crafted.reinforcedVest=true;s.crafted.chitinPadding=true;s.crafted.trailBoots=true;return s;};
test('equipamentos inicialmente não fabricados não podem ser vestidos',()=>{
 const s=createSurvival();
 for(const key of ['vest','padding','boots']){assert.equal(setGearEquipped(s,key,true),false);assert.equal(isGearEquipped(s,key),false);}
 assert.equal(setGearEquipped(s,'__proto__',true),false);
});
test('fabricar e vestir cada peça não altera inventário nem propriedade',()=>{
 const s=owned(),before=structuredClone(s.inventory);
 for(const [recipe,key] of [['reinforcedVest','vest'],['chitinPadding','padding'],['trailBoots','boots']]){
  assert.equal(equipNewCraft(s,recipe),true);assert.equal(isGearEquipped(s,key),true);
  assert.equal(setGearEquipped(s,key,false),true);assert.equal(isGearEquipped(s,key),false);
  assert.equal(setGearEquipped(s,key,true),true);
  assert.equal(setGearEquipped(s,key,true),false);
 }
 assert.deepEqual(s.inventory,before);
});
test('migração de partidas antigas preserva comportamento de equipamentos fabricados',()=>{
 const s=owned();delete s.equippedGear;
 const restored=restoreSurvival(s);
 assert.deepEqual(restored.equippedGear,{vest:true,padding:true,boots:true});
 assert.equal(isGearEquipped(restored,'padding'),true);
});
test('equipamentos retirados persistem no save e não se reequipam sozinhos',()=>{
 const s=owned();s.equippedGear={vest:false,padding:true,boots:false};
 const r=restoreSurvival(structuredClone(s));assert.deepEqual(r.equippedGear,s.equippedGear);
});
test('flags de equipamento adulteradas são rejeitadas',()=>{
 const s=createSurvival();
 for(const forged of [{vest:true,padding:false,boots:false},{vest:1,padding:false,boots:false},
  {vest:false,padding:false},{vest:false,padding:false,boots:false,other:true},null]){
  assert.equal(normalizeGear(s,forged),null);
  assert.equal(restoreSurvival({...s,equippedGear:forged}),null);
 }
});
test('colete e quitina só reduzem dano quando realmente vestidos',()=>{
 const s=owned();s.equippedGear={vest:true,padding:true,boots:true};
 const multiplier=()=> (isGearEquipped(s,'vest')?.8:1)*(isGearEquipped(s,'padding')?.9:1);
 assert.equal(multiplier(),.8*.9);
 setGearEquipped(s,'vest',false);assert.equal(multiplier(),.9);
 setGearEquipped(s,'padding',false);assert.equal(multiplier(),1);
});
test('botas só economizam energia quando estão vestidas',()=>{
 const s=owned();s.equippedGear={vest:false,padding:false,boots:true};
 assert.equal(isGearEquipped(s,'boots'),true);setGearEquipped(s,'boots',false);
 assert.equal(isGearEquipped(s,'boots'),false);
});
test('save completo restaura peças vestidas e os 36 slots sem alteração',()=>{
 const s=owned();s.equippedGear={vest:false,padding:true,boots:false};
 const data={version:2,seed:333,graphicsQuality:'medium',level:1,xp:0,kills:0,health:100,maxHealth:100,wave:1,elapsed:0,
 currentWeapon:0,player:{x:0,z:0,yaw:0},survival:s,inventorySlots:createBag(s.inventory),resources:[],buildings:[],
 healthPacks:[],speedBoosts:[],enemies:[]};
 let raw='';const local={setItem(_,text){raw=text;},getItem(){return raw;}};
 assert.equal(writeSave(local,data),true);const restored=readSave(local);
 assert.ok(restored);assert.deepEqual(restored.survival.equippedGear,s.equippedGear);
 assert.ok(validBag(restored.inventorySlots,restored.survival.inventory));
 const forged=structuredClone(data);forged.survival.equippedGear={vest:true,padding:false,boots:1};
 assert.equal(validateSave(forged),null);
});
test('baú em duas grades usa transações sem perda ou criação de materiais',()=>{
 let s=createSurvival(),chest={},bag=createBag(s.inventory);
 s.inventory.wood=250;s.inventory.berries=27;bag=createBag(s.inventory);
 const original=s.inventory.wood+(chest.wood||0);
 for(let i=0;i<120;i++){
  const pos=bag.findIndex(x=>x?.item==='wood');
  const qty=(i%5)+1;
  const plan=planStoreBagStack(s.inventory,bag,chest,pos,qty);
  if(plan){s.inventory=plan.inventory;chest=plan.items;bag=plan.bag;}
  const take=planTakeFromChest(s.inventory,bag,chest,'wood',qty);
  if(take){s.inventory=take.inventory;chest=take.items;bag=take.bag;}
  assert.ok(validBag(bag,s.inventory));assert.ok(validChestItems(chest));
  assert.equal(s.inventory.wood+(chest.wood||0),original);
 }
});
class Node{constructor(name=''){this.name=name;this.children=[];this.position={set(x,y,z){this.x=x;this.y=y;this.z=z;}};this.userData={};this.visible=true;this.isBone=true;}
 add(c){this.children.push(c);c.parent=this;}
 remove(c){this.children.splice(this.children.indexOf(c),1);c.parent=null;}
 removeFromParent(){this.parent?.remove(this);}
 getObjectByName(name){if(this.name===name)return this;for(const child of this.children){const res=child.getObjectByName?.(name);if(res)return res;}return null;}
 traverse(fn){fn(this);for(const c of this.children)c.traverse?.(fn);}
}
class Mesh extends Node{constructor(g,m){super();this.geometry=g;this.material=m;this.isBone=false;}}
class Geo{constructor(...size){this.size=size;}dispose(){this.disposed=true;}}
class Mat{constructor(opts){this.opts=opts;}dispose(){this.disposed=true;}}
const THREE={Mesh,BoxGeometry:Geo,MeshStandardMaterial:Mat};
test('visuais 3D presos ao rig seguem tronco e pés, com estados independentes',()=>{
 const torso=new Node(),leftLeg=new Node(),rightLeg=new Node();
 const manager=createPlayerGearVisuals(THREE,{torso,leftLeg,rightLeg});
 assert.equal(manager.count,7);
 manager.set({vest:true,padding:false,boots:true});
 assert.equal(torso.children.filter(c=>c.visible).length,1);
 assert.equal(leftLeg.children.filter(c=>c.visible).length,2);
 const root=new Node('root');
 for(const name of ['Spine1','LeftFoot','RightFoot'])root.add(new Node('mixamorig'+name));
 manager.bind(root);assert.equal(manager.count,14);
 const foot=root.getObjectByName('mixamorigLeftFoot');assert.equal(foot.children.filter(c=>c.visible).length,2);
 manager.set({vest:false,padding:true,boots:false});assert.equal(foot.children.filter(c=>c.visible).length,0);
 assert.equal(root.getObjectByName('mixamorigSpine1').children.filter(c=>c.visible).length,2);
 manager.bind(null);assert.equal(manager.count,7);manager.dispose();assert.equal(manager.count,0);
});
test('integração de interface, combate, stamina, GLB, save e transferência nas duas grades',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../src/ui/survival-ui.js',import.meta.url),'utf8');
 const storage=readFileSync(new URL('../src/ui/storage-ui.js',import.meta.url),'utf8');
 const rev5=readFileSync(new URL('../src/characters/player-rev5.js',import.meta.url),'utf8');
 for(const pattern of ["isGearEquipped(survival,'vest')","isGearEquipped(survival,'padding')","isGearEquipped(survival,'boots')",
   'equipNewCraft(survival,recipe)','onToggleGear:toggleEquippedGear','planStoreBagStack','planTakeFromChest','playerRev5.setGear'])assert.ok(main.includes(pattern),pattern);
 for(const key of ['vest','padding','boots'])assert.ok(ui.includes("['"+key+"',state.crafted."),key);
 for(const term of ['storage-columns','storage-slot-grid','dragstart','drop','getBag()','onTransfer'])assert.ok(storage.includes(term),term);
 assert.match(rev5,/gearVisuals\?\.bind\(meshRoot\)/);assert.match(rev5,/setGear/);
});
console.log(`v2.19: ${n} verificações específicas aprovadas`);
