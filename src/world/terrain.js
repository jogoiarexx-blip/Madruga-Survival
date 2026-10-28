import {lakeTerrainDrop,lakeEdgeDistance} from './fishing-lake.js';
// Terreno procedural criado uma vez; sem arquivos de textura externos.
export function createTerrain(THREE, scene, getGroundHeight) {
    // Textura procedural: não depende de servidor externo e nunca fica faltando.
    const grassCanvas = document.createElement('canvas');
    grassCanvas.width = grassCanvas.height = 128;
    const grassCtx = grassCanvas.getContext('2d');
    grassCtx.fillStyle = '#7d9d58'; grassCtx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 3500; i++) {
        const shade = Math.floor(40 + Math.random() * 70);
        grassCtx.fillStyle = `rgba(${shade},${120 + shade},${35 + Math.floor(shade * 0.4)},0.18)`;
        grassCtx.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 2, 2 + Math.random() * 4);
    }
    const grassTexture = new THREE.CanvasTexture(grassCanvas);
    grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.repeat.set(32, 32);
    grassTexture.colorSpace = THREE.SRGBColorSpace;
    grassTexture.anisotropy = 16;

    // Grade de 2,5 m em vez de 4 m; suaviza a margem sem texturas extras.
    // Mantém uma única malha e evita geometrias sobrepostas na praia.
    const groundGeo = new THREE.PlaneGeometry(240, 240, 96, 96);
    const groundMat = new THREE.MeshStandardMaterial({ 
        map: grassTexture,
        color: 0xa5d6a7,
        roughness: 0.78,
        metalness: 0.0,
        vertexColors: true
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    const posAttr = ground.geometry.attributes.position;
    const colors = new Float32Array(posAttr.count*3);
    // Os valores RGB são interpolados sem criar um Color por vértice.
    const bankTint=[.84,.78,.63];
    for (let i = 0; i < posAttr.count; i++) {
        // Plano XY rotacionado -90°: X local->X mundial, Y local->-Z.
        const x = posAttr.getX(i), z = -posAttr.getY(i);
        posAttr.setZ(i, Math.sin(x * 0.08) * Math.cos(z * 0.08) * 0.6 + Math.sin(x * 0.3) * 0.15 - lakeTerrainDrop(x,z));
        const edge=lakeEdgeDistance(x,z);
        const u=Math.max(0,Math.min(1,(edge-1.8)/6.5));
        const smooth=u*u*(3-2*u);
        colors[i*3]=bankTint[0]+(1-bankTint[0])*smooth;
        colors[i*3+1]=bankTint[1]+(1-bankTint[1])*smooth;
        colors[i*3+2]=bankTint[2]+(1-bankTint[2])*smooth;
    }
    ground.geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
    ground.geometry.computeVertexNormals();
    scene.add(ground);

    return ground;
}
