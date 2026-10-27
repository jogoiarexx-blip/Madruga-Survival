// Posição de tiro acessível: só reposiciona o aliado se existir uma linha de
// visão realmente livre. A navegação decide se é possível chegar ao ponto.
export function findGuardFiringPosition(origin,enemy,{isFree=()=>true,canSee=()=>true,
  withinTerritory=()=>true,radius=.42,maxTravel=12,shotRange=11}={}){
  if(!origin||!enemy||![origin.x,origin.z,enemy.x,enemy.z].every(Number.isFinite))return null;
  const d=Math.hypot(enemy.x-origin.x,enemy.z-origin.z);
  if(d<.01)return null;
  const toward=Math.atan2(origin.z-enemy.z,origin.x-enemy.x);
  let best=null,score=Infinity;
  // 3 anéis e 12 direções = até 36 avaliações; não executado todo frame.
  for(const range of [5.5,7.5,9.5])for(let k=0;k<12;k++){
    const angle=toward+(k<=6?k:-1*(k-6))*Math.PI/6;
    const spot={x:enemy.x+Math.cos(angle)*range,z:enemy.z+Math.sin(angle)*range};
    const travel=Math.hypot(spot.x-origin.x,spot.z-origin.z);
    if(travel>maxTravel||travel<.65||range>shotRange||!withinTerritory(spot)||
       !isFree(spot.x,spot.z,radius)||!canSee(spot,enemy))continue;
    const value=travel+Math.abs(range-7.5)*.17;
    if(value<score){score=value;best=spot;}
  }
  return best;
}
