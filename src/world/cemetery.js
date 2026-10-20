import {geometryDetail,roundedBoxGeometry} from '../render/geometry-detail.js';
// Bioma sombreado de cemitério low-poly. Sem texturas/downloads externos.
import {CEMETERY_POS,withinCemetery} from '../gameplay/zombie-variants.js';
export {CEMETERY_POS,withinCemetery};
export function createCemetery({THREE,scene,getGroundHeight,addCollider=()=>{},getQuality=()=> 'medium'}){
  let group=null;
  const cameraMeshes=[];
  function create(){
    if(group)return group;
    const {x,z}=CEMETERY_POS,y=getGroundHeight(x,z);
    const detail=geometryDetail(getQuality());
    group=new THREE.Group();group.position.set(x,y,z);scene.add(group);
    const earth=new THREE.MeshStandardMaterial({color:0x363d37,roughness:1});
    const stone=new THREE.MeshStandardMaterial({color:0x777e76,roughness:1});
    const chipped=new THREE.MeshStandardMaterial({color:0x58635e,roughness:.96});
    const moss=new THREE.MeshStandardMaterial({color:0x4e6a49,roughness:1});
    const wood=new THREE.MeshStandardMaterial({color:0x383128,roughness:1});
    const ghost=new THREE.MeshBasicMaterial({color:0x9bddb5,transparent:true,opacity:.6,depthWrite:false});
    function block(parent,w,h,d,mat,px,py,pz){const geo=(getQuality()==='high'&&h>0.5&&w<2)?roundedBoxGeometry(THREE,w,h,d,Math.min(w,h,d)*.10,3):new THREE.BoxGeometry(w,h,d);const m=new THREE.Mesh(geo,mat);m.position.set(px,py,pz);m.castShadow=true;parent.add(m);return m;}
    const ground=new THREE.Mesh(new THREE.CylinderGeometry(13.8,13.8,.22,Math.max(28,detail.resourceCylinder*3)),earth);
    ground.position.y=-.08;ground.receiveShadow=true;group.add(ground);
    const gravePositions=[];
    for(let row=-2;row<=2;row++)for(let col=-2;col<=2;col++){
      if(Math.abs(row)<=1&&Math.abs(col)<=1)continue;
      const gx=col*3.5+(row%2?.4:0),gz=row*3.1;
      const grave=new THREE.Group();grave.position.set(gx,getGroundHeight(x+gx,z+gz)-y,gz);group.add(grave);
      const headstone=block(grave,.9,1.25,.30,(row+col)%2?stone:chipped,0,.70,0);
      cameraMeshes.push(headstone);
      block(grave,1.10,.15,.39,stone,0,1.36,0);
      block(grave,.38,.6,.10,moss,0,.85,.17);
      block(grave,1.2,.10,1.55,earth,0,.06,-.6);
      gravePositions.push({x:x+gx,z:z+gz});
      addCollider({x:x+gx,z:z+gz,radius:.47});
    }
    // Cripta central, silhueta simples. Entrada marcada à frente.
    const crypt=block(group,4.1,3.1,3.5,chipped,0,1.55,0);cameraMeshes.push(crypt);
    const roof=block(group,4.8,.55,4.25,stone,0,3.32,0);roof.rotation.z=.035;
    block(group,1.32,2.25,.11,wood,0,1.20,1.82);
    for(const px of [-1.3,1.3]){
      const torch=new THREE.Mesh(new THREE.ConeGeometry(.22,.55,detail.flame),ghost);
      torch.position.set(px,2.25,1.95);group.add(torch);
    }
    for(const px of [-7,7]) for(const pz of [-7,7]){
      block(group,.4,2.5,.4,wood,px,1.25,pz);
      const branch=block(group,.15,1.85,.15,wood,px+(.5*Math.sign(px)),2.1,pz);branch.rotation.z=.65*Math.sign(px);
    }
    // A cripta pode ser contornada, sem bloquear o interior do mapa.
    addCollider({x,z,radius:2.6});
    return group;
  }
  return {create,get position(){return CEMETERY_POS},get graves(){return group?16:0},get cameraObstacles(){return cameraMeshes}};
}
