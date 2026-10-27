import {createSeededRandom} from './random.js';

// POIs determinísticos pelo seed do mundo; decisões de loot independerão da ordem da busca.
export const EXPLORATION_SITES=Object.freeze([
  {id:'cabana',label:'Cabana do Lenhador',kind:'cabin',min:22,max:49,threat:0,
    containers:[{id:'armario',label:'Armário velho'},{id:'caixa',label:'Caixa de mantimentos'},{id:'mesa',label:'Mesa de ferramentas'}]},
  {id:'posto',label:'Posto de Primeiros Socorros',kind:'clinic',min:36,max:68,threat:1,
    containers:[{id:'gaveta',label:'Gaveta médica'},{id:'estoque',label:'Caixa de suprimentos'},{id:'prateleira',label:'Prateleira caída'}]},
  {id:'oficina',label:'Oficina Abandonada',kind:'workshop',min:48,max:82,threat:2,
    containers:[{id:'caixa',label:'Caixa de peças'},{id:'ferramentas',label:'Bancada enferrujada'},{id:'baú',label:'Baú de ferro'}]},
  {id:'deposito',label:'Depósito Esquecido',kind:'warehouse',min:64,max:98,threat:2,
    containers:[{id:'caixa',label:'Caixa de carga'},{id:'barril',label:'Barril de estoque'},{id:'armario',label:'Armário trancado'}]}
]);
const REWARDS=Object.freeze({
  cabin:[['wood',2,5],['fiber',2,4],['berries',1,3],['seeds',1,2],['water',1,2]],
  clinic:[['bandage',1,2],['water',1,3],['cloth',4,6],['berries',1,2]],
  workshop:[['iron',2,4],['scrap',2,5],['wood',1,3],['cloth',1,2]],
  warehouse:[['iron',2,5],['scrap',3,6],['cloth',2,5],['water',1,2]]
});
const lootHash=(str)=>{let h=2166136261;for(let i=0;i<str.length;i++)h=Math.imul(h^str.charCodeAt(i),16777619);return h>>>0;};
export function lootForContainer(seed,siteId,containerId){
  const spec=EXPLORATION_SITES.find(s=>s.id===siteId);
  if(!spec||!spec.containers.some(c=>c.id===containerId))return null;
  const random=createSeededRandom((seed ^ lootHash(siteId+'/'+containerId) ^ 0x563ea9f1)>>>0);
  const pool=REWARDS[spec.kind];
  const mandatory=spec.kind==='clinic'?'cloth':['workshop','warehouse'].includes(spec.kind)?'scrap':null;
  const guaranteed=mandatory?pool.findIndex(([name])=>name===mandatory):-1;
  const selected=new Set(),amounts={};
  if(guaranteed>=0){const [key,min,max]=pool[guaranteed];selected.add(guaranteed);amounts[key]=min+Math.floor(random()*(max-min+1));}
  // Dois tipos diferentes por recipiente. Os componentes críticos ficam garantidos por local.
  while(selected.size<2){const index=Math.floor(random()*pool.length);if(selected.has(index))continue;
    selected.add(index);const [key,min,max]=pool[index];amounts[key]=min+Math.floor(random()*(max-min+1));}
  return amounts;
}
export function generateSiteLayout(seed,isPositionFree=()=>true){
  const random=createSeededRandom((seed^0x5317bc49)>>>0),layout=[];
  for(const spec of EXPLORATION_SITES){
    let chosen=null;
    // Sites suficientemente afastados entre si, das ruínas principais e da base inicial.
    for(let tryIndex=0;tryIndex<250;tryIndex++){
      const angle=random()*Math.PI*2;
      const distance=spec.min+random()*(spec.max-spec.min);
      const x=Math.round(Math.cos(angle)*distance*10)/10,z=Math.round(Math.sin(angle)*distance*10)/10;
      if(Math.abs(x)>100||Math.abs(z)>100||Math.hypot(x-32,z+28)<14 || Math.hypot(x+64,z+46)<20 ||
         Math.hypot(x+4,z+5)<17 || layout.some(s=>Math.hypot(s.x-x,s.z-z)<20))continue;
      if(!isPositionFree(x,z,3.9))continue;
      chosen={id:spec.id,x,z};break;
    }
    if(chosen)layout.push(chosen);
  }
  return layout;
}
export function validExplorationSave(data){
  if(data===undefined)return true; // Checkpoints da v2.4 não possuem exploração.
  if(!Array.isArray(data)||data.length>EXPLORATION_SITES.length)return false;
  const ids=new Set();
  return data.every(s=>{
    const spec=EXPLORATION_SITES.find(entry=>entry.id===s?.id);
    if(!spec||ids.has(s.id)||typeof s.discovered!=='boolean'||typeof s.ambushed!=='boolean'||
       (s.doorOpen!==undefined&&typeof s.doorOpen!=='boolean')||
       (s.windowOpen!==undefined&&typeof s.windowOpen!=='boolean')||
       !Array.isArray(s.opened)||s.opened.length>spec.containers.length)return false;
    ids.add(s.id);
    const used=new Set();return s.opened.every(id=>{
      if(typeof id!=='string'||used.has(id)||!spec.containers.some(c=>c.id===id))return false;
      used.add(id);return true;
    });
  });
}
export function canTakeLoot(inventory,items,limit=999){
  return !!inventory&&!!items&&Object.entries(items).every(([key,count])=>
    Object.hasOwn(inventory,key)&&Number.isInteger(count)&&count>0&&
    Number.isInteger(inventory[key])&&inventory[key]>=0&&inventory[key]+count<=limit);
}
export function takeLoot(inventory,items){
  if(!canTakeLoot(inventory,items))return false;
  for(const [key,count] of Object.entries(items))inventory[key]+=count;
  return true;
}

// Geometria low poly sem imagens/CDN; locais abertos e realmente acessíveis a pé.
export function createExplorationWorld({THREE,scene,getGroundHeight,isPositionFree,addCollider=()=>{}}){
  const sites=[];
  let seed=0;
  const mats={
    wood:new THREE.MeshStandardMaterial({color:0x785339,roughness:1}),
    aged:new THREE.MeshStandardMaterial({color:0x54473e,roughness:1}),
    roof:new THREE.MeshStandardMaterial({color:0x58483c,roughness:1,side:THREE.DoubleSide}),
    clinic:new THREE.MeshStandardMaterial({color:0xd1c7af,roughness:1}),
    metal:new THREE.MeshStandardMaterial({color:0x737d79,roughness:.8,metalness:.22}),
    accent:new THREE.MeshStandardMaterial({color:0xe7bd6c,roughness:.85}),
    crate:new THREE.MeshStandardMaterial({color:0x90613f,roughness:1}),
    searched:new THREE.MeshStandardMaterial({color:0x4f483e,roughness:1})
  };
  const boxGeo=new THREE.BoxGeometry(1,1,1);
  const mesh=(group,x,y,z,w,h,d,material)=>{
    const item=new THREE.Mesh(boxGeo,material);item.position.set(x,y,z);item.scale.set(w,h,d);
    item.castShadow=true;item.receiveShadow=true;group.add(item);return item;
  };
  function generate(worldSeed){
    if(sites.length)return sites;
    seed=worldSeed>>>0;
    for(const candidate of generateSiteLayout(seed,isPositionFree)){
      const spec=EXPLORATION_SITES.find(s=>s.id===candidate.id);
      const g=new THREE.Group();g.position.set(candidate.x,getGroundHeight(candidate.x,candidate.z),candidate.z);
      const material=spec.kind==='clinic'?mats.clinic:spec.kind==='workshop'?mats.metal:mats.wood;
      mesh(g,0,.10,0,5.7,.20,5.2,mats.aged);
      // Fachada aberta ao sul (+Z), permitindo acesso por fora e por dentro.
      // Parede de trás com vão real para a janela (sem painel opaco por trás).
      mesh(g,-2.27,1.35,-2.52,1.16,2.6,.19,material);
      mesh(g,1.05,1.35,-2.52,3.6,2.6,.19,material);
      mesh(g,-1.31,.43,-2.52,1.15,.78,.19,material);
      mesh(g,-1.31,2.27,-2.52,1.15,.77,.19,material);
      for(const side of [-1,1]){
        mesh(g,side*2.77,1.18,0,.22,2.35,5.2,material);
        mesh(g,side*2.03,1.28,2.53,1.64,2.5,.19,material);
      }
      mesh(g,0,2.48,2.53,2.58,.20,.24,mats.wood);
      // Portas e janelas móveis em todas as ruínas, preservando a entrada antiga.
      const doorPivot=new THREE.Group();doorPivot.position.set(-1.18,0,2.53);g.add(doorPivot);
      mesh(doorPivot,1.13,1.18,0,2.25,2.27,.12,mats.aged);
      mesh(doorPivot,2.05,1.13,.09,.15,.18,.17,mats.metal);
      const windowPivot=new THREE.Group();windowPivot.position.set(-1.32,1.34,-2.67);g.add(windowPivot);
      mesh(windowPivot,.61,.52,0,1.2,1.05,.12,mats.accent);
      mesh(g,-1.32,1.38,-2.53,1.40,.11,.27,mats.metal);
      mesh(g,-2.06,1.38,-2.53,.11,1.2,.27,mats.metal);
      // Telhado parcial deixa um lado aberto como ruína, sem obstruir a visão interna.
      mesh(g,-1.48,2.65,-1.4,2.75,.21,2.75,mats.roof);
      if(spec.kind==='clinic'){
        mesh(g,0,2.53,-2.65,1.1,.18,.04,mats.accent);
        mesh(g,0,2.53,-2.68,.18,.85,.045,mats.accent);
      }
      const coords=[[-1.58,-1.34],[1.44,-1.27],[0.9,.85]];
      const containers=spec.containers.map((def,i)=>{
        const [x,z]=coords[i];const item=new THREE.Group();item.position.set(x,0,z);g.add(item);
        mesh(item,0,.42,0,.92,.75,.7,i===1?mats.metal:mats.crate);
        const lid=mesh(item,0,.85,0,1.05,.13,.79,mats.accent);
        const props={id:def.id,label:def.label,x:candidate.x+x,z:candidate.z+z,
          opened:false,group:item,lid};return props;
      });
      // Barris, estantes, mesas e caixas visíveis com silhuetas diferentes.
      if(spec.kind==='workshop')mesh(g,.0,.68,-1.5,1.3,.30,.85,mats.metal);
      if(spec.kind==='warehouse')mesh(g,-1.6,.37,.78,.75,.72,.78,mats.crate);
      if(spec.kind==='clinic')mesh(g,-.1,1.05,-2.3,.9,1.25,.33,mats.clinic);
      if(spec.kind==='cabin')mesh(g,1.65,1.3,-2.4,1.2,1.3,.23,mats.wood);
      scene.add(g);
      // Colisão real apenas das paredes: interior e entrada permanecem transitáveis.
      for(const side of [-1,1])for(let z=-2;z<=2;z+=1){
        addCollider({x:candidate.x+side*2.77,z:candidate.z+z,radius:.34});
      }
      for(let x=-2.5;x<=2.5;x+=1){addCollider({x:candidate.x+x,z:candidate.z-2.52,radius:.34});}
      for(const side of [-1,1])addCollider({x:candidate.x+side*2.13,z:candidate.z+2.53,radius:.38});
      sites.push({...candidate,label:spec.label,threat:spec.threat,group:g,containers,doorPivot,windowPivot,doorOpen:false,windowOpen:false,discovered:false,ambushed:false});
    }
    return sites;
  }
  function nearest(position,maxDistance=2.5){
    let found=null,closest=maxDistance;
    for(const site of sites)for(const item of site.containers){
      // Não permitir pegar objetos através das paredes externas da ruína.
      if(Math.abs(position.x-site.x)>2.50||position.z-site.z< -2.27||position.z-site.z>3.15)continue;
      if(item.opened)continue;
      const d=Math.hypot(item.x-position.x,item.z-position.z);
      if(d<closest){closest=d;found={site,container:item,distance:d};}
    }
    return found;
  }
  function nearestFixture(position,range=2.6){
    let best=null,closest=range;
    for(const site of sites){
      const parts=[{kind:'door',x:site.x,z:site.z+2.55},
        {kind:'window',x:site.x-1.32,z:site.z-2.65}];
      for(const part of parts){const distance=Math.hypot(part.x-position.x,part.z-position.z);
        if(distance<closest){closest=distance;best={site,...part};}}
    }
    return best;
  }
  function toggleFixture(position){
    const hit=nearestFixture(position);if(!hit)return null;
    const {site,kind}=hit,key=kind==='door'?'doorOpen':'windowOpen';
    site[key]=!site[key];
    (kind==='door'?site.doorPivot:site.windowPivot).rotation.y=site[key]?-Math.PI*.60:0;
    return {kind,open:site[key],site:site.label};
  }
  // Fachadas reais: visibilidade só passa pela porta aberta ou pelo vão
  // da janela aberta. Colisões permanecem físicas mesmo para a janela aberta.
  function blocksWalls(from,to){
    if(!from||!to)return false;
    const cut=(axis,value,other,min,max)=>{
      const diff=to[axis]-from[axis];if(Math.abs(diff)<.00001)return null;
      const t=(value-from[axis])/diff;
      if(t<=.001||t>=.999)return null;
      const v=from[other]+(to[other]-from[other])*t;
      return v>=min&&v<=max?v:null;
    };
    return sites.some(s=>{
      if(cut('x',s.x-2.77,'z',s.z-2.52,s.z+2.53)!==null||
         cut('x',s.x+2.77,'z',s.z-2.52,s.z+2.53)!==null)return true;
      const rear=cut('z',s.z-2.52,'x',s.x-2.85,s.x+2.85);
      if(rear!==null&&!(s.windowOpen&&Math.abs(rear-(s.x-1.32))<.57))return true;
      const front=cut('z',s.z+2.53,'x',s.x-2.85,s.x+2.85);
      if(front!==null&&!(s.doorOpen&&Math.abs(front-s.x)<1.17))return true;
      return false;
    });
  }
  const blocksDoorAtSight=blocksWalls;
  function blocksDoor(x,z,r=.46){
    return sites.some(s=>!s.doorOpen&&Math.abs(x-s.x)<1.18+r&&Math.abs(z-s.z-2.53)<.11+r);
  }
  function resolveDoor(x,z,r=.46){
    for(const s of sites){if(s.doorOpen||Math.abs(x-s.x)>=1.18+r||Math.abs(z-s.z-2.53)>=.11+r)continue;
      z=s.z+2.53+(z>=s.z+2.53?1:-1)*(.11+r+.01);
    }
    return {x,z};
  }
  function search(position,inventory){
    const target=nearest(position);
    if(!target)return {ok:false,reason:'Sem móveis para vasculhar por perto.'};
    const {site,container}=target;
    const items=lootForContainer(seed,site.id,container.id);
    if(!canTakeLoot(inventory,items))return {ok:false,reason:'Mochila cheia para esses itens. Libere espaço e tente novamente.'};
    if(!takeLoot(inventory,items))return {ok:false,reason:'Não foi possível recolher os suprimentos.'};
    container.opened=true;container.lid.material=mats.searched;container.lid.rotation.x=-.28;
    return {ok:true,siteId:site.id,label:container.label,siteLabel:site.label,items,
      remaining:site.containers.filter(item=>!item.opened).length};
  }
  function update(position,quality='medium'){
    const events=[];
    const visible=quality==='low'?50:quality==='high'?110:78;
    for(const site of sites){
      const d=Math.hypot(site.x-position.x,site.z-position.z);
      site.group.visible=d<visible;
      if(d<15&&!site.discovered){site.discovered=true;events.push({type:'discovered',site});}
      if(d<11&&site.threat>0&&!site.ambushed){site.ambushed=true;events.push({type:'danger',site});}
    }
    return events;
  }
  function objective(position){
    const pending=sites.filter(site=>site.containers.some(c=>!c.opened));
    if(!sites.length)return {ready:false,complete:false};
    if(!pending.length)return {ready:true,complete:true,total:sites.length};
    const target=pending.reduce((best,s)=>
      Math.hypot(s.x-position.x,s.z-position.z)<Math.hypot(best.x-position.x,best.z-position.z)?s:best);
    const dx=target.x-position.x,dz=target.z-position.z;
    const directions=['L','SE','S','SO','O','NO','N','NE'];
    // 0 = Leste. O eixo Z+ aponta para o sul do mundo.
    const direction=directions[(Math.round(Math.atan2(dz,dx)/(Math.PI/4))+8)%8];
    return {complete:false,site:target,meters:Math.round(Math.hypot(dx,dz)),direction,
      opened:sites.reduce((sum,s)=>sum+s.containers.filter(c=>c.opened).length,0),
      total:sites.reduce((sum,s)=>sum+s.containers.length,0)};
  }
  function serialize(){return sites.map(s=>({id:s.id,discovered:s.discovered,ambushed:s.ambushed,
    opened:s.containers.filter(c=>c.opened).map(c=>c.id),doorOpen:s.doorOpen,windowOpen:s.windowOpen}));}
  function restore(data){
    if(!validExplorationSave(data))return false;
    const byId=new Map((data||[]).map(item=>[item.id,item]));
    for(const site of sites){
      const saved=byId.get(site.id);
      site.discovered=!!saved?.discovered;site.ambushed=!!saved?.ambushed;
      site.doorOpen=!!saved?.doorOpen;site.windowOpen=!!saved?.windowOpen;
      site.doorPivot.rotation.y=site.doorOpen?-Math.PI*.60:0;site.windowPivot.rotation.y=site.windowOpen?-Math.PI*.60:0;
      const opened=new Set(saved?.opened||[]);
      for(const container of site.containers){
        container.opened=opened.has(container.id);
        container.lid.material=container.opened?mats.searched:mats.accent;
        container.lid.rotation.x=container.opened?-.28:0;
      }
    }
    return true;
  }
  return {sites,generate,nearest,nearestFixture,toggleFixture,blocksDoor,blocksDoorAtSight,resolveDoor,search,update,objective,serialize,restore};
}
