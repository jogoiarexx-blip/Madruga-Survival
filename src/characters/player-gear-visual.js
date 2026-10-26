// Acessórios leves que seguem os ossos animados do REV5. Não duplicam a malha do personagem.
const keys=['vest','padding','boots'];
export function createPlayerGearVisuals(THREE,{torso,leftLeg,rightLeg}={}){
  const materials=[
    new THREE.MeshStandardMaterial({color:0x76634b,metalness:.2,roughness:.86}),
    new THREE.MeshStandardMaterial({color:0x45494e,metalness:.38,roughness:.67}),
    new THREE.MeshStandardMaterial({color:0x59442d,roughness:.88}),
    new THREE.MeshStandardMaterial({color:0x9c8264,roughness:.75})
  ];
  const models=[];
  let glb=null;
  let equipped={vest:false,padding:false,boots:false};
  function panel(parent,size,offset,material,kind){
    if(!parent)return;
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),materials[material]);
    mesh.position.set(...offset);mesh.castShadow=true;mesh.userData.gear=kind;
    parent.add(mesh);models.push(mesh);
  }
  function addForRoot(root,type){
    const isGlb=type==='glb';
    const find=name=>{
      let result=root?.getObjectByName?.('mixamorig'+name)||root?.getObjectByName?.('mixamorig:'+name);
      if(result)return result;
      const normalized=('mixamorig'+name).toLowerCase();
      root?.traverse?.(b=>{if(!result&&b.isBone&&String(b.name).replace(/[^a-z0-9]/gi,'').toLowerCase()===normalized)result=b;});
      return result;
    };
    const chest=isGlb?(find('Spine1')||find('Spine2')):torso;
    const left=isGlb?find('LeftFoot'):leftLeg;
    const right=isGlb?find('RightFoot'):rightLeg;
    // Volumes baixos não escondem o GLB; seguem a coluna e os pés durante as animações.
    if(chest){
      const k=isGlb?.72:1;
      panel(chest,[.48*k,.38*k,.29*k],[0,isGlb?.10:0,0],0,'vest');
      panel(chest,[.52*k,.22*k,.31*k],[0,isGlb?.08:0,0],1,'padding');
      panel(chest,[.2*k,.075*k,.33*k],[0,isGlb?-.07:-.19,.02],3,'padding');
    }
    for(const leg of [left,right])if(leg){
      const k=isGlb?.74:1;
      panel(leg,[.28*k,.18*k,.36*k],[0,isGlb?.06:-.68,isGlb?.08:.06],2,'boots');
      panel(leg,[.25*k,.10*k,.3*k],[0,isGlb?.18:-.57,isGlb?.01:.03],3,'boots');
    }
  }
  addForRoot(null,'fallback');
  function update(){for(const mesh of models)mesh.visible=!!equipped[mesh.userData.gear];}
  // O root procedural não possui ossos Mixamo; usa pivôs locais animados.
  function bind(root){
    if(glb===root)return;
    for(let i=models.length-1;i>=0;i--){
      const mesh=models[i];if(mesh.userData.boundGlb){mesh.removeFromParent();mesh.geometry.dispose();models.splice(i,1);}
    }
    glb=root;
    if(root){const start=models.length;addForRoot(root,'glb');for(const mesh of models.slice(start))mesh.userData.boundGlb=true;}
    update();
  }
  function set(next){equipped={...equipped,...Object.fromEntries(keys.map(k=>[k,next?.[k]===true]))};update();}
  function dispose(){bind(null);for(const mesh of models){mesh.removeFromParent();mesh.geometry.dispose();}models.length=0;for(const m of materials)m.dispose();}
  return {bind,set,dispose,get count(){return models.length;}};
}
