import {spiderInterruptWindup} from './spider-ai.js?v=2.11.0-spider';
import {PLAYER_HIT_PHASES,PLAYER_ATTACK_DURATIONS} from '../characters/player-attack-pose.js';
import {nextComboStep,comboProfile,COMBO_WINDOW,ATTACK_BUFFER_WINDOW} from './combo-system.js?v=2.4.0-combat';
// Combate corpo a corpo, especial, dano em inimigos e efeitos temporários.
export function isInAttackArc(playerPosition, playerYaw, target, radius, cosineThreshold) {
    const dx = target.x - playerPosition.x;
    const dz = target.z - playerPosition.z;
    const dist = Math.hypot(dx, dz);
    if (dist > radius || dist < 0.001) return false;
    return (-Math.sin(playerYaw) * dx - Math.cos(playerYaw) * dz) / dist >= cosineThreshold;
}

export function createCombatSystem({THREE,scene,player,enemies,weaponTypes,healthPacks,speedBoosts,particles,
  getGroundHeight,resolveCollision,removeMesh,spawnParticle,gainXP,showToast,sfx,
  spawnEnemy,spawnHealthPack,spawnSpeedBoost,advanceQuestIfReady,updateHUD,
  onBossDefeated,onEnemyKilled,getLevel,getWeaponIndex,getPlayerYaw,isGameActive,isLocked,
  getWeaponBonus=()=>0,onWeaponHit=()=>{},onSwing=()=>0,onEnemyDamaged=()=>{},
  onAttackStart=()=>{},onSpecialStart=()=>{},onHitFeedback=()=>{}}) {
let attackCooldown=0, specialCooldown=0, attackAnimTimer=0, attackAnimDuration=.34;
let pendingAttack=null,queuedAttack=false,combatClock=0,lastAttackAt=-Infinity,lastWeapon=-1,lastStep=0,comboStep=0;
const slashEffects=[];
function damageEnemy(enemy, amount, knockback = 0.35, credited = true, impactStrength = 1) {
    if (!enemies.includes(enemy)) return;
    enemy.hp -= amount;
    onEnemyDamaged(enemy);
    // Short hit-stun only: bosses resist staggering and ongoing attacks aren't cancelled.
    const stagger=enemy.type==='boss'?.12:Math.min(.36,.17*Math.max(.5,Math.min(2,impactStrength)));
    enemy.knockback = Math.max(enemy.knockback||0,stagger);
    if(enemy.hp>0){
      enemy.rev4Visual?.hurt();
      enemy.goblinVisual?.hurt();
      if(enemy.type==='spider'){
        const interrupted=spiderInterruptWindup(enemy.spiderBrain,impactStrength);
        if(interrupted)enemy.spiderVisual?.interrupt?.();
        enemy.spiderVisual?.hurt(impactStrength);
        // Dano comum não interrompe a animação de ataque, mas gera reação visível.
        sfx.spiderHurt?.(Math.hypot(enemy.mesh.position.x-player.position.x,
          enemy.mesh.position.z-player.position.z));
      }
    }
    if(enemy.type==='boss' && enemy.hp>0 && enemy.hp<=enemy.maxHp*.5 && !enemy.enraged){
        enemy.enraged=true;enemy.speed*=1.28;
        enemy.mesh.material.color.setHex(0xe24629);
        enemy.attackTimer=Math.max(enemy.attackTimer,1.1);
        showToast('⚠ GUARDIÃO EM FÚRIA! Fase 2: novos ataques');
        sfx.boost();
        if(enemies.length<12){spawnEnemy('fast');spawnEnemy('normal');}
    }
    enemy.mesh.material.emissiveIntensity = 0.4;
    spawnParticle(enemy.mesh.position, 0xff6644, 6);
    const dx = enemy.mesh.position.x - player.position.x;
    const dz = enemy.mesh.position.z - player.position.z;
    const length = Math.hypot(dx, dz) || 1;
    const pushed = resolveCollision(enemy.mesh.position.x + dx / length * knockback,
        enemy.mesh.position.z + dz / length * knockback, enemy.size * 0.5);
    enemy.mesh.position.x = pushed.x; enemy.mesh.position.z = pushed.z;
    sfx.hit();
    if (enemy.hp <= 0) {
        if(enemy.type==='spider')sfx.spiderDeath?.(Math.hypot(enemy.mesh.position.x-player.position.x,
          enemy.mesh.position.z-player.position.z));
        const drop = {x: enemy.mesh.position.x, z: enemy.mesh.position.z};
        removeMesh(enemy.mesh,true);
        enemies.splice(enemies.indexOf(enemy), 1);
        if(credited){onEnemyKilled(enemy.type,drop,enemy);
        gainXP(enemy.type === 'boss' ? 22 : enemy.type === 'tank' ? 5 : enemy.type==='shaman'?4:2);}
        if (enemy.type === 'boss') { onBossDefeated(); showToast('🏆 Guardião derrotado! Termine de juntar as peças!'); }
        advanceQuestIfReady();
        if (credited && healthPacks.length < 12 && Math.random() < (enemy.type==='boss'?1:0.18)) spawnHealthPack(drop);
        if (credited && speedBoosts.length < 9 && Math.random() < 0.1) spawnSpeedBoost(drop);
    }
    updateHUD();
}
function spawnSlashArc(selected,index,profile){
    const halfAngle=Math.PI*selected.arc*profile.arc,effect=new THREE.Group();
    effect.rotation.y=getPlayerYaw();
    effect.position.set(player.position.x,getGroundHeight(player.position.x,player.position.z)+1.13,player.position.z);
    const mesh=new THREE.Mesh(new THREE.RingGeometry(selected.range*.44,selected.range*.49,
        28,1,Math.PI*.5-halfAngle,halfAngle*2),
        new THREE.MeshBasicMaterial({color:profile.step===2?0xfff6b4:index===2?0x9efae8:0xffdf88,
            transparent:true,opacity:.68,side:THREE.DoubleSide,depthWrite:false}));
    mesh.position.z=-.68;effect.add(mesh);scene.add(effect);
    slashEffects.push({effect,mesh,life:.18});
}
function resolveWeaponHit(attack){
    if(!isGameActive()||!isLocked())return;
    const {selected,index,profile}=attack;
    const damage=selected.damage+getWeaponBonus()+Math.floor((getLevel()-1)/3)+profile.damageBonus;
    spawnSlashArc(selected,index,profile);
    let hits=0;
    for(const e of [...enemies]){
      if(isInAttackArc(player.position,getPlayerYaw(),e.mesh.position,
        selected.range*profile.reach+e.size*.2,Math.cos(Math.PI*selected.arc*profile.arc)) &&
        Math.abs(e.mesh.position.y-player.position.y)<2.6){
        damageEnemy(e,damage,(index===1?.65:index===2?.25:.35)*profile.knockback,true,profile.knockback);hits++;
      }
    }
    hits+=onSwing(selected.range*profile.reach,Math.min(1,selected.arc*profile.arc),damage,getPlayerYaw())||0;
    if(hits)onWeaponHit();
    if(hits){
      spawnParticle(player.position.clone().add(new THREE.Vector3(0,1,0)),profile.step===2?0xffe4a0:0xffd07b,profile.step===2?8:5);
      onHitFeedback({hits,step:profile.step,weapon:index,damage});
    }
}
function startAttack(){
    const index=getWeaponIndex(),selected=weaponTypes[index];
    if(!selected)return false;
    comboStep=nextComboStep({lastWeapon,weapon:index,lastStep,elapsed:combatClock-lastAttackAt});
    const profile=comboProfile(index,comboStep);
    lastStep=comboStep;lastWeapon=index;lastAttackAt=combatClock;
    queuedAttack=false;
    attackCooldown=Math.max(.22,selected.cooldown-(getLevel()-1)*.012)*(comboStep===2?1.10:1);
    attackAnimDuration=(PLAYER_ATTACK_DURATIONS[index]??.34)*profile.duration;
    attackAnimTimer=attackAnimDuration;
    pendingAttack={selected,index,profile,elapsed:0,hitAt:attackAnimDuration*profile.hitPhase};
    sfx.attack();
    const visual=onAttackStart();
    // REV5 clips report their authored contact phase; hit resolves only once.
    if(visual&&typeof visual==='object'&&Number.isFinite(visual.hitPhase)&&
       visual.hitPhase>=.1&&visual.hitPhase<=.9){
      pendingAttack.hitAt=attackAnimDuration*visual.hitPhase;
    }
    updateHUD();
    return true;
}
function doAttack(){
    if(!isGameActive()||!isLocked())return false;
    if(attackCooldown>0){
      // Buffer only near the end of recovery; repeated early clicks do not
      // generate phantom queued hits or bypass the weapon's cooldown.
      if(attackCooldown<=ATTACK_BUFFER_WINDOW && lastWeapon===getWeaponIndex() &&
         combatClock-lastAttackAt<=COMBO_WINDOW && lastStep<2){
        queuedAttack=true;return true;
      }
      return false;
    }
    return startAttack();
}
const shockwaves = [];
function doSpecialAttack() {
    if (specialCooldown > 0 || !isGameActive() || !isLocked()) return;
    specialCooldown = Math.max(5, 9 - getLevel() * 0.35);
    pendingAttack=null;queuedAttack=false;lastWeapon=-1;lastAttackAt=-Infinity;comboStep=0;
    attackAnimDuration = attackAnimTimer = 0.48;
    sfx.boost(); sfx.attack(); onSpecialStart();
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.83, 1.0, 48), new THREE.MeshBasicMaterial({
        color: 0xffd263, transparent: true, opacity: 0.82, depthWrite: false, side: THREE.DoubleSide
    }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(player.position); ring.position.y += 0.15;
    scene.add(ring); shockwaves.push({mesh:ring, life:0.40});
    for (const e of [...enemies]) {
        if (Math.hypot(e.mesh.position.x-player.position.x, e.mesh.position.z-player.position.z) < 3.8 + e.size * 0.3) {
            damageEnemy(e, 2 + Math.floor((getLevel()-1)/4), 1.4);
        }
    }
    onSwing(3.6,1,2+Math.floor((getLevel()-1)/4),getPlayerYaw());
    updateHUD();
}

function update(dt){
    if(!Number.isFinite(dt)||dt<=0)return;
    dt=Math.min(dt,2);combatClock+=dt;
    attackCooldown=Math.max(0,attackCooldown-dt);
    specialCooldown=Math.max(0,specialCooldown-dt);
    attackAnimTimer=Math.max(0,attackAnimTimer-dt);
    if(pendingAttack){
      if(getWeaponIndex()!==pendingAttack.index||!isGameActive()){
        pendingAttack=null;queuedAttack=false;lastWeapon=-1;
      }
      else{
        pendingAttack.elapsed+=Math.max(0,dt);
        if(pendingAttack.elapsed+1e-8>=pendingAttack.hitAt){
          const attack=pendingAttack;pendingAttack=null;resolveWeaponHit(attack);
        }
      }
    }
    if(queuedAttack){
      if(getWeaponIndex()!==lastWeapon || !isGameActive() || !isLocked() || combatClock-lastAttackAt>COMBO_WINDOW){queuedAttack=false;}
      else if(attackCooldown===0 && attackAnimTimer===0 && !pendingAttack)startAttack();
    }
}
function tickEffects(dt){
        for(let i=slashEffects.length-1;i>=0;i--){
            const f=slashEffects[i];f.life-=dt;
            f.mesh.material.opacity=Math.max(0,f.life/.18)*.78;
            f.effect.scale.setScalar(1+(1-f.life/.18)*.12);
            if(f.life<=0){removeMesh(f.effect);slashEffects.splice(i,1);}
        }
        // Partículas e ondas paradas ao abrir o menu de pausa.
        for (let i=particles.length-1;i>=0;i--) {
            const p=particles[i];p.userData.life-=dt*2.2;
            p.position.addScaledVector(p.userData.vel,dt);
            p.userData.vel.y-=9.8*dt;
            p.material.opacity=Math.max(0,p.userData.life);
            if (p.userData.life<=0) {scene.remove(p);p.material.dispose();particles.splice(i,1);}
        }
        for (let i=shockwaves.length-1;i>=0;i--) {
            const effect=shockwaves[i];effect.life-=dt;
            const fraction=1- Math.max(0,effect.life)/0.4;
            effect.mesh.scale.setScalar(1+fraction*3.6);
            effect.mesh.position.y=getGroundHeight(effect.mesh.position.x,effect.mesh.position.z)+0.14;
            effect.mesh.material.opacity=Math.max(0,effect.life/0.4)*0.85;
            if (effect.life<=0){removeMesh(effect.mesh);shockwaves.splice(i,1);}
        }

}
return {attack:doAttack,special:doSpecialAttack,damageEnemy,update,tickEffects,
    get specialCooldown(){return specialCooldown},
    get attackAnimTimer(){return attackAnimTimer},
    get attackAnimDuration(){return attackAnimDuration},
    get isAttacking(){return attackAnimTimer>0},
    get attackWeaponIndex(){return pendingAttack?.index??getWeaponIndex()},
    get comboStep(){return comboStep},
    get comboActive(){return combatClock-lastAttackAt<=COMBO_WINDOW && lastStep<2 && lastWeapon===getWeaponIndex()},
    get attackBuffered(){return queuedAttack},
    cancelAttack(){pendingAttack=null;queuedAttack=false;attackAnimTimer=0;lastWeapon=-1;lastAttackAt=-Infinity;comboStep=0}};
}
