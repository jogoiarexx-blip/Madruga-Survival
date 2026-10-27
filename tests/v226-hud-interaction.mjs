import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildingInteractionLabel} from '../src/ui/building-interaction-label.js';
let ok=0;
function test(name,callback){callback();console.log(`OK HUD #${++ok}: ${name}`);}
test('todas as estruturas nao agricolas sem crop nao interrompem updateHUD',()=>{
    const items={door:'Abrir porta',bed:'Dormir até amanhecer',chest:'Abrir baú',workbench:'Usar bancada'};
    for(const [type,expected] of Object.entries(items)){
        assert.equal(buildingInteractionLabel({type,crop:null,open:false}),expected);
    }
    assert.equal(buildingInteractionLabel({type:'door',crop:null,open:true}),'Fechar porta');
});
test('canteiro vazio, em crescimento, molhado e pronto',()=>{
    const plot=crop=>({type:'farmPlot',crop});
    assert.equal(buildingInteractionLabel(plot({planted:false,growth:0,water:0})),'Plantar sementes');
    assert.equal(buildingInteractionLabel(plot({planted:true,growth:75,water:0})),'Regar canteiro');
    assert.equal(buildingInteractionLabel(plot({planted:true,growth:75,water:20})),'Canteiro crescendo');
    assert.equal(buildingInteractionLabel(plot({planted:true,growth:125,water:0})),'Colher legumes');
});
test('save de canteiro nulo não interrompe HUD',()=>{
    assert.equal(buildingInteractionLabel({type:'farmPlot',crop:null}),'Verificar canteiro');
    assert.equal(buildingInteractionLabel({type:'farmPlot'}),'Verificar canteiro');
    assert.equal(buildingInteractionLabel(null),'');
    assert.equal(buildingInteractionLabel({type:'floor',crop:null}),'Interagir');
});
test('HUD usa apenas helper lazily em vez de avaliar farmPlot sempre',()=>{
    const js=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
    assert.match(js,/buildingInteractionLabel\(closestBuilding,CROP_MATURITY\)/);
    assert.doesNotMatch(js,/farmPlot:!closestBuilding\.crop\.planted/);
});
console.log(`${ok} regressões do HUD aprovadas`);
