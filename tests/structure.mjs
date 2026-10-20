import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const load = path => readFileSync(resolve(root,path),'utf8');
const html = load('index.html');
const main = load('src/main.js');
assert.match(html, /<script type="module" src="\.\/src\/main\.js"><\/script>/);
assert.match(html, /<link rel="stylesheet" href="\.\/styles\/main\.css">/);
assert.ok(!html.includes('<script type="module">'),'Jogo principal não pode estar embutido em HTML');
assert.ok(html.length < 14000,`index.html longo demais: ${html.length}`);
assert.match(html, /"three": "https:\/\/cdn\.jsdelivr\.net\/npm\/three@0\.160\.0\/build\/three\.module\.js"/);
let count=0;
function listJs(dir) {
  return readdirSync(resolve(root,dir),{withFileTypes:true}).flatMap(entry=> {
    const path=`${dir}/${entry.name}`;
    return entry.isDirectory()?listJs(path):entry.name.endsWith('.js')?[path]:[];
  });
}
for (const from of listJs('src')) {
  const code=load(from);
  for (const [,rel] of code.matchAll(/from ['"](\.[^'"]+)['"]/g)) {
    assert.ok(existsSync(resolve(root,dirname(from),rel)),`Import quebrado: ${from} -> ${rel}`);
    count++;
  }
}
for (const id of main.matchAll(/getElementById\('([\w-]+)'\)/g)) {
  assert.ok(html.includes(`id="${id[1]}"`),`Falta o elemento ${id[1]}`);
}
assert.match(main,/minimapTick >= 0\.10/,'Limite de frequência no minimapa ausente');
assert.match(main,/if \(document\.hidden\) return/,'Aba oculta não deve renderizar');
assert.match(main,/const natureAssets = createNatureAssets/,'Geometrias não foram compartilhadas');
assert.match(load('src/world/nature-assets.js'),/leafGeometry/);
assert.match(load('scripts/serve.ps1'),/TcpListener/);
// Evita que funções do cemitério, aldeão e variantes fiquem indefinidas na inicialização.
const imports=new Map([...main.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/gs)]
  .map(([,names,path])=>[path,new Set(names.split(',').map(name=>name.trim().split(/\s+as\s+/)[0]))]));
for(const [file,symbols] of [
  ['./world/cemetery.js',['createCemetery','CEMETERY_POS','withinCemetery']],
  ['./characters/villager-guard.js',['createVillagerGuard']],
  ['./gameplay/zombie-variants.js',['chooseZombieType']]
])for(const symbol of symbols)assert.ok(imports.get(file)?.has(symbol),
  `Símbolo ${symbol} não importado no main.js a partir de ${file}`);
// Cache busting obrigatório no carregamento principal: Pages não pode reutilizar JS de builds anteriores.
assert.match(html,/src=["']\.\/src\/main\.js\?v=[^"'\s]+["']/,
  'Cache busting obrigatório no carregamento principal');
assert.ok(existsSync(resolve(root,'.nojekyll')));
console.log(`OK estrutura estática, ${count} imports locais e GitHub Pages`);
