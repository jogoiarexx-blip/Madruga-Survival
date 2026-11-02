import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {forestSpriteMetrics,measureForestAlpha,createForestBillboards}
  from '../src/world/forest-billboards.js';
import {forestGlbInRange} from '../src/world/forest-object-models.js';
const approx=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);

// Fotos 256x384 antigas: margens de cima/baixo não podem diminuir a árvore.
const bounds={left:33,top:42,right:205,bottom:348};
const size=forestSpriteMetrics(256,384,bounds,5.5);
approx(size.visibleHeight,5.5);
approx(size.centerX,(33+205+1)/(256*2));
approx(size.centerY,(384-348-1)/384);
approx(size.visibleWidth/size.visibleHeight,(205-33+1)/(348-42+1));
assert.ok(size.height>5.5,'Compensa a margem alfa');
const fallback=forestSpriteMetrics(256,384,null,5.5);
approx(fallback.height,5.5);
assert.ok(Number.isFinite(forestSpriteMetrics(256,384,{left:1,top:1,right:1,bottom:1},5.5).height),
 'Proteção contra alfa muito pequeno');

// Margem de 1,5 m: já selecionado segue GLB até sair da zona externa.
assert.equal(forestGlbInRange(20*20,22,false),true);
assert.equal(forestGlbInRange(22*22,22,false),false);
assert.equal(forestGlbInRange(22*22,22,true),true);
assert.equal(forestGlbInRange(24*24,22,true),false);
assert.equal(forestGlbInRange(NaN,22,true),false);

function createCanvas(){
 const canvas={width:1,height:1,subject:null};
 const ctx={
  clearRect(){},
  drawImage(image){canvas.subject=image;},
  getImageData(){
   const image=canvas.subject;
   const data=new Uint8ClampedArray(canvas.width*canvas.height*4);
   const r=image?.rect;
   if(r)for(let y=r.top;y<=r.bottom;y++)
     for(let x=r.left;x<=r.right;x++)data[(y*canvas.width+x)*4+3]=255;
   return {data};
  }
 };
 canvas.getContext=()=>ctx;
 return canvas;
}
const canvas=createCanvas();
assert.deepEqual(measureForestAlpha({width:32,height:48,rect:{left:4,top:8,right:23,bottom:40}},canvas),
 {left:4,top:8,right:23,bottom:40});
assert.equal(measureForestAlpha({width:32,height:48},canvas),null);
assert.equal(measureForestAlpha({width:32,height:48},null),null);

class Sprite{
 constructor(material){
  this.material=material;this.visible=false;
  this.position={x:0,y:0,z:0,set(x,y,z){this.x=x;this.y=y;this.z=z;}};
  this.scale={x:0,y:0,z:0,set(x,y,z){this.x=x;this.y=y;this.z=z;}};
  this.center={x:0,y:0,set(x,y){this.x=x;this.y=y;}};
 }
}
class Material{constructor(config){Object.assign(this,config);}}
class TextureLoader{
 load(url,resolve){
   const view=Number(url.match(/-(\d)\.webp$/)?.[1]||0);
   const rect={left:view%2?3:6,top:8,right:view%2?25:23,bottom:41};
   resolve({image:{width:32,height:48,rect},url,dispose(){}});
 }
}
const THREE={Sprite,SpriteMaterial:Material,TextureLoader,SRGBColorSpace:'srgb'};
const tree={position:{x:2,y:.7,z:3},rotation:{y:0},visible:true,
 userData:{modelVariant:'tree2',modelScale:1.2},children:[],add(o){this.children.push(o);}};
const shrub={x:6,y:.3,z:3,scale:.7,rotation:0};
const scene={added:[],add(s){this.added.push(s);}};
const oldDocument=globalThis.document;
try{
 globalThis.document={createElement:()=>createCanvas()};
 const systems=createForestBillboards({THREE,scene,trees:[tree],bushPositions:[shrub]});
 assert.equal(await systems.preload(),4);
 systems.update({x:2,z:12},{quality:'medium'});
 assert.equal(tree.sprite.visible,true);
 assert.equal(shrub.sprite.visible,true);
 assert.equal(tree.sprite.position.y,0,'Altura local na raiz do tronco');
 approx(shrub.sprite.position.y,.3);
 const height=5.5*1.2,shrubHeight=1.55*.7;
 approx(tree.sprite.scale.y*(41-8+1)/48,height);
 approx(shrub.sprite.scale.y*(41-8+1)/48,shrubHeight);
 approx(tree.sprite.center.y,(48-41-1)/48);
 const oldWidth=tree.sprite.scale.x;
 systems.update({x:15,z:16},{quality:'medium'});
 assert.notEqual(tree.sprite.scale.x,oldWidth,'Vista lateral respeita a largura da nova silhueta');
 approx(tree.sprite.scale.y*(41-8+1)/48,height);
 systems.update({x:15,z:16},{quality:'medium',glbTrees:new Set([tree])});
 assert.equal(tree.sprite.visible,false,'GLB substitui a imagem sem duplicação');
}finally{
 if(oldDocument===undefined)delete globalThis.document;
 else globalThis.document=oldDocument;
}
const shader=readFileSync(new URL('../src/world/forest-billboards.js',import.meta.url),'utf8');
assert.match(shader,/willReadFrequently:true/);
assert.match(shader,/forestWebpView=index/);
const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert.match(index,/forest-webp-r1-s2/);
const blender=readFileSync(new URL('../scripts/generate-forest-webp.py',import.meta.url),'utf8');
assert.match(blender,/diagonal_width/);
console.log('OK escala WebP: alfa, âncora no solo, 8 vistas, proporção e histerese GLB');
