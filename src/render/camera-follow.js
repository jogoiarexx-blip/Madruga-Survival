// Acompanhamento orbital da câmera: gira suavemente para a direção real
// do deslocamento, mas nunca altera a orientação usada pelo movimento/combat.
// Dessa forma segurar W/D não causa uma curva em espiral involuntária.
export const CAMERA_FOLLOW_MAX_OFFSET=.78;
export const CAMERA_FOLLOW_MANUAL_GRACE=.9;
const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
export function movementCameraOffset(baseYaw,dx,dz,dt){
  if(![baseYaw,dx,dz,dt].every(Number.isFinite)||dt<=0)return 0;
  const distance=Math.hypot(dx,dz);
  if(distance/Math.max(dt,.001)<.65)return 0;
  const travelYaw=Math.atan2(-dx,-dz);
  const delta=Math.atan2(Math.sin(travelYaw-baseYaw),Math.cos(travelYaw-baseYaw));
  // Recuar não deve virar a câmera para a frente do rosto do personagem.
  if(Math.abs(delta)>2.35)return 0;
  if(Math.abs(delta)<.09)return 0;
  return clamp(delta*.52,-CAMERA_FOLLOW_MAX_OFFSET,CAMERA_FOLLOW_MAX_OFFSET);
}
export function createMovementCameraFollow(){
  let offset=0,manualGrace=0;
  function update(dt,yaw,{dx=0,dz=0,enabled=true}={}){
    const elapsed=Number.isFinite(dt)?clamp(dt,0,.10):0;
    manualGrace=Math.max(0,manualGrace-elapsed);
    const target=enabled&&manualGrace===0?
      movementCameraOffset(yaw,dx,dz,elapsed):0;
    // Mantém o movimento lento, mas retorna mais depressa ao eixo neutro
    // quando solta as teclas ou vira o mouse.
    const rate=Math.abs(target)>Math.abs(offset)?4.1:5.0;
    offset+=(target-offset)*(1-Math.exp(-rate*elapsed));
    if(Math.abs(offset)<.0001)offset=0;
    return Number.isFinite(yaw)?yaw+offset:offset;
  }
  return {
    update,
    noteManualLook(){manualGrace=CAMERA_FOLLOW_MANUAL_GRACE;offset=0;},
    reset(){offset=0;manualGrace=0;},
    get offset(){return offset;},
    get manualGrace(){return manualGrace;}
  };
}
