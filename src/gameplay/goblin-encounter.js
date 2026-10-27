// Encontro do goblin REV2: procurar lugar livre e à frente da câmera
// (o rig em terceira pessoa olha do lado +Z para a origem quando yaw=0).
// Não atravessar limites do mapa, árvores, construções ou a entrada da caverna.
export function findGoblinEncounterSpot({player,yaw=0,isFree,hasClearPath=()=>true}){
  if(!player||!Number.isFinite(player.x)||!Number.isFinite(player.z)||!Number.isFinite(yaw))return null;
  for(const distance of [17,20,14,23]){
    for(const offset of [0,0.28,-0.28,0.54,-0.54,0.82,-0.82]){
      const angle=yaw+Math.PI+offset;
      const x=player.x+Math.sin(angle)*distance;
      const z=player.z+Math.cos(angle)*distance;
      if(Math.abs(x)>102||Math.abs(z)>102)continue;
      const spot={x,z};
      if(isFree(x,z,0.9)&&hasClearPath(player,spot))return spot;
    }
  }
  return null;
}
export function nearestGoblinEncounter(enemies,player){
  if(!player||!Array.isArray(enemies))return null;
  let best=null;
  for(const enemy of enemies){
    if(enemy.type!=='normal'||enemy.hp<=0||!enemy.mesh?.position)continue;
    const position=enemy.mesh.position;
    const distance=Math.hypot(position.x-player.x,position.z-player.z);
    if(!best||distance<best.distance)best={enemy,distance};
  }
  return best;
}
