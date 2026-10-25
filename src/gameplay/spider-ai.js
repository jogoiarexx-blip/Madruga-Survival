// Controlador separado dos zumbis: salto curto, mordida sincronizada e disparo de teia.
// As decisões são feitas por timers, sem duplicar dano por quadro nem atacar à distância sem linha de visão.
export const SPIDER_ATTACK_PHASE=0.48/1.12;
export const SPIDER_WEB_PHASE=0.49/1.45;
export function spiderDecision(distance,visible,timer,random=0.5){
  if(timer>0||!visible)return null;
  if(distance<2.2)return 'Attack';
  if(distance>5&&distance<15)return 'WebShot';
  if(distance>=2.2&&distance<5&&random<.30)return 'Jump';
  return null;
}
export function createSpiderAI({player,getGroundHeight,resolveCollision,damagePlayer,throwProjectile,hasLineOfSight=()=>true}){
 function update(enemy,dt,elapsed){
   const mesh=enemy.mesh;
   const dx=player.position.x-mesh.position.x,dz=player.position.z-mesh.position.z,dist=Math.hypot(dx,dz);
   const visible=dist<26&&hasLineOfSight(mesh.position,player.position);
   const ai=enemy.spiderBrain||(enemy.spiderBrain={cooldown:1.1,action:null,actionTime:0,hit:false});
   ai.cooldown=Math.max(0,ai.cooldown-dt);
   enemy.knockback=Math.max(0,(enemy.knockback||0)-dt);
   if(ai.action){
     ai.actionTime+=dt;
     if(ai.action==='Attack'&&!ai.hit&&ai.actionTime>=.48){
       ai.hit=true;
       const near=Math.hypot(mesh.position.x-player.position.x,mesh.position.z-player.position.z);
       if(near<2.2&&hasLineOfSight(mesh.position,player.position))damagePlayer(enemy.damage,mesh.position);
     }
     if(ai.action==='WebShot'&&!ai.hit&&ai.actionTime>=.49){
       ai.hit=true;if(visible)throwProjectile(enemy);
     }
     if(ai.actionTime>=(ai.action==='WebShot'?1.45:ai.action==='Jump'?1.6:1.12)){
       ai.action=null;ai.actionTime=0;
     }
   }
   const decision=ai.action?null:spiderDecision(dist,visible,ai.cooldown,Math.abs(Math.sin(elapsed+mesh.id)));
   if(decision){
     ai.action=decision;ai.actionTime=0;ai.hit=false;
     ai.cooldown=decision==='WebShot'?5.1:decision==='Jump'?3.0:1.55;
     if(decision==='Jump')enemy.spiderVisual?.jump();
     else enemy.spiderVisual?.attack(decision);
   }
   const moving=!ai.action&&enemy.knockback<=0&&dist>2.0&&dist<32;
   if(moving){
     const speed=enemy.speed*dt;
     const next=resolveCollision(mesh.position.x+dx/(dist||1)*speed,mesh.position.z+dz/(dist||1)*speed,enemy.size*.36);
     mesh.position.x=next.x;mesh.position.z=next.z;
   }
   mesh.position.y=getGroundHeight(mesh.position.x,mesh.position.z)+enemy.size/2;
   mesh.scale.set(1,1,1);mesh.rotation.z=0;
   if(dist<35&&dist>0.01)mesh.rotation.y=Math.atan2(dx,dz);
   enemy.spiderVisual?.update(dt,moving,dist<48,moving?1:0);
 }
 return {update};
}
