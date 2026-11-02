// Câmera orbital em terceira pessoa com checagem de obstáculos locais.
// Apenas malhas próximas ao segmento alvo-câmera entram no raycast.
export function distanceToSegmentSquared(point, start, end) {
    const vx=end.x-start.x,vz=end.z-start.z;
    const lengthSq=vx*vx+vz*vz;
    const t=lengthSq?Math.max(0,Math.min(1,((point.x-start.x)*vx+(point.z-start.z)*vz)/lengthSq)):0;
    const dx=point.x-(start.x+vx*t),dz=point.z-(start.z+vz*t);
    return dx*dx+dz*dz;
}
export function selectNearBlockers(entries,start,end,radius=3.0,result=[]) {
    result.length=0;
    for (const entry of entries) {
        if (!entry?.mesh || entry.mesh.visible===false) continue;
        // Ruínas são grupos grandes: seu pivô pode ficar longe da linha de
        // visão, mas uma parede da fachada ainda pode cruzar a câmera.
        const effective=radius+Math.max(0,Number.isFinite(entry.radius)?entry.radius:0);
        if (distanceToSegmentSquared(entry,start,end)<=effective*effective) result.push(entry.mesh);
    }
    return result;
}
// Mantém a câmera dentro da arena sem teleportar o alvo nem mexer na colisão do jogador.
// Interseção analítica com o círculo; evita atravessar paredes mesmo em frestas.
export function clampCameraToArena(start,end,arena){
    if(!arena||!Number.isFinite(arena.radius)||arena.radius<=0)return {...end};
    const radius=Math.max(.5,arena.radius-.38),dx=end.x-start.x,dz=end.z-start.z;
    const fromX=start.x-arena.x,fromZ=start.z-arena.z;
    if((end.x-arena.x)**2+(end.z-arena.z)**2<=radius**2)return {...end};
    const a=dx*dx+dz*dz,b=2*(fromX*dx+fromZ*dz),c=fromX*fromX+fromZ*fromZ-radius*radius;
    const disc=b*b-4*a*c;
    if(a>1e-8&&disc>=0&&c<=0){
        const t=Math.max(0,Math.min(1,(-b+Math.sqrt(disc))/(2*a)));
        return {x:start.x+dx*t*.995,y:start.y+(end.y-start.y)*t*.995,z:start.z+dz*t*.995};
    }
    const r=Math.hypot(end.x-arena.x,end.z-arena.z)||1;
    return {x:arena.x+(end.x-arena.x)*radius/r,y:end.y,z:arena.z+(end.z-arena.z)*radius/r};
}
export function createCameraRig({THREE,camera,player,raycaster,getGroundHeight,cameraObstacles,scene}) {
    const cameraTarget=new THREE.Vector3();
    const desired=new THREE.Vector3();
    const direction=new THREE.Vector3();
    const localOrigin=new THREE.Vector3();
    const cameraOffset=new THREE.Vector3(0,1.55,0);
    const nearbyBlockers=[];
    const hits=[];
    const nearby=[];
    let blockers=[];
    let ground=null;
    let cameraDistance=7.6,zoomDistance=7.6,arena=null,snapOnNext=false,dynamicBlockers=[];
    function refreshObstacles() {
        scene.updateMatrixWorld(true);
        // Chamada após a geração da floresta e das ruínas; geometria estática.
        ground=cameraObstacles[0] ?? null;
        blockers=cameraObstacles.slice(1).map(mesh=>{
            if (typeof mesh.getWorldPosition==='function') mesh.getWorldPosition(localOrigin);
            else if(mesh.parent?.position) localOrigin.copy(mesh.parent.position);
            else localOrigin.copy(mesh.position);
            return {mesh,x:localOrigin.x,z:localOrigin.z,radius:mesh.userData?.cameraRadius||0};
        });
    }
    function clipToWorld(target) {
        // O candidato já usa o mesmo ponto focal que o render. Reusar buffers
        // evita alocar três vetores e dezenas de arrays em cada frame.
        direction.copy(target).sub(cameraTarget);
        const length=direction.length();
        if(length<=.01)return false;
        direction.multiplyScalar(1/length);
        raycaster.set(cameraTarget,direction);
        raycaster.far=length;
        nearby.length=0;
        if(ground&&ground.visible!==false)nearby.push(ground);
        selectNearBlockers(blockers,cameraTarget,target,2.1,nearbyBlockers);
        for(const mesh of nearbyBlockers)nearby.push(mesh);
        if(arena){
            selectNearBlockers(dynamicBlockers,cameraTarget,target,2.0,nearbyBlockers);
            for(const mesh of nearbyBlockers)nearby.push(mesh);
        }
        if(!nearby.length)return false;
        hits.length=0;
        const intersections=raycaster.intersectObjects(nearby,true,hits);
        let nearest=Infinity;
        for(const hit of intersections){
            if(Number.isFinite(hit.distance)&&hit.distance>=0&&hit.distance<nearest)
                nearest=hit.distance;
        }
        // Um obstáculo entre a cabeça do jogador e a câmera nunca pode ser
        // atravessado pelo resultado interpolado, mesmo girando rapidamente.
        if(nearest>=length||!Number.isFinite(nearest))return false;
        const clear=Math.max(.12,Math.min(length,nearest-.38));
        target.copy(cameraTarget).addScaledVector(direction,clear);
        return true;
    }
    function update(dt,yaw,pitch) {
        const step=Math.max(0,Math.min(.1,Number.isFinite(dt)?dt:0));
        if(snapOnNext)zoomDistance=cameraDistance;
        else zoomDistance+=(cameraDistance-zoomDistance)*(1-Math.exp(-10*step));
        cameraTarget.copy(player.position).add(cameraOffset);
        desired.set(
            player.position.x+Math.sin(yaw)*zoomDistance*(arena?.zoom??1)*Math.cos(pitch),
            player.position.y+3.25+Math.sin(pitch)*5.4,
            player.position.z+Math.cos(yaw)*zoomDistance*(arena?.zoom??1)*Math.cos(pitch)
        );
        desired.y=Math.max(getGroundHeight(desired.x,desired.z)+1.1,desired.y);
        if(arena){
            const limit=clampCameraToArena(cameraTarget,desired,arena);
            desired.set(limit.x,limit.y,limit.z);
        }
        // Encurtar imediatamente quando a câmera se aproxima de uma parede.
        const obstructed=clipToWorld(desired);
        const previousRadius=camera.position.distanceTo(cameraTarget);
        const desiredRadius=desired.distanceTo(cameraTarget);
        if(snapOnNext){
            camera.position.copy(desired);
            snapOnNext=false;
        }else if(obstructed&&previousRadius>desiredRadius+.03){
            camera.position.copy(desired);
        }else{
            camera.position.lerp(desired,1-Math.exp(-9*step));
        }
        if(arena){
            const bounded=clampCameraToArena(cameraTarget,camera.position,arena);
            camera.position.set(bounded.x,bounded.y,bounded.z);
        }
        // A interpolação lateral pode terminar ATRÁS de uma parede mesmo que
        // desired esteja livre. Validar também a posição efetivamente renderizada.
        clipToWorld(camera.position);
        if(arena){
            const bounded=clampCameraToArena(cameraTarget,camera.position,arena);
            camera.position.set(bounded.x,bounded.y,bounded.z);
        }
        camera.lookAt(cameraTarget);
    }
    return {update,refreshObstacles,setDistance(value){if(Number.isFinite(value))cameraDistance=Math.max(3,Math.min(12,value))},
        setArena(next,obstacles=[]){
            arena=next&&{x:next.x,z:next.z,radius:next.radius,zoom:next.zoom??.87};
            dynamicBlockers=obstacles.map(mesh=>({mesh,x:mesh.position.x,z:mesh.position.z,radius:mesh.userData?.cameraRadius||0}));
            snapOnNext=true;
        }};
}
