import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
let count=0; const test=(name,fn)=>{fn();count++;console.log('OK v2.1.4',count,name)};
const models=readFileSync(new URL('../src/characters/zombie-models.js',import.meta.url),'utf8');
const ai=readFileSync(new URL('../src/gameplay/enemy-ai.js',import.meta.url),'utf8');
const anim=readFileSync(new URL('../src/characters/enemy-animation.js',import.meta.url),'utf8');

test('zumbi base ficou um pouco maior que o player visual antigo',()=>{
  assert.match(models,/BASE_MATCH_HEIGHT=2\.58/);
  assert.match(models,/LOCOMOTION_CLIP_SCALE/);
});

test('ritmo da animação do GLB acompanha a passada real',()=>{
  assert.match(anim,/update\(dt,moving,near,pace,footIKNear\)/);
  assert.match(ai,/const locomotionPace=actualMoving \? stepDistance\/Math\.max\(\.001,enemy\.speed\*dt\) : 0/);
  assert.match(models,/const locomotionPace=moving\?Math\.max\(\.82,Math\.min\(2\.80,this\.locomotionScale\*Math\.max\(\.65,Math\.min\(1\.25,pace\|\|1\)\)\)\):1/);
});
console.log('v2.1.4:',count,'testes aprovados.');
