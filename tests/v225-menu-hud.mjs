import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('index.html'),css=read('styles/main.css'),main=read('src/main.js'),preview=read('src/ui/menu-preview.js');
let count=0;const test=(name,fn)=>{fn();console.log('OK v2.25 '+(++count)+': '+name);};
test('menu oferece iniciar, retomar, qualidade, ajuda, status da preparação',()=>{
  for(const id of ['start-btn','load-btn','gfx-low','gfx-med','gfx-high','menu-help','menu-performance-tip'])assert.ok(html.includes('id="'+id+'"'),id);
});
test('HUD usa resumo e mantém detalhes sob demanda',()=>{
  for(const id of ['mission-toggle','status-toggle','help-toggle','help-close','help-panel','mission-title','mission-goal','skill-hud','tool-status'])assert.ok(html.includes('id="'+id+'"'),id);
  assert.match(css,/#campaign-hud:not\(\.expanded\)/);assert.match(css,/#survival-hud:not\(\.expanded\)/);
});
test('comandos acessíveis a mouse toque e F1',()=>{
  assert.match(main,/e\.code==='F1'/);assert.match(main,/document\.getElementById\('menu-help'\)/);
  assert.match(main,/document\.getElementById\('help-close'\)/);
});
test('pré-shaders usa mesmo renderer do jogo e começa apenas em hora ociosa',()=>{
  assert.match(main,/ensureRenderer\(\);\s*hint\.textContent/);
  assert.match(main,/createMenuPreview\(\{THREE,cloneSkeleton,renderer,model:playerRev5\.model\}\)/);
  assert.match(main,/requestIdleCallback/);assert.match(main,/playerRev5\.preload\(\)/);
  assert.match(main,/gameActive\|\|menuPreparing/);
  assert.match(preview,/renderer\.render\(scene,camera\)/);
  assert.doesNotMatch(preview,/requestAnimationFrame|setInterval/);
});
test('iniciar remove a prévia antes de gerar o mundo',()=>{
  const start=main.slice(main.indexOf('function beginAdventure('),main.indexOf("document.getElementById('start-btn').onclick"));
  assert.ok(start.indexOf('menuPreview?.dispose()')<start.indexOf('initWorld()'));
  assert.match(main,/document\.body\.classList\.add\('game-active'\)/);
});
test('menu não executa IA, terreno ou física até iniciar',()=>{
  const boot=main.slice(main.indexOf('async function prepareMainMenuPreview'),main.indexOf('const pauseMenu = '));
  assert.doesNotMatch(boot,/advanceSurvival\(|enemyAI\.update\(|forest\.populate\(|initWorld\(\)/);
  assert.match(main,/getMode:\(\)=>!gameActive\|\|document\.hidden\?'off'/);
});
test('cache busting dos arquivos da revisão',()=>{
  assert.match(html,/data-build="2\.27\.0-recovery|2\.28\.0-model-cache|2\.29\.0-enemy-pool|2\.29\.1-goblin-visible|2\.30\.0-chaves-workbench|2\.31\.0-chaves-patrol-ai|2\.32\.0-chaves-orders|2\.34\.0-chaves-combat"/);
  assert.match(html,/main\.js\?v=2\.27\.0-recovery|2\.28\.0-model-cache|2\.29\.0-enemy-pool|2\.29\.1-goblin-visible|2\.30\.0-chaves-workbench|2\.31\.0-chaves-patrol-ai|2\.32\.0-chaves-orders|2\.34\.0-chaves-combat/);
  assert.match(html,/main\.css\?v=2\.27\.0-recovery|2\.28\.0-model-cache|2\.29\.0-enemy-pool|2\.29\.1-goblin-visible|2\.30\.0-chaves-workbench|2\.31\.0-chaves-patrol-ai|2\.32\.0-chaves-orders|2\.34\.0-chaves-combat/);
});
console.log('v2.25: '+count+' novas verificações aprovadas');
