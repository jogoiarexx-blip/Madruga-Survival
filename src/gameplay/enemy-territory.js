// Patrulha territorial de goblins e xamãs com rota determinística,
// investigação de ruídos, perseguição limitada e retorno à origem.
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const point=(p)=>({x:p.x,z:p.z});
export const TERRITORY_STATES=Object.freeze({PATROL:'patrol',CHASE:'chase',SEARCH:'search',INVESTIGATE:'investigate',RETURN:'return'});

export function patrolRoute(home,radius,id=1,steps=5){
  const direction=(id%2===0?1:-1);
  const phase=(id%17)*0.37;
  return Array.from({length:steps},(_,i)=>{
    const a=phase+direction*2*Math.PI*i/steps;
    const r=radius*(.48+.13*(1+Math.sin(i*2.4+id))*.5);
    return {x:home.x+Math.sin(a)*r,z:home.z+Math.cos(a)*r};
  });
}
export function territoryFor(enemy){
  const p=enemy?.mesh?.position;
  if(!p)return null;
  if(!enemy.territory||!Number.isFinite(enemy.territory.home?.x)){
    const radius=enemy.type==='shaman'?13:enemy.type==='normal'?11:15;
    const home=point(p);
    enemy.territory={home,radius,state:TERRITORY_STATES.PATROL,
      route:patrolRoute(home,radius,enemy.mesh.id||1),routeIndex:0,
      pauseUntil:0,until:0,lastKnown:null,heardId:0};
  }
  return enemy.territory;
}
export function updateEnemyTerritory(enemy,{player,now,sounds=null,canSee=()=>true}={}){
  if(!enemy||enemy.raider||enemy.type==='boss'||!player||!Number.isFinite(now))return null;
  const t=territoryFor(enemy),position=enemy.mesh.position;
  if(!t)return null;
  const dPlayer=distance(position,player), dPlayerHome=distance(t.home,player);
  const dHome=distance(position,t.home);
  // A zona é um limite real de perseguição: inimigos não cruzam o mapa inteiro.
  if(dHome>t.radius+10){
    t.state=TERRITORY_STATES.RETURN;t.lastKnown=null;
    return {state:t.state,target:t.home,speed:.88,canAttack:false};
  }
  const visible=dPlayer<14 && dPlayerHome<t.radius+8 && canSee(position,player);
  if(visible){
    t.state=TERRITORY_STATES.CHASE;t.lastKnown=point(player);t.until=now+4;
    return {state:t.state,target:player,speed:1,canAttack:true};
  }
  // O barulho não concede visão nem permissão de atacar.
  const heard=sounds?.hear?.(position,now,{afterId:t.heardId,
    blocked:(from,to)=>!canSee(from,to)})||null;
  if(heard){
    t.heardId=heard.id;
    if(t.state!==TERRITORY_STATES.CHASE&&t.state!==TERRITORY_STATES.SEARCH){
      t.state=TERRITORY_STATES.INVESTIGATE;t.lastKnown=point(heard);t.until=now+4;
    }
  }
  if(t.state===TERRITORY_STATES.CHASE){
    // Se o relógio já saltou muito à frente, não criar uma busca nova.
    if(now>t.until){t.state=TERRITORY_STATES.RETURN;t.lastKnown=null;}
    else t.state=TERRITORY_STATES.SEARCH;
  }
  if(t.state===TERRITORY_STATES.SEARCH||t.state===TERRITORY_STATES.INVESTIGATE){
    if(now<t.until && t.lastKnown && distance(position,t.lastKnown)>1.35){
      return {state:t.state,target:t.lastKnown,speed:t.state===TERRITORY_STATES.SEARCH?.67:.58,canAttack:false};
    }
    t.state=TERRITORY_STATES.RETURN;t.lastKnown=null;
  }
  if(dHome>t.radius+1.0||t.state===TERRITORY_STATES.RETURN){
    if(dHome>1.6){t.state=TERRITORY_STATES.RETURN;
      return {state:t.state,target:t.home,speed:.8,canAttack:false};}
    t.state=TERRITORY_STATES.PATROL;t.pauseUntil=now+.6;
  }
  // Percurso fixo por ciclo. Paradas curtas dão a sensação de ronda.
  t.state=TERRITORY_STATES.PATROL;
  const waypoint=t.route[t.routeIndex%t.route.length];
  if(distance(position,waypoint)<1.3){
    if(!t.pauseUntil)t.pauseUntil=now+.75;
    if(now<t.pauseUntil)return {state:t.state,target:null,speed:0,canAttack:false};
    t.routeIndex=(t.routeIndex+1)%t.route.length;t.pauseUntil=0;
  }
  return {state:t.state,target:t.route[t.routeIndex],speed:.40,canAttack:false};
}
