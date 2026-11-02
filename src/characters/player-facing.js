// Direção visual do Seu Madruga, separada da orientação usada pelo WASD.
// O movimento continua relativo à câmera, sem recalcular o vetor usando
// o ângulo do corpo (isso produziria movimentos circulares involuntários).
export const PLAYER_TURN_MIN_SPEED=.65;
export const PLAYER_TURN_RATE=11;
export function shortestTurn(from,to){
  if(!Number.isFinite(from)||!Number.isFinite(to))return 0;
  return Math.atan2(Math.sin(to-from),Math.cos(to-from));
}
export function movementFacingYaw(dx,dz,dt){
  if(![dx,dz,dt].every(Number.isFinite)||dt<=0)return null;
  if(Math.hypot(dx,dz)<PLAYER_TURN_MIN_SPEED*dt)return null;
  return Math.atan2(-dx,-dz);
}
export function nextPlayerFacing(currentYaw,lookYaw,dt,{
  dx=0,dz=0,moving=false,manualLook=false,attacking=false,dashing=false
}={}){
  if(!Number.isFinite(currentYaw)||!Number.isFinite(lookYaw))return 0;
  const elapsed=Number.isFinite(dt)?Math.max(0,Math.min(.10,dt)):0;
  if(elapsed<=0)return currentYaw;
  const actualHeading=moving||dashing?movementFacingYaw(dx,dz,elapsed):null;
  // Em luta ou ao mover o mouse, olhar é prioridade para a arma ficar no
  // mesmo eixo do ataque. Andando, o corpo aponta ao destino real (inclusive
  // esquerda, direita e ré). Sem movimento, mantém a última direção.
  const desired=attacking||manualLook?lookYaw:actualHeading??currentYaw;
  const delta=shortestTurn(currentYaw,desired);
  const rate=attacking?19:manualLook?15:PLAYER_TURN_RATE;
  const smooth=1-Math.exp(-rate*elapsed);
  return currentYaw+delta*smooth;
}
