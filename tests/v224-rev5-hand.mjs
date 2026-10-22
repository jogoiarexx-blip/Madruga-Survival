import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {findRev5Hand,createPlayerRev5} from '../src/characters/player-rev5.js';
let passed=0;
async function test(name,run){await run();passed++;console.log('OK REV5 rig',passed,name)}
const rootUrl=new URL('../assets/models/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('rev5-parts/manifest.json',rootUrl),'utf8'));
const glb=Buffer.concat(manifest.parts.map(name=>Buffer.from(readFileSync(new URL('rev5-parts/'+name,rootUrl),'utf8'),'base64')));
const doc=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)).toString('utf8'));
await test('GLB real mantém osso mixamorig:LeftHand',()=>{
  assert.ok(doc.skins[0].joints.map(i=>doc.nodes[i].name).includes('mixamorig:LeftHand'));
  assert.equal(doc.skins[0].joints.length,45);
  assert.equal(doc.animations.length,17);
});
await test('Three r160 sanitiza o caractere dois-pontos no nome do osso',()=>{
  const name='mixamorig:LeftHand';
  assert.equal(name.replace(/\\s/g,'_').replace(/[\\[\\].:/]/g,''),'mixamorigLeftHand');
});
class Node{
 constructor(name='',bone=false){this.name=name;this.isBone=bone;this.children=[];this.parent=null;this.visible=true;this.isMesh=false;
   this.position={set(...v){this.val=v},y:0};this.rotation={set(){},y:0};this.scale={setScalar(){}};}
 add(n){n.parent?.remove(n);this.children.push(n);n.parent=this}
 remove(n){this.children=this.children.filter(c=>c!==n);n.parent=null}
 traverse(fn){fn(this);this.children.forEach(c=>c.traverse(fn))}
 getObjectByName(name){let result=null;this.traverse(n=>{if(!result&&n.name===name)result=n});return result}
}
class Action{time=0;running=false;reset(){return this}setLoop(){return this}setEffectiveWeight(){return this}setEffectiveTimeScale(){return this}play(){this.running=true;return this}isRunning(){return this.running}stopFading(){return this}crossFadeFrom(){return this}stop(){return this}}
class Mixer{timeScale=1;clips=new Map;clipAction(clip){if(!this.clips.has(clip.name))this.clips.set(clip.name,new Action);return this.clips.get(clip.name)}addEventListener(){}update(){}stopAllAction(){}uncacheRoot(){}}
const THREE={Group:Node,AnimationMixer:Mixer,LoopRepeat:2,LoopOnce:1,Vector3:class{},Quaternion:class{}};
const names=['Running','Walking','Attack','Triple_Combo_Attack','Idle','Walk_REV3','Run_REV3','SwordAttack_REV3','SwordCombo_REV3','CastMagic','Jump','HitReact','Death','BlockSword','Celebrate','SwordAttack_Refined','TripleCombo_Refined'];
function fixture(handName){
 const player=new Node('player'),avatar=new Node('old'),oldHand=new Node('oldHand'),weapon=new Node('weapon');
 player.add(avatar);avatar.add(oldHand);oldHand.add(weapon);weapon.position.y=-1.17;
 const scene=new Node('new'),hand=new Node(handName,true);scene.add(hand);
 scene.add(new Node('REV4_Sword_RightHand'));scene.add(new Node('REV4_Magic_LeftHand'));
 const GLTFLoader=class{loadAsync(){return Promise.resolve({scene,animations:names.map(name=>({name,duration:1}))})}};
 return {player,avatar,weapon,hand,THREE,GLTFLoader};
}
for(const name of ['mixamorig:LeftHand','mixamorigLeftHand','mixamorig_LeftHand']){
 await test('modelo substitui antigo e arma acompanha '+name,async()=>{
  const f=fixture(name);
  assert.equal(findRev5Hand(f.hand.parent),f.hand);
  const player=createPlayerRev5(f);
  assert.equal(await player.preload(),true);
  assert.equal(player.loaded,true);
  assert.equal(player.oldVisualVisible,false);
  assert.equal(player.visualVisible,true);
  assert.equal(f.weapon.parent,f.hand);
  player.dispose();
 });
}
await test('ossos de dedo não substituem a mão',()=>{
 const root=new Node('root');root.add(new Node('mixamorigLeftHandThumb1',true));
 assert.equal(findRev5Hand(root),null);
});
await test('a ausência de mão não impede o novo personagem de aparecer',async()=>{
 const originalWarn=console.warn;console.warn=()=>{};
 try{
  const f=fixture('notAHand'),player=createPlayerRev5(f);
  assert.equal(await player.preload(),true);
  assert.equal(player.oldVisualVisible,false);
  assert.equal(player.visualVisible,true);
  assert.equal(f.weapon.parent,player.model);
 }finally{console.warn=originalWarn}
});
console.log('REV5 rig verifications:',passed);
