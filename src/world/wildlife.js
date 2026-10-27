import {geometryDetail} from '../render/geometry-detail.js';
import {createSeededRandom} from './random.js';
import {isInAttackArc} from '../gameplay/combat.js';

// Animais low-poly leves. O corpo usa a mesma geometria compartilhada em
// múltiplos espécimes; apenas transforms individuais são animados.
export const MAX_ANIMALS=10;
export const RABBIT_ALERT_RADIUS=16;
export const BOAR_DEFENSE_RADIUS=8.5;
export function validWildlife(data){return Array.isArray(data)&&data.length<=MAX_ANIMALS&&data.every(a=>
 a&&['rabbit','boar'].includes(a.type)&&Number.isFinite(a.x)&&Math.abs(a.x)<=109&&
 Number.isFinite(a.z)&&Math.abs(a.z)<=109&&Number.isInteger(a.hp)&&a.hp>=1&&a.hp<=(a.type==='boar'?5:2)&&
 Number.isFinite(a.heading)&&Math.abs(a.heading)<=Math.PI*2);}

const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const turnTowards=(from,to,limit)=>from+clamp(Math.atan2(Math.sin(to-from),Math.cos(to-from)),-limit,limit);
export function wildlifeDecision(type,distance,canSeePlayer=true){
 if(type==='rabbit')return distance<RABBIT_ALERT_RADIUS&&canSeePlayer?'flee':'forage';
 if(type==='boar')return distance<BOAR_DEFENSE_RADIUS&&canSeePlayer?'defend':'wander';
 return 'wander';
}
export function createWildlifeWorld({THREE,scene,getGroundHeight,isPositionFree,onHunt,onHurt=()=>{},canSee=()=>true}){
 const animals=[];
 let respawnElapsed=0, rabbitGeo=new THREE.SphereGeometry(1,12,9);
 const boxGeo=new THREE.BoxGeometry(1,1,1);
 const mat=(color,roughness=1)=>new THREE.MeshStandardMaterial({color,roughness});
 const fur=mat(0x9a8167),furLight=mat(0xb9a083),innerEar=mat(0xc78f91),belly=mat(0xe8d5bc);
 const white=mat(0xf3e3cf),boarMat=mat(0x554033),boarHighlight=mat(0x826148),
       nose=mat(0x8f665c),hooves=mat(0x302722),eyes=mat(0x131717,.55),tusk=mat(0xf0e4c9);
 function sphere(g,material,x,y,z,sx,sy,sz){
  const m=new THREE.Mesh(rabbitGeo,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;g.add(m);return m;
 }
 function block(g,material,x,y,z,sx,sy,sz){
  const m=new THREE.Mesh(boxGeo,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;g.add(m);return m;
 }
 function rabbit(g){
  const body=sphere(g,fur,0,.37,0,.35,.29,.48);
  sphere(g,belly,0,.25,-.04,.27,.18,.37);
  // Olhos, focinho, orelhas com interior e patas articuladas, sem texturas externas.
  const head=new THREE.Group();head.position.set(0,.58,-.37);g.add(head);
  sphere(head,furLight,0,.015,0,.265,.26,.26);
  sphere(head,white,0,-.115,-.225,.17,.12,.095);
  sphere(head,nose,0,-.04,-.307,.065,.052,.045);
  const ears=[];
  for(const side of [-1,1]){
   sphere(head,eyes,side*.194,.057,-.184,.043,.052,.039);
   const ear=new THREE.Group();ear.position.set(side*.135,.20,-.055);head.add(ear);
   sphere(ear,fur,0,.232,0,.075,.32,.105);
   sphere(ear,innerEar,0,.240,-.081,.040,.245,.029);
   ears.push(ear);
  }
  const legs=[];
  for(const side of [-1,1])for(const z of [-.29,.30]){
   const leg=new THREE.Group();leg.position.set(side*.24,.24,z);g.add(leg);
   sphere(leg,z>.0?furLight:fur,0,-.10,-.055,.14,.135,.18);legs.push(leg);
  }
  const tail=sphere(g,white,0,.43,.49,.16,.16,.16);
  return {body,head,ears,legs,tail};
 }
 function boar(g){
  const body=sphere(g,boarMat,0,.67,0,.69,.53,.93);
  // Javali robusto: dorso mais alto, crina, ombros largos, tromba, presas e cascos.
  sphere(g,boarHighlight,0,.89,-.33,.66,.41,.52);
  const head=new THREE.Group();head.position.set(0,.74,-.66);g.add(head);
  sphere(head,boarMat,0,0,0,.52,.41,.43);
  sphere(head,boarHighlight,0,-.155,-.35,.38,.28,.29);
  sphere(head,nose,0,-.14,-.575,.275,.20,.11);
  for(const side of [-1,1]){
   sphere(head,eyes,side*.39,.105,-.256,.060,.055,.055);
   sphere(head,hooves,side*.115,-.14,-.68,.046,.045,.018);
   const ear=sphere(head,boarMat,side*.40,.32,.05,.19,.22,.10);ear.rotation.z=side*.28;
   const fang=sphere(head,tusk,side*.40,-.27,-.48,.075,.165,.084);fang.rotation.z=-side*.3;
   // Javali reconhecível mesmo em visual low-poly.
  }
  const legs=[];
  for(const side of [-1,1])for(const z of [-.55,.57]){
   const leg=new THREE.Group();leg.position.set(side*.43,.47,z);g.add(leg);
   block(leg,boarMat,0,-.18,0,.26,.46,.28);
   block(leg,hooves,0,-.40,-.02,.30,.12,.34);
   legs.push(leg);
  }
  const mane=[];
  for(let i=0;i<5;i++){
   const spine=block(g,boarHighlight,0,1.18-Math.abs(i-2)*.045,-.47+i*.24,.105,.19,.13);
   spine.rotation.x=(i-2)*.15;mane.push(spine);
  }
  const tail=new THREE.Group();tail.position.set(0,.75,.88);g.add(tail);
  sphere(tail,boarMat,0,.015,.19,.055,.065,.25);
  return {body,head,legs,mane,tail};
 }
 function spawn(type,x,z,hp=null,heading=0){
  if(animals.length>=MAX_ANIMALS)return null;
  const g=new THREE.Group();g.name=type==='rabbit'?'Coelho':'Javali';
  const rig=type==='rabbit'?rabbit(g):boar(g);
  g.position.set(x,getGroundHeight(x,z),z);g.rotation.y=heading+Math.PI;scene.add(g);
  const a={type,x,z,heading,hp:hp??(type==='boar'?5:2),group:g,rig,
   pace:1,attackDelay:0,wander:0,step:0,alert:false,behavior:'wander'};
  animals.push(a);return a;
 }
 function generate(seed=2026,quality='medium'){
  if(animals.length)return;
  const detail=geometryDetail(quality);rabbitGeo.dispose?.();
  rabbitGeo=new THREE.SphereGeometry(1,detail.bushWidth,detail.bushHeight);
  const rand=createSeededRandom((seed^0xBBCC1342)>>>0);
  for(let i=0;i<MAX_ANIMALS;i++){
   const type=i<7?'rabbit':'boar';
   for(let tries=0;tries<100;tries++){
    const angle=rand()*Math.PI*2,dist=12+rand()*62;
    const x=Math.sin(angle)*dist,z=Math.cos(angle)*dist;
    if(isPositionFree(x,z,1.25)&&animals.every(a=>Math.hypot(a.x-x,a.z-z)>5)){
     spawn(type,x,z,null,rand()*Math.PI*2);break;
    }
   }
  }
 }
 function update(dt,player,quality='medium'){
  const frame=clamp(dt,0,.1);
  if(animals.length<MAX_ANIMALS){
   respawnElapsed+=frame;
   if(respawnElapsed>=100){
    respawnElapsed=0;
    for(let tries=0;tries<20;tries++){
     const theta=Math.random()*Math.PI*2,r=26+Math.random()*35;
     const x=player.x+Math.cos(theta)*r,z=player.z+Math.sin(theta)*r;
     if(Math.abs(x)>98||Math.abs(z)>98||!isPositionFree(x,z,1.3))continue;
     spawn(Math.random()<.72?'rabbit':'boar',x,z,null,theta);break;
    }
   }
  }
  const radius=quality==='low'?45:quality==='medium'?72:100;
  for(const a of animals){
   const dx=a.x-player.x,dz=a.z-player.z,dist=Math.hypot(dx,dz);
   a.group.visible=dist<radius;a.attackDelay=Math.max(0,a.attackDelay-frame);
   if(dist>radius)continue;
   const close=dist<(a.type==='rabbit'?RABBIT_ALERT_RADIUS:BOAR_DEFENSE_RADIUS);
   // A detecção depende da linha de visão a distâncias não imediatas.
   const hasVisual=dist<2.5||(!close?false:canSee(a.group.position,player));
   const behavior=wildlifeDecision(a.type,dist,hasVisual);
   a.behavior=behavior;a.alert=behavior==='flee'||behavior==='defend';
   let desired=a.heading;
   if(behavior==='flee')desired=Math.atan2(dx,dz);
   else if(behavior==='defend'&&dist>1.1)desired=Math.atan2(-dx,-dz);
   else if(a.wander<=0){desired=a.heading+(Math.random()-.5)*1.8;a.heading=desired;a.wander=3+Math.random()*3;}
   a.wander=Math.max(0,a.wander-frame);
   a.heading=turnTowards(a.heading,desired,frame*(behavior==='forage'||behavior==='wander'?1.3:5.2));
   const speed=behavior==='flee'?5.0:behavior==='defend'?(dist>1.25?3.65:0):a.type==='rabbit'?.58:.44;
   const nx=a.x+Math.sin(a.heading)*speed*frame;
   const nz=a.z+Math.cos(a.heading)*speed*frame;
   let moved=false;
   if(speed>0&&Math.abs(nx)<98&&Math.abs(nz)<98&&isPositionFree(nx,nz,a.type==='boar'?.8:.45)){
    a.x=nx;a.z=nz;moved=true;
   }else if(speed>0){a.heading=turnTowards(a.heading,a.heading+Math.PI*.7,frame*3.4);a.wander=0;}
   a.heading=Math.atan2(Math.sin(a.heading),Math.cos(a.heading));
   a.step+=frame*(moved?(a.type==='rabbit'?15.5:9.2)*Math.max(.5,speed/3.7):2.5);
   const cadence=Math.sin(a.step),amplitude=moved?Math.min(1,speed/3.0):0;
   if(a.type==='rabbit'){
    const jump=moved?Math.pow(Math.max(0,cadence),1.5)*.22*amplitude:0;
    a.group.position.set(a.x,getGroundHeight(a.x,a.z)+jump,a.z);
    a.rig.body.rotation.x=Math.cos(a.step)*.075*amplitude;
    a.rig.head.rotation.x=(a.alert?-.12:.03)+Math.sin(a.step*.48)*.035;
    a.rig.ears.forEach((ear,i)=>{ear.rotation.x=Math.sin(a.step*.76+i*.9)*.09*(a.alert?2:1);});
    a.rig.legs.forEach((leg,i)=>{leg.rotation.x=Math.sin(a.step+(i%2)*Math.PI)*.23*amplitude;});
    a.rig.tail.scale.y=1+Math.sin(a.step)*.05;
   }else{
    a.group.position.set(a.x,getGroundHeight(a.x,a.z),a.z);
    a.rig.body.rotation.x=Math.sin(a.step)*.035*amplitude;
    a.rig.head.rotation.x=a.alert?-.11:Math.sin(a.step*.35)*.03;
    a.rig.legs.forEach((leg,i)=>{leg.rotation.x=Math.sin(a.step+((i%3)===0?Math.PI:0))*.28*amplitude;});
    a.rig.tail.rotation.z=Math.sin(a.step*.55)*.2;
    a.rig.mane.forEach((spine,i)=>{spine.rotation.x=(i-2)*.15+Math.sin(a.step+i*.2)*.035;});
   }
   a.group.rotation.y=a.heading+Math.PI;
   // O javali só machuca em contato real e com campo de visão; coelhos nunca atacam.
   if(a.type==='boar'&&dist<1.65&&a.attackDelay<=0&&hasVisual){
    onHurt(5,a.group.position);a.attackDelay=2.8;
   }
  }
 }
 function attack(player,yaw,range,arc,damage){
  let hit=0;
  for(const a of [...animals]){
   if(!isInAttackArc(player,yaw,a,range+(a.type==='boar'?.5:.25),Math.cos(Math.PI*arc)))continue;
   if(!canSee(player,a.group.position))continue;
   a.hp-=Math.max(1,Math.floor(damage));hit++;
   if(a.hp<=0){const i=animals.indexOf(a);if(i>=0)animals.splice(i,1);scene.remove(a.group);onHunt(a.type,a.type==='boar'?3:1);}
   else a.heading=Math.atan2(a.x-player.x,a.z-player.z);
  }
  return hit;
 }
 function serialize(){return animals.map(a=>({type:a.type,x:a.x,z:a.z,hp:a.hp,heading:a.heading}));}
 function restore(saved){
  if(!validWildlife(saved))return false;
  for(const a of animals)scene.remove(a.group);
  animals.length=0;respawnElapsed=0;
  for(const a of saved)spawn(a.type,a.x,a.z,a.hp,a.heading);
  return true;
 }
 return {animals,generate,update,attack,serialize,restore};
}
