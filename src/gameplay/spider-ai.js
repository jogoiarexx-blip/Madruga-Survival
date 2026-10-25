// Aranha Sombria — deslocamento de salto real, percepção e ataques com eventos únicos.
import {SPIDER_DURATIONS} from '../characters/spider-model.js';
export const SPIDER_ATTACK_PHASE=0.48/SPIDER_DURATIONS.Attack;
export const SPIDER_WEB_PHASE=0.49/SPIDER_DURATIONS.WebShot;
export const SPIDER_JUMP_DAMAGE_PHASE=.79;
export const SPIDER_WEB_FAN_SPREAD=Object.freeze([-.23,0,.23]);
// Golpe forte interrompe somente o wind-up anterior ao impacto; nunca depois.
export function spiderInterruptWindup(brain,strength=1){
  if(!brain?.action||strength<1.5)return false;
  const hitAt=brain.action==='Attack'?.48:brain.action==='WebShot'||brain.action==='WebBurst'?.49:
    brain.action==='Jump'?SPIDER_DURATIONS.Jump*SPIDER_JUMP_DAMAGE_PHASE:0;
  if(brain.actionTime>=hitAt)return false;
  brain.action=null;brain.actionTime=0;brain.hit=false;
  brain.cooldown=Math.max(brain.cooldown||0,.85);
  return true;
}

const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

export function spiderDecision(distance,visible,timer,random=0.5){
  if(timer>0||!visible)return null;
  if(distance<2.2)return 'Attack';
  if(distance>5&&distance<15)return random<.23?'WebBurst':'WebShot';
  if(distance>=2.2&&distance<5&&random<.30)return 'Jump';
  return null;
}

// Retorna o deslocamento vertical do collider, não apenas do modelo. Altura
// zero no começo/fim garante contato das patas com o chão nas aterrissagens.
export function spiderJumpHeight(time,duration=SPIDER_DURATIONS.Jump,amplitude=.50){
  if(!Number.isFinite(time)||!Number.isFinite(duration)||duration<=0)return 0;
  const phase=clamp(time/duration,0,1);
  return amplitude*Math.sin(Math.PI*phase)**2;
}

// Inclinação leve calculada ao longo dos eixos da criatura (não gira collider).
export function spiderTerrainSlope(x,z,yaw,getGroundHeight,sample=.65){
  const dx=(getGroundHeight(x+sample,z)-getGroundHeight(x-sample,z))/(2*sample);
  const dz=(getGroundHeight(x,z+sample)-getGroundHeight(x,z-sample))/(2*sample);
  const forward=dx*Math.sin(yaw)+dz*Math.cos(yaw);
  const right=dx*Math.cos(yaw)-dz*Math.sin(yaw);
  return {x:clamp(-Math.atan(forward),-.23,.23),z:clamp(Math.atan(right),-.23,.23)};
}

export function createSpiderAI({player,getGroundHeight,resolveCollision,damagePlayer,throwProjectile,
  hasLineOfSight=()=>true,onSpiderSound=()=>{}}){
 function update(enemy,dt,elapsed){
   if(!enemy||!Number.isFinite(dt)||dt<=0)return;
   const step=Math.min(dt,.1),mesh=enemy.mesh;
   const dx=player.position.x-mesh.position.x,dz=player.position.z-mesh.position.z,dist=Math.hypot(dx,dz);
   const visible=dist<26&&hasLineOfSight(mesh.position,player.position);
   const ai=enemy.spiderBrain||(enemy.spiderBrain={cooldown:1.1,action:null,actionTime:0,hit:false});
   ai.stepTimer=Math.max(0,(ai.stepTimer??0)-step);
   ai.cooldown=Math.max(0,ai.cooldown-step);
   enemy.knockback=Math.max(0,(enemy.knockback||0)-step);
   let leaping=false;
   if(ai.action){
     ai.actionTime+=step;
     const duration=SPIDER_DURATIONS[ai.action==='WebBurst'?'WebShot':ai.action];
     if(ai.action==='Attack'&&!ai.hit&&ai.actionTime>=.48){
       ai.hit=true;
       const near=Math.hypot(mesh.position.x-player.position.x,mesh.position.z-player.position.z);
       if(near<2.2&&hasLineOfSight(mesh.position,player.position))damagePlayer(enemy.damage,mesh.position);
     }
     if((ai.action==='WebShot'||ai.action==='WebBurst')&&!ai.hit&&ai.actionTime>=.49){
       ai.hit=true;
       // Arco visível e evitável: projéteis respeitam paredes e invulnerabilidade.
       if(visible){
         if(ai.action==='WebBurst')for(const spread of SPIDER_WEB_FAN_SPREAD)throwProjectile(enemy,spread);
         else throwProjectile(enemy);
         onSpiderSound('web',dist,enemy);
       }
     }
     if(ai.action==='Jump'){
       const phase=ai.actionTime/duration;
       if(phase>=.16&&phase<=.79&&enemy.knockback<=0){
         leaping=true;
         // Direção travada no começo do salto; o animal não faz curvas no ar.
         const speed=enemy.speed*1.22*step;
         const nx=mesh.position.x+ai.jumpX*speed,nz=mesh.position.z+ai.jumpZ*speed;
         const next=resolveCollision(nx,nz,enemy.size*.36);
         mesh.position.x=next.x;mesh.position.z=next.z;
       }
       if(!ai.hit&&phase>=SPIDER_JUMP_DAMAGE_PHASE){
         ai.hit=true;
         const near=Math.hypot(mesh.position.x-player.position.x,mesh.position.z-player.position.z);
         if(near<1.65&&hasLineOfSight(mesh.position,player.position))damagePlayer(enemy.damage*.75,mesh.position);
       }
     }
     if(ai.actionTime>=duration){ai.action=null;ai.actionTime=0;}
   }
   const decision=ai.action?null:spiderDecision(dist,visible,ai.cooldown,Math.abs(Math.sin(elapsed+mesh.id)));
   if(decision){
     ai.action=decision;ai.actionTime=0;ai.hit=false;
     ai.cooldown=decision==='WebBurst'?7.3:decision==='WebShot'?5.1:decision==='Jump'?3.0:1.55;
     onSpiderSound(decision==='WebBurst'||decision==='WebShot'?'charge':decision==='Jump'?'jump':'attack',dist,enemy);
     if(decision==='Jump'){
       ai.jumpX=dx/(dist||1);ai.jumpZ=dz/(dist||1);ai.jumpYaw=Math.atan2(dx,dz);
       enemy.spiderVisual?.jump();
     }else enemy.spiderVisual?.attack(decision==='WebBurst'?'WebShot':decision);
   }
   const moving=!ai.action&&enemy.knockback<=0&&dist>2&&dist<32;
   let actualMoving=false;
   if(moving){
     const speed=enemy.speed*step;
     const next=resolveCollision(mesh.position.x+dx/(dist||1)*speed,mesh.position.z+dz/(dist||1)*speed,enemy.size*.36);
     actualMoving=Math.hypot(next.x-mesh.position.x,next.z-mesh.position.z)>.0001;
     mesh.position.x=next.x;mesh.position.z=next.z;
     // Um único passo audível por ciclo, mesmo com FPS muito alto.
     if(actualMoving&&ai.stepTimer<=0){
       onSpiderSound('step',dist,enemy);
       ai.stepTimer=.48;
     }
   }
   const jumpAltitude=ai.action==='Jump'?spiderJumpHeight(ai.actionTime):0;
   mesh.position.y=getGroundHeight(mesh.position.x,mesh.position.z)+enemy.size/2+jumpAltitude;
   mesh.scale.set(1,1,1);mesh.rotation.z=0;
   if(dist<35&&dist>.01)mesh.rotation.y=ai.action==='Jump'?ai.jumpYaw:Math.atan2(dx,dz);
   // Amostrar a normal só periodicamente: quatro queries de relevo por aranha.
   ai.slopeTimer=(ai.slopeTimer||0)-step;
   if(ai.slopeTimer<=0){
     ai.slope=spiderTerrainSlope(mesh.position.x,mesh.position.z,mesh.rotation.y,getGroundHeight);
     ai.slopeTimer=.18;
   }
   enemy.spiderVisual?.update(step,actualMoving,dist<42,actualMoving?1:0,ai.slope,dist<24);
 }
 return {update};
}
