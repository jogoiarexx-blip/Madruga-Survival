// Cardumes determinísticos da lagoa. Sem temporizadores ou números aleatórios por frame.
export const SCHOOL_COUNT=22;
export function visibleFishCount(distance,quality='medium'){
 const d=Number.isFinite(distance)?Math.max(0,distance):Infinity;
 const max=quality==='low'?38:quality==='medium'?65:86;
 if(d>max)return 0;
 if(d>30)return quality==='low'?3:6;
 return quality==='low'?8:quality==='medium'?15:SCHOOL_COUNT;
}
export function sampleFishSwim(index,time,radius=14.8){
 const i=Math.max(0,Math.floor(Number(index)||0))%SCHOOL_COUNT;
 const t=Number.isFinite(time)?time:0;
 const orbit=Math.min(Math.max(1,radius-3.8),2.3+(i%6)*1.24);
 const speed=.26+(i%4)*.043;
 const theta=i*2.3999632297+t*speed;
 // Centro do círculo oscila suavemente, sem escapar da borda física da lagoa.
 const cx=Math.cos(i*1.37)*.8,cz=Math.sin(i*1.79)*.8;
 const x=cx+Math.sin(theta)*orbit,z=cz+Math.cos(theta)*orbit;
 const y=-.27-.09*Math.sin(i*.9+t*.65);
 const heading=Math.atan2(Math.cos(theta),-Math.sin(theta));
 return {x,y,z,heading,tail:Math.sin(t*10+i*1.7)*.42};
}
