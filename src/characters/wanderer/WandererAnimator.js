/** REV5 controller: explicit states, refined combat defaults, timed gameplay
 * events, optional foot IK and movement restoration after one-shot actions.
 * ES module, MIT license. Pass the THREE namespace and loaded GLTF from GLTFLoader.
 */
import {FootPlantIK} from './FootPlantIK.js';
export class WandererAnimator {
  constructor(THREE,gltf,onChange=()=>{},onEvent=()=>{},options={}) {
    this.THREE=THREE;this.root=gltf.scene;this.onChange=onChange;this.onEvent=onEvent;
    this.mixer=new THREE.AnimationMixer(this.root);
    this.actions=new Map();this.clips=new Map();
    this.activeName=null;this.current=null;this.speed=1;
    this.resumeClip='Idle';this._lastTime=0;
    this.oneShots=new Set(['Attack','Triple_Combo_Attack','SwordAttack_REV3',
      'SwordCombo_REV3','SwordAttack_Refined','TripleCombo_Refined','CastMagic',
      'Jump','HitReact','Death','BlockSword','Celebrate']);
    this.events={
      SwordAttack_Refined:[[.34,'sword-hit']],TripleCombo_Refined:[[.28,'sword-hit'],[.55,'sword-hit'],[.83,'sword-hit']],
      Attack:[[.34,'sword-hit']],Triple_Combo_Attack:[[.30,'sword-hit'],[.56,'sword-hit'],[.84,'sword-hit']],
      SwordAttack_REV3:[[.54,'sword-hit']],SwordCombo_REV3:[[.32,'sword-hit'],[.72,'sword-hit']],
      CastMagic:[[.52,'magic-release']],Jump:[[.27,'jump-peak']],HitReact:[[.10,'damage-react']],
      Walking:[[.24,'footstep'],[.72,'footstep']],Running:[[.24,'footstep'],[.72,'footstep']]
    };
    for(const clip of gltf.animations){this.clips.set(clip.name,clip);this.actions.set(clip.name,this.mixer.clipAction(clip));}
    this.ik=new FootPlantIK(THREE,this.root,options.ik||{});
    this.ik.enabled=options.enableFootIK!==false;
    this.mixer.addEventListener('finished',({action})=>{
      if(action!==this.current||this.activeName==='Death')return;
      this.play(this.actions.has(this.resumeClip)?this.resumeClip:'Idle',.2);
    });
  }
  play(name,fade=.18){
    if(!this.actions.has(name))throw new Error(`Clip ausente: ${name}`);
    if(this.activeName==='Death'&&name!=='Death')return false;
    if(this.activeName===name&&this.current?.isRunning())return false;
    const previous=this.current,next=this.actions.get(name),single=this.oneShots.has(name);
    if(!single)this.resumeClip=name;
    next.reset();next.enabled=true;next.paused=false;
    next.setLoop(single?this.THREE.LoopOnce:this.THREE.LoopRepeat,single?1:Infinity);
    next.clampWhenFinished=single;
    next.setEffectiveWeight(1);next.setEffectiveTimeScale(1);
    if(previous&&previous!==next){
      previous.stopFading();next.stopFading();
      if(fade>0){next.play();next.crossFadeFrom(previous,fade,false);}
      else {previous.stop();next.play();}
    }else next.play();
    this.activeName=name;this.current=next;this._lastTime=0;
    this.ik.reset();this.onChange(name,this.clips.get(name).duration);
    return true;
  }
  locomotion(name){
    if(!this.actions.has(name)||this.oneShots.has(name))throw new Error(`Locomoção inválida: ${name}`);
    this.resumeClip=name;
    if(this.current&&this.oneShots.has(this.activeName))return;
    this.play(name);
  }
  attack(combo=false){return this.play(combo?'TripleCombo_Refined':'SwordAttack_Refined');}
  cast(){return this.play('CastMagic');}
  setSpeed(speed){
    if(!Number.isFinite(speed)||speed<=0)throw new Error('Velocidade deve ser positiva');
    this.speed=speed;this.mixer.timeScale=speed;
  }
  update(dt){
    if(!Number.isFinite(dt)||dt<0)throw new Error('dt inválido');
    dt=Math.min(dt,.1);
    const beforeName=this.activeName,beforeAction=this.current;
    const before=beforeAction?.time||0;
    this.mixer.update(dt);
    if(beforeAction&&this.clips.has(beforeName)){
      const duration=this.clips.get(beforeName).duration;
      const after=(beforeAction===this.current?beforeAction.time:duration);
      const thresholds=this.events[beforeName]||[];
      const wrapping=after<before&&!this.oneShots.has(beforeName);
      for(const [phase,event] of thresholds){
        const marker=phase*duration;
        if((before<marker&&after>=marker)||(wrapping&&(marker>before||marker<=after)))
          this.onEvent({type:event,clip:beforeName,phase,time:marker});
      }
    }
    this.ik.update(dt,this.activeName);
  }
  dispose(){this.mixer.stopAllAction();this.mixer.uncacheRoot(this.root);this.ik.reset();}
}
