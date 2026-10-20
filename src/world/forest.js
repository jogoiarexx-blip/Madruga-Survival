// Floresta estática: gerada de uma semente persistida para restaurar os checkpoints.
// Não depende de bundler, CDN ou chamadas de rede.
import {createSeededRandom} from './random.js';
import {createDistanceVisibility} from '../render/visibility.js';

export function createForest({THREE,scene,natureAssets,getGroundHeight,shrinePosition,
    collisionWorld,rockColliders,treeColliders,cameraObstacles,trees}) {
    let random = Math.random;
    const rockMeshes=[];
    const visibility=createDistanceVisibility({trees,rocks:rockMeshes});
function createRock(x, z, scale = 1) {
    const rock = new THREE.Mesh(natureAssets.rockGeometry,
                natureAssets.rockMaterials[Math.floor(random() * natureAssets.rockMaterials.length)]);
            const rockSize = 0.35 + random() * 0.7;
    rock.position.set(x, getGroundHeight(x, z) + 0.25 * scale, z);
    rock.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
    rock.scale.setScalar(scale * rockSize);
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);
    rockMeshes.push(rock);
    cameraObstacles.push(rock);
    const collider = { x, z, radius: Math.max(0.55 * scale, rockSize * scale * 0.82) };
    rockColliders.push(collider); collisionWorld.add(collider);
}


function createTree(x, z) {
    const g = new THREE.Group();
    const heightVar = 0.7 + random() * 0.6;
    const trunkH = 2.4 * heightVar;
    const trunk = new THREE.Mesh(natureAssets.trunkGeometry, natureAssets.trunkMaterial);
    trunk.scale.y = heightVar;
    trunk.position.y = trunkH / 2;
    trunk.castShadow = true;
    g.add(trunk);
    const layers = 2 + Math.floor(random() * 2);
    for (let i = 0; i < layers; i++) {
        const leafSize = (1.4 - i * 0.25) * heightVar;
        const leafH = 2.2 * heightVar;
        const leaves = new THREE.Mesh(natureAssets.leafGeometry,
            natureAssets.leafMaterials[i % natureAssets.leafMaterials.length]);
        leaves.scale.set(leafSize, leafH, leafSize);
        leaves.position.y = trunkH + leafH * 0.35 - i * 0.8;
        leaves.castShadow = true;
        g.add(leaves);
    }
    g.position.set(x, getGroundHeight(x, z), z);
    g.rotation.y = random() * Math.PI * 2;
    scene.add(g);
    cameraObstacles.push(trunk);
    trees.push(g);
    const collider = { x, z, radius: 0.85 };
    treeColliders.push(collider); collisionWorld.add(collider);
}



// Vegetação decorativa usa poucas draw calls agrupando pela cor/material.
function createBushes(count) {
    const materials=natureAssets.bushMaterials;
    const matrices=materials.map(()=>[]);
    const dummy=new THREE.Object3D();
    for(let i=0;i<count;i++) {
        const x=(random()-.5)*185,z=(random()-.5)*185;
        if(Math.hypot(x,z)<=4) continue;
        const size=.4+random()*.5;
        const materialIndex=Math.floor(random()*materials.length);
        dummy.position.set(x,getGroundHeight(x,z)+size*.7,z);
        dummy.scale.set(size,size*.7,size);
        dummy.rotation.set(0,0,0);dummy.updateMatrix();
        matrices[materialIndex].push(dummy.matrix.clone());
    }
    for(let i=0;i<materials.length;i++) {
        if(!matrices[i].length) continue;
        const batch=new THREE.InstancedMesh(natureAssets.bushGeometry,materials[i],matrices[i].length);
        matrices[i].forEach((matrix,index)=>batch.setMatrixAt(index,matrix));
        batch.instanceMatrix.needsUpdate=true;
        batch.computeBoundingSphere();
        scene.add(batch);
    }
}

function createGrassTufts(count) {
    // Instancing: duas chamadas à GPU em vez de centenas de malhas individuais.
    const geo = new THREE.PlaneGeometry(0.12, 0.5);
    const mat = new THREE.MeshStandardMaterial({color: 0x54a747, side: THREE.DoubleSide, roughness: 0.9});
    const tuftA = new THREE.InstancedMesh(geo, mat, count);
    const tuftB = new THREE.InstancedMesh(geo, mat, count);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
        const x = (random()-0.5)*195, z = (random()-0.5)*195;
        const scale = 0.65 + random();
        dummy.position.set(x, getGroundHeight(x,z) + 0.2*scale, z);
        dummy.scale.set(scale, scale, scale);
        dummy.rotation.set(0, random()*Math.PI, 0);
        dummy.updateMatrix(); tuftA.setMatrixAt(i, dummy.matrix);
        dummy.rotation.y += Math.PI/2;
        dummy.updateMatrix(); tuftB.setMatrixAt(i, dummy.matrix);
    }
    tuftA.instanceMatrix.needsUpdate = tuftB.instanceMatrix.needsUpdate = true;
    tuftA.frustumCulled = tuftB.frustumCulled = false;
    scene.add(tuftA, tuftB);
}

function createFlowers(count) {
    const colors=natureAssets.flowerMaterials;
    const petals=colors.map(()=>[]), stems=[];
    const dummy=new THREE.Object3D();
    for(let i=0;i<count;i++) {
        const x=(random()-.5)*175,z=(random()-.5)*175;
        if(Math.hypot(x,z)<=5) continue;
        const y=getGroundHeight(x,z),index=Math.floor(random()*colors.length);
        dummy.scale.set(1,1,1);dummy.rotation.set(0,0,0);
        dummy.position.set(x,y+.12,z);dummy.updateMatrix();stems.push(dummy.matrix.clone());
        dummy.position.y=y+.28;dummy.updateMatrix();petals[index].push(dummy.matrix.clone());
    }
    const addBatch=(geometry,material,matrices)=>{
        if(!matrices.length) return;
        const batch=new THREE.InstancedMesh(geometry,material,matrices.length);
        matrices.forEach((matrix,i)=>batch.setMatrixAt(i,matrix));
        batch.instanceMatrix.needsUpdate=true;
        batch.computeBoundingSphere();scene.add(batch);
    };
    addBatch(natureAssets.stemGeometry,natureAssets.stemMaterial,stems);
    colors.forEach((material,i)=>addBatch(natureAssets.flowerGeometry,material,petals[i]));
}

function createCampsite(quality) {
    // Marco de início, não uma fogueira pronta: o jogador precisa fabricar a sua.
    const wood = new THREE.MeshStandardMaterial({color:0x614027,roughness:0.95});
    const x=-4,z=-5,y=getGroundHeight(x,z);
    const signCanvas=document.createElement('canvas');signCanvas.width=384;signCanvas.height=144;
    const bc=signCanvas.getContext('2d');
    bc.fillStyle='#52331f';bc.fillRect(0,0,384,144);
    bc.strokeStyle='#b38b51';bc.lineWidth=12;bc.strokeRect(6,6,372,132);
    bc.fillStyle='#ffe4a0';bc.font='bold 28px sans-serif';bc.textAlign='center';
    bc.fillText('MADRUGACRAFT',192,55);
    bc.font='23px sans-serif';bc.fillText('SOBREVIVA!',192,105);
    const sign=new THREE.Mesh(new THREE.PlaneGeometry(3.5,1.3),new THREE.MeshBasicMaterial({
        map:new THREE.CanvasTexture(signCanvas),side:THREE.DoubleSide
    }));
    sign.position.set(x,y+2.65,z);scene.add(sign);
    const post=new THREE.Mesh(new THREE.CylinderGeometry(.12,.13,2.6,8),wood);
    post.position.set(x,y+1.3,z);scene.add(post);
}


function generate(quality, seed) {
    random = createSeededRandom(seed);
    const treeCount = quality === 'low' ? 30 : quality === 'medium' ? 55 : 75;
    const rockCount = quality === 'low' ? 20 : quality === 'medium' ? 40 : 55;
    const bushCount = quality === 'low' ? 15 : quality === 'medium' ? 35 : 50;
    const grassCount = quality === 'low' ? 30 : quality === 'medium' ? 70 : 100;
    const flowerCount = quality === 'low' ? 8 : quality === 'medium' ? 20 : 30;

    for (let i = 0; i < treeCount; i++) {
        const x = (random()-0.5)*190;
        const z = (random()-0.5)*190;
        if (Math.hypot(x,z)>8 && Math.hypot(x-shrinePosition.x,z-shrinePosition.z)>10) createTree(x,z);
    }
    for (let i = 0; i < rockCount; i++) {
        const x = (random() - 0.5) * 190;
        const z = (random() - 0.5) * 190;
        if (Math.hypot(x,z)>5 && Math.hypot(x-shrinePosition.x,z-shrinePosition.z)>10) {
            const scale = 0.6 + random() * 1.4;
            createRock(x, z, scale);
        }
    }
    // Folhagens sem colisão: lotes por material para diminuir draw calls.
    createBushes(bushCount);
    createGrassTufts(grassCount);
    createFlowers(flowerCount);

    createCampsite(quality);
    scene.updateMatrixWorld(true);
}
return {generate,updateVisibility:visibility.update,visibilityStats:visibility.stats};
}
