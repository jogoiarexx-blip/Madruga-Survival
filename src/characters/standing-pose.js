// Gera uma pose de descanso estática a partir da média de duas passadas.
// Mantém as mesmas trilhas do rig original, inclusive a rotação dos pés,
// sem congelar no meio de uma passada nem forçar o esqueleto à posição T.
export function createStandingClip(THREE,walking,name='Stand'){
  if(!THREE?.AnimationClip||!walking?.tracks?.length||!(walking.duration>0))return null;
  const tracks=[];
  for(const track of walking.tracks){
    if(!track?.name||!track.createInterpolant||typeof track.constructor!=='function')continue;
    try{
      const interpolant=track.createInterpolant();
      const a=Array.from(interpolant.evaluate(walking.duration*.08));
      const b=Array.from(interpolant.evaluate(walking.duration*.58));
      if(a.length!==b.length||!a.length||a.some(v=>!Number.isFinite(v))||
        b.some(v=>!Number.isFinite(v)))continue;
      let frame;
      if(/\.quaternion$/i.test(track.name)&&a.length===4&&THREE.Quaternion){
        const qa=new THREE.Quaternion().fromArray(a);
        const qb=new THREE.Quaternion().fromArray(b);
        frame=qa.slerp(qb,.5).normalize().toArray();
      }else{
        frame=a.map((v,i)=>(v+b[i])*.5);
      }
      const values=[...frame,...frame];
      const copy=new track.constructor(track.name,[0,1],values);
      tracks.push(copy);
    }catch(_){/* trilha não interpolável: não impede modelo/animacões originais */}
  }
  return tracks.length?new THREE.AnimationClip(name,1,tracks):null;
}
