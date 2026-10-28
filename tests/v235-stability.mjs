import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readSave,writeSave,clearSave,SAVE_KEY,SAVE_BACKUP_KEY,SAVE_MAX_BYTES} from '../src/gameplay/save-system.js';
import {createSurvival} from '../src/gameplay/survival.js';
import {createGuardNavigator,findGuardPath,segmentIsWalkable} from '../src/gameplay/guard-navigation.js';

let count=0;
function test(label,fn){fn();console.log(`OK v2.35 ${++count}: ${label}`);}
function mockStorage(){const memory=new Map();return {
 memory, getItem:key=>memory.get(key)??null,setItem:(key,value)=>{memory.set(key,String(value));},
 removeItem:key=>{memory.delete(key);}
};}
function sample(kills=1){return {seed:2045,graphicsQuality:'medium',level:1,xp:0,kills,
 health:100,maxHealth:100,wave:1,elapsed:5,currentWeapon:0,
 player:{x:0,z:0,yaw:0},survival:createSurvival(),
 resources:[],buildings:[],healthPacks:[],speedBoosts:[],enemies:[]};}
test('guarda uma cópia do checkpoint anterior ao avançar uma partida',()=>{
 const storage=mockStorage();assert.equal(writeSave(storage,sample(2)),true);
 assert.equal(storage.getItem(SAVE_BACKUP_KEY),null);
 assert.equal(writeSave(storage,sample(3)),true);
 assert.equal(JSON.parse(storage.getItem(SAVE_BACKUP_KEY)).kills,2);
 assert.equal(readSave(storage).kills,3);
});
test('recupera salvamento pelo backup após corrupção do primário',()=>{
 const storage=mockStorage();writeSave(storage,sample(8));writeSave(storage,sample(9));
 storage.setItem(SAVE_KEY,'{quebrado');
 assert.equal(readSave(storage).kills,8);
});
test('não troca backup válido por checkpoint primário corrompido',()=>{
 const storage=mockStorage();writeSave(storage,sample(5));writeSave(storage,sample(6));
 storage.setItem(SAVE_KEY,'{');writeSave(storage,sample(7));
 assert.equal(JSON.parse(storage.getItem(SAVE_BACKUP_KEY)).kills,5);
 assert.equal(readSave(storage).kills,7);
});
test('uma falha no backup não impede a gravação do primário',()=>{
 const storage=mockStorage();writeSave(storage,sample(5));
 const setItem=storage.setItem;
 storage.setItem=(key,value)=>{if(key===SAVE_BACKUP_KEY)throw Error('quota');setItem(key,value);};
 assert.equal(writeSave(storage,sample(6)),true);
 assert.equal(readSave(storage).kills,6);
});
test('falha na gravação principal mantém progresso recuperável',()=>{
 const storage=mockStorage();writeSave(storage,sample(6));
 const setItem=storage.setItem;
 storage.setItem=(key,value)=>{if(key===SAVE_KEY)throw Error('quota');setItem(key,value);};
 assert.equal(writeSave(storage,sample(7)),false);
 assert.equal(readSave(storage).kills,6);
});
test('limpar save elimina primário e backup; não usa chave da campanha antiga',()=>{
 const storage=mockStorage();writeSave(storage,sample(3));writeSave(storage,sample(4));
 storage.setItem('madrugacraft.save.v1','antigo');
 assert.equal(clearSave(storage),true);
 assert.equal(readSave(storage),null);
 assert.equal(storage.getItem(SAVE_BACKUP_KEY),null);
 assert.equal(storage.getItem('madrugacraft.save.v1'),'antigo');
});
test('mantém limite finito e aceita JSON válido com mais de 60 KB',()=>{
 const storage=mockStorage(),save=sample(4);save.notes='x'.repeat(61000);
 assert.equal(writeSave(storage,save),true);
 assert.equal(readSave(storage).kills,4);
 assert.ok(SAVE_MAX_BYTES>61000);
 save.notes='x'.repeat(SAVE_MAX_BYTES);assert.equal(writeSave(storage,save),false);
 assert.equal(readSave(storage).kills,4);
});
test('Chaves percorre espaço livre replanejando com menos frequência',()=>{
 const nav=createGuardNavigator({isFree:()=>true,resolveCollision:(x,z)=>({x,z})});
 let pos={x:0,z:0};
 for(let i=0;i<190;i++){
  const next=nav.navigate(pos,{x:25,z:0},.04,.25,{stopAt:1});
  assert.ok(next.x>=pos.x && next.x-pos.x<=.0101);
  pos={x:next.x,z:next.z};
 }
 assert.ok(nav.plannedRoutes<=6,`replanejamentos em 7.6 s: ${nav.plannedRoutes}`);
});
test('Chaves continua sem atravessar paredes ao simplificar o caminho',()=>{
 const wall=(x,z,r)=>!(x>-1-r&&x<1+r&&z>-4-r&&z<4+r);
 const start={x:-8,z:0},route=findGuardPath(start,{x:8,z:0},{isFree:wall});
 assert.ok(route.length>=2);
 let from=start;for(const point of route){assert.ok(segmentIsWalkable(from,point,{isFree:wall}));from=point;}
});
test('HUD só substitui texto de configuração quando conteúdo muda',()=>{
 const ui=readFileSync(new URL('../src/ui/consumable-hotbar-ui.js',import.meta.url),'utf8');
 assert.match(ui,/if\(target.textContent!==targetLabel\)target.textContent=targetLabel/);
 assert.match(ui,/if\(target.title!==targetTitle\)target.title=targetTitle/);
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/2\.35\.0-stability|2\.36\.0-wildlife-inventory|2\.37\.0-campfire-ui|2\.38\.0-save-profiling|2\.39\.0-wildlife-quests|2\.40\.0-fauna-exploration|2\.41\.0-ecosystem|2\.42\.0-soundscape|2\.43\.0-foley|2\.44\.0-quiet-builds|2\.45\.0-stable-play|2\.47\.0-multi-floor/);
});
console.log(`v2.35.0: ${count} regressões aprovadas`);
