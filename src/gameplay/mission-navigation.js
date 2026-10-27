// Marcadores de missão com alvos existentes, sem inventar pontos no mapa.
export function missionWaypoint(id,{player,structures=[],sites=[],guard=null,camp={x:-4,z:-5},lake=null}={}){
 const nearest=(items)=>items.filter(s=>Number.isFinite(s?.x)&&Number.isFinite(s?.z))
  .sort((a,b)=>Math.hypot(a.x-player.x,a.z-player.z)-Math.hypot(b.x-player.x,b.z-player.z))[0]||null;
 if(id==='campfire'||id==='farm')return nearest(structures.filter(s=>s.type=== (id==='farm'?'farmPlot':'campfire')))||camp;
 if(id==='ally')return guard||camp;
 if(id==='medical')return sites.find(s=>s.id==='posto')||null;
 if(id==='survey')return nearest(sites.filter(s=>!s.discovered));
 if(id==='scavenge')return nearest(sites.filter(s=>s.containers?.some(c=>!c.opened)));
 if(id==='cook')return nearest(structures.filter(s=>s.type==='campfire'))||camp;
 if(id==='hunt')return null;
 return null;
}
