// Escolha de fuga com sondagem física: calcula desvios antes de encostar na parede.
// Módulo puro, sem Three.js, para manter resultados previsíveis e testáveis.
const angleDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export function chooseRabbitEscape({position,player,isFree=()=>true,radius=.45,probe=2.4}={}){
  if(!position||!player)return {heading:0,blocked:true};
  const away=Math.atan2(position.x-player.x,position.z-player.z);
  // Prefere seguir afastando-se do jogador; usa tangentes quando a frente está bloqueada.
  const angles=[0,Math.PI/5,-Math.PI/5,Math.PI*2/5,-Math.PI*2/5,Math.PI*.82,-Math.PI*.82,Math.PI];
  let best=null;
  const startDist=Math.hypot(position.x-player.x,position.z-player.z);
  for(const offset of angles){
    const heading=away+offset,sx=Math.sin(heading),sz=Math.cos(heading);
    // A rota curta inteira deve estar livre, não apenas seu ponto final.
    let clear=true;
    for(const d of [.65,1.35,probe]){
      const x=position.x+sx*d,z=position.z+sz*d;
      if(Math.abs(x)>=98||Math.abs(z)>=98||!isFree(x,z,radius)){clear=false;break;}
    }
    if(!clear)continue;
    const newDist=Math.hypot(position.x+sx*probe-player.x,position.z+sz*probe-player.z);
    const score=(newDist-startDist)-.45*Math.abs(offset);
    if(!best||score>best.score)best={heading:angleDiff(heading,0),blocked:false,score};
  }
  return best?{heading:best.heading,blocked:false}:{heading:away,blocked:true};
}
