// Goblin Mixamo: contato suave com o solo usando tornozelos, joelhos e quadril.
// Os ossos originais e a posição do collider nunca são substituídos.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function goblinContactWeight(phase,side){
  if(!Number.isFinite(phase))return 0;
  const p=((phase+(side==='left'?.5:0))%1+1)%1;
  return Math.min(clamp((p-.015)/.08,0,1),clamp((.40-p)/.09,0,1));
}
export function createGoblinFootPlant({THREE,model,getGroundHeight}){
  if(typeof getGroundHeight!=='function'||!THREE?.Vector3||!THREE?.Quaternion||
    typeof model?.getObjectByName!=='function')return null;
  const legs=[['left','LeftUpLeg','LeftLeg','LeftToeBase'],
              ['right','RightUpLeg','RightLeg','RightToeBase']].map(([side,h,k,f])=>({
    side,hip:model.getObjectByName('mixamorig:'+h),
    knee:model.getObjectByName('mixamorig:'+k),
    foot:model.getObjectByName('mixamorig:'+f),anchor:null,blend:0}));
  if(legs.some(l=>!l.hip||!l.knee||!l.foot))return null;
  const {Vector3,Quaternion}=THREE;
  const a=new Vector3(),b=new Vector3(),footPos=new Vector3(),jointPos=new Vector3();
  const target=new Vector3(),parentQ=new Quaternion(),worldDelta=new Quaternion(),localDelta=new Quaternion(),identity=new Quaternion();
  let lastClip='',rootLift=0;
  const baseY=model.position.y;
  const scale=()=>Math.abs(model.scale?.x||1);
  function rotate(joint,foot,desired,maxAngle){
    joint.getWorldPosition(jointPos);foot.getWorldPosition(footPos);
    a.copy(footPos).sub(jointPos);b.copy(desired).sub(jointPos);
    if(a.lengthSq()<.000001||b.lengthSq()<.000001)return;
    worldDelta.setFromUnitVectors(a.normalize(),b.normalize());
    const angle=2*Math.acos(clamp(worldDelta.w,-1,1));
    if(!Number.isFinite(angle)||angle<.0005)return;
    if(angle>maxAngle)worldDelta.slerp(identity,1-maxAngle/angle);
    joint.parent.getWorldQuaternion(parentQ);
    localDelta.copy(parentQ).invert().multiply(worldDelta).multiply(parentQ);
    joint.quaternion.premultiply(localDelta).normalize();
    joint.updateWorldMatrix(true,true);
  }
  function reset(){
    for(const leg of legs){leg.anchor=null;leg.blend=0;}
    lastClip='';rootLift=0;model.position.y=baseY;
  }
  function update({dt,moving,clip,action}={}){
    if(!Number.isFinite(dt)||dt<=0)return;
    const step=clamp(dt,0,.05);
    // Os contatos não podem puxar os pés enquanto os golpes ou a morte tocam.
    if(!moving||!action||!['Walking','Running'].includes(clip)){
      reset();return;
    }
    if(lastClip!==clip){for(const leg of legs){leg.anchor=null;leg.blend=0;}lastClip=clip;}
    const duration=action.getClip?.()?.duration;
    if(!Number.isFinite(duration)||duration<=0)return;
    const phase=((action.time%duration)+duration)%duration/duration;
    const soleOffset=.035*scale();
    let maxPenetration=0;
    model.updateWorldMatrix(true,true);
    for(const leg of legs){
      leg.foot.getWorldPosition(footPos);
      const ground=getGroundHeight(footPos.x,footPos.z);
      if(!Number.isFinite(ground)){leg.anchor=null;leg.blend=0;continue;}
      const desired=goblinContactWeight(phase,leg.side);
      leg.blend+=(desired-leg.blend)*Math.min(1,step*14);
      maxPenetration=Math.max(maxPenetration,ground+soleOffset-footPos.y);
      if(desired<.015){leg.anchor=null;continue;}
      if(!leg.anchor)leg.anchor=new Vector3(footPos.x,ground+soleOffset,footPos.z);
      // Colisões e viradas bruscas não deixam a âncora puxar o esqueleto à distância.
      if(Math.hypot(leg.anchor.x-footPos.x,leg.anchor.z-footPos.z)>.26*scale())
        leg.anchor.set(footPos.x,ground+soleOffset,footPos.z);
      const anchorGround=getGroundHeight(leg.anchor.x,leg.anchor.z);
      if(Number.isFinite(anchorGround))leg.anchor.y=anchorGround+soleOffset;
      target.copy(footPos).lerp(leg.anchor,leg.blend);
      if(target.distanceTo(footPos)>.13*scale())target.sub(footPos).setLength(.13*scale()).add(footPos);
      rotate(leg.knee,leg.foot,target,.07);
      rotate(leg.hip,leg.foot,target,.065);
    }
    const desiredLift=clamp(maxPenetration,0,.055*scale());
    rootLift+=(desiredLift-rootLift)*Math.min(1,step*8);
    model.position.y=baseY+rootLift;
  }
  return {update,reset,get legs(){return legs},get rootLift(){return rootLift}};
}
