// Sol e Lua leves; a trajetória usa o mesmo relógio de 480 s do jogo.
const FAR=230, clamp=v=>Math.max(0,Math.min(1,v));
const smooth=(a,b,x)=>{let t=clamp((x-a)/(b-a));return t*t*(3-2*t)};
const colors=[[-.35,0x08101f],[-.12,0x18213d],[-.03,0x3b3560],[.04,0xd8875a],[.16,0x9cc2df],[.45,0x87ceeb]];
function mix(a,b,t){const aR=a>>16&255,aG=a>>8&255,aB=a&255;return Math.round(aR+((b>>16&255)-aR)*t)<<16|Math.round(aG+((b>>8&255)-aG)*t)<<8|Math.round(aB+((b&255)-aB)*t)}
export function sunVector(f){const a=(((f%1)+1)%1)*2*Math.PI,x=Math.cos(a)*80,y=Math.sin(a-Math.PI/2)*65+5,z=Math.sin(a)*40,m=Math.hypot(x,y,z);return {x:x/m,y:y/m,z:z/m}}
export function skyColorAt(e){if(e<=colors[0][0])return colors[0][1];for(let i=1;i<colors.length;i++){let [hi,hc]=colors[i],[lo,lc]=colors[i-1];if(e<=hi)return mix(lc,hc,smooth(lo,hi,e))}return colors[colors.length-1][1]}
export function skyState(f,{graveAtmosphere=0,inCave=false}={}){
 const sun=sunVector(f),moon={x:-sun.x,y:-sun.y,z:-sun.z};
 let sky=skyColorAt(sun.y);if(graveAtmosphere>0)sky=mix(sky,0x1c2126,clamp(graveAtmosphere)*.45);
 const sunAlpha=inCave?0:smooth(-.06,.03,sun.y),moonAlpha=inCave?0:smooth(-.04,.10,moon.y)*(1-smooth(-.02,.12,sun.y)*.85);
 return {sun,moon,sky,sunAlpha,moonAlpha,sunColor:mix(0xff9a4a,0xfff3c4,smooth(0,.25,sun.y)),night:sun.y<-.03,twilight:Math.abs(sun.y)<.12};
}
export function createSkyBodies({THREE,scene,getQuality=()=> 'medium'}){
 const group=new THREE.Group();group.name='Ceu_Sol_Lua';
 const mat=(color,opacity=1,additive=false)=>new THREE.MeshBasicMaterial({color,fog:false,transparent:true,opacity,depthWrite:false,toneMapped:false,blending:additive?THREE.AdditiveBlending:THREE.NormalBlending});
 const sun=new THREE.Mesh(new THREE.CircleGeometry(9,24),mat(0xfff3c4));
 const halo=new THREE.Mesh(new THREE.CircleGeometry(24,24),mat(0xffd18a,.22,true));
 const moon=new THREE.Mesh(new THREE.CircleGeometry(6.5,20),mat(0xdfe8ff));
 sun.name='Sol';halo.name='Sol_Halo';moon.name='Lua';
 for(const m of [sun,halo,moon]){m.castShadow=false;m.receiveShadow=false;m.renderOrder=-10;m.frustumCulled=false;group.add(m)}
 scene.add(group);
 const color=new THREE.Color(),front=new THREE.Vector3(0,0,1),toward=new THREE.Vector3();
 const place=(m,dir,dist=FAR)=>{m.position.set(dir.x*dist,dir.y*dist,dir.z*dist);toward.set(-dir.x,-dir.y,-dir.z);m.quaternion.setFromUnitVectors(front,toward)};
 function update(s,camera){
   group.position.copy(camera.position);place(sun,s.sun);place(halo,s.sun,FAR+1);place(moon,s.moon);
   color.setHex(s.sunColor);sun.material.color.copy(color);halo.material.color.copy(color);
   sun.material.opacity=s.sunAlpha;halo.material.opacity=.22*s.sunAlpha*(s.twilight?1.5:1);moon.material.opacity=s.moonAlpha;
   sun.visible=s.sunAlpha>.01;halo.visible=getQuality()!=='low'&&s.sunAlpha>.01;moon.visible=s.moonAlpha>.01;
 }
 function hide(){sun.visible=halo.visible=moon.visible=false}
 return {group,sun,halo,moon,update,hide};
}
