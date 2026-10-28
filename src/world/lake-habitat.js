// Distribuição determinística de vegetação rasa, sem sorteios por frame.
const TAU=Math.PI*2;
export const HABITAT_PADS=15;
export const HABITAT_CATTAILS=19;
export function lakeHabitatSamples(count,shoreRadius,type='pad'){
 const n=Math.max(0,Math.min(100,Math.floor(Number(count)||0)));
 const items=[];
 for(let i=0;i<n;i++){
  const angle=(i*2.399963229728653 + (type==='pad'?.25:1.15))%TAU;
  const shore=shoreRadius(angle);
  const inset=type==='pad'?1.35+(i%5)*.43:.55+(i%3)*.28;
  const r=Math.max(0,shore-inset);
  items.push({x:Math.cos(angle)*r,z:Math.sin(angle)*r,
   angle,scale:.76+(i%7)*.067,inside:r<shore-.25,shoreDistance:shore-r});
 }
 return items;
}
export function habitatVisibility(distance,quality='medium'){
 if(quality==='low'||!Number.isFinite(distance)||distance>=46)return {pads:0,cattails:0};
 if(quality==='medium'||distance>=30)return {pads:9,cattails:12};
 return {pads:HABITAT_PADS,cattails:HABITAT_CATTAILS};
}
