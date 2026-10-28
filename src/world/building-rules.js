// Geometria pura do modo construção: encaixe, orientação e colisão sem Three.js.
export const BUILD_GRID=3;
export const MODULAR_TYPES=Object.freeze(['floor','wall','door','window','bed','chest','workbench','roof','roofFlat','stairs','loft','railing','farmPlot']);
export const STRUCTURE_TYPES=Object.freeze(['campfire','shelter',...MODULAR_TYPES]);
export const MAX_STRUCTURES=160;
export const orientation=angle=>((Math.round(angle)%4)+4)%4;
export const snapToGrid=n=>Math.round(n/BUILD_GRID)*BUILD_GRID;
export function preparePlacement(type,x,z,rotation=0,options={}){
  // Posições magnéticas podem cair nas bordas, em múltiplos de 1,5 m.
  // Casas antigas seguem usando a grade original de 3 m.
  const free=!!options.preserveCoordinates;
  return {type,x:MODULAR_TYPES.includes(type)&&!free?snapToGrid(x):x,
    z:MODULAR_TYPES.includes(type)&&!free?snapToGrid(z):z,
    ...(MODULAR_TYPES.includes(type)?{rotation:orientation(rotation)}:{})};
}
function localOf(s,x,z){
  const a=orientation(s.rotation||0)*Math.PI/2,c=Math.cos(a),n=Math.sin(a),dx=x-s.x,dz=z-s.z;
  return {x:dx*c+dz*n,z:-dx*n+dz*c};
}
function worldDelta(s,x,z){const a=orientation(s.rotation||0)*Math.PI/2,c=Math.cos(a),n=Math.sin(a);return {x:x*c-z*n,z:x*n+z*c};}
function shape(s,playerY=0){
  switch(s.type){
    case 'wall':return {x:1.5,z:.14};
    case 'door':return s.open?null:{x:1.5,z:.14};
    case 'window':return {x:1.5,z:.14};
    case 'railing':return playerY>(s.group?.position?.y||0)+1.35?{x:1.5,z:.11}:null;
    case 'chest':return {x:.72,z:.48};
    case 'workbench':return {x:1.16,z:.62};
    case 'bed':return {x:.79,z:1.09};
    case 'farmPlot':return {x:1.22,z:1.22};
    default:return null; // piso e abrigo são caminháveis
  }
}
export function collidesWithStructure(s,x,z,r=.46,playerY=0){
  if(s.type==='campfire')return Math.hypot(x-s.x,z-s.z)<.72+r;
  const box=shape(s,playerY);if(!box)return false;
  const p=localOf(s,x,z);
  return Math.abs(p.x)<box.x+r&&Math.abs(p.z)<box.z+r;
}
export function resolveStructureCollision(structures,x,z,r=.46,playerY=0){
  for(let pass=0;pass<3;pass++){
    for(const s of structures){
      if(s.type==='campfire'){
        const dx=x-s.x,dz=z-s.z,min=.72+r,d=Math.hypot(dx,dz);
        if(d<min){const push=(min-d)+.001;x+=(d>0.0001?dx/d:1)*push;z+=(d>0.0001?dz/d:0)*push;}continue;
      }
      const box=shape(s,playerY);if(!box)continue;
      const p=localOf(s,x,z),hx=box.x+r,hz=box.z+r;
      if(Math.abs(p.x)>=hx||Math.abs(p.z)>=hz)continue;
      const ox=hx-Math.abs(p.x),oz=hz-Math.abs(p.z);
      const delta=ox<oz?worldDelta(s,(Math.sign(p.x)||1)*(ox+.001),0):worldDelta(s,0,(Math.sign(p.z)||1)*(oz+.001));
      x+=delta.x;z+=delta.z;
    }
  }
  return {x,z};
}
export function positionBlocked(structures,x,z,r=.45,playerY=0){return structures.some(s=>collidesWithStructure(s,x,z,r,playerY));}
// Evita sobreposição de pisos e telhados inclusive em encaixes de 1,5 m.
function flatOverlap(a,b){return Math.abs(a.x-b.x)<BUILD_GRID-.04&&Math.abs(a.z-b.z)<BUILD_GRID-.04;}
function wallExtents(s){return orientation(s.rotation||0)%2===0?{x:1.5,z:.14}:{x:.14,z:1.5};}
function wallOverlap(a,b){
 const aa=wallExtents(a),bb=wallExtents(b);
 return aa.x+bb.x-Math.abs(a.x-b.x)>.20&&aa.z+bb.z-Math.abs(a.z-b.z)>.20;
}
export function canPlaceAmong(structures,candidate){
 if(structures.length>=MAX_STRUCTURES||!STRUCTURE_TYPES.includes(candidate.type)||!Number.isFinite(candidate.x)||!Number.isFinite(candidate.z)||Math.abs(candidate.x)>104||Math.abs(candidate.z)>104)return false;
 const isFloor=candidate.type==='floor'||candidate.type==='loft',isRoof=['roof','roofFlat'].includes(candidate.type);
 for(const s of structures){
   const dist=Math.hypot(s.x-candidate.x,s.z-candidate.z);
   if(isFloor||isRoof){if((isRoof?['roof','roofFlat'].includes(s.type):s.type===candidate.type)&&flatOverlap(s,candidate))return false;continue;}
   if(['floor','roof','roofFlat','loft'].includes(s.type))continue;
   if(s.type==='campfire'||s.type==='shelter'||candidate.type==='campfire'||candidate.type==='shelter'){
     const r=t=>t==='shelter'?2.5:t==='campfire'?1.2:1.1;
     if(dist<r(s.type)+r(candidate.type))return false;
     continue;
   }
   if(['wall','door','window','railing'].includes(candidate.type)&&['wall','door','window','railing'].includes(s.type)){
     if(wallOverlap(s,candidate))return false;
     continue;
   }
   if(['bed','chest','workbench','farmPlot'].includes(candidate.type)&&['bed','chest','workbench','farmPlot'].includes(s.type)&&dist<1.7)return false;
   if(dist<1.25)return false;
 }
 return true;
}
export function nearestInteractive(structures,position,radius=2.85){
  let closest=null,shortest=radius;
  for(const s of structures){if(!['door','window','chest','bed','workbench','farmPlot'].includes(s.type))continue;
    const dist=Math.hypot(position.x-s.x,position.z-s.z);
    if(dist<shortest){closest=s;shortest=dist;}}
  return closest;
}

// Visibilidade para IA: portas fechadas e paredes bloqueiam ataques através da base.
export function lineBlockedByStructure(s,from,to){
  if(!['wall','door','window'].includes(s.type)||(s.type!=='wall'&&s.open))return false;
  const a=localOf(s,from.x,from.z),b=localOf(s,to.x,to.z);
  const dx=b.x-a.x,dz=b.z-a.z;
  let t0=0,t1=1;
  for(const [start,speed,extent] of [[a.x,dx,1.5],[a.z,dz,.14]]){
    if(Math.abs(speed)<1e-9){if(Math.abs(start)>extent)return false;continue;}
    const enter=(-extent-start)/speed,exit=(extent-start)/speed;
    t0=Math.max(t0,Math.min(enter,exit));t1=Math.min(t1,Math.max(enter,exit));
    if(t1<t0)return false;
  }
  return true;
}
export function structureBlocksLine(structures,from,to){
  return structures.some(s=>lineBlockedByStructure(s,from,to));
}
