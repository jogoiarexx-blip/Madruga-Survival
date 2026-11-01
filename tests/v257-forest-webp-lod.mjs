import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {FOREST_WEBP_IDS,FOREST_WEBP_VIEWS,forestWebpUrl,forestWebpView,createForestBillboards}
 from '../src/world/forest-billboards.js';
import {forestObjectRange,forestObjectCap} from '../src/world/forest-object-models.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
assert.equal(FOREST_WEBP_IDS.length,4);
assert.equal(FOREST_WEBP_VIEWS,8);
assert.equal(forestWebpView({x:0,z:10},{x:0,z:0}),0);
assert.equal(forestWebpView({x:10,z:0},{x:0,z:0}),2);
assert.equal(forestWebpView({x:0,z:-10},{x:0,z:0}),4);
assert.equal(forestWebpView({x:-10,z:0},{x:0,z:0}),6);
assert.equal(forestWebpView({x:0,z:10},{x:0,z:0},Math.PI),4);
assert.throws(()=>forestWebpUrl('tree1',8),RangeError);
let compressed=0,original=0;
for(const id of FOREST_WEBP_IDS){
  const hashes=[];
  for(let i=0;i<FOREST_WEBP_VIEWS;i++){
    const url=forestWebpUrl(id,i);
    const bytes=readFileSync(new URL('../'+url.replace('./',''),import.meta.url));
    assert.ok(bytes.length>100, 'webp vazio '+url);
    assert.equal(bytes.toString('ascii',0,4),'RIFF');
    assert.equal(bytes.toString('ascii',8,12),'WEBP');
    hashes.push(createHash('sha256').update(bytes).digest('hex'));
    compressed+=bytes.length;
  }
  assert.ok(new Set(hashes).size>=4,'vistas realmente diferentes de '+id);
  const name={tree1:'arvore 1.glb',tree2:'arvore 2.glb',tree3:'arvore 3.glb',bush:'arbusto 1.glb'}[id];
  original+=readFileSync(new URL('../assets/models/Objetos/'+name,import.meta.url)).length;
  console.log(id+': 8 WEBPs validos; '+new Set(hashes).size+' vistas distintas');
}
assert.ok(compressed<original/3,'imagens devem ser muito menores que os quatro GLBs');
console.log('WebP total: '+(compressed/1048576).toFixed(2)+' MiB; GLBs: '+(original/1048576).toFixed(2)+' MiB');

assert.ok(forestObjectRange('medium','tree1')<=22,'GLB apenas proximo');
assert.ok(forestObjectRange('low','tree1')<forestObjectRange('high','tree1'));
assert.ok(forestObjectCap('low','tree1')<forestObjectCap('high','tree1'));
const model=read('src/world/forest-object-models.js');
assert.match(model,/maybeLoadRealModel/);
assert.match(model,/if\(!billboardsRequested\)return/);
assert.match(model,/preloadBillboards/);
assert.match(model,/billboards\.update\(viewer/);
const forest=read('src/world/forest.js');
assert.match(forest,/preloadModels:objectModels\.preloadBillboards/);
const main=read('src/main.js');
assert.match(main,/forest\.updateVisibility\(player\.position,graphicsQuality,dt,false,camera\.position\)/);
assert.match(read('index.html'),/forest-webp-r1/);
class MockSprite{
 constructor(material){this.material=material;this.position={set(x,y,z){this.x=x;this.y=y;this.z=z;}};
 this.scale={set(x,y,z){this.x=x;this.y=y;this.z=z;}};this.visible=false;}
}
class MockMaterial{constructor(options){Object.assign(this,options);}}
class MockTextureLoader{
 load(url,success){success({url,needsUpdate:false,dispose(){}});}
}
const THREE={Sprite:MockSprite,SpriteMaterial:MockMaterial,TextureLoader:MockTextureLoader,
 SRGBColorSpace:'srgb',LinearMipmapLinearFilter:1006};
const tree={position:{x:3,y:0,z:4},rotation:{y:0},visible:true,
 userData:{modelVariant:'tree1',modelScale:1},children:[],add(obj){this.children.push(obj)}};
const shrub={x:5,y:0,z:6,scale:1,rotation:0};
const scene={children:[],add(obj){this.children.push(obj)}};
const billboard=createForestBillboards({THREE,scene,trees:[tree],bushPositions:[shrub]});
assert.equal(await billboard.preload(),4);
assert.equal(billboard.status.tree1.views,8);
let draw=billboard.update({x:3,z:10},{quality:'medium'});
assert.equal(draw.trees.has(tree),true);
assert.equal(draw.bushes.has(shrub),true);
assert.equal(tree.sprite.visible,true);
assert.equal(shrub.sprite.visible,true);
assert.equal(tree.sprite.material.map.url,forestWebpUrl('tree1',0));
draw=billboard.update({x:8,z:4},{glbTrees:new Set([tree]),glbBushes:new Set([shrub])});
assert.equal(tree.sprite.visible,false);
assert.equal(shrub.sprite.visible,false);
assert.equal(draw.trees.size,0);
assert.equal(draw.bushes.size,0);
draw=billboard.update({x:200,z:200},{quality:'low'});
assert.equal(tree.sprite.visible,false,'oculta sprite distante');
assert.equal(shrub.sprite.visible,false,'oculta arbusto distante');
const unavailable=createForestBillboards({THREE:{},scene,trees:[tree],bushPositions:[shrub]});
assert.equal(await unavailable.preload(),0,'sem WebP usa fallback procedural');
console.log('OK LOD 2D/3D: 32 WebPs reais, rotacao 8 vistas, troca perto/longe, limites e fallback');
