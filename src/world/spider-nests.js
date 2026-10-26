// Madruga Survival v2.12: ninhos persistentes, ovos finitos e armadilhas de teia.
// Sem import de Three.js: geração, interação e timers são testáveis isoladamente.
import {createSeededRandom} from './random.js';

export const NEST_SPECS=Object.freeze([
  Object.freeze({id:'bosque',label:'Ninho do Bosque',variant:'shadow',radius:29,eggs:3}),
  Object.freeze({id:'ravina',label:'Ninho da Ravina',variant:'hunter',radius:43,eggs:3}),
  Object.freeze({id:'tecelas',label:'Colônia das Tecelãs',variant:'weaver',radius:59,eggs:3})
]);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const finite=(v,a,b)=>typeof v==='number'&&Number.isFinite(v)&&v>=a&&v<=b;
export function validSpiderNestSave(data){
  if(data===undefined)return true; // saves antigos (v2.11 e anteriores)
  if(!Array.isArray(data)||data.length>NEST_SPECS.length)return false;
  const used=new Set();
  return data.every(n=>{
    const spec=NEST_SPECS.find(s=>s.id===n?.id);
    if(!spec||used.has(n.id)||!Number.isInteger(n.eggs)||n.eggs<0||n.eggs>spec.eggs||
      !finite(n.hatchTimer,0,60)||!finite(n.webCooldown,0,15))return false;
    used.add(n.id);return true;
  });
}
export function spiderNestLayout(seed,isPositionFree=()=>true){
  const rng=createSeededRandom((seed^0x6c3a9e27)>>>0),layout=[];
  for(const spec of NEST_SPECS){
    for(let attempt=0;attempt<240;attempt++){
      const angle=rng()*Math.PI*2,r=spec.radius-6+rng()*12;
      const x=Math.round(Math.cos(angle)*r*10)/10,z=Math.round(Math.sin(angle)*r*10)/10;
      const p={x,z};
      if(Math.abs(x)>93||Math.abs(z)>93||dist(p,{x:-4,z:-5})<20||
         dist(p,{x:32,z:-28})<13||dist(p,{x:-64,z:-46})<15||
         layout.some(n=>dist(n,p)<16)||!isPositionFree(x,z,2.4))continue;
      layout.push({...spec,x,z});break;
    }
  }
  return layout;
}
export function nestLoot(variant){return {spiderSilk:variant==='weaver'?3:2,chitin:variant==='hunter'?2:1};}
export function takeNestEgg(nest,inventory){
  if(!nest||nest.eggs<=0||!inventory)return {ok:false,reason:'Não há ovos neste ninho'};
  const items=nestLoot(nest.variant);
  if(!Object.entries(items).every(([k,n])=>Number.isInteger(inventory[k])&&inventory[k]>=0&&inventory[k]+n<=999))
    return {ok:false,reason:'Mochila cheia para os materiais da aranha'};
  for(const [key,n] of Object.entries(items))inventory[key]+=n;
  nest.eggs--;
  return {ok:true,items,remaining:nest.eggs};
}
export function tickNest(nest,dt,distance,{canHatch=true,canTrip=true,webDistance=Infinity}={}){
  const events=[];
  if(!nest||!Number.isFinite(dt)||dt<=0)return events;
  const step=Math.min(dt,.25);
  nest.webCooldown=Math.max(0,nest.webCooldown-step);
  if(nest.eggs<=0)return events;
  if(distance<21){
    if(canHatch){
      nest.hatchTimer=Math.max(0,nest.hatchTimer-step);
      if(nest.hatchTimer===0){
        nest.eggs--;
        nest.hatchTimer=22;
        events.push({type:'hatch',nestId:nest.id,variant:nest.variant,x:nest.x,z:nest.z});
      }
    }
  }
  // Teia fixa perto do ninho; evento sem dano e com recarga para evitar stun infinito.
  if(canTrip&&nest.webCooldown<=0&&webDistance<1.25){
    nest.webCooldown=9;
    events.push({type:'web',nestId:nest.id,seconds:2.4});
  }
  return events;
}

export function createSpiderNestWorld({THREE,scene,getGroundHeight,isPositionFree=()=>true}){
  const nests=[];
  const materials={
    soil:new THREE.MeshStandardMaterial({color:0x3d302d,roughness:1}),
    silk:new THREE.MeshStandardMaterial({color:0xb5bcc8,roughness:.8,transparent:true,opacity:.78,side:THREE.DoubleSide}),
    egg:new THREE.MeshStandardMaterial({color:0x9e9b80,roughness:1}),
    shadow:new THREE.MeshStandardMaterial({color:0x36303a,roughness:1})
  };
  let root=null;
  function sync(n){for(let i=0;i<n.eggMeshes.length;i++)n.eggMeshes[i].visible=i<n.eggs;
    if(n.webMesh)n.webMesh.visible=n.eggs>0;}
  function generate(seed){
    if(root){scene.remove(root);root.traverse(o=>{if(o.geometry)o.geometry.dispose();});}
    root=new THREE.Group();scene.add(root);nests.length=0;
    for(const spec of spiderNestLayout(seed,isPositionFree)){
      const n={...spec,eggs:spec.eggs,hatchTimer:13,webCooldown:0,eggMeshes:[]};
      const group=new THREE.Group();group.position.set(n.x,getGroundHeight(n.x,n.z),n.z);
      const mound=new THREE.Mesh(new THREE.CylinderGeometry(.78,1.5,.32,9),materials.soil);
      mound.position.y=.13;group.add(mound);
      const mat=n.variant==='weaver'?materials.shadow:materials.silk;
      const rings=[.65,1.15];
      for(const radius of rings){
        const circle=new THREE.Mesh(new THREE.TorusGeometry(radius,.026,3,20),mat);
        circle.rotation.x=-Math.PI/2;circle.position.y=.34;group.add(circle);
      }
      for(let ray=0;ray<8;ray++){
        const spoke=new THREE.Mesh(new THREE.BoxGeometry(.025,.018,2.5),materials.silk);
        spoke.position.y=.35;spoke.rotation.y=ray*Math.PI/8;group.add(spoke);
      }
      for(let i=0;i<spec.eggs;i++){
        const egg=new THREE.Mesh(new THREE.IcosahedronGeometry(.26,0),materials.egg);
        const angle=i*Math.PI*2/spec.eggs;
        egg.position.set(Math.cos(angle)*.48,.54,Math.sin(angle)*.48);
        group.add(egg);n.eggMeshes.push(egg);
      }
      const web=new THREE.Mesh(new THREE.TorusGeometry(1.16,.045,3,24),materials.silk);
      web.rotation.x=-Math.PI/2;web.position.set(2.75,getGroundHeight(n.x+2.75,n.z)-group.position.y+.07,0);
      group.add(web);
      n.webX=n.x+2.75;n.webZ=n.z;n.webMesh=web;n.group=group;root.add(group);nests.push(n);
    }
    return nests;
  }
  function nearest(pos,range=2.7){
    return nests.filter(n=>n.eggs>0&&dist(n,pos)<=range).sort((a,b)=>dist(a,pos)-dist(b,pos))[0]||null;
  }
  function harvest(pos,inventory){
    const nest=nearest(pos);
    if(!nest)return {ok:false,reason:'Nenhum ninho com ovos próximo'};
    const result=takeNestEgg(nest,inventory);
    if(result.ok)sync(nest);
    return {...result,nest};
  }
  function update(dt,pos,{canHatch=true,canTrip=true}={}){
    const events=[];
    for(const nest of nests){
      const distance=dist(nest,pos);
      if(distance>27)continue;
      const old=nest.eggs;
      events.push(...tickNest(nest,dt,distance,{canHatch,canTrip,webDistance:Math.hypot(pos.x-nest.webX,pos.z-nest.webZ)}));
      if(old!==nest.eggs)sync(nest);
    }
    return events;
  }
  function serialize(){return nests.map(n=>({id:n.id,eggs:n.eggs,
    hatchTimer:Math.round(n.hatchTimer*100)/100,webCooldown:Math.round(n.webCooldown*100)/100}));}
  function restore(data){
    if(data===undefined)return true;
    if(!validSpiderNestSave(data))return false;
    for(const saved of data){const nest=nests.find(n=>n.id===saved.id);
      if(!nest)continue;nest.eggs=saved.eggs;nest.hatchTimer=saved.hatchTimer;
      nest.webCooldown=saved.webCooldown;sync(nest);}
    return true;
  }
  return {nests,generate,nearest,harvest,update,serialize,restore};
}
