// Movimentos determinísticos da pescaria. Sem alocações ou efeitos colaterais por frame.
export const CAST_DURATION=.8;
export const CATCH_DURATION=1.55;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:0));
const smooth=v=>{const t=clamp(v);return t*t*(3-2*t);};
export function fishingMotion({phase='idle',age=0,elapsed=0,progress=0,tugs=3}={}){
 const cast=smooth(age/CAST_DURATION);
 const t=Number.isFinite(elapsed)?elapsed:0;
 const reels=clamp(progress/Math.max(1,tugs));
 const pull=phase==='reeling'?.17*Math.sin(t*11)+.11*reels:phase==='bite'?.23*Math.sin(t*13):0;
 return {
  cast:phase==='waiting'?cast:1,
  pitch:phase==='waiting'?-.85*(1-cast)+.12*Math.sin(Math.PI*cast):phase==='reeling'?.13+pull:phase==='bite'?.14+pull:0,
  armRaise:phase==='waiting'?.42*(1-cast):phase==='bite'?.18:phase==='reeling'?.12+reels*.14:0,
  lineReach:phase==='waiting'?.45+2.55*cast:phase==='reeling'?3-.75*reels:3,
  castArc:phase==='waiting'?1.0*Math.sin(Math.PI*cast):0,
  reel:reels
 };
}
export function catchDisplay({age=0,id='tilapia'}={}){
 const u=clamp(age/CATCH_DURATION);
 const species={tilapia:{length:.58,color:0x809e87},traira:{length:.8,color:0x596c52},carpa:{length:1.04,color:0x9d8a60}};
 const fish=species[id]||species.tilapia;
 return {visible:u<1,x:.12*Math.sin(u*13),y:.35+1.05*Math.sin(Math.PI*u*.86),z:2.35-1.7*smooth(u),rotation:.12*Math.sin(u*25)*(1-u),...fish};
}
