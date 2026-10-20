// Posições magnéticas para casas modulares. Apenas matemática: sem Three.js.
// A grade clássica de 3 m continua válida para salvar/carregar casas existentes.
import {BUILD_GRID,orientation} from './building-rules.js';
export const SNAP_RANGE=1.85;
const WALLS=new Set(['wall','door']);
const round=n=>Math.round(n*1000)/1000;
const offset=(x,z,dx,dz,label)=>({x:round(x+dx),z:round(z+dz),label});

export function snapTargets(type,rotation,structures,near,maxDistance=SNAP_RANGE){
 if(!near||!Array.isArray(structures)||!['floor','roof','wall','door'].includes(type))return [];
 const r=orientation(rotation),horizontal=r%2===0;
 const targets=[];
 const push=(point)=>{
   if(Math.hypot(point.x-near.x,point.z-near.z)<=maxDistance+1e-8)
     targets.push({...point,rotation:r});
 };
 for(const structure of structures){
   if(!structure||!Number.isFinite(structure.x)||!Number.isFinite(structure.z))continue;
   if(Math.hypot(structure.x-near.x,structure.z-near.z)>BUILD_GRID*2.2+maxDistance)continue;
   const {x,z,type:other}=structure;
   if(WALLS.has(type)){
     if(other==='floor'){
       const normals=horizontal?[[0,-1.5],[0,1.5]]:[[-1.5,0],[1.5,0]];
       for(const [dx,dz] of normals)push(offset(x,z,dx,dz,'borda do piso'));
     }
     if(WALLS.has(other)){
       if(orientation(structure.rotation||0)%2===r%2){
         const along=horizontal?[[3,0],[-3,0]]:[[0,3],[0,-3]];
         for(const [dx,dz] of along)push(offset(x,z,dx,dz,'continuação da parede'));
       } else {
         // Canto em L: termina onde a extremidade da peça cruzada termina.
         for(const sx of [-1,1])for(const sz of [-1,1])
           push(offset(x,z,sx*1.5,sz*1.5,'canto da parede'));
       }
     }
   } else if(type==='floor'){
     if(other==='floor')for(const [dx,dz] of [[3,0],[-3,0],[0,3],[0,-3]])
       push(offset(x,z,dx,dz,'piso vizinho'));
     if(WALLS.has(other)){
       const normals=orientation(structure.rotation||0)%2===0?[[0,-1.5],[0,1.5]]:[[-1.5,0],[1.5,0]];
       for(const [dx,dz] of normals)push(offset(x,z,dx,dz,'junto à parede'));
     }
   } else if(type==='roof'){
     if(other==='floor')push(offset(x,z,0,0,'acima do piso'));
     if(other==='roof')for(const [dx,dz] of [[3,0],[-3,0],[0,3],[0,-3]])
       push(offset(x,z,dx,dz,'telhado vizinho'));
   }
 }
 // Sem duplicatas: múltiplos pisos contíguos apontam para a mesma borda.
 const unique=new Map();
 for(const target of targets){const key=`${target.x}:${target.z}:${target.rotation}`;
   if(!unique.has(key))unique.set(key,target);}
 return [...unique.values()].sort((a,b)=>{
   const da=(a.x-near.x)**2+(a.z-near.z)**2;
   const db=(b.x-near.x)**2+(b.z-near.z)**2;
   return da-db||a.x-b.x||a.z-b.z;
 });
}
