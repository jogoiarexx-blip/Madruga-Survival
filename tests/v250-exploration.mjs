import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createExplorationWorld,EXPLORATION_SITES,generateSiteLayout,lootForContainer,validExplorationSave,canTakeLoot,takeLoot} from '../src/world/exploration.js';
import {createSurvival} from '../src/gameplay/survival.js';
import {validateSave} from '../src/gameplay/save-system.js';
let passed=0;
function test(description,fn){fn();passed++;console.log(`OK v2.5 ${passed}: ${description}`);}
const seed=1345542;
const layout=generateSiteLayout(seed);
test('Posições procedurais reproduzíveis pelo seed',()=>assert.deepEqual(layout,generateSiteLayout(seed)));
test('Quatro locais com IDs únicos',()=>assert.deepEqual(new Set(layout.map(x=>x.id)).size,4));
test('Sites afastados do acampamento e entre si',()=>{
 for(const a of layout){assert.ok(Math.hypot(a.x+4,a.z+5)>17);
   for(const b of layout)if(a!==b)assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>=20);}
});
test('Terreno bloqueado não posiciona estruturas no meio de árvores',()=>{
 assert.equal(generateSiteLayout(seed,()=>false).length,0);
});
test('Ordem de busca não altera o loot de cada caixa',()=>{
 const first=lootForContainer(seed,'cabana','armario');
 lootForContainer(seed,'deposito','barril');
 assert.deepEqual(lootForContainer(seed,'cabana','armario'),first);
});
test('Recipiente gera dois recursos válidos com quantidades positivas',()=>{
 for(const spec of EXPLORATION_SITES)for(const c of spec.containers){
  const loot=lootForContainer(seed,spec.id,c.id);
  assert.equal(Object.keys(loot).length,2);
  for(const [key,n] of Object.entries(loot))assert.ok(Number.isInteger(n)&&n>0&&Object.hasOwn(createSurvival().inventory,key));
 }
});
test('Recipiente inexistente não gera loot',()=>assert.equal(lootForContainer(seed,'cabana','inexistente'),null));
test('Inventário cheio impede perda silenciosa de recursos',()=>{
 const inventory={wood:998,stone:1};
 assert.equal(takeLoot(inventory,{wood:2}),false);
 assert.equal(inventory.wood,998);
});
test('Transferência é integral, sem consumo parcial ou duplicação',()=>{
 const inv={wood:0,stone:0};assert.equal(takeLoot(inv,{wood:2,stone:3}),true);
 assert.deepEqual(inv,{wood:2,stone:3});
});
test('Itens inexistentes não podem ser adicionados',()=>assert.equal(canTakeLoot({wood:0},{hacker:10}),false));
test('Save ausente da v2.4 continua válido',()=>assert.equal(validExplorationSave(undefined),true));
test('Save de exploração rejeita IDs repetidos e inexistentes',()=>{
 assert.equal(validExplorationSave([{id:'cabana',discovered:true,ambushed:false,opened:['armario']},
  {id:'cabana',discovered:true,ambushed:false,opened:[]}]),false);
 assert.equal(validExplorationSave([{id:'cabana',discovered:true,ambushed:false,opened:['hacker']}]),false);
});
test('Save de exploração rejeita estados incorretos',()=>{
 assert.equal(validExplorationSave([{id:'cabana',discovered:'sim',ambushed:false,opened:[]}]),false);
 assert.equal(validExplorationSave([{id:'posto',discovered:true,ambushed:true,opened:['gaveta','gaveta']}]),false);
});
// Stub do motor 3D para testar o mundo sem WebGL ou navegador.
class Vector {constructor(){this.x=this.y=this.z=0;}set(x,y,z){this.x=x;this.y=y;this.z=z;}}
class Group {constructor(){this.position=new Vector();this.rotation=new Vector();this.children=[];this.visible=true;}add(o){this.children.push(o);}}
class Mesh extends Group {constructor(g,m){super();this.geometry=g;this.material=m;this.scale=new Vector();}}
const THREE={Group,Mesh,BoxGeometry:class{},DoubleSide:2,MeshStandardMaterial:class{constructor(p){Object.assign(this,p);}}};
const scene={children:[],add(x){this.children.push(x);}};
const walls=[];
const world=createExplorationWorld({THREE,scene,getGroundHeight:()=>0,isPositionFree:()=>true,addCollider:c=>walls.push(c)});
world.generate(seed);
test('Quatro locais e doze móveis visuais reais',()=>{
 assert.equal(world.sites.length,4);
 assert.equal(world.sites.reduce((n,s)=>n+s.containers.length,0),12);
 assert.equal(scene.children.length,4);
 assert.ok(walls.length>0);
});
test('Gerar duas vezes não duplica objetos e colisores',()=>{
 const n=walls.length;world.generate(seed);assert.equal(walls.length,n);
});
test('Local descoberto ao aproximar, sem spam de descoberta',()=>{
 const site=world.sites[0],p={x:site.x,z:site.z};
 assert.equal(world.update(p)[0].type,'discovered');
 assert.equal(world.update(p).length,0);
});
test('Área de alto risco dá aviso apenas uma vez',()=>{
 const site=world.sites.find(s=>s.threat>0),p={x:site.x,z:site.z};
 assert.deepEqual(world.update(p).map(e=>e.type),['discovered','danger']);
 assert.deepEqual(world.update(p),[]);
});
test('Objetivo fornece direção, distância e progresso de loot',()=>{
 const objective=world.objective({x:0,z:0});
 assert.ok(objective.meters>0);assert.equal(objective.opened,0);assert.equal(objective.total,12);
 assert.ok(['L','SE','S','SO','O','NO','N','NE'].includes(objective.direction));
});
test('Não vasculha caixa através de parede traseira',()=>{
 const s=world.sites[0],c=s.containers[0];
 assert.equal(world.nearest({x:c.x,z:s.z-3.5}),null);
});
test('Vasculhar recompensa inventário e não permite repetir saque',()=>{
 const s=world.sites[0],c=s.containers[0],inventory=createSurvival().inventory;
 const first=world.search({x:c.x,z:c.z},inventory);
 assert.equal(first.ok,true);
 assert.deepEqual(Object.keys(first.items).length,2);
 assert.equal(world.search({x:c.x,z:c.z},inventory).ok,false);
});
test('Mochila cheia mantém caixa não vasculhada',()=>{
 const s=world.sites[0],c=s.containers[1],inv=createSurvival().inventory;
 for(const key of Object.keys(inv))inv[key]=999;
 assert.equal(world.search({x:c.x,z:c.z},inv).ok,false);
 assert.equal(c.opened,false);
});
test('Restaurar checkpoint mantém móveis coletados e descoberta',()=>{
 const old=world.serialize();
 const clone=createExplorationWorld({THREE,scene:{add(){}},getGroundHeight:()=>0,isPositionFree:()=>true});
 clone.generate(seed);assert.equal(clone.restore(old),true);
 assert.deepEqual(clone.serialize(),old);
});
test('Checkpoint antigo inicia com locais inexplorados',()=>{
 assert.equal(world.restore(undefined),true);
 assert.equal(world.sites.every(s=>s.containers.every(c=>!c.opened)&&!s.ambushed),true);
});
test('Save modificado com loot inválido é rejeitado sem alteração',()=>{
 const previous=world.serialize();
 assert.equal(world.restore([{id:'cabana',discovered:true,ambushed:false,opened:['falso']}]),false);
 assert.deepEqual(world.serialize(),previous);
});
test('Arquivos de integração importam, mostram HUD e salvam loot',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const save=readFileSync(new URL('../src/gameplay/save-system.js',import.meta.url),'utf8');
 assert.match(main,/exploration\.search\(player\.position,survival\.inventory\)/);
 assert.match(main,/exploration:exploration\.serialize\(\)/);
 assert.match(main,/exploration\.restore\(data\.exploration\)/);
 assert.match(main,/explorationSites:exploration\.sites/);
 assert.match(ui,/id="exploration-status"/);
 assert.match(save,/validExplorationSave\(data\.exploration\)/);
});
console.log(`TOTAL v2.5: ${passed} testes de exploração`);
