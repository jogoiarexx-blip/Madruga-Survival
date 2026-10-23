import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPlayerWeaponRig,RIGHT_HAND_GRIP} from '../src/characters/player-weapons.js';
import {samplePlayerAttackPose,PLAYER_HIT_PHASES,PLAYER_ATTACK_DURATIONS} from '../src/characters/player-attack-pose.js';
import {findRev5Hand} from '../src/characters/player-rev5.js';
let count=0;
const test=(name,fn)=>{fn();console.log('OK v2.2.5',++count,name)};
class Node{constructor(name=''){this.name=name;this.isBone=false;this.children=[];this.visible=true;
this.position={set(x,y,z){this.x=x;this.y=y;this.z=z}};this.rotation={set(x,y,z){this.x=x;this.y=y;this.z=z}};}
add(n){this.children.push(n)}traverse(fn){fn(this);this.children.forEach(c=>c.traverse(fn))}
getObjectByName(n){let hit=null;this.traverse(o=>{if(o.name===n)hit=o});return hit}}
class Mesh extends Node{constructor(g,m){super();this.geometry=g;this.material=m}}
class Shape{constructor(...args){this.args=args}}
const THREE={Group:Node,Mesh,MeshStandardMaterial:Shape,CylinderGeometry:Shape,ConeGeometry:Shape,BoxGeometry:Shape,TorusGeometry:Shape};
test('pivô da arma coincide com a palma',()=>{
 const arm=new Node(),rig=createPlayerWeaponRig(THREE,arm);
 assert.equal(rig.weapon.parent,undefined);assert.equal(arm.children[0],rig.weapon);
 assert.equal(rig.weapon.position.y,RIGHT_HAND_GRIP.y);
 for(let index=0;index<3;index++){rig.equipWeaponVisual(index);assert.equal(rig.weaponModels.filter(x=>x.visible).length,1)}
 assert.equal(rig.hammerHead.position.y,.95);assert.equal(rig.spearHead.position.y,1.91);
});
test('poses contêm impacto entre preparo e recuperação sem valores inválidos',()=>{
 for(let w=0;w<3;w++){const pose=samplePlayerAttackPose(w,PLAYER_HIT_PHASES[w]);
 assert.ok(pose.armX<-.8);assert.ok(PLAYER_ATTACK_DURATIONS[w]<.5);
 for(let f=0;f<=100;f++)assert.ok(Object.values(samplePlayerAttackPose(w,f/100)).every(Number.isFinite))}
});
test('REV5 original contém espada na mão esquerda, não na direita',()=>{
 const base=new URL('../assets/models/rev5-parts/',import.meta.url);
 const manifest=JSON.parse(readFileSync(new URL('manifest.json',base),'utf8'));
 const p0=Buffer.from(readFileSync(new URL(manifest.parts[0],base),'utf8'),'base64');
 const p1=Buffer.from(readFileSync(new URL(manifest.parts[1],base),'utf8'),'base64');
 const len=p0.readUInt32LE(12),json=Buffer.concat([p0.subarray(20),p1]).subarray(0,len);
 const doc=JSON.parse(json.toString('utf8'));
 const sword=doc.nodes.findIndex(n=>n.name==='REV4_Sword_RightHand');
 const left=doc.nodes.findIndex(n=>n.name==='mixamorig:LeftHand');
 assert.ok(doc.nodes[left].children.includes(sword));
 assert.ok(Math.abs(doc.nodes[sword].translation[1])<.02);
});
test('ossos de dedos nunca são confundidos com a mão',()=>{
 const root=new Node(),hand=new Node('mixamorigLeftHand');hand.isBone=true;root.add(hand);
 const finger=new Node('mixamorigLeftHandThumb1');finger.isBone=true;root.add(finger);
 assert.equal(findRev5Hand(root),hand);
});
console.log('QA v2.2.5:',count,'grupos aprovados');
