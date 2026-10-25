import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSurvival,restoreSurvival,RECIPES} from '../src/gameplay/survival.js';
import {craftItem,craftAvailability,craftBatchPreview,materialStock,CRAFT_STATIONS} from '../src/gameplay/crafting.js';
import {createPlayerWeaponRig} from '../src/characters/player-weapons.js';
import {sampleRiggedWeaponMotion} from '../src/characters/player-attack-pose.js';
let passed=0;
const check=(name,fn)=>{fn();console.log('OK v2.2.8',++passed,name)};
const full=()=>{const s=createSurvival();for(const id of Object.keys(s.inventory))s.inventory[id]=250;return s};
check('novas melhorias possuem receitas válidas e exigem bancada',()=>{
 for(const id of ['armoredBroom','spikedHammer','hardenedSpear']){
  assert.equal(CRAFT_STATIONS[id],'workbench');
  for(const [material,n] of Object.entries(RECIPES[id].cost)){
   assert.ok(Number.isInteger(n)&&n>0&&Object.hasOwn(createSurvival().inventory,material));
  }
  assert.equal(craftItem(full(),id).ok,false);
 }
});
check('reforço da vassoura modifica estado uma única vez',()=>{
 const s=full(),before=s.inventory.iron;
 assert.equal(craftItem(s,'armoredBroom',1,{workbench:true}).ok,true);
 assert.equal(s.crafted.armoredBroom,true);assert.equal(s.inventory.iron,before-3);
 assert.equal(craftItem(s,'armoredBroom',1,{workbench:true}).ok,false);
});
check('marreta cravada só desbloqueia com cabeça de ferro',()=>{
 const s=full(),before=s.inventory.iron;
 assert.equal(craftItem(s,'spikedHammer',1,{workbench:true}).ok,false);
 assert.equal(s.inventory.iron,before);
 assert.equal(craftItem(s,'hammer').ok,true);
 assert.equal(craftItem(s,'spikedHammer',1,{workbench:true}).ok,false);
 assert.equal(craftItem(s,'ironHammer',1,{workbench:true}).ok,true);
 assert.equal(craftItem(s,'spikedHammer',1,{workbench:true}).ok,true);
 assert.equal(s.crafted.spikedHammer,true);
});
check('lança temperada exige ponta de ferro',()=>{
 const s=full();craftItem(s,'hammer');craftItem(s,'spear');
 assert.equal(craftItem(s,'hardenedSpear',1,{workbench:true}).ok,false);
 assert.equal(craftItem(s,'ironSpear',1,{workbench:true}).ok,true);
 assert.equal(craftItem(s,'hardenedSpear',1,{workbench:true}).ok,true);
});
check('antigos saves migram flags; upgrades inválidos são recusados',()=>{
 const old=full();delete old.crafted.armoredBroom;delete old.crafted.spikedHammer;delete old.crafted.hardenedSpear;
 const migrated=restoreSurvival(old);assert.ok(migrated);
 assert.equal(migrated.crafted.spikedHammer,false);
 const bad=structuredClone(migrated);bad.crafted.spikedHammer=true;
 assert.equal(restoreSurvival(bad),null);
});
check('prévia em lotes soma materiais da mochila e dos baús',()=>{
 const s=createSurvival();s.inventory.fiber=2;s.inventory.water=1;
 const chest={type:'chest',items:{fiber:13,water:4}};
 const preview=craftBatchPreview(s,'bandage',5,{chests:[chest]});
 assert.equal(preview.ok,true);assert.equal(preview.cost.fiber,15);
 assert.equal(preview.produced,5);assert.deepEqual(preview.missing,[]);
 assert.equal(craftItem(s,'bandage',5,{chests:[chest]}).ok,true);
 assert.equal(s.inventory.bandage,5);
});
check('prévia rejeita lote sem estoque, mas aceita menor',()=>{
 const s=createSurvival();s.inventory.fiber=6;s.inventory.water=2;
 const preview=craftBatchPreview(s,'bandage',5);
 assert.equal(preview.ok,false);assert.equal(preview.missing.find(m=>m.resource==='fiber').need,15);
 assert.equal(preview.missing.find(m=>m.resource==='fiber').have,6);
 assert.equal(craftBatchPreview(s,'bandage',2).ok,true);
});
check('baú que aponta à própria mochila não duplica recursos',()=>{
 const s=createSurvival();s.inventory.wood=4;
 assert.equal(materialStock(s,'wood',[{items:s.inventory}]),4);
});
check('prévia respeita capacidade máxima e não debita recursos',()=>{
 const s=full();s.inventory.bandage=999;
 const before=structuredClone(s);
 assert.equal(craftBatchPreview(s,'bandage',1).ok,false);
 assert.equal(craftItem(s,'bandage',1).ok,false);
 assert.deepEqual(s,before);
});
check('custos adulterados não podem resultar em craft inválido',()=>{
 const s=full();const before=structuredClone(s);
 assert.equal(craftAvailability(s,'armoredBroom',{workbench:true,cost:{iron:-1}}).ok,false);
 assert.equal(craftItem(s,'armoredBroom',1,{workbench:true,cost:{iron:NaN}}).ok,false);
 assert.deepEqual(s,before);
});
class N{constructor(name=''){this.name=name;this.children=[];this.visible=true;
 this.position={set(x,y,z){this.x=x;this.y=y;this.z=z}};
 this.rotation={set(x,y,z){this.x=x;this.y=y;this.z=z}};}
 add(n){n.parent=this;this.children.push(n)}traverse(f){f(this);for(const child of this.children)child.traverse(f)} }
class M extends N{constructor(g,m){super();this.geometry=g;this.material=m}}
class G{constructor(...v){this.args=v}}
const THREE={Group:N,Mesh:M,MeshStandardMaterial:G,CylinderGeometry:G,ConeGeometry:G,BoxGeometry:G,TorusGeometry:G};
check('visuais dos três novos upgrades aparecem e desaparecem sem clones',()=>{
 const rig=createPlayerWeaponRig(THREE,new N());
 const find=(model,name)=>model.children.find(x=>x.name===name);
 const broom=find(rig.weaponModels[0],'Cabo - proteção de ferro');
 const hammer=find(rig.weaponModels[1],'Marreta - cravos');
 const spear=find(rig.weaponModels[2],'Lança - lâmina temperada');
 for(const item of [broom,hammer,spear])assert.ok(item&&!item.visible);
 rig.setWeaponUpgrades({armoredBroom:true,spikedHammer:true,hardenedSpear:true});
 for(const item of [broom,hammer,spear])assert.equal(item.visible,true);
 rig.setWeaponUpgrades({});for(const item of [broom,hammer,spear])assert.equal(item.visible,false);
});
check('ataque aditivo das três armas não deriva após repouso',()=>{
 for(let type=0;type<3;type++){
  const idle=sampleRiggedWeaponMotion(type,0,0,0),end=sampleRiggedWeaponMotion(type,1,0,0);
  assert.ok(Math.abs(idle.x)<1e-7&&Math.abs(end.x)<1e-7);
  for(const frameRate of [30,60,144])for(let f=0;f<=frameRate;f++){
    assert.ok(Object.values(sampleRiggedWeaponMotion(type,f/frameRate,1,f/frameRate)).every(Number.isFinite));
  }
 }
 assert.notDeepEqual(sampleRiggedWeaponMotion(0,.5),sampleRiggedWeaponMotion(1,.5));
});
check('integração mantém modificadores e UI de estoque conectados',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../src/ui/survival-ui.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 for(const k of ['armoredBroom','hardenedSpear','spikedHammer','attackProgress:combat.isAttacking'])assert.ok(main.includes(k),k);
 for(const k of ['craftBatchPreview(','craft-ready-filter','Mochila + baús próximos','Só possíveis'])assert.ok(ui.includes(k),k);
 assert.ok(/2\.2\.8-weapons-craft|2\.3\.0-perception|2\.4\.0-combat|2\.5\.0-exploration|2\.6\.0-craft-progression|2\.7\.0-spider|2\.8\.0-spider/.test(html));
});
console.log('QA v2.2.8:',passed,'testes adicionais');
