import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSurvival,restoreSurvival,RECIPES} from '../src/gameplay/survival.js';
import {craftCategory,CRAFT_STATIONS,craftAvailability,craftItem} from '../src/gameplay/crafting.js';
import {recipeCost} from '../src/gameplay/skills.js';
import {PLAYER_ATTACK_DURATIONS,samplePlayerAttackPose} from '../src/characters/player-attack-pose.js';
import {createPlayerWeaponRig} from '../src/characters/player-weapons.js';
let done=0;function check(name,fn){fn();console.log('OK craft v2.2.6',++done,name)}
const stocked=()=>{const s=createSurvival();for(const k in s.inventory)s.inventory[k]=150;return s;};
check('receitas possuem categorias e materiais válidos',()=>{
 const ref=createSurvival();
 for(const [id,recipe] of Object.entries(RECIPES)){
  assert.ok(['build','food','healing','gear','upgrade'].includes(craftCategory(id)),id);
  for(const [key,num] of Object.entries(recipe.cost)){assert.ok(Object.hasOwn(ref.inventory,key),id);assert.ok(Number.isInteger(num)&&num>0)}
 }
 assert.equal(CRAFT_STATIONS.ironHammer,'workbench');
});
check('requisitos de bancada/fogueira impedem débitos',()=>{
 const s=stocked(),bag=structuredClone(s.inventory);
 assert.equal(craftItem(s,'pickaxe').ok,false);
 assert.equal(craftItem(s,'cooked').ok,false);
 assert.deepEqual(s.inventory,bag);
});
check('marreta de ferro exige equipamento anterior, aplica melhoria uma vez só',()=>{
 const s=stocked();assert.equal(craftItem(s,'ironHammer',1,{workbench:true}).ok,false);
 assert.equal(craftItem(s,'hammer').ok,true);
 const previous=s.inventory.iron;
 assert.equal(craftItem(s,'ironHammer',1,{workbench:true}).ok,true);
 assert.equal(s.inventory.iron,previous-5);assert.equal(s.crafted.ironHammer,true);
 assert.equal(craftItem(s,'ironHammer',1,{workbench:true}).ok,false);
});
check('empunhadura depende de marreta e lança',()=>{
 const s=stocked();craftItem(s,'hammer');
 assert.equal(craftItem(s,'reinforcedGrip',1,{workbench:true}).ok,false);
 craftItem(s,'spear');
 assert.equal(craftItem(s,'reinforcedGrip',1,{workbench:true}).ok,true);
 assert.equal(s.crafted.reinforcedGrip,true);
});
check('bandagem em lote e cozinha com rendimento por habilidade',()=>{
 const s=stocked(),before=s.inventory.fiber;
 assert.equal(craftItem(s,'bandage',5).produced,5);
 assert.equal(s.inventory.bandage,155);assert.equal(s.inventory.fiber,before-15);
 assert.equal(craftItem(s,'cooked',3,{campfire:true,yieldCount:2}).produced,6);
 assert.equal(s.inventory.cooked,156);
});
check('inventário cheio ou quantidade inválida não gastam recursos',()=>{
 const s=stocked();s.inventory.bandage=998;
 const before=structuredClone(s.inventory);
 assert.equal(craftItem(s,'bandage',5).ok,false);assert.deepEqual(s.inventory,before);
 assert.equal(craftAvailability(s,'bandage').maxBatch,1);
 assert.equal(craftItem(s,'bandage',21).ok,false);
 assert.equal(craftItem(s,'hammer',5).ok,false);
});
check('custos com desconto aplicados uma só vez',()=>{
 const s=stocked(),cost=recipeCost('bandage',RECIPES.bandage.cost,s.skills);
 const before=s.inventory.fiber;
 assert.equal(craftItem(s,'bandage',2,{cost}).ok,true);
 assert.equal(s.inventory.fiber,before-cost.fiber*2);
});
check('migração de save mantém campanha antiga',()=>{
 const s=createSurvival(),old=structuredClone(s);
 delete old.inventory.bandage;delete old.crafted.ironHammer;delete old.crafted.reinforcedGrip;delete old.gripStrikes;
 const restored=restoreSurvival(old);assert.ok(restored);
 assert.equal(restored.inventory.bandage,0);assert.equal(restored.gripStrikes,0);
 assert.equal(restored.crafted.ironHammer,false);
 const now=stocked();now.crafted.hammer=true;now.crafted.spear=true;
 now.crafted.ironHammer=true;now.crafted.reinforcedGrip=true;now.gripStrikes=1;
 assert.equal(restoreSurvival(now).gripStrikes,1);
});
check('animações mantêm 3 perfis e poses válidas a todas as taxas',()=>{
 assert.equal(PLAYER_ATTACK_DURATIONS.length,3);
 for(let weapon=0;weapon<3;weapon++){
  for(let fps of [30,60,144])for(let i=0;i<=fps;i++)
    assert.ok(Object.values(samplePlayerAttackPose(weapon,i/fps)).every(Number.isFinite));
 }
 assert.notDeepEqual(samplePlayerAttackPose(1,.5),samplePlayerAttackPose(2,.5));
});
check('visual de melhoria independente da troca de armas',()=>{
 class Node{constructor(name=''){this.name=name;this.visible=true;this.children=[];
 this.position={set(x,y,z){this.x=x;this.y=y;this.z=z}};
 this.rotation={set(x,y,z){this.x=x;this.y=y;this.z=z}};}
 add(child){this.children.push(child)}}
 class Mesh extends Node{constructor(g,m){super();this.geometry=g;this.material=m;}}
 class Geo{constructor(...v){this.args=v}}
 const THREE={Group:Node,Mesh,MeshStandardMaterial:Geo,CylinderGeometry:Geo,ConeGeometry:Geo,BoxGeometry:Geo,TorusGeometry:Geo};
 const rig=createPlayerWeaponRig(THREE,new Node());
 rig.setWeaponUpgrades({ironHammer:true,ironSpear:true,reinforcedGrip:true});
 for(let i=0;i<3;i++){rig.equipWeaponVisual(i);assert.equal(rig.weaponModels.filter(x=>x.visible).length,1)}
 assert.ok(rig.weaponModels[1].children.some(x=>x.name==='Marreta - cabeça de ferro'&&x.visible));
 assert.ok(rig.weaponModels[2].children.some(x=>x.name==='Lança - ponta de ferro'&&x.visible));
 rig.setWeaponUpgrades({});assert.ok(rig.spearHead.visible);
});
check('UI, craft e combate estão conectados',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const rev=readFileSync(new URL('../src/characters/player-rev5.js',import.meta.url),'utf8');
 for(const item of ['craftItem(survival','craftingStatus(','setWeaponUpgrades(survival.crafted)','reinforcedGrip','getCraftStatus'])
  assert.ok(main.includes(item),item);
 for(const item of ['use-bandage','recipe-list'])assert.ok(html.includes(item),item);
 assert.ok(/2\.2\.8-weapons-craft|2\.3\.0-perception|2\.4\.0-combat|2\.5\.0-exploration|2\.6\.0-craft-progression|2\.7\.0-spider|2\.8\.0-spider|2\.9\.0-spider|2\.10\.0-spider|2\.11\.0-spider|2\.12\.0-nests|2\.13\.0-cave|2\.14\.0-cave|2\.15\.0-hotbar|2\.16\.0-inventory|2\.18\.0-bag-chest|2\.19\.0-gear|2\.20\.0-build-wheel|2\.21\.0-menu|2\.22\.0-gpu|2\.23\.0-goblin|2\.24\.0-goblin-ik|2\.25\.0-menu-hud|2\.27\.0-recovery|2\.28\.0-model-cache|2\.29\.0-enemy-pool|2\.29\.1-goblin-visible|2\.30\.0-chaves-workbench|2\.31\.0-chaves-patrol-ai/.test(html));
 assert.match(rev,/SwordAttack_Refined/);assert.match(rev,/swingIndex/);
});
console.log('v2.2.6: '+done+' grupos de regressão aprovados');
