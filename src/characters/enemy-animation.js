import {isZombieType} from '../gameplay/zombie-variants.js';
// Animação procedural, sem arquivos externos ou skeletal mixer.
// Os pivôs do rig são partes visuais: não modificam posição/collider do inimigo.
export function enemyPose(type, time, moving, windup=0, knocked=0, enraged=false) {
    const speed = type==='boss' ? 3.9 : type==='tank' ? 4.4 : type==='fast' ? 11 : type==='zombie_runner' ? 10.8 : isZombieType(type) ? 4.9 : 7;
    const stride = moving ? Math.sin(time*speed)*.48 : Math.sin(time*2.1)*.035;
    const attack = windup>0 ? 1 : 0;
    const zombiePose = isZombieType(type);
    return {
        leftLeg: stride, rightLeg: -stride,
        leftArm: zombiePose ? -.95 + stride*.16 - attack*.10 : -stride*.45 - attack*(type==='boss'?1.05:.6),
        rightArm: zombiePose ? -.95 - stride*.16 - attack*.12 : stride*.45 - attack*.75,
        torsoTilt: knocked>0 ? .12 : attack ? -.14 : Math.sin(time*2.4)*.015,
        headYaw: Math.sin(time*1.8)*.08,
        pulse: enraged ? .15 + .10*Math.sin(time*12) : 0
    };
}
export function animateEnemy(enemy, elapsed, moving, dt=0.016,near=true,pace=1,footIKNear=true) {
    if(enemy.rev4Visual){enemy.rev4Visual.update(dt,moving,near,pace,footIKNear);return;}
    const rig=enemy.mesh?.userData?.rig;
    if (!rig) return;
    const pose=enemyPose(enemy.type,elapsed+enemy.mesh.id*.18,moving,enemy.windup,enemy.knockback,enemy.enraged);
    rig.leftLeg.rotation.x=pose.leftLeg;
    rig.rightLeg.rotation.x=pose.rightLeg;
    rig.leftArm.rotation.x=pose.leftArm;
    rig.rightArm.rotation.x=pose.rightArm;
    rig.head.rotation.y=pose.headYaw;
    rig.head.rotation.x=pose.torsoTilt;
    if (rig.aura) {
        rig.aura.visible=enemy.enraged || enemy.windup>0;
        rig.aura.scale.setScalar(1+pose.pulse);
    }
}
