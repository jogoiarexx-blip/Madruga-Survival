import {ZOMBIE_TYPES,isZombieType} from './zombie-variants.js';
import {animateEnemy} from '../characters/enemy-animation.js';
import {faceZombieAlongPath} from './zombie-facing.js';
import {updateZombieAwareness} from './zombie-perception.js';
import {queueZombieImpact,advanceZombieImpact,ZOMBIE_ATTACK_DURATION} from './zombie-attack-events.js?v=2.1.3-zombie-combat';

// Atualização de IA independente da renderização e dos controles.
export function createEnemyAI({enemies,player,getGroundHeight,resolveCollision,
  showBossTelegraph,hideBossTelegraph,damagePlayer,spawnParticle,throwProjectile,sfx,isGameActive,hasLineOfSight,getRaidTarget=()=>null,onRaidDamage=()=>{},getGuard=()=>null,onGuardDamage=()=>{},onPoison=()=>{},getPlayerPerception=null}) {
function update(dt,elapsed){
        // IA por tipo: melee perseguidor, xamã de longo alcance e chefe com aviso de ataque.
        for (const enemy of enemies) {
            if (!isGameActive()) break;
            const mesh=enemy.mesh;
            const targetBuilding=enemy.raider?getRaidTarget(mesh.position):null;
            const ally=!targetBuilding&&isZombieType(enemy.type)?getGuard():null;
            const guardDistance=ally?Math.hypot(mesh.position.x-ally.x,mesh.position.z-ally.z):Infinity;
            const playerDistance=Math.hypot(mesh.position.x-player.position.x,mesh.position.z-player.position.z);
            const targetGuard=ally&&guardDistance<9&&guardDistance<playerDistance+.4?ally:null;
            // Raids/guard/boss retain their explicit combat targets. Ordinary
            // zombies use sight, hearing and a short-lived search memory.
            const perception=getPlayerPerception?.();
            const aware=perception&&!targetBuilding&&!targetGuard&&isZombieType(enemy.type)&&!enemy.raider?
                updateZombieAwareness(enemy,{player:player.position,now:elapsed,dt,
                  ...perception,canSee:(from,to)=>!hasLineOfSight||hasLineOfSight(from,to)}):null;
            const targetPos=targetBuilding||targetGuard||(aware?aware.target:player.position);
            const dx=targetPos?targetPos.x-mesh.position.x:0;
            const dz=targetPos?targetPos.z-mesh.position.z:0;
            const dist=Math.hypot(dx,dz);
            enemy.attackTimer=Math.max(0,enemy.attackTimer-dt);
            if(enemy.attackTimer===0)enemy.attackFacingYaw=null;
            // REV2: confirma colisão e linha de visão no instante do impacto, nunca no início da pose.
            const pending=advanceZombieImpact(enemy,dt);
            if(pending){
                const target=pending.kind==='player'?player.position:
                    pending.kind==='guard'?getGuard():pending.target;
                if(target){
                    const radius=pending.kind==='building'?2.25:1.85;
                    const distance=Math.hypot(target.x-mesh.position.x,target.z-mesh.position.z);
                    const aimX=target.x-mesh.position.x,aimZ=target.z-mesh.position.z;
                    const frontDot=Number.isFinite(pending.facingYaw)&&distance>.001 ?
                        (Math.sin(pending.facingYaw)*aimX+Math.cos(pending.facingYaw)*aimZ)/distance : 1;
                    if(distance<radius && frontDot>.24 && (!hasLineOfSight||hasLineOfSight(mesh.position,target))){
                        if(pending.kind==='building'){
                            onRaidDamage(pending.target,Math.round(enemy.damage*(ZOMBIE_TYPES[enemy.type]?.structureDamage||1)));
                            spawnParticle(mesh.position,0xdba679,3);
                        }else if(pending.kind==='guard')onGuardDamage(enemy.damage);
                        else if(damagePlayer(enemy.damage,mesh.position) && enemy.type==='zombie_toxic')
                            onPoison(ZOMBIE_TYPES.zombie_toxic.poisonSeconds);
                    }
                }
            }
            enemy.knockback=Math.max(0,enemy.knockback-dt);
            const shaman=enemy.type==='shaman', boss=enemy.type==='boss';
            const meleeRadius=boss?2.65:1.85;
            const visible=!!targetPos&&(!hasLineOfSight||hasLineOfSight(mesh.position,targetPos));
            const wantsToMove=!!targetPos&&(aware?dist>(aware.state==='patrol'?1.3:1):shaman?dist>9.5:boss?dist>4.1:dist>meleeRadius*.8);
            const finishingAttack=Number.isFinite(enemy.attackFacingYaw)&&enemy.attackTimer>0;
            const moving=wantsToMove && dist<52 && enemy.knockback===0 && enemy.windup===0 &&
                !enemy.pendingImpact && !finishingAttack;
            const previousX=mesh.position.x, previousZ=mesh.position.z;
            if (moving) {
                const nx=dx/(dist||1),nz=dz/(dist||1);
                // Guardião contorna o alvo ao se aproximar: mais de uma rota.
                const orbit=boss && dist<12?enemy.strafe*(enemy.enraged?.48:.27):0;
                const steerX=nx-orbit*nz,steerZ=nz+orbit*nx;
                const steerLength=Math.hypot(steerX,steerZ)||1;
                const moveSpeed=enemy.speed*(aware?.speed??1);
                let next=resolveCollision(mesh.position.x+steerX/steerLength*moveSpeed*dt,
                    mesh.position.z+steerZ/steerLength*moveSpeed*dt,enemy.size*0.48);
                if (Math.hypot(next.x-mesh.position.x,next.z-mesh.position.z)<moveSpeed*dt*0.16) {
                    const sign=mesh.id%2===0?1:-1;
                    next=resolveCollision(mesh.position.x-sign*nz*moveSpeed*dt,
                        mesh.position.z+sign*nx*moveSpeed*dt,enemy.size*0.48);
                }
                mesh.position.x=next.x;mesh.position.z=next.z;
            }
            // O REV2 já anima o quadril e as pernas dentro do GLB. Não aplicar
            // oscilação e escala procedural ao collider: isto faz os pés flutuarem
            // e cria deslizamento mesmo que a cadência da caminhada esteja correta.
            const skinnedZombie=isZombieType(enemy.type)&&!!enemy.rev4Visual;
            mesh.position.y=getGroundHeight(mesh.position.x,mesh.position.z)+enemy.size/2+
                (skinnedZombie?0:(dist<52?Math.sin(elapsed*(boss?3.2:6.2)+mesh.id)*0.035:0));
            mesh.scale.y=skinnedZombie?1:1+Math.sin(elapsed*(boss?3.2:7.4)+mesh.id)*(boss?.024:.055);
            mesh.rotation.z=skinnedZombie?0:Math.sin(elapsed*(boss?2.2:4.1)+mesh.id)*(boss?.018:.048);
            const actualMoving=moving&&Math.hypot(mesh.position.x-previousX,mesh.position.z-previousZ)>.0001;
            if (targetPos && dist<52) {
                // Orientação REV2 (+Z): ao caminhar, use a direção efetiva dos passos.
                if(isZombieType(enemy.type)) {
                    if(Number.isFinite(enemy.attackFacingYaw)&&enemy.attackTimer>0){
                        mesh.rotation.x=0;mesh.rotation.y=enemy.attackFacingYaw;
                    } else faceZombieAlongPath(mesh,targetPos,previousX,previousZ,actualMoving);
                } else mesh.lookAt(targetPos.x,mesh.position.y,targetPos.z);
            }
            const stepDistance=Math.hypot(mesh.position.x-previousX,mesh.position.z-previousZ);
            const locomotionPace=actualMoving ? stepDistance/Math.max(.001,enemy.speed*(aware?.speed??1)*dt) : 0;
            animateEnemy(enemy,elapsed,isZombieType(enemy.type)?actualMoving:moving,dt,
                Math.hypot(player.position.x-mesh.position.x,player.position.z-mesh.position.z)<48,
                locomotionPace, playerDistance<16);
            if (boss && enemy.windup>0) {
                enemy.windup=Math.max(0,enemy.windup-dt);
                showBossTelegraph(enemy);
                mesh.material.emissiveIntensity=.52+Math.sin(elapsed*24)*.35;
                if (enemy.windup===0) {
                    hideBossTelegraph();
                    // Golpe pega apenas alvos ainda dentro da área AVISADA.
                    const impactRadius=enemy.enraged?4.3:3.7;
                    if (visible && Math.hypot(player.position.x-mesh.position.x,player.position.z-mesh.position.z)<impactRadius &&
                        Math.abs(player.position.y-mesh.position.y+enemy.size*.5)<2.8) {
                        damagePlayer(enemy.damage,mesh.position);
                    }
                    spawnParticle(mesh.position,0xffa14a,enemy.enraged?18:11);
                    if(enemy.enraged){
                        // O segundo estágio acrescenta duas ondas oblíquas.
                        throwProjectile(enemy,-.33);throwProjectile(enemy,.33);
                    }
                }
            } else if (enemy.attackTimer===0 && dist<52 && (!aware||aware.canAttack||targetBuilding||targetGuard)) {
                if(targetBuilding&&dist<2.25){
                    enemy.attackTimer=shaman?2.4:1.55;
                    if(enemy.rev4Visual){
                        if(queueZombieImpact(enemy,'building',targetBuilding)){
                            enemy.rev4Visual.attack();
                            enemy.attackTimer=Math.max(enemy.attackTimer,(ZOMBIE_ATTACK_DURATION[enemy.type]||0)+.10);
                        }
                    }else{
                        onRaidDamage(targetBuilding,Math.round(enemy.damage*(ZOMBIE_TYPES[enemy.type]?.structureDamage||1)));
                        spawnParticle(mesh.position,0xdba679,3);
                    }
                } else if (shaman && visible && dist<28 && dist>2.1) {
                    throwProjectile(enemy);enemy.attackTimer=2.6;
                } else if (boss && visible && dist<5.8) {
                    enemy.windup=enemy.enraged?.72:.98;
                    enemy.attackTimer=enemy.enraged?2.25:3.1;
                    showBossTelegraph(enemy);
                    sfx.warning();
                } else if (!targetBuilding&&!shaman && !boss && visible && dist<meleeRadius) {
                    enemy.attackTimer=1.15+(enemy.type==='fast'?-.15:enemy.type==='tank'?.45:0);
                    if(enemy.rev4Visual){
                        if(queueZombieImpact(enemy,targetGuard?'guard':'player',targetGuard)){
                            enemy.rev4Visual.attack();
                            enemy.attackTimer=Math.max(enemy.attackTimer,(ZOMBIE_ATTACK_DURATION[enemy.type]||0)+.10);
                        }
                    }else{
                        if(targetGuard){onGuardDamage(enemy.damage);}
                        else if(damagePlayer(enemy.damage,mesh.position) && enemy.type==='zombie_toxic')onPoison(ZOMBIE_TYPES.zombie_toxic.poisonSeconds);
                    }
                } else if (boss && visible && dist<22) {
                    // Segunda fase: salva oblíqua com espaços para esquiva.
                    if(enemy.enraged){
                        for(const spread of [-.22,0,.22])throwProjectile(enemy,spread);
                        enemy.attackTimer=2.0;
                    } else {
                        throwProjectile(enemy);enemy.attackTimer=2.55;
                    }
                }
            }
            if (enemy.windup===0) mesh.material.emissiveIntensity=Math.max(0,mesh.material.emissiveIntensity-dt*2);
        }

}
return {update};
}
