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
