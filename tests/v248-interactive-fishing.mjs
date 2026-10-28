import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFishingSession,selectFishSpecies,BITE_WINDOW,REEL_WINDOW} from '../src/gameplay/fishing-session.js';
import {tryFish,FISH_COOLDOWN} from '../src/gameplay/fishing.js';
import {createSurvival,restoreSurvival} from '../src/gameplay/survival.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
let checks=0;function test(name,fn){fn();console.log(`✓ v2.48 ${++checks} ${name}`);}
function session(random=.5){return createFishingSession(()=>random);}
function s(){const x=createSurvival();x.crafted.fishingRod=true;return x;}
const pos={x:60,z:41};
const cast=(f,sv=s())=>f.start({survival:sv,elapsed:0,nearWater:true,position:pos});
const untilBite=(f)=>{for(let i=0;i<200&&f.state.phase==='waiting';i++)f.tick(.1,{position:pos,nearWater:true});return f.state.phase;};
test('vara e fonte de água obrigatórias, sem consumir inventário',()=>{
 const a=session(),sv=s();sv.crafted.fishingRod=false;
 assert.equal(cast(a,sv).type,'error');sv.crafted.fishingRod=true;
 assert.equal(a.start({survival:sv,elapsed:0,nearWater:false,position:pos}).type,'error');
 assert.equal(sv.inventory.fish,0);assert.equal(cast(a,sv).type,'cast');assert.equal(sv.inventory.fish,0);
});
test('impede nova pesca durante cooldown e mochila com 999 peixes',()=>{
 const a=session(),sv=s();sv.fishReadyAt=35;
 assert.equal(cast(a,sv).type,'error');sv.fishReadyAt=0;sv.inventory.fish=999;
 assert.equal(cast(a,sv).type,'error');
});
test('espera variável não concede XP ou peixe antes da fisgada',()=>{
 const sv=s(),f=session(0);cast(f,sv);
 assert.equal(f.press().type,'wait');assert.equal(sv.inventory.fish,0);
 assert.equal(f.tick(2,{position:pos,nearWater:true}),null); // dt máximo de .1
 assert.equal(f.state.phase,'waiting');assert.equal(untilBite(f),'bite');
 assert.equal(sv.inventory.fish,0);
});
test('fisgada perdida não concede captura',()=>{
 const f=session(0),sv=s();cast(f,sv);untilBite(f);
 for(let i=0;i<35;i++)f.tick(.1,{position:pos,nearWater:true});
 assert.equal(f.state.phase,'idle');assert.equal(sv.inventory.fish,0);
});
test('puxadas com intervalo: uma tecla não pesca automaticamente',()=>{
 const f=session(0),sv=s();cast(f,sv);untilBite(f);
 assert.equal(f.press().type,'hook');assert.equal(f.state.progress,1);
 assert.equal(f.press().type,'wait');
 f.tick(.1,{position:pos,nearWater:true});f.tick(.1,{position:pos,nearWater:true});assert.equal(f.press().type,'reel');
 assert.equal(f.press().type,'wait');
 f.tick(.1,{position:pos,nearWater:true});f.tick(.1,{position:pos,nearWater:true});assert.equal(f.press().type,'caught');
 assert.equal(sv.inventory.fish,0,'captura só pode ser registrada no fim pelo runtime');
});
test('puxadas insuficientes deixam escapar ao fim da janela de recolhimento',()=>{
 const f=session(.95);cast(f);untilBite(f);f.press();
 for(let i=0;i<70;i++)f.tick(.1,{position:pos,nearWater:true});
 assert.equal(f.state.phase,'idle');
});
test('afastar da beira cancela sem recompensas',()=>{
 const f=session(),sv=s();cast(f,sv);
 assert.equal(f.tick(.02,{position:{x:pos.x+4,z:pos.z},nearWater:true}).type,'cancel');
 assert.equal(sv.inventory.fish,0);
});
test('pesca congelada quando simulação está pausada, e reset após retorno ao menu',()=>{
 const f=session(0);cast(f);
 const previous=f.state.seconds;
 for(let i=0;i<100;i++)f.tick(0,{position:pos,nearWater:true});
 assert.equal(f.state.seconds,previous);
 f.reset();assert.equal(f.state.phase,'idle');
});
test('probabilidades de tilápia, traíra e carpa e dificuldades crescentes',()=>{
 assert.equal(selectFishSpecies(0).id,'tilapia');
 assert.equal(selectFishSpecies(.61).id,'traira');
 assert.equal(selectFishSpecies(.99).id,'carpa');
 assert.deepEqual([0,.7,.99].map(x=>selectFishSpecies(x).tugs),[3,4,5]);
 assert.equal(BITE_WINDOW,1.55);assert.equal(REEL_WINDOW,6.6);
});
test('concluir minigame usa tryFish original e mantém peixe cru/receitas e cooldown',()=>{
 const sv=s(),f=session(0);cast(f,sv);untilBite(f);f.press();
 for(let i=0;i<2;i++){f.tick(.1,{position:pos,nearWater:true});f.tick(.1,{position:pos,nearWater:true});f.press();}
 assert.equal(f.state.phase,'caught');
 const caught=tryFish(sv,20,true);assert.equal(caught.ok,true);assert.equal(sv.inventory.fish,1);
 assert.equal(tryFish(sv,22,true).ok,false);assert.equal(sv.fishReadyAt,20+FISH_COOLDOWN);
 assert.ok(restoreSurvival(sv));
});
test('integração tela Y, mochila, celular, HUD de pesca e linha 3D',()=>{
 const main=read('src/main.js'),html=read('index.html');
 for(const x of ['fishingSession.tick','fishingSession.press','fishingSession.start','finishFishing','fishingHud.update','fishingVisual.update'])assert.ok(main.includes(x),x);
 assert.match(main,/if \(e\.code === 'KeyY'\) fishNearby\(\)/);
 assert.match(html,/data-action="KeyY"/);
 assert.match(read('src/ui/survival-ui.js'),/onFish\(\)/);
 assert.match(read('src/world/fishing-visual.js'),/RingGeometry/);
 assert.equal(JSON.parse(read('package.json')).version,'2.50.0');
});
console.log(`v2.48.0: ${checks} testes novos aprovados`);
