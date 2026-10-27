// Evita que vários inimigos ocupem a mesma posição durante perseguições.
// Resposta determinística, limitada a 7 vizinhos próximos, sem alterar os alvos da IA.
export function steerAroundAllies(enemy,enemies,dx,dz,{radius=2.2,strength=.75,maxNeighbors=7}={}){
 const origin=enemy?.mesh?.position;
 const baseLength=Math.hypot(dx,dz)||1;
 if(!origin||!Array.isArray(enemies))return {x:dx/baseLength,z:dz/baseLength};
 let repelX=0,repelZ=0,seen=0;
 for(const other of enemies){
  if(other===enemy||other.hp<=0||!other.mesh?.position||other.type==='boss'||other.type==='spider')continue;
  const ox=origin.x-other.mesh.position.x,oz=origin.z-other.mesh.position.z;
  const d2=ox*ox+oz*oz;
  if(d2>=radius*radius)continue;
  if(d2<.000001){ // grupos exatamente sobrepostos recebem direções opostas e previsíveis
   const sign=(enemy.mesh.id||1)<(other.mesh.id||2)?-1:1;
   repelX+=sign*.5;repelZ-=sign*.5;
  }else{
   const d=Math.sqrt(d2),w=(radius-d)/radius;
   repelX+=ox/d*w;repelZ+=oz/d*w;
  }
  if(++seen>=maxNeighbors)break;
 }
 const x=dx/baseLength+repelX*strength,z=dz/baseLength+repelZ*strength;
 const len=Math.hypot(x,z)||1;
 return {x:x/len,z:z/len};
}
