// v2.3: perception independent of Three.js. A bounded sound buffer and explicit
// state machine avoid continuous omniscient pursuit and unbounded allocations.
export const ZOMBIE_STATES=Object.freeze({PATROL:'patrol',INVESTIGATE:'investigate',CHASE:'chase',SEARCH:'search'});
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const copy2=p=>({x:p.x,z:p.z});
const distance2=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

export function createZombieSenses({capacity=24,lifetime=3.5}={}){
  let nextId=0;
  const sounds=[];
  function emit(position,radius,now,kind='activity'){
    if(!position||!Number.isFinite(position.x)||!Number.isFinite(position.z)||
       !Number.isFinite(now)||!Number.isFinite(radius)||radius<=0)return null;
    const sound={id:++nextId,x:position.x,z:position.z,radius:clamp(radius,0,60),at:now,kind};
    sounds.push(sound);
    if(sounds.length>capacity)sounds.splice(0,sounds.length-capacity);
    return sound.id;
  }
  function hear(position,now,{blocked=()=>false,afterId=0}={}){
    if(!position||!Number.isFinite(now))return null;
    let best=null,bestScore=-Infinity;
    for(let i=sounds.length-1;i>=0;i--){
      const s=sounds[i],age=now-s.at;
      if(age<0||age>lifetime||s.id<=afterId)continue;
      const distance=distance2(s,position);
      const radius=s.radius*(1-.55*age/lifetime)*(blocked(position,s)?0.48:1);
      if(distance>radius)continue;
      const score=(radius-distance)/Math.max(1,radius)+s.id*.000001;
      if(score>bestScore){bestScore=score;best=s;}
    }
    return best;
  }
  function prune(now){while(sounds.length&&now-sounds[0].at>lifetime)sounds.shift();}
  return {emit,hear,prune,clear(){sounds.length=0;},get count(){return sounds.length;}};
}

export function alertZombie(enemy,position,now){
  if(!enemy?.isZombie||enemy.raider||!position)return;
  const a=enemy.awareness||(enemy.awareness={});
  a.state=ZOMBIE_STATES.CHASE;
  a.lastKnown=copy2(position);
  a.until=now+6.5;
}

// Called once per active zombie per frame. Has no line-of-sight, physics or
// animation side effects; returns the only target the AI may navigate toward.
export function updateZombieAwareness(enemy,{player,now,night=false,sneaking=false,sprinting=false,
  sounds=null,canSee=()=>true,dt=0}={}){
  const mesh=enemy.mesh,position=mesh.position;
  const a=enemy.awareness||(enemy.awareness={state:ZOMBIE_STATES.PATROL,
    home:copy2(position),lastKnown:null,until:0,waypoint:null,nextWander:0,heardId:0});
  if(!a.home)a.home=copy2(position);
  if(!Number.isFinite(a.heardId))a.heardId=0;
  const playerDist=distance2(position,player);
  const watchRadius=(night?9.5:14)*(sneaking?.48:sprinting?1.24:1);
  const wasChasing=a.state===ZOMBIE_STATES.CHASE;
  const dx=player.x-position.x,dz=player.z-position.z;
  const dot=playerDist>.0001?(Math.sin(mesh.rotation?.y||0)*dx+Math.cos(mesh.rotation?.y||0)*dz)/playerDist:1;
  const inField=playerDist<=3.3||wasChasing||dot>-.15;
  const visible=playerDist<watchRadius && inField && canSee(position,player);
  if(visible){
    a.state=ZOMBIE_STATES.CHASE;
    a.lastKnown=copy2(player);a.until=now+5.2;
    return {state:a.state,target:player,speed:1,playerVisible:true,canAttack:true};
  }
  const heard=sounds?.hear(position,now,{afterId:a.heardId,
    blocked:(from,to)=>!canSee(from,to)})||null;
  if(heard){
    a.heardId=heard.id;
    if(a.state!==ZOMBIE_STATES.CHASE || now>a.until){
      a.state=ZOMBIE_STATES.INVESTIGATE;
      a.lastKnown=copy2(heard);a.until=now+4.5;
    } else {
      // A loud event updates the last known location, but cannot grant vision.
      a.lastKnown=copy2(heard);a.until=Math.max(a.until,now+3.2);
    }
  }
  if(a.state===ZOMBIE_STATES.CHASE){
    if(now<=a.until)return {state:a.state,target:a.lastKnown,speed:.9,playerVisible:false,canAttack:false};
    a.state=ZOMBIE_STATES.SEARCH;a.until=now+3.5;
  }
  if(a.state===ZOMBIE_STATES.INVESTIGATE){
    if(now<=a.until && a.lastKnown && distance2(position,a.lastKnown)>1.2)
      return {state:a.state,target:a.lastKnown,speed:.77,playerVisible:false,canAttack:false};
    a.state=ZOMBIE_STATES.SEARCH;a.until=now+3.3;
  }
  if(a.state===ZOMBIE_STATES.SEARCH){
    if(now<a.until)return {state:a.state,target:a.lastKnown,speed:.35,playerVisible:false,canAttack:false};
    a.state=ZOMBIE_STATES.PATROL;a.waypoint=null;
    a.nextWander=now+2;
  }
  // Restrict idle movement to the spawn area, preserving environmental threats.
  if(!a.waypoint || distance2(position,a.waypoint)<1.4 || now>=a.nextWander){
    if(now>=a.nextWander){
      const id=mesh.id||1,angle=now*.55+id*2.399963;
      a.waypoint={x:a.home.x+Math.sin(angle)*5.5,z:a.home.z+Math.cos(angle)*5.5};
      a.nextWander=now+5.5+(id%4);
    }
  }
  return {state:ZOMBIE_STATES.PATROL,target:a.waypoint,
    speed:.36,playerVisible:false,canAttack:false};
}

export function ambientSpawnPlan({night=false,wave=1,random=0.5}={}){
  const w=clamp(Number(wave)||1,1,6),r=clamp(Number(random)||0,0,1);
  return {delay:night?Math.max(8,15-w)+r*6:Math.max(17,29-w*1.5)+r*7,
    cap:night?Math.min(10,5+w):Math.min(6,3+Math.ceil(w/2))};
}
