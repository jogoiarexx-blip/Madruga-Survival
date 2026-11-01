// Instrumentação desativada fora de ?debug=1.
export function debugEnabled(search=globalThis.location?.search||''){try{const p=new URLSearchParams(search);return p.has('debug')&&p.get('debug')!=='0'}catch(_){return false}}
export function sceneInventory(scene){
 const materials=new Set(),geometries=new Set(),textures=new Set(),counts={objects:0,meshes:0,instanced:0,instances:0,skinned:0,lights:0,shadowCasters:0,visibleMeshes:0};
 scene.traverse(o=>{counts.objects++;if(o.isLight)counts.lights++;if(!o.isMesh&&!o.isPoints&&!o.isLine)return;
 counts.meshes++;if(o.isInstancedMesh){counts.instanced++;counts.instances+=o.count}if(o.isSkinnedMesh)counts.skinned++;if(o.castShadow)counts.shadowCasters++;
 let vis=true;for(let p=o;p;p=p.parent)if(!p.visible){vis=false;break}if(vis)counts.visibleMeshes++;
 if(o.geometry)geometries.add(o.geometry);
 for(const m of Array.isArray(o.material)?o.material:[o.material]){if(!m)continue;materials.add(m);for(const k of ['map','normalMap','roughnessMap','emissiveMap','alphaMap','aoMap'])if(m[k])textures.add(m[k])}
 });
 const materialTypes={};for(const m of materials)materialTypes[m.type]=(materialTypes[m.type]||0)+1;
 return {...counts,uniqueMaterials:materials.size,uniqueGeometries:geometries.size,uniqueTextures:textures.size,materialTypes};
}
export function triangleHotspots(scene,limit=12){
 const groups=new Map();
 scene.traverse(o=>{if(!o.isMesh||!o.geometry)return;for(let p=o;p;p=p.parent)if(!p.visible)return;
 const g=o.geometry,count=(g.index?g.index.count:g.attributes.position?.count||0)/3,copies=o.isInstancedMesh?o.count:1;
 let root=o;while(root.parent&&root.parent.parent)root=root.parent;
 const names=[];for(let q=o;q&&q!==root.parent;q=q.parent)if(q.name&&!/^Mesh(_\d+)?$/.test(q.name))names.push(q.name);
 const label=(names.slice(0,3).join(' < ')||o.type)+(o.isSkinnedMesh?' [skinned]':'');
 const e=groups.get(g.uuid)||{label,triangles:0,meshes:0,perMesh:Math.round(count),shadow:o.castShadow};
 e.triangles+=count*copies;e.meshes+=copies;groups.set(g.uuid,e);
 });
 return [...groups.values()].sort((a,b)=>b.triangles-a.triangles).slice(0,limit).map(e=>({...e,triangles:Math.round(e.triangles)}));
}
export function rendererStats(renderer){const i=renderer.info;return {calls:i.render.calls,triangles:i.render.triangles,geometries:i.memory.geometries,textures:i.memory.textures,programs:i.programs?.length??0}}
