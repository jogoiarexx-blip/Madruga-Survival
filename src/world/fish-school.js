// Cardumes determinísticos: tamanhos e velocidades individuais sem aleatoriedade por frame.
export const SCHOOL_COUNT=22;
export function visibleFishCount(distance,quality='medium'){
 const d=Number.isFinite(distance)?Math.max(0,distance):Infinity;
 const max=quality==='low'?38:quality==='medium'?65:86;
 if(d>max)return 0;
 if(d>30)return quality==='low'?2:5;
 return quality==='low'?5:quality==='medium'?12:SCHOOL_COUNT;
}
export function fishUpdateInterval(quality='medium'){
 return quality==='low'?.28:quality==='medium'?.15:.09;
}
export function fishBodyScale(index){
 const i=Math.max(0,Math.floor(Number(index)||0))%SCHOOL_COUNT;
 const size=.62+(i*7%11)/10; // 0.62 até 1.62; determinístico e variado
 return {width:size*.76,height:size*.48,length:size*1.45};
}
export function sampleFishSwim(index,time,radius=14.8){
 const i=Math.max(0,Math.floor(Number(index)||0))%SCHOOL_COUNT;
 const t=Number.isFinite(time)?time:0;
 const orbit=Math.min(Math.max(1,radius-3.8),2.3+(i%6)*1.24);
 const speed=(.26+(i%4)*.043)/fishBodyScale(i).length**.22;
 const theta=i*2.3999632297+t*speed;
 const cx=Math.cos(i*1.37)*.8,cz=Math.sin(i*1.79)*.8;
 const x=cx+Math.sin(theta)*orbit,z=cz+Math.cos(theta)*orbit;
 const y=-.33-.07*Math.sin(i*.9+t*.65);
 const heading=Math.atan2(Math.cos(theta),-Math.sin(theta));
 return {x,y,z,heading,tail:Math.sin(t*10+i*1.7)*.42,size:fishBodyScale(i).length};
}
