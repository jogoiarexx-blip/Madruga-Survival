// Lagoa permanente procedural sem texturas remotas. Borda acessível para pesca.
export const LAKE=Object.freeze({x:70,z:51,radius:14.8,shore:2.7});
// Profundidade suave no terreno sem criar malha dinâmica ou terra atravessando a água.
export function lakeTerrainDrop(x,z){
 const d=Math.hypot(x-LAKE.x,z-LAKE.z);
 const t=Math.max(0,Math.min(1,(d-(LAKE.radius-3))/(LAKE.shore+3)));
 return 1.65*(1-t*t*(3-2*t));
}
export function insideLake(x,z,r=0){return Math.hypot(x-LAKE.x,z-LAKE.z)<LAKE.radius+r;}
export function nearLakeShore(position,range=3.8){
 if(!position)return false;
 const d=Math.hypot(position.x-LAKE.x,position.z-LAKE.z);
 return d>=LAKE.radius-1.5&&d<=LAKE.radius+range;
}
export function keepOutsideLake(x,z,r=.45){
 const d=Math.hypot(x-LAKE.x,z-LAKE.z),min=LAKE.radius+r;
 if(d>=min)return {x,z};
 const dx=d>0.00001?(x-LAKE.x)/d:1,dz=d>0.00001?(z-LAKE.z)/d:0;
 return {x:LAKE.x+dx*min,z:LAKE.z+dz*min};
}
export function createFishingLake({THREE,scene,getGroundHeight}){
 const root=new THREE.Group();root.position.set(LAKE.x,getGroundHeight(LAKE.x,LAKE.z)+lakeTerrainDrop(LAKE.x,LAKE.z)+.15,LAKE.z);
 // Polígonos concêntricos = LOD natural na água: sem tesselação pesada nem reflexões em tempo real.
 const water=new THREE.Mesh(new THREE.CircleGeometry(LAKE.radius,40),
   new THREE.MeshStandardMaterial({color:0x318ca4,roughness:.33,metalness:.12,transparent:true,opacity:.88,depthWrite:false,side:THREE.DoubleSide}));
 water.rotation.x=-Math.PI/2;water.renderOrder=1;root.add(water);
 const shoreMat=new THREE.MeshStandardMaterial({color:0xb2a276,roughness:1});
 const shore=new THREE.Mesh(new THREE.RingGeometry(LAKE.radius+.1,LAKE.radius+LAKE.shore,48),shoreMat);
 shore.rotation.x=-Math.PI/2;shore.position.y=-.08;shore.receiveShadow=true;root.add(shore);
 const reedsMat=new THREE.MeshStandardMaterial({color:0x4b7b48,roughness:1});
 const reedGeo=new THREE.ConeGeometry(.12,.84,4);
 for(let i=0;i<30;i++){
  const angle=i*2.39996,r=LAKE.radius+1+Math.sin(i*12.1)*.6;
  const reed=new THREE.Mesh(reedGeo,reedsMat);reed.position.set(Math.cos(angle)*r,.30,Math.sin(angle)*r);
  reed.rotation.z=.09*Math.sin(i);root.add(reed);
 }
 scene.add(root);
 return {root,position:LAKE,near:nearLakeShore,update(position,quality='medium'){
   const d=Math.hypot(position.x-LAKE.x,position.z-LAKE.z);
   root.visible=d<(quality==='low'?68:quality==='medium'?95:130);
   // Juncos são detalhes próximos; a água permanece visível à distância.
   for(let i=2;i<root.children.length;i++)root.children[i].visible=d<42;
 }};
}
