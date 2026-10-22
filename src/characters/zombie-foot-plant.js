// Apoio dos pés do zumbi REV2. A malha original e a animação GLB não são alteradas.
// Durante o contato, um CCD limitado compensa o escorregamento nos ossos de quadril/joelho.
// O efeito é opcional, próximo da câmera, e funciona com qualquer altura de terreno.
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));

// Janelas identificadas a partir dos clipes Andar (1.55 s) e Correr (0.86 s) do REV2.
// Rampas evitam o estalo ao plantar/soltar o pé. A função é puramente numérica e testável.
export function footContactWeight(phase,side){
  if(!Number.isFinite(phase))return 0;
  const shift=side==='left'?.5:0;
  const p=((phase-shift)%1+1)%1;
  const enter=clamp((p-.015)/.055,0,1);
  const leave=clamp((.36-p)/.065,0,1);
  return Math.min(enter,leave);
}

export function createZombieFootPlant({THREE,model,getGroundHeight}){
  if(typeof getGroundHeight!=='function'||!THREE?.Vector3||!THREE?.Quaternion||
     typeof model?.getObjectByName!=='function')return null;
  const legs=[
    ['right','R_Hip','R_Knee','R_Foot'],
    ['left','L_Hip','L_Knee','L_Foot']
  ].map(([side,hip,knee,foot])=>({side,
    hip:model.getObjectByName(hip),knee:model.getObjectByName(knee),foot:model.getObjectByName(foot),
    anchor:null,blend:0}));
  if(legs.some(l=>!l.hip||!l.knee||!l.foot))return null;

  const {Vector3,Quaternion}=THREE;
  const tempEnd=new Vector3(),tempJoint=new Vector3(),tempA=new Vector3(),tempB=new Vector3();
  const tempTarget=new Vector3(),tempFoot=new Vector3(),tempParentQuat=new Quaternion();
  const tempDelta=new Quaternion(),tempLocalDelta=new Quaternion();
  const identity=new Quaternion();
  const maxJointAngle=.135; // Limita deformação mesmo quando a IA muda de direção.
  const baseY=model.position.y;
  let rootLift=0, lastClip=null;
  const sideScale=()=>model.scale.x||1;
  function rotateToward(joint,foot,target,maxAngle=maxJointAngle){
    joint.getWorldPosition(tempJoint);
    foot.getWorldPosition(tempEnd);
    tempA.copy(tempEnd).sub(tempJoint);
    tempB.copy(target).sub(tempJoint);
    if(tempA.lengthSq()<.00001||tempB.lengthSq()<.00001)return;
    tempDelta.setFromUnitVectors(tempA.normalize(),tempB.normalize());
    const angle=2*Math.acos(clamp(tempDelta.w,-1,1));
    if(!Number.isFinite(angle)||angle<.001)return;
    if(angle>maxAngle)tempDelta.slerp(identity,1-maxAngle/angle);
    joint.parent.getWorldQuaternion(tempParentQuat);
    tempLocalDelta.copy(tempParentQuat).invert().multiply(tempDelta).multiply(tempParentQuat);
    joint.quaternion.premultiply(tempLocalDelta).normalize();
    joint.updateWorldMatrix(true,true);
  }
  function reset(){
    for(const leg of legs){leg.anchor=null;leg.blend=0;}
    rootLift=0;lastClip=null;
    model.position.y=baseY;
  }
  function update({dt,moving,clip,action}={}){
    if(!Number.isFinite(dt)||dt<=0)return;
    const delta=clamp(dt,0,.05);
    // Não contaminar as poses das animações de combate/queda.
    const walking=!!moving && (clip==='Andar'||clip==='Correr') && action;
    if(lastClip!==clip){for(const leg of legs){leg.anchor=null;leg.blend=0;}lastClip=clip;}
    model.position.y=baseY+rootLift;
    model.updateWorldMatrix(true,true);
    const soleOffset=.087*sideScale();
    if(!walking){
      for(const leg of legs){leg.anchor=null;leg.blend=0;}
      // Mesmo parado, mantém os solados acima do terreno inclinado. Não interfere
      // na animação de queda, mordida ou dano.
      let penetration=0;
      if(clip==='Parado') for(const leg of legs){
        leg.foot.getWorldPosition(tempFoot);
        const ground=getGroundHeight(tempFoot.x,tempFoot.z);
        if(Number.isFinite(ground))penetration=Math.max(penetration,ground+soleOffset-tempFoot.y);
      }
      const target=clamp(penetration,0,.065*sideScale());
      rootLift+=(target-rootLift)*Math.min(1,delta*9);
      model.position.y=baseY+rootLift;
      return;
    }
    const duration=action.getClip?.()?.duration;
    const phase=Number.isFinite(duration)&&duration>.01?((action.time%duration)+duration)%duration/duration:0;
    // Mantém uma pequena folga de desempenho: apenas o zumbi próximo do jogador usa IK.
    let penetration=0;
    for(const leg of legs){
      const desired=footContactWeight(phase,leg.side);
      leg.foot.getWorldPosition(tempFoot);
      const footY= getGroundHeight(tempFoot.x,tempFoot.z)+soleOffset;
      if(Number.isFinite(footY))penetration=Math.max(penetration,footY-tempFoot.y);
      const lerp=Math.min(1,delta*16);
      leg.blend+=(desired-leg.blend)*lerp;
      if(desired<.02){leg.anchor=null;continue;}
      if(!leg.anchor){leg.anchor=new Vector3(tempFoot.x,footY,tempFoot.z);}
      // Reamarrar se o passo já passou do alcance físico da perna.
      const dist=Math.hypot(leg.anchor.x-tempFoot.x,leg.anchor.z-tempFoot.z);
      if(dist>.32*sideScale())leg.anchor.set(tempFoot.x,footY,tempFoot.z);
      leg.anchor.y=getGroundHeight(leg.anchor.x,leg.anchor.z)+soleOffset;
      tempTarget.copy(tempFoot).lerp(leg.anchor,leg.blend);
      if(tempTarget.distanceTo(tempFoot)>.24*sideScale()){
        tempTarget.sub(tempFoot).setLength(.24*sideScale()).add(tempFoot);
      }
      // Duas iterações curtas: preservam a silhueta do joelho sem esticar demais.
      for(let i=0;i<2;i++){
        rotateToward(leg.knee,leg.foot,tempTarget);
        rotateToward(leg.hip,leg.foot,tempTarget);
      }
    }
    // Corrige somente penetração leve dos solados, sem mover o collider principal.
    const targetLift=clamp(penetration,0,.065*sideScale());
    rootLift+=(targetLift-rootLift)*Math.min(1,delta*9);
    model.position.y=baseY+rootLift;
  }
  return {update,reset,get legs(){return legs},get rootLift(){return rootLift}};
}
