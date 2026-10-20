import {geometryDetail} from '../render/geometry-detail.js';
// Materiais e geometrias compartilhados para decoração estática.
// Cada malha pode variar escala e orientação sem alocar buffers novos.
export function createNatureAssets(THREE) {
    const d=geometryDetail();
    let trunkGeometry = new THREE.CylinderGeometry(0.18, 0.28, 2.4, d.trunk);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.95 });
    let leafGeometry = new THREE.ConeGeometry(1, 1, d.foliage);
    const leafMaterials = [0x2e7d32, 0x388e3c, 0x43a047, 0x1b5e20]
        .map(color => new THREE.MeshStandardMaterial({color, roughness: .75}));
    let rockGeometry = new THREE.DodecahedronGeometry(1, d.rockSubdivision);
    const rockMaterials = [0x646260,0x73716c,0x817d77,0x595e59]
        .map(color=>new THREE.MeshStandardMaterial({color,roughness:.85,metalness:.05}));
    let bushGeometry = new THREE.SphereGeometry(1, d.bushWidth, d.bushHeight);
    const bushMaterials = [0x346d34,0x3e8140,0x4a763a,0x315d34]
        .map(color=>new THREE.MeshStandardMaterial({color,roughness:.8}));
    let stemGeometry = new THREE.CylinderGeometry(.02,.02,.25,Math.max(4,Math.floor(d.trunk/2)));
    const stemMaterial = new THREE.MeshStandardMaterial({color:0x388e3c});
    let flowerGeometry = new THREE.SphereGeometry(.08,d.smallSphereWidth,d.smallSphereHeight);
    const flowerMaterials=[0xffeb3b,0xff5722,0xe91e63,0x9c27b0,0xffffff]
        .map(color=>new THREE.MeshStandardMaterial({color,emissive:0x333300,emissiveIntensity:.2}));
    const assets={trunkGeometry,trunkMaterial,leafGeometry,leafMaterials,
        rockGeometry,rockMaterials,bushGeometry,bushMaterials,
        stemGeometry,stemMaterial,flowerGeometry,flowerMaterials,
        quality:'medium',
        setQuality(quality){
            const key=geometryDetail(quality)===geometryDetail('low')?'low':
                geometryDetail(quality)===geometryDetail('high')?'high':'medium';
            if(key===this.quality)return false;
            // Chamado antes de gerar a floresta: nenhuma malha utiliza estas geometrias.
            const detail=geometryDetail(key);
            this.trunkGeometry.dispose?.();this.leafGeometry.dispose?.();this.rockGeometry.dispose?.();
            this.bushGeometry.dispose?.();this.stemGeometry.dispose?.();this.flowerGeometry.dispose?.();
            this.trunkGeometry=new THREE.CylinderGeometry(.18,.28,2.4,detail.trunk);
            this.leafGeometry=new THREE.ConeGeometry(1,1,detail.foliage);
            this.rockGeometry=new THREE.DodecahedronGeometry(1,detail.rockSubdivision);
            this.bushGeometry=new THREE.SphereGeometry(1,detail.bushWidth,detail.bushHeight);
            this.stemGeometry=new THREE.CylinderGeometry(.02,.02,.25,Math.max(4,Math.floor(detail.trunk/2)));
            this.flowerGeometry=new THREE.SphereGeometry(.08,detail.smallSphereWidth,detail.smallSphereHeight);
            this.quality=key;
            return true;
        }};
    return assets;
}
