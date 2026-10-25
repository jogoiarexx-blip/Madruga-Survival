// Projéteis de xamãs e guardião, com atualização e limpeza isoladas.
export function createProjectileSystem({THREE,scene,player,allColliders,isPositionFree,damagePlayer,removeMesh,isGameActive,onWebHit=()=>{}}) {
const projectiles=[];
function throwProjectile(enemy, spread = 0) {
    const origin = enemy.mesh.position.clone(); origin.y += 0.45;
    const direction = player.position.clone().add(new THREE.Vector3(0,1,0)).sub(origin).normalize();
    direction.applyAxisAngle(new THREE.Vector3(0,1,0),spread);
    const isWeb=enemy.type==='spider';
    const orb = new THREE.Mesh(isWeb?new THREE.IcosahedronGeometry(.32,1):new THREE.IcosahedronGeometry(0.23,0),
        new THREE.MeshStandardMaterial({color:isWeb?0xddd7ee:0x8b59e8,emissive:isWeb?0x8d6ca2:0x623ed9,emissiveIntensity:isWeb?.45:1.25}));
    orb.position.copy(origin);scene.add(orb);
    projectiles.push({mesh:orb, velocity: direction.multiplyScalar(isWeb?8:enemy.type==='boss'?11:12),
        age:0,isWeb,damage:isWeb?3:enemy.type==='boss' ? (enemy.enraged?15:12) : enemy.damage});
}
function updateProjectiles(dt) {
    for (let i=projectiles.length-1;i>=0;i--) {
        const p=projectiles[i]; p.age+=dt;
        // Subpassos impedem projéteis de atravessar paredes finas em FPS baixo.
        // Aplicar lentidão apenas se o dano realmente passou pela esquiva.
        const distance=p.velocity.length()*Math.min(dt,.12);
        const substeps=Math.max(1,Math.ceil(distance/.24));
        let collided=false,hitPlayer=false;
        for(let step=0;step<substeps&&!collided&&!hitPlayer;step++){
            p.mesh.position.addScaledVector(p.velocity,Math.min(dt,.12)/substeps);
            collided = isPositionFree ? !isPositionFree(p.mesh.position.x,p.mesh.position.z,0.16) :
                allColliders.some(c => (c.x-p.mesh.position.x)**2+(c.z-p.mesh.position.z)**2 < (c.radius+0.16)**2);
            if(collided)break;
            hitPlayer=Math.hypot(player.position.x-p.mesh.position.x,player.position.z-p.mesh.position.z)<0.83 &&
                Math.abs(player.position.y+1-p.mesh.position.y)<1.2;
            if(hitPlayer){const applied=damagePlayer(p.damage,p.mesh.position);if(applied&&p.isWeb)onWebHit(2.7);}
        }
        p.mesh.rotation.y+=dt*6;
        if (p.age>4 || collided || hitPlayer || !isGameActive()) {
            removeMesh(p.mesh);projectiles.splice(i,1);
        }
    }
}
return {throwProjectile, update:updateProjectiles, get count(){return projectiles.length;}};
}
