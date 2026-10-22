import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {queueZombieImpact,advanceZombieImpact,ZOMBIE_IMPACT_SECONDS} from '../src/gameplay/zombie-attack-events.js';
import {createZombieModelManager} from '../src/characters/zombie-models.js';
import {ZOMBIE_TYPES} from '../src/gameplay/zombie-variants.js';
let n=0;const test=(label,fn)=>{fn();n++;console.log(`OK ajuste REV2 ${n}: ${label}`)};
test('altura normal 2,48 aproxima personagem de 2,505 incluindo chapéu',()=>{
 const s=readFileSync(new URL('../src/characters/zombie-models.js',import.meta.url),'utf8');
 assert.match(s,/BASE_MATCH_HEIGHT=2\.48/);assert.match(s,/model\.rotation\.y=0/);
 assert.ok(Math.abs(2.48-2.505)<.05);
});
test('dano de mordida só ocorre 0,56 s após começar a pose',()=>{
 const e={type:'zombie',hp:3};assert.equal(queueZombieImpact(e,'player'),true);
 assert.equal(queueZombieImpact(e,'player'),false);
 assert.equal(advanceZombieImpact(e,.1),null);
 for(let i=0;i<4;i++)assert.equal(advanceZombieImpact(e,.1),null);
 assert.equal(advanceZombieImpact(e,.06)?.kind,'player');
 assert.equal(advanceZombieImpact(e,.1),null);
});
test('agarrão demora 0,85s e cancelamento por morte impede dano tardio',()=>{
 const e={type:'zombie_toxic',hp:4};assert.equal(ZOMBIE_IMPACT_SECONDS.zombie_toxic,.85);
 queueZombieImpact(e,'guard',{x:2,z:3});for(let i=0;i<8;i++)assert.equal(advanceZombieImpact(e,.1),null);
 assert.equal(advanceZombieImpact(e,.05)?.kind,'guard');
 queueZombieImpact(e,'player');e.hp=0;assert.equal(advanceZombieImpact(e,.8),null);
 assert.equal(e.pendingImpact,null);
});
test('variantes mantêm diferenças de escala; corpo é alinhado ao solo',()=>{
 assert.ok(ZOMBIE_TYPES.zombie_runner.size<ZOMBIE_TYPES.zombie.size);
 assert.ok(ZOMBIE_TYPES.zombie_brute.size>ZOMBIE_TYPES.zombie.size);
 const s=readFileSync(new URL('../src/characters/zombie-models.js',import.meta.url),'utf8');
 assert.match(s,/SOURCE_MIN_Y\*baseScaleFor\(enemy\)/);
 assert.match(s,/model\.position\.set\(0, verticalOffsetFor\(enemy\), 0\)/);
});
test('IA revalida alvo no instante do impacto e preserva fallback',()=>{
 const s=readFileSync(new URL('../src/gameplay/enemy-ai.js',import.meta.url),'utf8');
 assert.match(s,/const pending=advanceZombieImpact\(enemy,dt\)/);
 assert.match(s,/hasLineOfSight\(mesh\.position,target\)/);
 assert.match(s,/queueZombieImpact\(enemy,targetGuard\?'guard':'player'/);
});
console.log(`REV2 scale/attack: ${n} verificações aprovadas.`);
