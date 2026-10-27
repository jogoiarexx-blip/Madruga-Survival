// Tiro do Chaves: o dano ocorre no evento do clipe Shoot, não no primeiro frame.
export const CHAVES_SHOT_TIME=0.46;
export const CHAVES_SHOOT_DURATION=1.20;
export const CHAVES_SHOT_COOLDOWN=1.45;
export const CHAVES_SHOT_RANGE=11;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

export function guardTarget(enemies,origin,{detectionRange=13,canSee=()=>true}={}){
    if(!Array.isArray(enemies)||!origin)return null;
    let nearest=null,best=Infinity;
    for(const enemy of enemies){
        if(!enemy||enemy.hp<=0||enemy.type==='boss'||!enemy.mesh?.position)continue;
        const d=dist(origin,enemy.mesh.position);
        if(d<best&&d<=detectionRange&&canSee(origin,enemy.mesh.position)){
            nearest=enemy;best=d;
        }
    }
    return nearest;
}
export function validGuardShot(target,origin,{range=CHAVES_SHOT_RANGE,canSee=()=>true}={}){
    const p=target?.mesh?.position;
    return !!p&&target.hp>0&&!!origin&&dist(origin,p)<=range&&canSee(origin,p);
}
export function createGuardShotController({shotTime=CHAVES_SHOT_TIME,
  clipDuration=CHAVES_SHOOT_DURATION,cooldown=CHAVES_SHOT_COOLDOWN}={}){
    let readyAt=0,clock=0,pending=null,animating=0;
    function begin(target){
        if(!target||target.hp<=0||clock<readyAt||pending||animating>0)return false;
        pending={target,delay:shotTime};readyAt=clock+cooldown;animating=clipDuration;
        return true;
    }
    function update(dt,position,{canSee=()=>true,onHit=()=>{},range=CHAVES_SHOT_RANGE}={}){
        if(!Number.isFinite(dt)||dt<0)return false;
        clock+=dt;animating=Math.max(0,animating-dt);
        if(!pending)return false;
        pending.delay-=dt;
        if(pending.delay>0)return false;
        const target=pending.target;pending=null;
        if(!validGuardShot(target,position,{range,canSee}))return false;
        onHit(target);
        return true;
    }
    function cancel(){pending=null;animating=0;}
    return {begin,update,cancel,
        get isShooting(){return animating>0},get ready(){return clock>=readyAt&&!pending&&animating===0},
        get hasPendingShot(){return !!pending}};
}
