// Patrulha territorial para goblins/xamãs. Não interfere em chefes e invasores.
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function territoryFor(enemy){
  const p=enemy?.mesh?.position;
  if(!p)return null;
  if(!enemy.territory||!Number.isFinite(enemy.territory.home?.x)){
    const radius=enemy.type==='shaman'?13:enemy.type==='normal'?11:15;
    enemy.territory={home:{x:p.x,z:p.z},radius,state:'patrol',waypoint:null,nextWander:0,until:0,lastKnown:null};
  }
  return enemy.territory;
}
export function updateEnemyTerritory(enemy,{player,now,canSee=()=>true}={}){
  if(!enemy||enemy.raider||enemy.type==='boss'||!player||!Number.isFinite(now))return null;
  const t=territoryFor(enemy),position=enemy.mesh.position;
  if(!t)return null;
  const playerDistance=distance(position,player),homeDistance=distance(t.home,player);
  const visible=playerDistance<=14 && homeDistance<t.radius+8 && canSee(position,player);
  if(visible){t.state='chase';t.lastKnown={x:player.x,z:player.z};t.until=now+3.2;
    return {state:'chase',target:player,speed:1,canAttack:true};}
  if(t.state==='chase'&&now<t.until&&t.lastKnown&&distance(t.home,t.lastKnown)<t.radius+8)
    return {state:'search',target:t.lastKnown,speed:.75,canAttack:false};
  t.state='patrol';
  if(distance(position,t.home)>t.radius+1.5){
    return {state:'return',target:t.home,speed:.86,canAttack:false};
  }
  if(!t.waypoint||distance(position,t.waypoint)<1.25||now>=t.nextWander){
    // Destinos reprodutíveis, contidos na zona própria de cada criatura.
    const id=enemy.mesh.id||1,angle=now*.41+id*1.61803398875;
    const radius=t.radius*(.35+.32*Math.abs(Math.sin(angle*.57)));
    t.waypoint={x:t.home.x+Math.cos(angle)*radius,z:t.home.z+Math.sin(angle)*radius};
    t.nextWander=now+5+(id%4);
  }
  return {state:'patrol',target:t.waypoint,speed:.4,canAttack:false};
}
