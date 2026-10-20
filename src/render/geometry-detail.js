// Orçamento geométrico por qualidade. Só aumenta malhas próximas/ativas;
// a distância da floresta e dos recursos continua limitada pelo culling existente.
export const GEOMETRY_DETAIL=Object.freeze({
  low:Object.freeze({trunk:6,foliage:7,bushWidth:8,bushHeight:6,rockSubdivision:0,
    resourceCylinder:6,resourceFacet:0,resourceSphere:0,smallSphereWidth:8,smallSphereHeight:6,
    flame:6,decoration:6,bedPillowWidth:8,bedPillowHeight:6}),
  medium:Object.freeze({trunk:10,foliage:11,bushWidth:12,bushHeight:9,rockSubdivision:0,
    resourceCylinder:10,resourceFacet:0,resourceSphere:1,smallSphereWidth:12,smallSphereHeight:8,
    flame:9,decoration:10,bedPillowWidth:12,bedPillowHeight:8}),
  high:Object.freeze({trunk:16,foliage:18,bushWidth:20,bushHeight:14,rockSubdivision:1,
    resourceCylinder:16,resourceFacet:1,resourceSphere:2,smallSphereWidth:16,smallSphereHeight:12,
    flame:14,decoration:16,bedPillowWidth:16,bedPillowHeight:12})
});
export function geometryDetail(quality='medium'){
  return GEOMETRY_DETAIL[quality]||GEOMETRY_DETAIL.medium;
}

// Aumenta polígonos criando bordas arredondadas reais, não apenas
// subdividindo faces planas. Usado somente em personagens e móveis próximos.
export function roundedBoxGeometry(THREE,width,height,depth,radius=.06,segments=3){
  if(!Number.isFinite(radius)||radius<=0)return new THREE.BoxGeometry(width,height,depth);
  const steps=Math.max(2,Math.min(8,Math.floor(segments)));
  const geo=new THREE.BoxGeometry(width,height,depth,steps,steps,steps);
  const position=geo.attributes?.position;
  if(!position?.getX||!position?.setXYZ)return geo; // Mock de testes sem BufferGeometry.
  const r=Math.min(radius,width*.45,height*.45,depth*.45);
  const hx=width*.5-r, hy=height*.5-r, hz=depth*.5-r;
  for(let i=0;i<position.count;i++){
    const x=position.getX(i),y=position.getY(i),z=position.getZ(i);
    const nx=Math.max(-hx,Math.min(hx,x));
    const ny=Math.max(-hy,Math.min(hy,y));
    const nz=Math.max(-hz,Math.min(hz,z));
    const dx=x-nx,dy=y-ny,dz=z-nz;
    const len=Math.hypot(dx,dy,dz)||1;
    position.setXYZ(i,nx+dx/len*r,ny+dy/len*r,nz+dz/len*r);
  }
  position.needsUpdate=true;
  geo.computeVertexNormals?.();
  return geo;
}
