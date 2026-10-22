// Momentos de impacto documentados junto às 8 animações do GLB REV2.
// O movimento é iniciado antes do dano; o alvo pode esquivar até o quadro de impacto.
export const ZOMBIE_IMPACT_SECONDS=Object.freeze({
  zombie:.56, zombie_runner:.44, zombie_toxic:.85, zombie_brute:.44
});
export function queueZombieImpact(enemy,kind,target=null){
  if(!enemy||enemy.pendingImpact || !(enemy.type in ZOMBIE_IMPACT_SECONDS))return false;
  enemy.pendingImpact={kind,target,remaining:ZOMBIE_IMPACT_SECONDS[enemy.type]};
  return true;
}
export function advanceZombieImpact(enemy,dt){
  if(!enemy?.pendingImpact)return null;
  if(enemy.hp<=0){enemy.pendingImpact=null;return null;}
  enemy.pendingImpact.remaining-=Math.max(0,Math.min(.1,Number.isFinite(dt)?dt:0));
  if(enemy.pendingImpact.remaining>0.000001)return null;
  const impact=enemy.pendingImpact;
  enemy.pendingImpact=null;
  return impact;
}
