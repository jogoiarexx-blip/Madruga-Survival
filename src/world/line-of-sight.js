// Linha de visão com segmentos vs colisores circulares. Puro e sem alocações por nó.
export function segmentBlockedByCircles(from,to,colliders=[],margin=.08){
 if(!from||!to)return false;
 const ax=from.x,az=from.z,dx=to.x-ax,dz=to.z-az,den=dx*dx+dz*dz;
 if(den<.001)return false;
 for(const c of colliders){
  // Extremos dentro do próprio colisor (ex.: tronco próximo) não escondem toda a cena.
  const r=Math.max(0,c.radius||0)+margin;
  const t=Math.max(.07,Math.min(.93,((c.x-ax)*dx+(c.z-az)*dz)/den));
  const px=ax+dx*t-c.x,pz=az+dz*t-c.z;
  if(px*px+pz*pz<r*r && Math.hypot(c.x-ax,c.z-az)>r*.7)return true;
 }
 return false;
}
