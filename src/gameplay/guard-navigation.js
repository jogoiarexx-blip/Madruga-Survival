// Navegação local do Chaves: procura rotas caminháveis ao redor de construções,
// sem teleportar nem modificar a malha de colisões do jogador.
export const GUARD_RADIUS=.42;
const hypot=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function segmentIsWalkable(a,b,{isFree,getGroundHeight=()=>0,radius=GUARD_RADIUS,maxRise=.75}={}){
  if(!a||!b||typeof isFree!=='function')return false;
  const d=hypot(a,b),count=Math.max(1,Math.ceil(d/.055));
  let prevY=getGroundHeight(a.x,a.z);
  for(let i=1;i<=count;i++){
    const t=i/count,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
    if(!isFree(x,z,radius))return false;
    const y=getGroundHeight(x,z);
    if(!Number.isFinite(y)||!Number.isFinite(prevY)||Math.abs(y-prevY)>maxRise*(d/count)/1.25)return false;
    prevY=y;
  }
  return true;
}
// Retorna alguns pontos de rota ou [] se não houver progresso seguro.
// O limite de 380 expansões impede picos de CPU em mundos congestionados.
export function findGuardPath(start,destination,{isFree,getGroundHeight=()=>0,
  radius=GUARD_RADIUS,step=1.3,maxRange=13,maxExpanded=380}={}){
  if(!start||!destination||typeof isFree!=='function')return [];
  const d=hypot(start,destination);
  if(d<.35)return [];
  const goal=d>maxRange?{x:start.x+(destination.x-start.x)*maxRange/d,
    z:start.z+(destination.z-start.z)*maxRange/d}:destination;
  const options={isFree,getGroundHeight,radius};
  if(segmentIsWalkable(start,goal,options))return [{x:goal.x,z:goal.z}];
  const half=Math.ceil(maxRange/step)+3,size=2*half+1;
  const cellPos=(ix,iz)=>({x:start.x+ix*step,z:start.z+iz*step});
  const id=(ix,iz)=>(iz+half)*size+ix+half;
  const startId=id(0,0),cost=new Map([[startId,0]]),previous=new Map(),closed=new Set();
  const queue=[{ix:0,iz:0,id:startId,g:0,f:hypot(start,goal)}];
  const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  let winner=null,nearest=Infinity,expanded=0;
  while(queue.length && expanded<maxExpanded){
    let bestIndex=0;
    for(let i=1;i<queue.length;i++)if(queue[i].f<queue[bestIndex].f)bestIndex=i;
    const node=queue.splice(bestIndex,1)[0];
    if(closed.has(node.id))continue;
    closed.add(node.id);expanded++;
    const from=cellPos(node.ix,node.iz),remain=hypot(from,goal);
    if(remain<nearest){nearest=remain;winner=node;}
    if(remain<=step*.75)break;
    for(const [dx,dz] of dirs){
      const ix=node.ix+dx,iz=node.iz+dz;
      if(Math.abs(ix)>half||Math.abs(iz)>half)continue;
      const nextId=id(ix,iz);if(closed.has(nextId))continue;
      const to=cellPos(ix,iz);
      if(!segmentIsWalkable(from,to,options))continue;
      const g=node.g+Math.hypot(dx,dz)*step;
      if(g>= (cost.get(nextId)??Infinity))continue;
      cost.set(nextId,g);previous.set(nextId,node.id);
      queue.push({ix,iz,id:nextId,g,f:g+hypot(to,goal)});
    }
  }
  if(!winner || winner.id===startId)return [];
  const points=[],positions=new Map([[startId,{x:start.x,z:start.z}]]);
  // Recupera índices sem depender de um grafo mutável do mundo.
  let current=winner.id;
  while(current!==startId && points.length<maxExpanded){
    const ix=current%size-half,iz=Math.floor(current/size)-half;
    const p=cellPos(ix,iz);points.push(p);
    current=previous.get(current);
    if(current===undefined)return [];
  }
  points.reverse();
  // Simplifica o caminho apenas quando o segmento inteiro é caminhável.
  const route=[];let anchor=start;
  for(let i=0;i<points.length;){
    let far=i;
    for(let j=i+1;j<points.length;j++)if(segmentIsWalkable(anchor,points[j],options))far=j;
    route.push(points[far]);anchor=points[far];i=far+1;
  }
  if(nearest<=step*.75 && segmentIsWalkable(anchor,goal,options))route.push(goal);
  return route;
}
export function createGuardNavigator({isFree,resolveCollision,getGroundHeight=()=>0,
  radius=GUARD_RADIUS}={}){
  if(typeof isFree!=='function'||typeof resolveCollision!=='function')throw Error('Navegação precisa de colisão e teste de espaço livre');
  let route=[],destination=null,elapsed=0,blocked=0,lastPosition=null,plans=0;
  const geometry={isFree,getGroundHeight,radius};
  function reset(){route=[];destination=null;elapsed=0;blocked=0;lastPosition=null;}
  function navigate(from,to,dt,speed=3.3,{stopAt=1.5}={}){
    if(!to||!from||!Number.isFinite(to.x)||!Number.isFinite(to.z))return {x:from.x,z:from.z,moved:false};
    const distance=hypot(from,to);
    const interval=clamp(Number(dt)||0,0,.05);
    if(distance<=stopAt||interval===0){reset();return {x:from.x,z:from.z,moved:false};}
    elapsed+=interval;
    const movedEarlier=lastPosition?hypot(from,lastPosition):Infinity;
    if(lastPosition && movedEarlier<.006)blocked+=interval;
    else blocked=Math.max(0,blocked-interval*.8);
    const changed=!destination||hypot(destination,to)>1.8;
    const needPlan=changed||(elapsed>.28 && (!route.length||blocked>.23))||elapsed>.8;
    if(needPlan){
      route=findGuardPath(from,to,geometry);destination={x:to.x,z:to.z};
      elapsed=0;plans++;
    }
    while(route.length&&hypot(from,route[0])<.48)route.shift();
    const aim=route[0];
    if(!aim){lastPosition={x:from.x,z:from.z};return {x:from.x,z:from.z,moved:false,blocked:true};}
    const dir=hypot(from,aim);
    const length=Math.min(Math.max(0,distance-stopAt),Math.max(0,speed)*interval,dir);
    if(length<=0)return {x:from.x,z:from.z,moved:false};
    const proposed={x:from.x+(aim.x-from.x)*length/dir,z:from.z+(aim.z-from.z)*length/dir};
    let safe=segmentIsWalkable(from,proposed,geometry);
    let next=safe?resolveCollision(proposed.x,proposed.z,radius):from;
    // Projeção após colisão pode empurrar para dentro de outro objeto: validar.
    if(!safe||!isFree(next.x,next.z,radius)||hypot(next,proposed)>.27){
      route=[];blocked=.24;next=from;
    }
    const delta=hypot(from,next);
    lastPosition={x:from.x,z:from.z};
    return {x:next.x,z:next.z,moved:delta>.002,blocked:delta<=.002,
      direction:delta>.002?{x:next.x-from.x,z:next.z-from.z}:null};
  }
  return {navigate,reset,get plannedRoutes(){return plans},get pendingPoints(){return route.length}};
}
