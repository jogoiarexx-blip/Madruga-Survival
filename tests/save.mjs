import assert from 'node:assert/strict';
import {readSave,writeSave,clearSave,SAVE_KEY,validateSave} from '../src/gameplay/save-system.js';
import {createSurvival} from '../src/gameplay/survival.js';
const sample=()=>({seed:2026,graphicsQuality:'medium',level:2,xp:2,kills:1,
 health:90,maxHealth:112,wave:1,elapsed:99,currentWeapon:0,
 player:{x:15,z:-14,yaw:.1},survival:createSurvival(),
 resources:[{type:'water',x:4,z:4,cooldown:0},{type:'stone',x:14,z:2,cooldown:16}],
 buildings:[{type:'campfire',x:9,z:4}],
 healthPacks:[{x:5,z:4}],speedBoosts:[],
 enemies:[{type:'normal',x:11,z:9,hp:2,enraged:false}]});
function storage(){const memory=new Map();return {getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k),memory};}
const test=(label,fn)=>{fn();console.log('OK save v2:',label)};
test('salva e retoma todos os elementos da sobrevivência',()=>{
 const store=storage(),data=sample();assert.ok(writeSave(store,data));
 assert.deepEqual(readSave(store),{version:2,...data,raid:{lastNight:0,waves:0}});
 assert.ok(clearSave(store));assert.equal(readSave(store),null);
});
test('ignora save de campanha v1 sem apagá-lo',()=>{
 const store=storage();store.setItem('madrugacraft.save.v1','{"version":1}');
 assert.equal(readSave(store),null);assert.ok(store.getItem('madrugacraft.save.v1'));
});
test('rejeita JSON inválido, grandes blobs e corrupção de inventário',()=>{
 const store=storage();store.setItem(SAVE_KEY,'{');assert.equal(readSave(store),null);
 store.setItem(SAVE_KEY,'x'.repeat(60001));assert.equal(readSave(store),null);
 const s=sample();s.survival.inventory.stone=-1;assert.equal(writeSave(store,s),false);
});
test('rejeita arma não fabricada e posição ou estruturas maliciosas',()=>{
 const s=sample();s.currentWeapon=2;assert.equal(validateSave({version:2,...s}),null);
 s.currentWeapon=0;s.buildings[0].x=Infinity;assert.equal(writeSave(storage(),s),false);
});
test('arma fabricada e inimigos com vida válida são preservados',()=>{
 const s=sample();s.survival.crafted.hammer=true;s.currentWeapon=1;
 assert.ok(validateSave({version:2,...s}));
 s.enemies[0].hp=9999;assert.equal(writeSave(storage(),s),false);
});
test('localStorage bloqueado não derruba o jogo',()=>{
 const bad={getItem(){throw Error('deny')},setItem(){throw Error('deny')},removeItem(){throw Error('deny')}};
 assert.equal(readSave(bad),null);assert.equal(writeSave(bad,sample()),false);assert.equal(clearSave(bad),false);
});

test('save aceita zumbi como inimigo válido e rejeita tipo desconhecido',()=>{
 const s=sample();s.enemies=[{type:'zombie',x:7,z:-2,hp:3,enraged:false}];
 assert.ok(validateSave({version:2,...s}));
 s.enemies=[{type:'mutant',x:0,z:0,hp:1,enraged:false}];
 assert.equal(validateSave({version:2,...s}),null);
});
