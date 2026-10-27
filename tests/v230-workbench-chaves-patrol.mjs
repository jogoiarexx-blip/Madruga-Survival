import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {CRAFT_STATIONS} from '../src/gameplay/crafting.js';
import {WORKBENCH_RECIPES} from '../src/ui/workbench-ui.js';
import {territoryFor,updateEnemyTerritory} from '../src/gameplay/enemy-territory.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
let passed=0;const test=(name,fn)=>{fn();console.log('OK v2.30 '+(++passed)+': '+name);};
test('receitas exclusivas da bancada e sem acesso direto na mochila',()=>{
  assert.ok(WORKBENCH_RECIPES.length>=12);
  for(const id of WORKBENCH_RECIPES)assert.equal(CRAFT_STATIONS[id],'workbench');
  assert.match(read('src/ui/survival-ui.js'),/CRAFT_STATIONS\[id\]==='workbench'\)continue/);
  assert.match(read('src/main.js'),/workbenchUI\.isOpen\|\|!buildings\.near\('workbench',player\.position,6\)/);
});
test('janela própria abre ao usar a bancada, não mais a mochila',()=>{
  const src=read('src/main.js');
  assert.match(src,/item\.type==='workbench'\)\{openWorkbench\(\)/);
  assert.doesNotMatch(src,/item\.type==='workbench'\)\{openInventory\(\)/);
  const html=read('index.html');
  for(const id of ['workbench-panel','workbench-close','workbench-recipes','workbench-stock'])assert.ok(html.includes('id="'+id+'"'));
});
test('arma REV5 em escala reduzida e grip centrado',()=>{
  assert.match(read('src/characters/player-weapons.js'),/const proportions=\[\.72,\.78,\.68\]/);
  assert.match(read('src/characters/player-rev5.js'),/weapon\.scale\.setScalar\(\.80\/PLAYER_REV5_SCALE\)/);
  assert.match(read('src/characters/player-rev5.js'),/limit\(motion\.y,\.10\)/);
});
test('goblins patrulham sua origem e voltam ao sair do território',()=>{
  const enemy={type:'normal',mesh:{id:17,position:{x:10,z:15}}};
  const state=territoryFor(enemy);
  assert.deepEqual(state.home,{x:10,z:15});
  let r=updateEnemyTerritory(enemy,{player:{x:90,z:90},now:10,canSee:()=>false});
  assert.equal(r.state,'patrol');assert.ok(Math.hypot(r.target.x-10,r.target.z-15)<=state.radius);
  enemy.mesh.position.x=30;
  r=updateEnemyTerritory(enemy,{player:{x:90,z:90},now:12,canSee:()=>false});
  assert.equal(r.state,'return');assert.deepEqual(r.target,{x:10,z:15});
});
test('goblins só perseguem jogador detectado perto da sua zona',()=>{
  const enemy={type:'normal',mesh:{id:8,position:{x:0,z:0}}};
  let r=updateEnemyTerritory(enemy,{player:{x:12,z:0},now:1,canSee:()=>false});
  assert.equal(r.state,'patrol');assert.equal(r.canAttack,false);
  r=updateEnemyTerritory(enemy,{player:{x:12,z:0},now:2,canSee:()=>true});
  assert.equal(r.state,'chase');assert.equal(r.canAttack,true);
  r=updateEnemyTerritory(enemy,{player:{x:100,z:100},now:20,canSee:()=>false});
  assert.equal(r.state,'patrol');
});
test('invasores e chefes não perdem seus alvos especiais',()=>{
  for(const enemy of [{type:'normal',raider:true},{type:'boss',raider:false}]){
    enemy.mesh={position:{x:0,z:0}};
    assert.equal(updateEnemyTerritory(enemy,{player:{x:0,z:1},now:1}),null);
  }
});
test('arquivo Chaves com rig, texturas e seis animações reconstruível',()=>{
  const manifest=JSON.parse(read('assets/models/chaves-parts/manifest.json'));
  const compressed=Buffer.concat(manifest.parts.map(n=>Buffer.from(read('assets/models/chaves-parts/'+n).trim(),'base64')));
  assert.equal(compressed.length,manifest.compressedByteLength);
  const glb=gunzipSync(compressed);
  assert.equal(glb.length,manifest.byteLength);
  assert.equal(createHash('sha256').update(glb).digest('hex'),manifest.sha256);
  const json=JSON.parse(glb.subarray(20,20+glb.readUInt32LE(12)).toString('utf8'));
  assert.equal(json.skins.length,1);
  for(const name of ['Walking','Running','Aim_Idle','Shoot','Boxing_Practice','Triple_Combo_Attack'])
    assert.ok(json.animations.some(a=>a.name===name));
});
test('Chaves substitui visual e mantém recrutamento salvo',()=>{
  const guard=read('src/characters/villager-guard.js'),main=read('src/main.js');
  assert.match(guard,/fallbackVisuals\)child\.visible=false/);
  assert.match(guard,/mixer\.update\(dt\)/);
  assert.match(main,/guard\.preload\(\)/);
  assert.match(main,/guard:guard\.getState\(\)/);
  assert.match(main,/guard\.setState\(data\.guard\)/);
});
test('versão e nomes de cache invalidados',()=>{
  assert.equal(JSON.parse(read('package.json')).version,'2.32.0');
  assert.match(read('index.html'),/data-build="2\.30\.0-chaves-workbench|2\.31\.0-chaves-patrol-ai|2\.32\.0-chaves-orders"/);
});
console.log('v2.30: '+passed+' novos testes aprovados');
