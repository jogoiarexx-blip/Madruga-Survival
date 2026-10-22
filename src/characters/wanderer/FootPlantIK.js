/** Lightweight, optional two-bone CCD planting for the Meshy humanoid rig.
 * Apply AFTER AnimationMixer.update(). Designed for flat ground and *small* stance
 * corrections; not full terrain IK. Does not change GLB or add dependencies.
 */
export class FootPlantIK {
  constructor(THREE, root, { groundY = 0, strength = .55, maxOffset = .09 } = {}) {
    this.THREE=THREE; this.root=root;
    this.groundY=groundY; this.strength=strength; this.maxOffset=maxOffset;
    this.chains=[];this.enabled=true;
    const byName=new Map();root.traverse(n=>{if(n.isBone)byName.set(n.name,n);});
    for(const side of ['Left','Right']){
      const upper=byName.get(`mixamorig:${side}UpLeg`);
      const lower=byName.get(`mixamorig:${side}Leg`);
      const ankle=byName.get(`mixamorig:${side}Foot`);
      if(upper&&lower&&ankle)this.chains.push({upper,lower,ankle,contact:false,anchor:new THREE.Vector3(),restAnkleHeight:null});
    }
    this._p=new THREE.Vector3();this._e=new THREE.Vector3();this._desired=new THREE.Vector3();
    this._from=new THREE.Vector3();this._to=new THREE.Vector3();
    this._delta=new THREE.Quaternion();this._parent=new THREE.Quaternion();this._local=new THREE.Quaternion();
    this._unit=new THREE.Quaternion();
  }
  reset(){for(const c of this.chains){c.contact=false;}}
  _rotateToward(joint,end,target,amount){
    joint.getWorldPosition(this._p);end.getWorldPosition(this._e);
    this._from.copy(this._e).sub(this._p);
    this._to.copy(target).sub(this._p);
    if(this._from.lengthSq()<1e-8||this._to.lengthSq()<1e-8)return;
    this._from.normalize();this._to.normalize();
    this._delta.setFromUnitVectors(this._from,this._to);
    const angle=2*Math.acos(Math.max(-1,Math.min(1,this._delta.w)));
    if(angle<1e-5)return;
    this._unit.identity().slerp(this._delta,Math.min(1, .24/angle)*amount);
    joint.parent.getWorldQuaternion(this._parent);
    this._local.copy(this._parent).invert().multiply(this._unit).multiply(this._parent);
    joint.quaternion.premultiply(this._local).normalize();
    joint.updateWorldMatrix(true,true);
  }
  update(dt=1/60, activeClip='Idle'){
    if(!this.enabled||!this.chains.length)return;
    if(!['Idle','Walking','Running','Walk_REV3','Run_REV3'].includes(activeClip)){
      this.reset();return;
    }
    this.root.updateWorldMatrix(true,true);
    for(const chain of this.chains){
      chain.ankle.getWorldPosition(this._e);
      if(chain.restAnkleHeight===null){
        // Initialize in the Idle pose for predictable ankle-to-floor offset.
        if(activeClip==='Idle')chain.restAnkleHeight=this._e.y-this.groundY;
        else continue;
      }
      const ankleFloor=this.groundY+chain.restAnkleHeight;
      const lift=this._e.y-ankleFloor;
      const walking=activeClip!=='Idle';
      // Swing foot should move freely: do not pin the lifted foot in mid-air.
      if(lift>.075 || Math.abs(lift)>.14){chain.contact=false;continue;}
      if(!chain.contact){chain.anchor.copy(this._e);chain.anchor.y=ankleFloor;chain.contact=true;}
      else if(walking){
        // Prevent long-lived stationary anchors fighting forward translation.
        const gap=chain.anchor.distanceTo(this._e);
        if(gap>this.maxOffset){chain.anchor.lerp(this._e,Math.min(1,(gap-this.maxOffset)/gap));chain.anchor.y=ankleFloor;}
      } else {chain.anchor.x=this._e.x;chain.anchor.z=this._e.z;}
      this._desired.copy(chain.anchor);
      const diff=this._desired.sub(this._e);
      if(diff.length()>.001){
        this._desired.copy(this._e).addScaledVector(diff,Math.min(this.strength,1));
        for(let pass=0;pass<2;pass++){
          this._rotateToward(chain.lower,chain.ankle,this._desired,.6);
          this._rotateToward(chain.upper,chain.ankle,this._desired,.6);
        }
      }
    }
  }
}
