// Alturas de escadas e plataformas: só são utilizáveis quando o jogador chega pelo lado acessível.
// Funciona sem Three.js e preserva a altura do terreno nos saves antigos.
export const PLATFORM_HEIGHT=2.6;
export function walkSurfaceHeight(structures=[],x,z,terrainHeight=0,playerHeight=terrainHeight,groundAt=()=>terrainHeight){
 let height=terrainHeight;
 for(const s of structures){
  if(!s||!['stairs','loft'].includes(s.type))continue;
  const angle=((Math.round(s.rotation||0)%4)+4)%4*Math.PI/2;
  const dx=x-s.x,dz=z-s.z,c=Math.cos(angle),t=Math.sin(angle);
  const lx=dx*c+dz*t,lz=-dx*t+dz*c;
  if(Math.abs(lx)>1.42||Math.abs(lz)>(s.type==='loft'?1.52:1.5))continue;
  const base=groundAt(s.x,s.z);
  const candidate=base+(s.type==='loft'?PLATFORM_HEIGHT:
    PLATFORM_HEIGHT*Math.max(0,Math.min(1,(lz+1.5)/3)));
  // Evita teleportar quem está andando sob uma plataforma ou entrando na escada pelo alto.
  if(playerHeight>=candidate-.52)height=Math.max(height,candidate);
 }
 return height;
}
