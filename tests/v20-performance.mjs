import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {batchStaticMeshes} from '../src/render/static-batching.js';
import {shouldRenderFrame,IDLE_RENDER_INTERVAL_MS} from '../src/render/frame-budget.js';
let passed=0;
const test=(name,fn)=>{fn();passed++;console.log('OK v2.0 '+passed+': '+name)};
class Geometry {constructor(tag){this.tag=tag;this.disposed=false}clone(){return new Geometry(this.tag)}applyMatrix4(m){this.matrix=m;return this}dispose(){this.disposed=true}}
class Group {constructor(){this.children=[]}add(child){this.children.push(child);child.parent=this}remove(child){this.children.splice(this.children.indexOf(child),1);child.parent=null}}
class Mesh extends Group {constructor(geometry,material){super();this.geometry=geometry;this.material=material;this.isMesh=true;this.castShadow=true;this.receiveShadow=true;this.matrix={}}updateMatrix(){this.matrix={recalculated:true}}}
const THREE={Mesh};
function makeGroup(){const group=new Group(),materials={wood:{},iron:{}};for(let i=0;i<12;i++)group.add(new Mesh(new Geometry('wood'),i<10?materials.wood:materials.iron));const pivot=new Group();pivot.add(new Mesh(new Geometry('door'),materials.wood));group.add(pivot);return {group,pivot}}
test('agrupa peças rígidas sem fundir dobradiças',()=>{const {group,pivot}=makeGroup(),parts=group.children.filter(c=>c.isMesh).map(c=>c.geometry);let count=0;const saved=batchStaticMeshes({THREE,group,mergeGeometries:arr=>{count++;assert.ok(arr.every(g=>g.matrix?.recalculated));return new Geometry('merged')}});assert.equal(saved,10);assert.equal(count,2);assert.equal(group.children.filter(x=>x.isMesh).length,2);assert.ok(group.children.includes(pivot));assert.equal(pivot.children.length,1);assert.ok(parts.every(g=>g.disposed))});
test('fallback não elimina construções incompatíveis',()=>{const {group}=makeGroup();assert.equal(batchStaticMeshes({THREE,group,mergeGeometries:()=>null}),0);assert.equal(group.children.length,13)});
test('funciona sem utilitário de mesclagem',()=>{const {group}=makeGroup();assert.equal(batchStaticMeshes({THREE,group}),0);assert.equal(group.children.length,13)});
test('peças dinâmicas excluídas preservadas',()=>{const {group}=makeGroup(),flame=group.children[0];const saved=batchStaticMeshes({THREE,group,mergeGeometries:()=>new Geometry('merged'),exclude:[flame]});assert.equal(saved,9);assert.ok(group.children.includes(flame));assert.equal(flame.geometry.disposed,false)});
test('pausa desenha a cada 250 ms',()=>{assert.equal(IDLE_RENDER_INTERVAL_MS,250);assert.equal(shouldRenderFrame({running:false,now:1200,lastIdleRenderAt:1100}),false);assert.equal(shouldRenderFrame({running:false,now:1350,lastIdleRenderAt:1100}),true);assert.equal(shouldRenderFrame({running:true,now:1101,lastIdleRenderAt:1100}),true)});
test('timestamp não finito é rejeitado',()=>{assert.equal(shouldRenderFrame({running:false,now:Infinity,lastIdleRenderAt:0}),false);assert.equal(shouldRenderFrame({running:false,now:1000,lastIdleRenderAt:-Infinity}),true)});
test('integra culling REV4 e batching sem alterar GLB',()=>{const m=readFileSync(new URL('../src/main.js',import.meta.url),'utf8'),z=readFileSync(new URL('../src/characters/zombie-models.js',import.meta.url),'utf8');assert.match(m,/mergeGeometries/);assert.match(m,/shouldRenderFrame/);assert.match(z,/this\.model\.visible=!!near/);assert.match(z,/this\.mixer\.update\(step\)/)});
console.log('v2.0: '+passed+' verificações aprovadas.');
