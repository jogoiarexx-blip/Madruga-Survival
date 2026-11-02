import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createStandingClip} from '../src/characters/standing-pose.js';
import {SPIDER_SKINS,spiderSkinKey,paintSpiderSkin,createSpiderAppearance} from '../src/characters/spider-appearance.js';
import {forestWebpBrightness,createForestBillboards} from '../src/world/forest-billboards.js';
import {chooseNpcClip} from '../src/characters/forest-npcs.js';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
assert.deepEqual(Object.keys(SPIDER_SKINS),['shadow','hunter','weaver','matriarch']);
assert.notEqual(SPIDER_SKINS.weaver.base,SPIDER_SKINS.hunter.base);
assert.notEqual(spiderSkinKey('weaver',{uuid:'x'}),spiderSkinKey('hunter',{uuid:'x'}));
const painted={ellipses:0,strokes:0,drawn:0};
const canvas=()=>({
  width:0,height:0,
  getContext(){return {
    save(){},restore(){},beginPath(){},ellipse(){painted.ellipses++;},
    fill(){},stroke(){painted.strokes++;},moveTo(){},quadraticCurveTo(){},
    fillRect(){},drawImage(){painted.drawn++;}
  };}
});
const doc={createElement(name){assert.equal(name,'canvas');return canvas();}};
class CanvasTexture {
  constructor(image){this.image=image;this.offset={copy(){}};this.repeat={copy(){}};
    this.center={copy(){}};this.uuid='mock-image';}
  dispose(){this.disposed=true}
}
class Color {constructor(value){this.value=value}}
const appearance=createSpiderAppearance({THREE:{CanvasTexture,Color,SRGBColorSpace:'srgb'},documentRef:doc});
function original(){
 return {map:{uuid:'diffuse-1',image:{width:96,height:64},flipY:false,wrapS:1,wrapT:2},
   roughness:.38,color:{multiply(v){this.tint=v.value;},setHex(v){this.hex=v;}},emissive:{setHex(v){this.hex=v;}},
   emissiveIntensity:.9,clone(){return {...this,color:{...this.color},emissive:{...this.emissive},
     clone:this.clone}}};
}
const shared=original(),skins=Object.keys(SPIDER_SKINS).map(id=>appearance.material(shared,id));
assert.equal(appearance.textures,4);
assert.ok(skins.every(x=>x!==shared&&x.map!==shared.map&&x.map.colorSpace==='srgb'));
assert.equal(shared.roughness,.38,'material compartilhado original não alterado');
assert.ok(skins.every(x=>x.roughness>=.77&&x.emissiveIntensity<.1));
assert.notEqual(skins[0].color.tint,skins[1].color.tint);
assert.equal(appearance.material(shared,'weaver').map,skins[2].map,'mesma textura reusada na espécie');
assert.equal(appearance.textures,4);
assert.ok(painted.ellipses>=4*100);
assert.ok(painted.strokes>=4*20);
assert.ok(painted.drawn>=4,'mapas originais UV preservados sob padrões');
const fallback=appearance.material({...original(),map:null},'hunter');
assert.ok(fallback.map,'GLB sem diffuse recebe textura procedural');
assert.equal(fallback.color.tint,undefined,'cor branca não distorce fallback texturizado');
appearance.dispose();assert.equal(appearance.textures,0);

class FakeTrack{
 constructor(name,times,values){this.name=name;this.times=times;this.values=values;}
 createInterpolant(){return {evaluate:t=>t<.5?[...this.values.slice(0,3)]:[...this.values.slice(3,6)]};}
}
class FakeClip{constructor(name,duration,tracks){this.name=name;this.duration=duration;this.tracks=tracks;}}
const walking=new FakeClip('Walking',1,[new FakeTrack('LeftFoot.position',[0,.5],[0,0,0,2,0,0])]);
const still=createStandingClip({AnimationClip:FakeClip},walking);
assert.equal(still.name,'Stand');
assert.equal(still.duration,1);
assert.deepEqual(still.tracks[0].values,[1,0,0,1,0,0],'fase da passada simétrica e sem deslocamento');
assert.equal(createStandingClip({AnimationClip:FakeClip},null),null);
assert.equal(chooseNpcClip(['Running','Walking','Stand'],false),'Stand');
assert.equal(chooseNpcClip(['Running','Walking','Stand'],true),'Walking');
const npc=read('src/characters/forest-npcs.js'),guard=read('src/characters/villager-guard.js');
assert.match(npc,/createStandingClip\(THREE,walking,'Stand'\)/);
assert.match(guard,/createStandingClip\(THREE,\(gltf.animations/);
assert.match(guard,/target\?'Aim_Idle':'Stand'/);
assert.match(npc,/agent.actions.Stand=agent.mixer.clipAction\(stand\)/);

const noon=forestWebpBrightness(.61,1.48),night=forestWebpBrightness(.12,.13);
assert.ok(night<noon&&night>=.3&&noon<.73);
assert.ok(noon<1,'webp não pode ignorar iluminação do GLB');
let getLighting=()=>({ambient:.61,sun:1.48});
class Sprite{
 constructor(material){this.material=material;this.visible=false;
  this.position={set(){}},this.scale={set(){}},this.center={set(){}};}
}
class SpriteMaterial{constructor(opt){Object.assign(this,opt);this.color={setRGB(r,g,b){this.level=r;this.green=g;this.blue=b;}};}}
class Loader{load(url,ok){ok({image:{width:256,height:384},needsUpdate:false});}}
const tree={position:{x:1,y:0,z:1},visible:true,rotation:{y:0},
 userData:{modelVariant:'tree1',modelScale:1},add(o){this.sprite=o}};
const scene={add(){}};
const bb=createForestBillboards({THREE:{Sprite,SpriteMaterial,TextureLoader:Loader},
 scene,trees:[tree],bushPositions:[],getLighting:()=>getLighting()});
assert.equal(await bb.preload(),4);
bb.update({x:3,z:4});assert.ok(Math.abs(tree.sprite.material.color.level-noon)<1e-8);
getLighting=()=>({ambient:.12,sun:.13});
bb.update({x:3,z:4});assert.ok(Math.abs(tree.sprite.material.color.level-night)<1e-8);
assert.match(read('src/gameplay/projectiles.js'),/opacity:isWeb\?\.73:1/);
assert.match(read('src/characters/spider-model.js'),/appearance.material\(material,enemy.spiderVariant\)/);
assert.match(read('src/main.js'),/getLighting:\(\)=>\(\{ambient:ambient.intensity,sun:sun.intensity\}\)/);
console.log('OK v2.60: 4 texturas de aranha com UV, repouso esquelético, luz WebP dia/noite e teia');
