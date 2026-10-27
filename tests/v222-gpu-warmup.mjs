import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGpuWarmup,collectTextures} from '../src/render/gpu-warmup.js';
let tests=0;
const test=async(label,run)=>{await run();console.log('OK v2.22 '+(++tests)+': '+label);};
const texture=()=>({isTexture:true});
const mesh=material=>({isMesh:true,material});
const sceneOf=(...children)=>({children,traverse(fn){const walk=n=>{fn(n);for(const ch of n.children||[])walk(ch);};walk(this);}});
function fake(active=true){
 const scene=sceneOf(),camera={},calls=[],status=[];let frames=0;
 const renderer={compileAsync:async(...args)=>{calls.push(['compile',...args]);},initTexture:t=>calls.push(['texture',t])};
 const warmup=createGpuWarmup({getRenderer:()=>renderer,getScene:()=>scene,getCamera:()=>camera,isActive:()=>active,
   nextFrame:async()=>{frames++;},onProgress:x=>status.push(x)});
 return {scene,camera,renderer,calls,status,warmup,setActive:n=>{active=n;},get frames(){return frames;}};
}
await test('não usa WebGL, RAF nem shaders durante construção do preparador',async()=>{
 const t=fake();assert.equal(t.calls.length,0);assert.equal(t.frames,0);assert.equal(t.status.length,0);
});
await test('cena prepara shaders com câmera sem passar targetScene duplicado',async()=>{
 const t=fake();assert.equal(await t.warmup.prepare(t.scene),true);
 assert.deepEqual(t.calls,[['compile',t.scene,t.camera]]);
});
await test('GLB antes da montagem compila com luzes e ambiente da cena real',async()=>{
 const t=fake(),rig=sceneOf(mesh({map:texture(),normalMap:texture()}));
 assert.equal(await t.warmup.prepare(rig,'Player'),true);
 assert.deepEqual(t.calls[0],['compile',rig,t.camera,t.scene]);
 assert.equal(t.calls.filter(c=>c[0]==='texture').length,2);
 assert.equal(t.frames,2);
 assert.equal(t.status.at(-1).phase,'ready');
});
await test('materiais repetidos e multi-material não enviam textura duplicada',async()=>{
 const t=fake(),tex=texture();
 const rig=sceneOf(mesh({map:tex}),mesh([{map:tex,roughnessMap:tex},{normalMap:tex}]));
 assert.deepEqual(collectTextures(rig),[tex]);
 await t.warmup.prepare(rig);
 assert.equal(t.calls.filter(c=>c[0]==='texture').length,1);
 const extra=sceneOf(mesh({map:tex}));await t.warmup.prepare(extra);
 assert.equal(t.calls.filter(c=>c[0]==='texture').length,1);
});
await test('raízes repetidas e chamadas simultâneas utilizam uma compilação',async()=>{
 const t=fake(),rig=sceneOf();
 const both=await Promise.all([t.warmup.prepare(rig),t.warmup.prepare(rig)]);
 assert.deepEqual(both,[true,true]);await t.warmup.prepare(rig);
 assert.equal(t.calls.filter(c=>c[0]==='compile').length,1);
});
await test('pausa e aba oculta impedem preparação inicial',async()=>{
 const t=fake(false);assert.equal(await t.warmup.prepare(sceneOf()),false);
 assert.equal(t.calls.length,0);t.setActive(true);assert.equal(await t.warmup.prepare(sceneOf()),true);
});
await test('se jogador pausa entre uploads, a etapa termina com fallback seguro',async()=>{
 let live=true;const calls=[],t1=texture(),t2=texture(),scene=sceneOf(),cam={};
 const warmup=createGpuWarmup({getRenderer:()=>({compileAsync:async()=>calls.push('compile'),initTexture:()=>calls.push('upload')}),
   getScene:()=>scene,getCamera:()=>cam,isActive:()=>live,nextFrame:async()=>{live=false;}});
 assert.equal(await warmup.prepare(sceneOf(mesh({map:t1,normalMap:t2}))),false);
 assert.deepEqual(calls,['compile']);
});
await test('falha na GPU não derruba jogo nem força compile() síncrono',async()=>{
 const scene=sceneOf();const warmup=createGpuWarmup({getRenderer:()=>({compileAsync:async()=>{throw new Error('gpu unavailable');},compile:()=>{throw Error('sync forbidden');}}),
   getScene:()=>scene,getCamera:()=>({})});
 const old=console.warn;console.warn=()=>{};
 try{assert.equal(await warmup.prepare(scene),false);}finally{console.warn=old;}
});
await test('fallback quando compileAsync não está disponível é não bloqueante',async()=>{
 const scene=sceneOf();const warmup=createGpuWarmup({getRenderer:()=>({compile:()=>{throw Error('sync called');}}),getScene:()=>scene,getCamera:()=>({})});
 assert.equal(await warmup.prepare(scene),true);
});
await test('main mantém menu inerte e prepara três GLBs antes de exibi-los',async()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const player=readFileSync(new URL('../src/characters/player-rev5.js',import.meta.url),'utf8');
 const zombie=readFileSync(new URL('../src/characters/zombie-models.js',import.meta.url),'utf8');
 const spider=readFileSync(new URL('../src/characters/spider-model.js',import.meta.url),'utf8');
 assert.match(main,/createGpuWarmup\(/);assert.match(main,/Compilando shaders e texturas do cenário/);
 assert.match(main,/getRenderer:\(\)=>renderer/);
 assert.match(main,/gameCanvas\.style\.visibility='hidden'/);
 assert.match(main,/await adventureLoader\.start\(stages\)/);
 assert.match(player,/await onBeforeMount\(meshRoot/);
 assert.match(zombie,/await onBeforeMount\(gltf\.scene/);
 assert.match(spider,/await onBeforeMount\(gltf\.scene/);
});
await test('UI de progresso sem bloquear botões e arquivos da revisão conectados',async()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const css=readFileSync(new URL('../styles/main.css',import.meta.url),'utf8');
 const packageJson=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
 assert.match(html,/data-build="(?:2\.22\.0-gpu|2\.23\.0-goblin|2\.24\.0-goblin-ik|2\.25\.0-menu-hud|2\.27\.0-recovery|2\.28\.0-model-cache|2\.29\.0-enemy-pool|2\.29\.1-goblin-visible|2\.30\.0-chaves-workbench|2\.31\.0-chaves-patrol-ai|2\.32\.0-chaves-orders|2\.34\.0-chaves-combat|2\.35\.0-stability|2\.36\.0-wildlife-inventory|2\.32\.0-chaves-orders|2\.34\.0-chaves-combat|2\.35\.0-stability|2\.36\.0-wildlife-inventory|2\.37\.0-campfire-ui|2\.38\.0-save-profiling|2\.39\.0-wildlife-quests|2\.40\.0-fauna-exploration|2\.41\.0-ecosystem)"/);assert.match(html,/id="gpu-warmup-status"/);
 assert.match(css,/#gpu-warmup-status\{[^}]*pointer-events:none/);
 assert.ok(['2.22.0','2.23.0','2.24.0','2.25.0','2.26.0','2.26.1','2.27.0','2.28.0','2.29.0','2.29.1','2.30.0','2.31.0','2.32.0','2.33.0','2.34.0','2.35.0','2.36.0','2.37.0','2.38.0','2.39.0','2.40.0','2.41.0'].includes(packageJson.version));
 assert.match(packageJson.scripts.test,/v222-gpu-warmup/);
});
console.log('v2.22: '+tests+' cenários de GPU aprovados');
