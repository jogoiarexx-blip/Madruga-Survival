// Minimapa de baixo custo, sem acesso ao motor 3D.
export function createMinimap(canvas, getState) {
    const minimap = canvas;
    const mmCtx = minimap.getContext('2d');
    minimap.width = 140; minimap.height = 140;
    if (!mmCtx) return () => {};
    return function drawMinimap() {
        const {player,treeColliders,rockColliders,collectibles,healthPacks,speedBoosts,enemies,shrinePosition,playerYaw,resources=[],structures=[],explorationSites=[],spiderNests=[],caveEntrance=null,caveInside=false,cemeteryPosition=null,guardPosition=null,missionTarget=null,lake=null} = getState();
        const w = minimap.width, center = w / 2, scale = 1.2;
        mmCtx.clearRect(0, 0, w, w);
        mmCtx.fillStyle = '#173522'; mmCtx.fillRect(0, 0, w, w);
        const dot = (x,z,color,radius) => {
            const px = center + (x-player.position.x) * scale;
            const py = center + (z-player.position.z) * scale;
            if (px < 3 || py < 3 || px > w-3 || py > w-3) return;
            mmCtx.fillStyle = color; mmCtx.beginPath(); mmCtx.arc(px,py,radius,0,Math.PI*2); mmCtx.fill();
        };
        // Recursos deliberadamente omitidos para não poluir o minimapa.
        for(const s of structures)dot(s.x,s.z,s.type==='campfire'?'#ff9c3b':'#eef6a2',4);
        for(const site of explorationSites){
          if(!site.discovered&&Math.hypot(site.x-player.position.x,site.z-player.position.z)>25)continue;
          const searched=site.containers.every(c=>c.opened);
          dot(site.x,site.z,searched?'#87918a':site.threat?'#f1a36a':'#ffe08b',5);
        }
        for(const n of spiderNests)if(n.eggs>0&&Math.hypot(n.x-player.position.x,n.z-player.position.z)<30)dot(n.x,n.z,'#b7c9f7',5);
        if(caveEntrance&&!caveInside&&Math.hypot(caveEntrance.x-player.position.x,caveEntrance.z-player.position.z)<33)
          dot(caveEntrance.x,caveEntrance.z,'#c991ef',6);
        // Árvores, pedras e itens comuns são vistos no mundo, não no radar.
        healthPacks.forEach(c => dot(c.position.x,c.position.z,'#51ef92',2.5));
        speedBoosts.forEach(c => dot(c.position.x,c.position.z,'#30ccff',2.5));
        enemies.forEach(e => dot(e.mesh.position.x,e.mesh.position.z,e.type==='boss'?'#ffda44':e.type==='normal'?'#98f079':e.type==='shaman'?'#b883ff':'#ff7661',e.type==='boss'?5:3));
        if(lake){
          dot(lake.x,lake.z,'#45bdeb',5);
        }
        if(missionTarget&&Number.isFinite(missionTarget.x)&&Number.isFinite(missionTarget.z)){
          const dx=missionTarget.x-player.position.x,dz=missionTarget.z-player.position.z;
          const dist=Math.hypot(dx,dz);
          if(dist>2){
            const px=center+dx*scale,py=center+dz*scale;
            const onScreen=px>10&&px<w-10&&py>10&&py<w-10;
            const x=onScreen?px:center+dx/dist*58,z=onScreen?py:center+dz/dist*58;
            mmCtx.save();mmCtx.translate(x,z);mmCtx.rotate(Math.atan2(dz,dx)+Math.PI/2);
            mmCtx.fillStyle='#ffe58a';mmCtx.beginPath();mmCtx.moveTo(0,-7);mmCtx.lineTo(-5,5);mmCtx.lineTo(5,5);mmCtx.closePath();mmCtx.fill();mmCtx.restore();
          }
        }
        dot(-4,-5,'#ffffff',3);
        dot(shrinePosition.x,shrinePosition.z,'#8affdb',4);
        if(cemeteryPosition)dot(cemeteryPosition.x,cemeteryPosition.z,'#b5a3ff',5);
        if(guardPosition)dot(guardPosition.x,guardPosition.z,'#64d8ff',4);
        mmCtx.save(); mmCtx.translate(center,center); mmCtx.rotate(-playerYaw);
        mmCtx.fillStyle = '#e1f1ff'; mmCtx.beginPath(); mmCtx.moveTo(0,-8); mmCtx.lineTo(-5,6); mmCtx.lineTo(5,6); mmCtx.closePath(); mmCtx.fill(); mmCtx.restore();
        mmCtx.fillStyle='#d1dfd1';mmCtx.font='bold 12px sans-serif';mmCtx.fillText('N',w-16,14);
        mmCtx.strokeStyle='rgba(240,246,236,.25)'; mmCtx.strokeRect(1,1,w-2,w-2);
    }
}
