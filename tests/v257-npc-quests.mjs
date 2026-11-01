import assert from 'node:assert/strict';
import {createNpcQuestProgress,restoreNpcQuestProgress,nearestChiquinhaFarm,
  advanceChiquinhaWork,interactNpcQuest,npcQuestStatus,CHIQUINHA_INTERVAL}
  from '../src/gameplay/npc-questlines.js';
import {createSurvival} from '../src/gameplay/survival.js';
import {makeCrop,CROP_MATURITY} from '../src/gameplay/farming.js';
import {createWitchCabin} from '../src/world/witch-cabin.js';

const state=createNpcQuestProgress(),inventory=createSurvival().inventory;
assert.deepEqual(restoreNpcQuestProgress(undefined),state);
assert.equal(restoreNpcQuestProgress({chiquinha:{stage:5,harvests:0,workTimer:0},bruxa:{stage:0,lastBlessingDay:0}}),null);
const plot={type:'farmPlot',x:9,z:-10,crop:makeCrop()};
assert.equal(nearestChiquinhaFarm([{...plot,x:100}]),null);
assert.equal(advanceChiquinhaWork(state,[plot],inventory,9),null,'Sem conversa, não trabalha');
let result=interactNpcQuest(state,'chiquinha',{inventory,farms:[plot]});
assert.equal(result.changed,true);assert.equal(state.chiquinha.stage,1);
function workPeriod(){
 let r=null;
 for(let t=0;t<CHIQUINHA_INTERVAL*10+2;t++)r=advanceChiquinhaWork(state,[plot],inventory,.1)||r;
 return r;
}
for(let i=0;i<2;i++){
 const start=inventory.vegetables;
 assert.equal(workPeriod().action,'plant','Plantio automático');
 plot.crop.growth=CROP_MATURITY;
 assert.equal(workPeriod().action,'harvest','Colheita automática');
 assert.equal(inventory.vegetables,start+3);
}
assert.equal(state.chiquinha.harvests,2);
result=interactNpcQuest(state,'chiquinha',{inventory,farms:[plot]});
assert.equal(state.chiquinha.stage,2);assert.equal(result.xp,18);
assert.equal(interactNpcQuest(state,'chiquinha',{inventory,farms:[plot]}).changed,false);
result=interactNpcQuest(state,'bruxa71',{inventory,day:1});
assert.equal(result.changed,false,'Cabana requer materiais');
Object.assign(inventory,{wood:12,stone:8,fiber:6});
result=interactNpcQuest(state,'bruxa71',{inventory,day:1});
assert.equal(result.builtCabin,true);assert.equal(state.bruxa.stage,1);
assert.equal(inventory.wood,0);assert.equal(inventory.stone,0);
result=interactNpcQuest(state,'bruxa71',{inventory,day:1});
assert.equal(result.changed,false);
inventory.spiderSilk=3;inventory.caveCrystal=1;
result=interactNpcQuest(state,'bruxa71',{inventory,day:1});
assert.equal(result.xp,30);assert.equal(state.bruxa.stage,2);
assert.equal(interactNpcQuest(state,'bruxa71',{inventory,day:1}).changed,false);
assert.equal(interactNpcQuest(state,'bruxa71',{inventory,day:2}).changed,true);
assert.equal(interactNpcQuest(state,'bruxa71',{inventory,day:2}).changed,false);
assert.match(npcQuestStatus(state,{farms:[plot],day:3}).bruxa,/disponível/);
assert.deepEqual(restoreNpcQuestProgress(JSON.parse(JSON.stringify(state))),state);
inventory.vegetables=998;plot.crop.growth=CROP_MATURITY;plot.crop.planted=true;
assert.equal(workPeriod().action,'full','Sem perder colheita quando a mochila está cheia');

class FakeNode{
 constructor(){this.children=[];this.position={set(x,y,z){this.x=x;this.y=y;this.z=z;}};
 this.rotation={};this.visible=true;}
 add(child){this.children.push(child);}
}
class FakeMesh extends FakeNode{constructor(){super();}}
const THREE={Group:FakeNode,Mesh:FakeMesh,BoxGeometry:class{},
 MeshStandardMaterial:class{},DoubleSide:2};
const scene=new FakeNode(),cabin=createWitchCabin({THREE,scene,getGroundHeight:()=>0});
assert.equal(cabin.blocks(-48,-38,.5),false);
cabin.setBuilt(true);assert.equal(cabin.blocks(-48,-38,.5),true);
const pos=cabin.resolve({x:-48,z:-38},.5);
assert.ok(Math.hypot(pos.x+48,pos.z+38)>2.8);
cabin.setBuilt(false);assert.equal(cabin.blocks(-48,-38,.5),false);
console.log('NPC sidequests: plantio, colheitas, custos, missões, recompensas, dia, restauração e cabana OK');
