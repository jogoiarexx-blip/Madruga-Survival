import {IDLE_GRIP_POSES} from './player-weapons.js';
export const PLAYER_HIT_PHASES=Object.freeze([.55,.57,.48]);
export const PLAYER_ATTACK_DURATIONS=Object.freeze([.36,.53,.40]);
const BASE={armX:-.20,armY:0,armZ:-.08,gripX:.24,gripZ:-.56,torsoY:0,leftArmX:-.05};
const CLIPS=[
 [[0,{...BASE}],[.22,{armX:-2.15,armY:-.24,armZ:-.42,gripX:.22,gripZ:-.30,torsoY:.34,leftArmX:-.45}],
  [.55,{armX:-1.16,armY:.15,armZ:.18,gripX:.64,gripZ:-.55,torsoY:-.30,leftArmX:-.25}],
  [.78,{armX:-.54,armY:.06,armZ:.26,gripX:.37,gripZ:-.70,torsoY:-.08,leftArmX:-.11}],[1,{...BASE}]],
 [[0,{...BASE,gripX:.21,gripZ:-.48}],[.27,{armX:-2.52,armY:-.25,armZ:-.36,gripX:.08,gripZ:-.32,torsoY:.26,leftArmX:-.50}],
  [.57,{armX:-1.02,armY:.08,armZ:.24,gripX:.72,gripZ:-.56,torsoY:-.26,leftArmX:-.25}],
  [.79,{armX:-.38,armY:0,armZ:.13,gripX:.31,gripZ:-.50,torsoY:-.06,leftArmX:-.10}],
  [1,{...BASE,gripX:.21,gripZ:-.48}]],
 [[0,{...BASE,gripX:.29,gripZ:-.71}],[.25,{armX:-1.65,armY:-.18,armZ:-.25,gripX:.68,gripZ:-.57,torsoY:.16,leftArmX:-.40}],
  [.48,{armX:-1.75,armY:.06,armZ:.06,gripX:1.18,gripZ:-.42,torsoY:-.16,leftArmX:-.38}],
  [.72,{armX:-1.26,armY:-.06,armZ:-.12,gripX:.73,gripZ:-.62,torsoY:0,leftArmX:-.19}],
  [1,{...BASE,gripX:.29,gripZ:-.71}]]
];
const smooth=t=>{const n=Math.max(0,Math.min(1,t));return n*n*(3-2*n);};
export function samplePlayerAttackPose(index,progress){
 const clip=CLIPS[index]??CLIPS[0],t=Math.max(0,Math.min(1,Number.isFinite(progress)?progress:0));
 let a=clip[0],b=clip[clip.length-1];
 for(let i=1;i<clip.length;i++)if(t<=clip[i][0]){a=clip[i-1];b=clip[i];break;}
 const blend=smooth((t-a[0])/Math.max(1e-5,b[0]-a[0])),out={};
 for(const key of Object.keys(a[1]))out[key]=a[1][key]+(b[1][key]-a[1][key])*blend;
 return out;
}
export function idleGripPose(index){return IDLE_GRIP_POSES[index]??IDLE_GRIP_POSES[0];}
