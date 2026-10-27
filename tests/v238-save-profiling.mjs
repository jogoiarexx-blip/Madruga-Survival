import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSurvival} from '../src/gameplay/survival.js';
import {readSave,writeSave,SAVE_KEY,SAVE_BACKUP_KEY} from '../src/gameplay/save-system.js';
import {EXPORT_FORMAT,MAX_IMPORT_BYTES,serializePortableSave,parsePortableSave,exportStoredSave,importPortableSave} from '../src/gameplay/save-transfer.js';
import {createFrameProfiler} from '../src/render/frame-profiler.js';
import {setTextIfChanged,setWidthIfChanged} from '../src/ui/dom-patch.js';
let n=0;const test=(label,fn)=>{fn();console.log('OK v2.38 '+(++n)+': '+label);};
function storage(){const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k),map};}
function sample(kills=1){return {seed:100,graphicsQuality:'medium',level:1,xp:0,kills,
 health:100,maxHealth:100,wave:1,elapsed:10,currentWeapon:0,
 player:{x:0,z:0,yaw:0},survival:createSurvival(),resources:[],buildings:[],healthPacks:[],speedBoosts:[],enemies:[]};}
test('exportação preserva versão, data e propriedades válidas',()=>{
 const raw=serializePortableSave(sample(11)),payload=JSON.parse(raw);
 assert.equal(payload.format,EXPORT_FORMAT);assert.equal(payload.exportVersion,1);
 assert.equal(parsePortableSave(raw).kills,11);
 assert.ok(!Number.isNaN(Date.parse(payload.createdAt)));
});
test('importação validada deixa checkpoint anterior disponível como backup',()=>{
 const db=storage();writeSave(db,sample(3));
 const next=importPortableSave(db,serializePortableSave(sample(9)));
 assert.equal(next.kills,9);assert.equal(readSave(db).kills,9);
 assert.equal(JSON.parse(db.getItem(SAVE_BACKUP_KEY)).kills,3);
});
test('exportação lê apenas o checkpoint do navegador e não altera seus bytes',()=>{
 const db=storage();writeSave(db,sample(8));const original=db.getItem(SAVE_KEY);
 assert.equal(parsePortableSave(exportStoredSave(db)).kills,8);
 assert.equal(db.getItem(SAVE_KEY),original);
});
test('importação rejeita JSON adulterado sem tocar no save existente',()=>{
 const db=storage();writeSave(db,sample(4));const original=db.getItem(SAVE_KEY);
 for(const text of ['','{malformado','{}',JSON.stringify({format:EXPORT_FORMAT,exportVersion:99,save:sample(5)}),
 JSON.stringify({format:EXPORT_FORMAT,exportVersion:1,save:{version:2,health:-10}}),'x'.repeat(MAX_IMPORT_BYTES+1)]){
  assert.throws(()=>importPortableSave(db,text));
  assert.equal(db.getItem(SAVE_KEY),original);
 }
});
test('falha de escrita não destrói save existente',()=>{
 const db=storage();writeSave(db,sample(2));
 db.setItem=(key,value)=>{if(key===SAVE_KEY)throw Error('quota');db.map.set(key,value);};
 assert.throws(()=>importPortableSave(db,serializePortableSave(sample(6))));
 assert.equal(readSave(db).kills,2);
});
test('perfil calcula p95 e quadros lentos sem truncar frame real',()=>{
 const monitor=createFrameProfiler({capacity:20});
 for(let i=0;i<19;i++)monitor.record(16.6);monitor.record(180);
 assert.equal(monitor.snapshot().samples,20);
 assert.equal(monitor.snapshot().p95,16.6);
 assert.equal(monitor.snapshot().max,180);
 assert.equal(monitor.snapshot().slowFrames,1);
 monitor.reset();assert.equal(monitor.snapshot().samples,0);
});
test('diagnóstico usa janela limitada e ignora valores inválidos',()=>{
 const monitor=createFrameProfiler({capacity:8});
 for(let i=0;i<20;i++)monitor.record(i);
 monitor.record(-1);monitor.record(Number.NaN);
 assert.equal(monitor.snapshot().samples,8);
 assert.equal(monitor.snapshot().p50,15);
});
test('patch DOM não reescreve conteúdo ou estilo idêntico',()=>{
 let textWrites=0,styleWrites=0,t='bom',w='50%';
 const el={get textContent(){return t;},set textContent(v){textWrites++;t=v;},style:{get width(){return w;},set width(v){styleWrites++;w=v;}}};
 assert.equal(setTextIfChanged(el,'bom'),false);
 assert.equal(setWidthIfChanged(el,'50%'),false);
 assert.equal(setTextIfChanged(el,'novo'),true);
 assert.equal(setWidthIfChanged(el,'51%'),true);
 assert.equal(textWrites,1);assert.equal(styleWrites,1);
});
test('interface disponibiliza backup no menu e pausa, além da instrumentação F3',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 for(const id of ['export-save-menu','export-save-pause','import-save-menu','import-save-pause','save-file-input']){
  assert.ok(html.includes('id="'+id+'"'),id);
 }
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(main,/if\(running&&showFps\)frameProfiler\.record\(frameSeconds\*1000\)/);
 assert.match(main,/if \(hudTick>0\.25\)/);
 assert.match(main,/gameActive=false; \/\/ impede que o pagehide sobrescreva o save importado/);
 assert.match(html,/2\.38\.0-save-profiling|2\.39\.0-wildlife-quests|2\.40\.0-fauna-exploration|2\.41\.0-ecosystem|2\.42\.0-soundscape|2\.43\.0-foley|2\.44\.0-quiet-builds/);
});
console.log(`v2.38: ${n} regressões aprovadas`);
