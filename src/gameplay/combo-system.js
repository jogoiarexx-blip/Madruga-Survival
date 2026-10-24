// Three-hit combos use one collision test per input. Pure data: safe to unit-test
// independently from Three.js, rig animation, UI and inventory.
export const COMBO_WINDOW = .92;
export const ATTACK_BUFFER_WINDOW = .16;
export const MAX_COMBO_STEPS = 3;
const STEPS = Object.freeze([
  Object.freeze({duration:1,damageBonus:0,knockback:1,reach:1,arc:1,hitPhase:.55}),
  Object.freeze({duration:.94,damageBonus:0,knockback:1.12,reach:1,arc:1.08,hitPhase:.51}),
  Object.freeze({duration:1.12,damageBonus:1,knockback:1.65,reach:1.15,arc:1.16,hitPhase:.60})
]);
const WEAPON_TIMING = Object.freeze([.55,.57,.48]);
export function nextComboStep({lastWeapon=-1,weapon=0,lastStep=0,elapsed=Infinity}={}){
  if(!Number.isInteger(weapon)||weapon<0||weapon>2)return 0;
  if(lastWeapon!==weapon || !Number.isFinite(elapsed) || elapsed<0 || elapsed>COMBO_WINDOW)return 0;
  return (Math.max(0,Math.trunc(lastStep)) + 1) % MAX_COMBO_STEPS;
}
export function comboProfile(weapon=0,step=0){
  const index=Number.isInteger(weapon)&&weapon>=0&&weapon<3?weapon:0;
  const stage=Number.isInteger(step)&&step>=0&&step<3?step:0;
  const data=STEPS[stage];
  return {...data,hitPhase:stage===0?WEAPON_TIMING[index]:Math.max(.2,Math.min(.8,data.hitPhase+(index===2?-.045:index===1?.025:0))),step:stage};
}
