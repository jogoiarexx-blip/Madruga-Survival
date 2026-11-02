// Variações texturizadas do mesmo GLB: mantém UV, rig, animações e diffuse map.
// Compõe a textura uma vez por espécie/material e reutiliza em todos os clones.
export const SPIDER_SKINS=Object.freeze({
  shadow:Object.freeze({base:'#524452',spots:'#261e32',lines:'#827084',tint:0xd0cad6}),
  hunter:Object.freeze({base:'#84664e',spots:'#382b28',lines:'#b19a6c',tint:0xe0c7aa}),
  weaver:Object.freeze({base:'#496879',spots:'#203841',lines:'#8eabb2',tint:0xb4c7ce}),
  matriarch:Object.freeze({base:'#745478',spots:'#3d294c',lines:'#a183ad',tint:0xd4bdd9})
});
const idFor=value=>Object.hasOwn(SPIDER_SKINS,value)?value:'shadow';
export function spiderSkinKey(variant,source){
  return idFor(variant)+':'+(source?.uuid||source?.id||'untextured');
}
export function paintSpiderSkin(ctx,variant,width=512,height=512){
  const p=SPIDER_SKINS[idFor(variant)];
  // Feixes de seda, listras e placas orgânicas diferentes entre espécies.
  // Não cria uma textura lisa que apague a textura original do GLB.
  const seed={shadow:19,hunter:71,weaver:131,matriarch:197}[idFor(variant)];
  let state=seed;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
  ctx.save();
  ctx.fillStyle=p.spots;
  for(let i=0;i<115;i++){
    const x=random()*width,y=random()*height,rx=(3+random()*13)*width/512,ry=(2+random()*10)*height/512;
    ctx.globalAlpha=.12+random()*.12;
    ctx.beginPath();ctx.ellipse(x,y,rx,ry,random()*Math.PI,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha=.15;ctx.strokeStyle=p.lines;ctx.lineWidth=Math.max(.8,width/430);
  for(let i=0;i<22;i++){
    const x=random()*width,y=random()*height,dx=(.04+random()*.12)*width;
    ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+dx*.5,y-18,x+dx,y+24);ctx.stroke();
  }
  ctx.restore();
}
export function createSpiderAppearance({THREE,documentRef=typeof document!=='undefined'?document:null}={}){
  const cache=new Map();
  function texture(variant,base=null){
    const key=spiderSkinKey(variant,base);
    if(cache.has(key))return cache.get(key);
    if(!THREE?.CanvasTexture||!documentRef?.createElement)return base;
    const img=base?.image,ready=!!(img&&(img.naturalWidth||img.width)&&(img.naturalHeight||img.height));
    const w=Math.max(16,Math.min(1024,ready?(img.naturalWidth||img.width):512));
    const h=Math.max(16,Math.min(1024,ready?(img.naturalHeight||img.height):512));
    const canvas=documentRef.createElement('canvas');canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext?.('2d');
    if(!ctx)return base;
    if(ready){
      try{ctx.drawImage(img,0,0,w,h);}catch(_){
        ctx.fillStyle=SPIDER_SKINS[idFor(variant)].base;ctx.fillRect(0,0,w,h);
      }
    }else{
      ctx.fillStyle=SPIDER_SKINS[idFor(variant)].base;ctx.fillRect(0,0,w,h);
    }
    paintSpiderSkin(ctx,variant,w,h);
    const next=new THREE.CanvasTexture(canvas);
    if(THREE.SRGBColorSpace)next.colorSpace=THREE.SRGBColorSpace;
    if(base){
      next.flipY=base.flipY;next.wrapS=base.wrapS;next.wrapT=base.wrapT;
      if(base.offset&&next.offset)next.offset.copy(base.offset);
      if(base.repeat&&next.repeat)next.repeat.copy(base.repeat);
      if(base.center&&next.center)next.center.copy(base.center);
      next.rotation=base.rotation||0;next.anisotropy=base.anisotropy||1;
    }
    next.needsUpdate=true;cache.set(key,next);return next;
  }
  function material(original,variant){
    if(!original?.clone)return original;
    const copy=original.clone(),skin=SPIDER_SKINS[idFor(variant)];
    const hadMap=!!copy.map;
    copy.map=texture(variant,copy.map);
    // A malha mantém seus detalhes existentes, com luz PBR, menos brilho
    // emissivo; a variação usa padrões reais em UV, não só cor de corpo.
    if(copy.color?.setHex&&!hadMap&&copy.map)copy.color.setHex(0xffffff);
    else if(copy.color?.multiply&&THREE.Color)copy.color.multiply(new THREE.Color(skin.tint));
    if(Number.isFinite(copy.roughness))copy.roughness=Math.max(.77,copy.roughness);
    if(copy.emissive?.setHex){copy.emissive.setHex(0x151016);copy.emissiveIntensity=.055;}
    copy.needsUpdate=true;return copy;
  }
  return {material,get textures(){return cache.size;},dispose(){for(const t of cache.values())t.dispose?.();cache.clear();}};
}
