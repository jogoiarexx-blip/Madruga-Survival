import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FOREST_NPC_SPECS} from '../src/characters/forest-npcs.js';
import {PLAYER_REV5_TARGET_HEIGHT} from '../src/characters/player-rev5.js';
import {chooseInteractionFocus} from '../src/gameplay/interaction-focus.js';
import {createExplorationWorld} from '../src/world/exploration.js';
import {createSurvival} from '../src/gameplay/survival.js';

const witch=FOREST_NPC_SPECS.find(x=>x.id==='bruxa71');
const chiquinha=FOREST_NPC_SPECS.find(x=>x.id==='chiquinha');
assert.equal(witch.height,PLAYER_REV5_TARGET_HEIGHT,'Bruxa deve ter exatamente a altura visual do Madruga REV5');
assert.ok(chiquinha.height<witch.height,'Chiquinha mantém escala menor');
class Vector{constructor(){this.x=this.y=this.z=0;}set(x,y,z){this.x=x;this.y=y;this.z=z;}}
class Group{constructor(){this.position=new Vector();this.rotation=new Vector();this.children=[];this.visible=true;}
 add(c){this.children.push(c);}}
class Mesh extends Group{constructor(g,m){super();this.geometry=g;this.material=m;this.scale=new Vector();}}
const THREE={Group,Mesh,BoxGeometry:class{},DoubleSide:2,MeshStandardMaterial:class{constructor(p){Object.assign(this,p);}}};
const world=createExplorationWorld({THREE,scene:{add(){}},getGroundHeight:()=>0,isPositionFree:()=>true});
world.generate(1345542);
assert.equal(world.sites.length,4);
const site=world.sites[0];
const last=site.containers[2];
const pos={x:last.x,z:last.z+.4};
const loot=world.nearest(pos);
const fixture=world.nearestFixture(pos);
assert.equal(loot.container,last,'No interior, seleciona caixa visualmente mais perto');
assert.ok(fixture,'A porta também fica dentro do raio; é um caso de disputa de interação');
const focus=chooseInteractionFocus([
 {kind:'fixture',target:fixture,distance:Math.hypot(pos.x-fixture.x,pos.z-fixture.z)},
 {kind:'loot',target:loot,distance:loot.distance}
]);
assert.equal(focus.kind,'loot','A caixa tem prioridade porque está mais próxima da porta');
assert.equal(focus.target.container,last);

const door={x:site.x,z:site.z+2.5};
const nearestDoor=world.nearestFixture(door);
const nearDoorLoot=world.nearest(door);
const atDoor=chooseInteractionFocus([
 nearestDoor&&{kind:'fixture',target:nearestDoor,distance:Math.hypot(door.x-nearestDoor.x,door.z-nearestDoor.z)},
 nearDoorLoot&&{kind:'loot',target:nearDoorLoot,distance:nearDoorLoot.distance}
]);
assert.equal(atDoor.kind,'fixture','Portas continuam interativas quando realmente mais próximas');

const rear=site.containers[0];
assert.equal(world.nearest({x:rear.x,z:site.z-3}),null,
  'Não permite saquear através da parede traseira');
const side=site.containers[1];
assert.equal(world.nearest({x:site.x+3.4,z:side.z}),null,
  'Não permite saquear através da parede lateral');

site.doorOpen=false;
const fromEntrance={x:last.x,z:site.z+3.2};
assert.notEqual(world.nearest(fromEntrance)?.container,last,
  'Porta fechada impede saque de fora');
site.doorOpen=true;
assert.equal(world.nearest(fromEntrance)?.container,last,
  'Com porta aberta, pode identificar o recipiente próximo no vão');

const inv=createSurvival().inventory;
const result=world.search(pos,inv);
assert.equal(result.ok,true);
assert.equal(last.opened,true);
assert.notEqual(world.nearest(pos)?.container,last,'Caixa já vasculhada não volta a aparecer');
const afterFirst={...inv};world.search(pos,inv);
assert.equal(last.opened,true,'A caixa saqueada permanece indisponível');
assert.ok(Object.values(inv).every((v,i)=>Number.isFinite(v)),'Saque não corrompe o inventário');

assert.equal(chooseInteractionFocus([
 {kind:'building',target:{},distance:1.7},
 {kind:'loot',target:{},distance:.7}
]).kind,'loot');
assert.equal(chooseInteractionFocus([
 {kind:'building',target:{},distance:1.2},
 {kind:'loot',target:{},distance:1.8}
]).kind,'building');
assert.equal(chooseInteractionFocus([
 {kind:'fixture',target:{},distance:1.05},
 {kind:'loot',target:{},distance:1.1}
]).kind,'loot','Empate de 10 cm favorece saque');
assert.equal(chooseInteractionFocus([{kind:'loot',target:{},distance:NaN}]),null);
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert.match(main,/function nearbyWorldInteraction\(pos\)/);
assert.match(main,/const \{focus\}=nearbyWorldInteraction\(player.position\)/);
assert.match(main,/const \{focus,closestBuilding,closest,closestLoot,closestFixture,nearNest,nearForestNpc\}/);
assert.match(main,/if\(focus\?\.kind==='loot'\)/);
assert.match(main,/if\(focus\?\.kind==='fixture'\)/);
assert.match(main,/exploration\.search\(player.position,survival\.inventory\)/);
assert.match(html,/forest-webp-r1-s2-f5/);
console.log('OK v2.61: Bruxa com escala do Madruga, alvo F/HUD único e loot com visibilidade nas ruínas');
