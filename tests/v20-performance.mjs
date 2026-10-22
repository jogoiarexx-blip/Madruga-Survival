import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {batchStaticMeshes} from '../src/render/static-batching.js';
import {shouldRenderFrame,IDLE_RENDER_INTERVAL_MS} from '../src/render/frame-budget.js';
import {createZombieModelManager} from '../src/characters/zombie-models.js';
let passed=0;
const test=(name,fn)=>{fn();passed++;console.log('OK v2.0 '+passed+': '+name);};
class Geometry {
 constructor(tag){this.tag=tag;this.disposed=false;}
 clone(){return new Geometry(this.tag);}
 applyMatrix4(m){this.matrix=m;return this;}
 dispose(){this.disposed=true;}
}
class Group{
 constructor(){this.children=[];}
 add(child){this.children.push(child);child.parent=this;}
 remove(child){this.children.splice(this.children.indexOf(child),1);child.parent=null;}
}
class Mesh extends Group{
 constructor(geometry,material){super();this.geometry=geometry;this.material=material;this.isMesh=true;this.castShadow=true;this.receiveShadow=true;this.matrix={};}
 updateMatrix(){this.matrix={recalculated:true};}
}
const THREE={Mesh};
const makeGroup=()=>{
 const group=new Group(),materials={wood:{},iron:{}};
 for(let i=0;i<12;i++)group.add(new Mesh(new Geometry('wood'),i<10?materials.wood:materials.iron));
 const pivot=new Group();pivot.name='DoorPivot';pivot.add(new Mesh(new Geometry('door'),materials.wood));group.add(pivot);
 return {group,materials,pivot};
};
test('pares de peças estáticas reduzem draw calls sem alterar pivô da porta',()=>{
 const {group,pivot}=makeGroup();
 const sources=group.children.filter(c=>c.isMesh).map(c=>c.geometry);
 let merges=0;
 const saved=batchStaticMeshes({THREE,group,mergeGeometries:geos=>{merges++;assert.ok(geos.every(g=>g.matrix?.recalculated));return new Geometry('merged')}});
 assert.equal(saved,10);assert.equal(merges,2);
 assert.equal(group.children.filter(c=>c.isMesh).length,2);
 assert.equal(pivot.children.length,1);assert.ok(group.children.includes(pivot));
 assert.ok(sources.every(g=>g.disposed));
});
test('fallback mantém meshes quando geometrias são incompatíveis',()=>{
 const {group}=makeGroup();
 assert.equal(batchStaticMeshes({THREE,group,mergeGeometries:()=>null}),0);
 assert.equal(group.children.length,13);
 assert.ok(group.children[0].geometry.disposed===false);
});
test('sem utilitário Three.js, construção permanece funcional',()=>{
 const {group}=makeGroup();
 assert.equal(batchStaticMeshes({THREE,group}),0);assert.equal(group.children.length,13);
});
test('malha excluída nunca é mesclada (fogo e peças dinâmicas)',()=>{
 const {group}=makeGroup(),flame=group.children[0];
 const saved=batchStaticMeshes({THREE,group,mergeGeometries:()=>new Geometry('merged'),exclude:[flame]});
 assert.equal(saved,9);assert.ok(group.children.includes(flame));assert.equal(flame.geometry.disposed,false);
});
test('menu pausado limita renderização a quatro quadros por segundo',()=>{
 assert.equal(IDLE_RENDER_INTERVAL_MS,250);
 assert.equal(shouldRenderFrame({running:false,now:1200,lastIdleRenderAt:1100}),false);
 assert.equal(shouldRenderFrame({running:false,now:1350,lastIdleRenderAt:1100}),true);
 assert.equal(shouldRenderFrame({running:true,now:1101,lastIdleRenderAt:1100}),true);
});
test('realimentação com timestamp válido e aba oculta não acumula simulação',()=>{
 assert.equal(shouldRenderFrame({running:false,now:Infinity,lastIdleRenderAt:0}),false);
 assert.equal(shouldRenderFrame({running:false,now:1000,lastIdleRenderAt:-Infinity}),true);
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(main,/clock\.getDelta\(\)/);assert.match(main,/if \(document\.hidden\) return/);
 assert.match(main,/shouldRenderFrame\(\{running,now,lastIdleRenderAt\}\)/);
});
test('GLB REV2 é mantido e somente os zumbis recebem culling por distância',()=>{
 const source=readFileSync(new URL('../src/characters/zombie-models.js',import.meta.url),'utf8');
 assert.match(source,/this\.model\.visible=!!near/);
 assert.match(source,/this\.mixer\.update\(step\)/);
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(main,/import \{mergeGeometries\} from 'three\/addons\/utils\/BufferGeometryUtils\.js'/);
 assert.match(main,/mergeGeometries\}\)/);
});
console.log(`v2.0: ${passed} testes de regressão aprovados.`);
