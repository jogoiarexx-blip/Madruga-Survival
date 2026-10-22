import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createPlayerRev5,PLAYER_REV5_SCALE,PLAYER_REV5_URL,PLAYER_REV5_YAW} from '../src/characters/player-rev5.js';
let total=0;const test=async(label,func)=>{await func();console.log('REV5 '+(++total)+': '+label)};
await test('GLB intacto contém 45 ossos, 17 animações e três meshes',()=>{
 const f=new URL('../assets/models/Striped_Wanderer_REV5.glb',import.meta.url);
 const buf=readFileSync(f);
 assert.equal(buf.toString('ascii',0,4),'glTF');assert.ok(buf.length>9_000_000);
 const jsonLength=buf.readUInt32LE(12);const doc=JSON.parse(buf.subarray(20,20+jsonLength).toString('utf8'));
 assert.equal(doc.skins[0].joints.length,45);
 assert.equal(doc.animations.length,17);assert.equal(doc.meshes.length,3);
 for(const name of ['Idle','Walking','Running','SwordAttack_REV3','SwordAttack_Refined','CastMagic','Jump','HitReact','Death'])
  assert.ok(doc.animations.some(a=>a.name===name),name);
 assert.ok(Math.abs(PLAYER_REV5_SCALE*1.70000017-2.48)<1e-5);
 assert.equal(PLAYER_REV5_YAW,Math.PI);
});
class Vec{constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}}
class Quat{}
class Node{constructor(name=''){this.name=name;this.children=[];this.position=new Vec();this.rotation=new Vec();this.scale={setScalar(n){this.n=n}};this.visible=true;this.parent=null;this.isMesh=false;}
 add(o){o.parent?.remove(o);this.children.push(o);o.parent=this;}remove(o){if(!o)return;const i=this.children.indexOf(o);if(i>=0)this.children.splice(i,1);o.parent=null;}
 traverse(fn){fn(this);for(const c of this.children)c.traverse(fn);}
 getObjectByName(name){let found=null;this.traverse(o=>{if(o.name===name)found=o;});return found;}}
class Action{constructor(clip){this.clip=clip;this.time=0;this.playing=false;}reset(){this.time=0;return this;}setLoop(){return this;}setEffectiveWeight(){return this;}setEffectiveTimeScale(){return this;}play(){this.playing=true;return this;}isRunning(){return this.playing;}stopFading(){return this;}crossFadeFrom(){return this;}stop(){this.playing=false;return this;}}
class Mixer{constructor(root){this.root=root;this.clips=new Map();this.timeScale=1;}clipAction(c){if(!this.clips.has(c.name))this.clips.set(c.name,new Action(c));return this.clips.get(c.name);}addEventListener(){}update(){}stopAllAction(){}uncacheRoot(){}}
const THREE={Group:Node,AnimationMixer:Mixer,Vector3:Vec,Quaternion:Quat,LoopOnce:1,LoopRepeat:2};
const clipNames=['Running','Walking','Attack','Triple_Combo_Attack','Idle','Walk_REV3','Run_REV3','SwordAttack_REV3','SwordCombo_REV3','CastMagic','Jump','HitReact','Death','BlockSword','Celebrate','SwordAttack_Refined','TripleCombo_Refined'];
function sceneFixture(){const player=new Node('player'),avatar=new Node('legacy'),handOld=new Node('handOld'),weapon=new Node('weapon');player.add(avatar);avatar.add(handOld);handOld.add(weapon);weapon.position.y=-1.17;return {player,avatar,handOld,weapon};}
function glbFixture(){const model=new Node('gltfRoot'),hand=new Node('mixamorig:LeftHand'),sword=new Node('REV4_Sword_RightHand'),magic=new Node('REV4_Magic_LeftHand');hand.isBone=true;model.add(hand);hand.add(sword);model.add(magic);return {scene:model,animations:clipNames.map(name=>({name,duration:1.2}))};}
let currentLoad=0;class Loader{loadAsync(url){currentLoad++;assert.equal(url,PLAYER_REV5_URL);return Promise.resolve(glbFixture());}}
await test('modelo REV5 substitui visual antigo e ancora arma na mão do rig',async()=>{
 currentLoad=0;const f=sceneFixture();
 const ctrl=createPlayerRev5({THREE,GLTFLoader:Loader,...f});
 assert.equal(await ctrl.preload(),true);assert.equal(await ctrl.preload(),true);assert.equal(currentLoad,1);
 assert.equal(ctrl.loaded,true);assert.equal(f.avatar.visible,false);
 assert.equal(f.weapon.parent.name,'mixamorig:LeftHand');
 assert.equal(ctrl.model.getObjectByName('REV4_Sword_RightHand').visible,false);
 assert.equal(ctrl.model.getObjectByName('REV4_Magic_LeftHand').visible,false);
 assert.equal(f.player.children.length,2,'o modelo antigo permanece oculto só como fallback');
 ctrl.equip(2);assert.equal(f.weapon.position.y,-.43);
 ctrl.update(.016,{speed:3,sprinting:false,grounded:true});assert.equal(ctrl.animator.activeName,'Walking');
 ctrl.update(.016,{speed:7,sprinting:true,grounded:true});assert.equal(ctrl.animator.activeName,'Running');
 ctrl.attack();assert.equal(ctrl.animator.activeName,'SwordAttack_REV3');
 ctrl.special();assert.equal(ctrl.animator.activeName,'CastMagic');assert.equal(ctrl.model.getObjectByName('REV4_Magic_LeftHand').visible,true);
 ctrl.update(1.6,{speed:0});assert.equal(ctrl.model.getObjectByName('REV4_Magic_LeftHand').visible,false);
 ctrl.jump();assert.equal(ctrl.animator.activeName,'Jump');
 ctrl.hurt();assert.equal(ctrl.animator.activeName,'HitReact');
 ctrl.die();assert.equal(ctrl.animator.activeName,'Death');
 ctrl.dispose();assert.equal(f.avatar.visible,true);assert.equal(f.weapon.parent,f.handOld);
});
await test('falha de GLB preserva avatar original sem tela invisível',async()=>{
 const f=sceneFixture();
 const W=console.warn;console.warn=()=>{};
 try {const ctrl=createPlayerRev5({THREE,GLTFLoader:class{loadAsync(){return Promise.reject(new Error('offline'));}},...f});
 assert.equal(await ctrl.preload(),false);assert.equal(f.avatar.visible,true);assert.equal(f.weapon.parent,f.handOld);}finally{console.warn=W;}
});
await test('main usa REV5 para ataque, magia, corrida, salto, esquiva, dano e morte',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const combat=readFileSync(new URL('../src/gameplay/combat.js',import.meta.url),'utf8');
 assert.match(main,/createPlayerRev5\(/);assert.match(main,/void playerRev5\.preload\(\)/);
 for(const re of [/playerRev5\.attack\(\)/,/playerRev5\.special\(\)/,/playerRev5\.update\(dt/,/playerRev5\.jump\(\)/,/playerRev5\.hurt\(\)/,/playerRev5\.die\(\)/,/playerRev5\.equip\(index\)/])assert.match(main,re);
 assert.match(combat,/onAttackStart\(\)/);assert.match(combat,/onSpecialStart\(\)/);
 assert.ok(existsSync(new URL('../src/characters/wanderer/WandererAnimator.js',import.meta.url)));
});
console.log('REV5 total:',total);
