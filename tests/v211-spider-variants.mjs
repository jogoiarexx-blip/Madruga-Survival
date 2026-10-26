import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSurvival} from '../src/gameplay/survival.js';
import {SPIDER_VARIANTS,isSpiderVariant,getSpiderVariant,chooseSpiderVariant} from '../src/gameplay/spider-variants.js';
import {spiderDecision,createSpiderAI} from '../src/gameplay/spider-ai.js';
import {validateSave,writeSave,readSave} from '../src/gameplay/save-system.js';
let tests=0;
const test=(label,fn)=>{fn();tests++;console.log('OK v2.11',tests,label)};
const source=file=>readFileSync(new URL(file,import.meta.url),'utf8');
const sample=()=>({seed:2026,graphicsQuality:'medium',level:2,xp:2,kills:1,
 health:90,maxHealth:112,wave:1,elapsed:99,currentWeapon:0,player:{x:15,z:-14,yaw:.1},
 survival:createSurvival(),resources:[],buildings:[],healthPacks:[],speedBoosts:[],
 enemies:[{type:'spider',spiderVariant:'weaver',x:11,z:9,hp:12,enraged:false}]});
const storage=()=>{const map=new Map();return {getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};
test('três espécies com parâmetros físicos finitos',()=>{
 assert.deepEqual(Object.keys(SPIDER_VARIANTS).filter(id=>id!=='matriarch'),['shadow','hunter','weaver']);
 for(const p of Object.values(SPIDER_VARIANTS))for(const key of ['size','speed','hp','damage','webSpeed','webDamage','webSlow','fanSpread','webCooldown','burstCooldown','jumpCooldown','biteCooldown'])
   assert.ok(Number.isFinite(p[key])&&p[key]>0,`${p.name} ${key}`);
});
test('caçadora mais rápida e menor, tecelã mais resistente',()=>{
 assert.ok(getSpiderVariant('hunter').speed>getSpiderVariant('shadow').speed);
 assert.ok(getSpiderVariant('hunter').size<getSpiderVariant('shadow').size);
 assert.ok(getSpiderVariant('weaver').hp>getSpiderVariant('shadow').hp);
 assert.ok(getSpiderVariant('weaver').damage>getSpiderVariant('shadow').damage);
});
test('validação e fallback seguro de espécie',()=>{
 assert.ok(isSpiderVariant('hunter'));assert.ok(!isSpiderVariant('x'));assert.ok(!isSpiderVariant(null));
 assert.equal(getSpiderVariant('hacker'),SPIDER_VARIANTS.shadow);
});
test('primeiro dia evita tecelã e caçadora',()=>{
 for(const roll of [0,.2,.8,.999])assert.equal(chooseSpiderVariant({day:1,night:false,roll}),'shadow');
});
test('caçadora aparece com progresso',()=>{
 assert.equal(chooseSpiderVariant({day:2,roll:.1}),'hunter');
 assert.equal(chooseSpiderVariant({day:2,roll:.9}),'shadow');
});
test('tecelã reservada para locais perigosos e noites avançadas',()=>{
 assert.equal(chooseSpiderVariant({day:4,night:true,roll:.12}),'weaver');
 assert.equal(chooseSpiderVariant({day:4,night:false,roll:.12}),'hunter');
 assert.equal(chooseSpiderVariant({day:1,threat:3,roll:0}),'weaver');
});
test('probabilidades limitadas e determinísticas',()=>{
 assert.equal(chooseSpiderVariant({day:10,night:true,roll:Infinity}),chooseSpiderVariant({day:10,night:true,roll:.5}));
 assert.ok(isSpiderVariant(chooseSpiderVariant({day:50,roll:-1})));
});
test('sombria mantém mordida e disparo original',()=>{
 assert.equal(spiderDecision(1.2,true,0,.5),'Attack');
 assert.equal(spiderDecision(11,true,0,.1),'WebBurst');
 assert.equal(spiderDecision(11,true,0,.5),'WebShot');
});
test('caçadora privilegia saltos e teias únicas',()=>{
 assert.equal(spiderDecision(3,true,0,.5,'hunter'),'Jump');
 assert.equal(spiderDecision(10,true,0,.1,'hunter'),'WebShot');
});
test('tecelã privilegia teia em leque',()=>{
 assert.equal(spiderDecision(10,true,0,.5,'weaver'),'WebBurst');
 assert.equal(spiderDecision(2,true,0,.5,'weaver'),'Attack');
 assert.equal(spiderDecision(10,false,0,.1,'weaver'),null);
});
test('save novo com tecelã funciona e preserva variante',()=>{
 const store=storage(),data=sample();assert.equal(writeSave(store,data),true);
 assert.equal(readSave(store).enemies[0].spiderVariant,'weaver');
});
test('save antigo sem espécie continua válido e carrega como sombria',()=>{
 const data=sample();delete data.enemies[0].spiderVariant;data.enemies[0].hp=6;
 assert.ok(validateSave({version:2,...data}));
});
test('save rejeita espécie inválida e vida acima do limite',()=>{
 const data=sample();data.enemies[0].spiderVariant='boss';
 assert.equal(validateSave({version:2,...data}),null);
 data.enemies[0].spiderVariant='hunter';assert.equal(validateSave({version:2,...data}),null);
});
test('save de zumbi não permite espécie de aranha indevida',()=>{
 const data=sample();data.enemies[0]={type:'normal',hp:2,spiderVariant:'shadow',x:0,z:0,enraged:false};
 assert.equal(validateSave({version:2,...data}),null);
});
test('IA utiliza a espécie na decisão e no cooldown',()=>{
 const enemy={type:'spider',spiderVariant:'weaver',speed:2.65,damage:15,size:1.94,knockback:0,
 mesh:{id:5,position:{x:0,y:0,z:0},rotation:{y:0,z:0},scale:{set(){}}},
 spiderBrain:{cooldown:0,action:null,actionTime:0,hit:false},
 spiderVisual:{attack(){},update(){}}};
 const shots=[];
 const ai=createSpiderAI({player:{position:{x:10,z:0,y:0}},getGroundHeight:()=>0,
   resolveCollision:(x,z)=>({x,z}),damagePlayer:()=>true,throwProjectile:(_e,spread)=>shots.push(spread)});
 ai.update(enemy,.1,2*Math.PI-5);
 assert.equal(enemy.spiderBrain.action,'WebBurst');
 assert.equal(enemy.spiderBrain.cooldown,SPIDER_VARIANTS.weaver.burstCooldown);
 for(let i=0;i<7;i++)ai.update(enemy,.1,0);
 assert.deepEqual(shots,[-.28,0,.28]);
});
test('teia traz lentidão e velocidade específicas por espécie',()=>{
 const code=source('../src/gameplay/projectiles.js');
 assert.match(code,/profile\.webSpeed/);assert.match(code,/profile\.webSlow/);
 assert.match(code,/profile\.webDamage/);assert.match(code,/onWebHit\(p\.webSlow\)/);
});
test('main repassa spread, usa espécies no spawn e mantém save',()=>{
 const main=source('../src/main.js');
 assert.match(main,/throwProjectile:\(enemy,spread\)=>projectileSystem\.throwProjectile\(enemy,spread\)/);
 assert.match(main,/chooseSpiderVariant\(/);assert.match(main,/spiderVariant:enemy\.spiderVariant/);
 assert.match(main,/spawnEnemy\(savedEnemy\.type,savedEnemy\.spiderVariant\)/);
});
test('cada modelo compartilha esqueleto mas clona materiais tintos',()=>{
 const model=source('../src/characters/spider-model.js');
 assert.match(model,/material\.clone\(\)/);assert.match(model,/new THREE\.Color\(profile\.tint\)/);
 assert.match(model,/tintedMaterials/);assert.match(model,/for\(const m of tintedMaterials\)m\.dispose\(\)/);
});
test('nome da revisão, execução dos novos testes e sem download extra de GLB',()=>{
 const p=JSON.parse(source('../package.json'));
 assert.ok(['2.11.0','2.12.0','2.13.0','2.14.0','2.15.0','2.16.0','2.17.0','2.18.0','2.19.0','2.20.0'].includes(p.version));assert.match(p.scripts.test,/v211-spider-variants\.mjs/);
 assert.match(source('../index.html'),/(?:2\.11\.0-spider|2\.12\.0-nests|2\.13\.0-cave|2\.14\.0-cave|2\.15\.0-hotbar|2\.16\.0-inventory|2\.17\.0-bag|2\.18\.0-bag-chest|2\.19\.0-gear|2\.20\.0-build-wheel)/);
 assert.equal(source('../src/characters/spider-model.js').includes('SPIDER_GLB=\'./assets/models/aranha_sombria_animada.glb\''),true);
});
console.log(`v2.11: ${tests} verificações novas aprovadas`);
