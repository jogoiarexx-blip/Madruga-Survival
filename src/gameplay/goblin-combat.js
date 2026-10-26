// Impactos sincronizados aos clipes reais do goblin. A hitbox não é aplicada
// quando o ataque começa: o alvo ainda pode recuar, esquivar-se ou bloquear
// a linha de visão antes do fotograma de impacto.
export const GOBLIN_MOVES=Object.freeze({
  quick:Object.freeze({clip:'Attack_Quick',duration:.91,impacts:[{at:.43,damage:.92}],cooldown:1.13}),
  heavy:Object.freeze({clip:'Attack_Heavy',duration:1.22,impacts:[{at:.73,damage:1.3}],cooldown:1.48}),
  combo:Object.freeze({clip:'Attack_Combo',duration:2.45,impacts:[{at:.68,damage:.8},{at:1.72,damage:1.05}],cooldown:2.73})
});
export function chooseGoblinMove(enemy){
  const next=(enemy.goblinComboCount||0)+1;
  return next%6===0?'combo':next%3===0?'heavy':'quick';
}
export function startGoblinAttack(enemy,kind='player',target=null){
  if(!enemy||enemy.type!=='normal'||enemy.hp<=0||enemy.goblinAttack)return false;
  const moveName=chooseGoblinMove(enemy),move=GOBLIN_MOVES[moveName];
  enemy.goblinComboCount=(enemy.goblinComboCount||0)+1;
  enemy.goblinAttack={move:moveName,elapsed:0,nextImpact:0,kind,target,
    facingYaw:Number.isFinite(enemy.mesh?.rotation?.y)?enemy.mesh.rotation.y:0};
  enemy.attackTimer=move.cooldown;
  enemy.attackFacingYaw=enemy.goblinAttack.facingYaw;
  enemy.goblinVisual?.attack(moveName);
  return true;
}
export function advanceGoblinAttack(enemy,dt,onImpact){
  const state=enemy?.goblinAttack;
  if(!state)return 0;
  const move=GOBLIN_MOVES[state.move];
  if(!move){enemy.goblinAttack=null;return 0;}
  state.elapsed+=Math.max(0,Math.min(.12,dt));
  let impacts=0;
  while(state.nextImpact<move.impacts.length&&state.elapsed>=move.impacts[state.nextImpact].at){
    const impact=move.impacts[state.nextImpact++];
    onImpact?.({kind:state.kind,target:state.target,facingYaw:state.facingYaw,
      move:state.move,damageMultiplier:impact.damage});
    impacts++;
  }
  if(state.elapsed>=move.duration+.04)enemy.goblinAttack=null;
  return impacts;
}
export function goblinHitTest(enemy,position,{hasLineOfSight=()=>true,radius=1.95}={}){
  if(!enemy||!position)return false;
  const dx=position.x-enemy.mesh.position.x,dz=position.z-enemy.mesh.position.z;
  const dist=Math.hypot(dx,dz);
  if(dist>radius)return false;
  const facing=enemy.attackFacingYaw;
  if(Number.isFinite(facing)&&dist>.001){
    const dot=(Math.sin(facing)*dx+Math.cos(facing)*dz)/dist;
    if(dot<.25)return false;
  }
  return hasLineOfSight(enemy.mesh.position,position);
}
