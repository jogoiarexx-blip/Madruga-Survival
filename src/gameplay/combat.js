import {PLAYER_HIT_PHASES,PLAYER_ATTACK_DURATIONS} from '../characters/player-attack-pose.js';
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
  getWeaponBonus=()=>0,onWeaponHit=()=>{},onSwing=()=>0,
  onAttackStart=()=>{},onSpecialStart=()=>{}}) {
let attackCooldown=0, specialCooldown=0, attackAnimTimer=0, attackAnimDuration=.34;
let pendingAttack=null;
const slashEffects=[];
function damageEnemy(enemy, amount, knockback = 0.35, credited = true) {
    if (!enemies.includes(enemy)) return;
    enemy.hp -= amount;
    enemy.knockback = 0.17;
    if(enemy.hp>0)enemy.rev4Visual?.hurt();
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
        const drop = {x: enemy.mesh.position.x, z: enemy.mesh.position.z};
        removeMesh(enemy.mesh,true);
        enemies.splice(enemies.indexOf(enemy), 1);
        if(credited){onEnemyKilled(enemy.type,drop);
        gainXP(enemy.type === 'boss' ? 22 : enemy.type === 'tank' ? 5 : enemy.type==='shaman'?4:2);}
        if (enemy.type === 'boss') { onBossDefeated(); showToast('🏆 Guardião derrotado! Termine de juntar as peças!'); }
        advanceQuestIfReady();
        if (credited && healthPacks.length < 12 && Math.random() < (enemy.type==='boss'?1:0.18)) spawnHealthPack(drop);
        if (credited && speedBoosts.length < 9 && Math.random() < 0.1) spawnSpeedBoost(drop);
    }
    updateHUD();
}
function spawnSlashArc(selected,index){
    const halfAngle=Math.PI*selected.arc,effect=new THREE.Group();
    effect.rotation.y=getPlayerYaw();
    effect.position.set(player.position.x,getGroundHeight(player.position.x,player.position.z)+1.13,player.position.z);
    const mesh=new THREE.Mesh(new THREE.RingGeometry(selected.range*.44,selected.range*.49,
        28,1,Math.PI*.5-halfAngle,halfAngle*2),
        new THREE.MeshBasicMaterial({color:index===2?0x9efae8:0xffdf88,
            transparent:true,opacity:.68,side:THREE.DoubleSide,depthWrite:false}));
    mesh.position.z=-.68;effect.add(mesh);scene.add(effect);
    slashEffects.push({effect,mesh,life:.18});
}
function resolveWeaponHit(attack){
    if(!isGameActive()||!isLocked())return;
    const {selected,index}=attack;
    const damage=selected.damage+getWeaponBonus()+Math.floor((getLevel()-1)/3);
    spawnSlashArc(selected,index);
    let hits=0;
    for(const e of [...enemies]){
      if(isInAttackArc(player.position,getPlayerYaw(),e.mesh.position,
        selected.range+e.size*.2,Math.cos(Math.PI*selected.arc)) &&
        Math.abs(e.mesh.position.y-player.position.y)<2.6){
        damageEnemy(e,damage);hits++;
      }
    }
    hits+=onSwing(selected.range,selected.arc,damage,getPlayerYaw())||0;
    if(hits)onWeaponHit();
    if(hits)spawnParticle(player.position.clone().add(new THREE.Vector3(0,1,0)),0xffd07b,5);
}
function doAttack(){
    if(attackCooldown>0||!isGameActive()||!isLocked())return false;
    const index=getWeaponIndex(),selected=weaponTypes[index];
    if(!selected)return false;
    attackCooldown=Math.max(.22,selected.cooldown-(getLevel()-1)*.012);
    attackAnimDuration=PLAYER_ATTACK_DURATIONS[index]??.34;
    attackAnimTimer=attackAnimDuration;
    pendingAttack={selected,index,elapsed:0,hitAt:attackAnimDuration*(PLAYER_HIT_PHASES[index]??.55)};
    sfx.attack();onAttackStart();
    return true;
}
const shockwaves = [];
function doSpecialAttack() {
    if (specialCooldown > 0 || !isGameActive() || !isLocked()) return;
    specialCooldown = Math.max(5, 9 - getLevel() * 0.35);
    pendingAttack=null;
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
    attackCooldown=Math.max(0,attackCooldown-dt);
    specialCooldown=Math.max(0,specialCooldown-dt);
    attackAnimTimer=Math.max(0,attackAnimTimer-dt);
    if(pendingAttack){
      if(getWeaponIndex()!==pendingAttack.index||!isGameActive())pendingAttack=null;
      else{
        pendingAttack.elapsed+=Math.max(0,dt);
        if(pendingAttack.elapsed+1e-8>=pendingAttack.hitAt){
          const attack=pendingAttack;pendingAttack=null;resolveWeaponHit(attack);
        }
      }
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
    cancelAttack(){pendingAttack=null;attackAnimTimer=0}};
}
