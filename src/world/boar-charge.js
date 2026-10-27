// A investida é anunciada antes do dano, que só acontece em alcance/cone real.
// Estado pequeno, separado do visual para testes e saves retrocompatíveis.
export const BOAR_WINDUP=0.72;
export const BOAR_CHARGE_DURATION=0.72;
export const BOAR_REST=1.65;
const facing=(heading,dx,dz)=>{
  const distance=Math.hypot(dx,dz)||1;
  return (Math.sin(heading)*dx+Math.cos(heading)*dz)/distance;
};
export function advanceBoarCharge(a,{dt,distance,playerDx,playerDz,canSee=true}={}){
  const frame=Math.max(0,Math.min(.1,Number(dt)||0));
  a.chargePhase ||= 'idle'; a.chargeLeft=Math.max(0,(a.chargeLeft||0)-frame);
  a.staggerLeft=Math.max(0,(a.staggerLeft||0)-frame);
  a.attackDelay=Math.max(0,(a.attackDelay||0)-frame);
  if(a.chargePhase==='idle' && a.attackDelay<=0 && canSee && distance>=2.15 && distance<=7.2){
    a.chargePhase='windup';a.chargeLeft=BOAR_WINDUP;
    a.chargeHeading=Math.atan2(playerDx,playerDz);a.chargeHit=false;
  }else if(a.chargePhase==='windup' && a.chargeLeft===0){
    a.chargePhase='charge';a.chargeLeft=BOAR_CHARGE_DURATION;
  }else if(a.chargePhase==='charge' && a.chargeLeft===0){
    a.chargePhase='rest';a.chargeLeft=BOAR_REST;a.attackDelay=BOAR_REST;
  }else if(a.chargePhase==='rest' && a.chargeLeft===0){a.chargePhase='idle';}
  const inCone=facing(a.chargeHeading??a.heading,playerDx,playerDz)>.63;
  const hit=a.chargePhase==='charge'&&!a.chargeHit&&distance<1.75&&inCone&&canSee;
  if(hit){a.chargeHit=true;a.attackDelay=BOAR_REST;}
  return {phase:a.chargePhase,heading:a.chargeHeading??a.heading,hit,speed:a.chargePhase==='charge'?8.0:0};
}

// Reação recebendo golpe: interrompe a investida, sem mudar a física do collider.
export const BOAR_HIT_DURATION=.36;
export function startBoarHitReaction(animal){
 if(!animal||animal.hp<=0)return false;
 animal.staggerLeft=BOAR_HIT_DURATION;
 animal.chargePhase='rest';animal.chargeLeft=Math.max(animal.chargeLeft||0,.60);
 animal.attackDelay=Math.max(animal.attackDelay||0,.70);
 animal.chargeHit=false;
 return true;
}
export function boarHitPose(remaining=0){
 const t=Math.max(0,Math.min(1,(Number(remaining)||0)/BOAR_HIT_DURATION));
 const impact=Math.sin(Math.PI*t);
 return {active:t>0,pitch:impact?-.22*impact:0,headDip:.30*impact,
   squash:.075*impact,swell:.045*impact,lift:.035*impact};
}
