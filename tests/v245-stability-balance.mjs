import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSurvival,advanceSurvival,SURVIVAL_BALANCE,restoreSurvival} from '../src/gameplay/survival.js';
import {guardOrderButtonLabel,normalizeGuardOrder,nextGuardOrder} from '../src/gameplay/guard-orders.js';
import {setTextIfChanged,setWidthIfChanged} from '../src/ui/dom-patch.js';
import {createFrameProfiler} from '../src/render/frame-profiler.js';
let count=0;
const test=(name,fn)=>{fn();console.log(`OK v2.45 ${++count}: ${name}`)};
const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function simulate(seconds,dt,options={}){
 const s=createSurvival();let damage=0;
 for(let t=0;t<seconds-1e-8;t+=dt){const v=advanceSurvival(s,dt,options);damage+=v.damage;}
 return {state:s,damage};
}
test('frio da primeira noite continua perigoso, mas não letal em segundos',()=>{
 assert.equal(SURVIVAL_BALANCE.nightColdRate,.75);
 const {damage}=simulate(600,.1,{moving:true});
 assert.ok(damage>20 && damage<100,`dano observado em 10 minutos: ${damage}`);
});
test('fogueira e teto protegem durante o primeiro dia e noite',()=>{
 assert.equal(simulate(600,.1,{nearFire:true}).damage,0);
 assert.equal(simulate(600,.1,{sheltered:true}).damage,0);
});
test('indicadores não extrapolam limites com caminhada contínua',()=>{
 const {state}=simulate(1800,.1,{moving:true});
 for(const key of ['stamina','hunger','thirst','warmth'])assert.ok(state[key]>=0&&state[key]<=100,key);
 assert.ok(state.days>=4);
 assert.ok(restoreSurvival(state),'estado ainda pode ser salvo');
});
test('corrida gasta menos com botas e ainda possui custo',()=>{
 const naked=createSurvival(),boots=createSurvival();
 for(let i=0;i<45;i++){advanceSurvival(naked,.1,{moving:true,sprinting:true});advanceSurvival(boots,.1,{moving:true,sprinting:true,trailBoots:true});}
 assert.ok(boots.stamina>naked.stamina && naked.stamina<100);
});
test('vigor regenera ao descansar e usar movimento leve',()=>{
 const state=createSurvival();state.stamina=25;
 for(let i=0;i<10;i++)advanceSurvival(state,.1,{moving:true});
 const walking=state.stamina;
 for(let i=0;i<10;i++)advanceSurvival(state,.1);
 assert.ok(walking>=36 && state.stamina>=walking+19);
});
test('Chaves exibe exatamente a ordem ativa no botão',()=>{
 assert.equal(guardOrderButtonLabel('gather'),'🛡 Coletar [O]');
 assert.equal(guardOrderButtonLabel('follow'),'🛡 Seguir [O]');
 assert.equal(guardOrderButtonLabel('patrol'),'🛡 Patrulhar [O]');
 assert.equal(guardOrderButtonLabel('defend'),'🛡 Defender [O]');
 assert.equal(guardOrderButtonLabel('unknown'),guardOrderButtonLabel(normalizeGuardOrder('unknown')));
 assert.equal(nextGuardOrder('patrol'),'gather');
 assert.match(src('src/main.js'),/guardOrderButtonLabel\(guard\.mode\)/);
});
test('HUD preserva DOM quando valor de texto não muda',()=>{
 let writes=0;const node={_value:'',get textContent(){return this._value},set textContent(v){this._value=v;writes++}};
 assert.equal(setTextIfChanged(node,'coletando'),true);
 for(let i=0;i<200;i++)assert.equal(setTextIfChanged(node,'coletando'),false);
 assert.equal(writes,1);
});
test('larguras do HUD não invalidam layout sem alteração',()=>{
 const el={style:{width:'55%'}};
 assert.equal(setWidthIfChanged(el,'55%'),false);
 assert.equal(setWidthIfChanged(el,'60%'),true);
 assert.equal(el.style.width,'60%');
 assert.match(src('src/main.js'),/setWidthIfChanged\(document.getElementById\('health-bar'\)/);
});
test('perfil de quadros não depende de renderização e mantém p95',()=>{
 const profiler=createFrameProfiler({capacity:120});
 for(let i=0;i<120;i++)profiler.record(i<110?16.7:52);
 const p=profiler.snapshot();assert.equal(p.samples,120);assert.equal(p.slowFrames,10);assert.equal(p.p95,52);
});
test('escanear zumbis próximos em uma única passagem sem arrays filtrados',()=>{
 const main=src('src/main.js');
 assert.match(main,/for\(const enemy of enemies\)/);
 assert.doesNotMatch(main,/nearbyZombies=enemies\.filter/);
 assert.match(main,/setTextIfChanged\(stealthStatus/);
});
test('suíte histórica testa módulos atuais e participa do CI',()=>{
 const workflow=src('.github/workflows/qa-madruga.yml');
 assert.match(workflow,/npm run test:legacy/);
 assert.doesNotMatch(src('tests/regression.mjs'),/new Script\(/);
 assert.doesNotMatch(src('testes.mjs'),/<script type="module">/);
});
test('versão e cache são os mesmos nos pontos de entrada',()=>{
 assert.equal(JSON.parse(src('package.json')).version,'2.46.0');
 assert.match(src('index.html'),/data-build="2\.46\.0-build-logistics"/);
 assert.match(src('index.html'),/main\.js\?v=2\.46\.0-build-logistics/);
});
console.log(`v2.45.0: ${count} testes aprovados`);
