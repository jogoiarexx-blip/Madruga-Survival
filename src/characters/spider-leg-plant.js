// Aranha Sombria REV5: apoio procedural das 8 patas sem substituir animações GLB.
// Correção CCD limitada, com diagonais alternadas e ancoragem curta no chão.
export const SPIDER_LEGS=Object.freeze([
  Object.freeze(['Bone_066','Bone_064','Bone_062']), // frente esquerda
  Object.freeze(['Bone_071','Bone_069','Bone_067']), // frente direita
  Object.freeze(['Bone_038','Bone_036','Bone_034']),
  Object.freeze(['Bone_026','Bone_024','Bone_022']),
  Object.freeze(['Bone_031','Bone_029','Bone_027']),
  Object.freeze(['Bone_043','Bone_041','Bone_039']),
  Object.freeze(['Bone_019','Bone_017','Bone_015']), // trás esquerda
  Object.freeze(['Bone_014','Bone_012','Bone_010'])  // trás direita
]);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function spiderLegContactWeight(phase,index){
  if(!Number.isFinite(phase)||!Number.isInteger(index)||index<0||index>=8)return 0;
  // Grupo A/B em diagonais: 4 patas sustentam o corpo enquanto 4 avançam.
  const row=Math.floor(index/2),side=index%2;
  const offset=(row+side)%2?.5:0;
  const p=((phase+offset)%1+1)%1;
  const inWeight=clamp(p/.09,0,1);
  const outWeight=clamp((.58-p)/.09,0,1);
  return Math.min(inWeight,outWeight);
}
export function spiderLegGroundTarget(foot,ground,scale=1){
  if(!Number.isFinite(ground)||!Number.isFinite(foot?.y))return null;
  // Impede que terrenos extremamente irregulares distorçam o rig.
  const target=ground+.034*scale;
  return clamp(target,foot.y-.34*scale,foot.y+.28*scale);
}
export function inspectSpiderLegs(model){
  if(typeof model?.getObjectByName!=='function')return null;
  const legs=SPIDER_LEGS.map(([hip,knee,foot],index)=>({index,
    hip:model.getObjectByName(hip),knee:model.getObjectByName(knee),foot:model.getObjectByName(foot),
    anchor:null,weight:0,ground:null}));
  if(legs.some(l=>!l.hip||!l.knee||!l.foot||!l.foot.parent))return null;
  return legs;
}
export function createSpiderLegPlant({THREE,model,getGroundHeight}){
  if(typeof getGroundHeight!=='function'||!THREE?.Vector3||!THREE?.Quaternion)return null;
  const legs=inspectSpiderLegs(model);
  if(!legs)return null;
  const {Vector3,Quaternion}=THREE;
  const jointPoint=new Vector3(),footPoint=new Vector3(),direction=new Vector3(),desired=new Vector3();
  const destination=new Vector3(),parentQuat=new Quaternion(),delta=new Quaternion(),localDelta=new Quaternion();
  const identity=new Quaternion();
  let elapsed=0,lastClip='',phase=0,enabled=false;
  function reset(){
    for(const leg of legs){leg.anchor=null;leg.weight=0;leg.ground=null;}
    elapsed=0;lastClip='';phase=0;enabled=false;
  }
  function bendToward(joint,foot,target,weight){
    if(!joint?.parent||weight<=0)return;
    joint.getWorldPosition(jointPoint);foot.getWorldPosition(footPoint);
    direction.copy(footPoint).sub(jointPoint);desired.copy(target).sub(jointPoint);
    if(direction.lengthSq()<1e-7||desired.lengthSq()<1e-7)return;
    delta.setFromUnitVectors(direction.normalize(),desired.normalize());
    const theta=2*Math.acos(clamp(delta.w,-1,1));
    if(!Number.isFinite(theta)||theta<.0005)return;
    // Nenhum osso gira mais que 0,16 rad por iteração: preserva o Walk original.
    const limit=.16*weight;
    if(theta>limit)delta.slerp(identity,1-limit/theta);
    joint.parent.getWorldQuaternion(parentQuat);
    localDelta.copy(parentQuat).invert().multiply(delta).multiply(parentQuat);
    joint.quaternion.premultiply(localDelta).normalize();
    joint.updateWorldMatrix(true,true);
  }
  function update({dt,clip,moving,near,action}={}){
    if(!Number.isFinite(dt)||dt<=0)return;
    if(!near||!action||!['Idle','Walk'].includes(clip)){
      if(enabled)reset();
      return;
    }
    if(lastClip!==clip){
      for(const leg of legs){leg.anchor=null;leg.weight=0;leg.ground=null;}
      lastClip=clip;
    }
    enabled=true;
    // Sonda o relevo a 30 Hz, mas corrige a pose em cada frame para não tremer.
    elapsed+=Math.min(dt,.1);
    const resample=elapsed>=1/30;
    if(resample)elapsed=0;
    const step=Math.min(dt,.065);
    const duration=action.getClip?.()?.duration;
    phase=duration>0?((action.time%duration)+duration)%duration/duration:0;
    const scale=Math.abs(model.scale?.x||1);
    model.updateWorldMatrix(true,true);
    for(const leg of legs){
      leg.foot.getWorldPosition(footPoint);
      if(resample||leg.ground===null)leg.ground=getGroundHeight(footPoint.x,footPoint.z);
      const footY=spiderLegGroundTarget(footPoint,leg.ground,scale);
      if(footY===null){leg.anchor=null;leg.weight=0;continue;}
      const desiredWeight=moving?spiderLegContactWeight(phase,leg.index):.68;
      leg.weight+=(desiredWeight-leg.weight)*Math.min(1,step*14);
      if(desiredWeight<.02){leg.anchor=null;continue;}
      if(!leg.anchor)leg.anchor=new Vector3(footPoint.x,footY,footPoint.z);
      // Mudanças de direção e grandes distâncias liberam a pata sem esticá-la.
      const horizontal=Math.hypot(footPoint.x-leg.anchor.x,footPoint.z-leg.anchor.z);
      if(horizontal>.42*scale)leg.anchor.set(footPoint.x,footY,footPoint.z);
      if(resample){
        const anchorY=spiderLegGroundTarget(footPoint,getGroundHeight(leg.anchor.x,leg.anchor.z),scale);
        if(anchorY!==null)leg.anchor.y=anchorY;
      }
      destination.copy(footPoint).lerp(leg.anchor,leg.weight);
      const maxShift=.39*scale;
      if(destination.distanceTo(footPoint)>maxShift)
        destination.sub(footPoint).setLength(maxShift).add(footPoint);
      // Poucos passes CCD: o GLB original continua controlando as 5 animações.
      for(let iteration=0;iteration<2;iteration++){
        bendToward(leg.knee,leg.foot,destination,leg.weight);
        bendToward(leg.hip,leg.foot,destination,leg.weight*.75);
      }
    }
  }
  return {legs,update,reset};
}
