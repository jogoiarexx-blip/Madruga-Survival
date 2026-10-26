import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SPIDER_LEGS,spiderLegContactWeight,spiderLegGroundTarget,inspectSpiderLegs,createSpiderLegPlant}
  from '../src/characters/spider-leg-plant.js';
let tests=0;
const test=(name,fn)=>{fn();tests++;console.log(`OK v2.9 ${tests}: ${name}`);};
const glb=readFileSync(new URL('../assets/models/aranha_sombria_animada.glb',import.meta.url));
const meta=JSON.parse(glb.toString('utf8',20,20+glb.readUInt32LE(12)));
const nodes=new Map(meta.nodes.map((n,i)=>[n.name,{...n,id:i}]));
test('oito patas com pares de ossos únicos e reais do GLB',()=>{
  assert.equal(SPIDER_LEGS.length,8);
  assert.equal(new Set(SPIDER_LEGS.map(x=>x[2])).size,8);
  for(const leg of SPIDER_LEGS){assert.equal(leg.length,3);leg.forEach(n=>assert.ok(nodes.has(n),n));}
});
test('quadrúpedes diagonais alternados têm fases complementares',()=>{
  const w=SPIDER_LEGS.map((_,i)=>spiderLegContactWeight(.20,i));
  assert.deepEqual(w.map(n=>n>.95),[true,false,false,true,true,false,false,true]);
  assert.ok(w.every(n=>n>=0&&n<=1));
});
test('fases periódicas e inválidas não geram NaN',()=>{
  for(let i=0;i<8;i++)for(let p=0;p<1;p+=.037){
    assert.ok(Math.abs(spiderLegContactWeight(p,i)-spiderLegContactWeight(p+1,i))<1e-10);
  }
  assert.equal(spiderLegContactWeight(NaN,2),0);
  assert.equal(spiderLegContactWeight(0,9),0);
});
test('contato tem transições suaves no início e no fim da passada',()=>{
  assert.equal(spiderLegContactWeight(0,0),0);
  assert.equal(spiderLegContactWeight(.04,0)>0,true);
  assert.equal(spiderLegContactWeight(.30,0),1);
  assert.equal(spiderLegContactWeight(.58,0),0);
});
test('alvo vertical respeita solo, folga e limite anatômico',()=>{
  assert.equal(spiderLegGroundTarget({y:.2},0,1),.034);
  assert.equal(spiderLegGroundTarget({y:3},0,1),2.66);
  assert.equal(spiderLegGroundTarget({y:0},4,1),.28);
});
test('altura do terreno inválida não afeta o esqueleto',()=>{
  assert.equal(spiderLegGroundTarget({y:2},NaN),null);
  assert.equal(spiderLegGroundTarget({y:2},Infinity),null);
});
test('todos os ossos terminais estão em suas respectivas cadeias',()=>{
  const parents=new Map(meta.nodes.flatMap((n,i)=>(n.children||[]).map(k=>[k,i])));
  for(const [hip,knee,foot] of SPIDER_LEGS){
    let current=nodes.get(foot).id,passedKnee=false,passedHip=false;
    while(parents.has(current)){
      current=parents.get(current);
      if(current===nodes.get(knee).id)passedKnee=true;
      if(current===nodes.get(hip).id)passedHip=true;
    }
    assert.ok(passedKnee&&passedHip,`${hip}/${knee}/${foot}`);
  }
});
test('rig incompleto desativa IK sem impedir a aranha',()=>{
  assert.equal(inspectSpiderLegs({getObjectByName:()=>null}),null);
  assert.equal(createSpiderLegPlant({THREE:{},model:{},getGroundHeight:()=>0}),null);
});
test('mapeamento do rig recupera as oito referências corretamente',()=>{
  const byName=new Map(SPIDER_LEGS.flat().map(n=>[n,{name:n,parent:{}}]));
  const found=inspectSpiderLegs({getObjectByName:n=>byName.get(n)});
  assert.equal(found.length,8);
  assert.equal(found[0].hip.name,'Bone_066');
  assert.equal(found[7].foot.name,'Bone_010');
});
test('clipes originais preservam nomes e ossos',()=>{
  assert.deepEqual(meta.animations.map(a=>a.name),['Idle','Walk','Jump','Attack','WebShot']);
  assert.equal(meta.skins[0].joints.length,72);
});
test('gestor de modelos recebe altura do terreno e integra IK só após o mixer',()=>{
  const m=readFileSync(new URL('../src/characters/spider-model.js',import.meta.url),'utf8');
  const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  assert.match(m,/createSpiderLegPlant\(\{THREE,model,getGroundHeight\}\)/);
  assert.ok(m.indexOf('this.mixer.update(advanced)')<m.indexOf('this.footPlant?.update'));
  assert.match(main,/createSpiderModelManager\(\{THREE,GLTFLoader,cloneSkeleton,getGroundHeight\}\)/);
  const ai=readFileSync(new URL('../src/gameplay/spider-ai.js',import.meta.url),'utf8');
  assert.match(ai,/ai\.slope,dist<24\)/);
});
test('cache bust do navegador e scripts de verificação atualizados',()=>{
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
  assert.match(html,/data-build="(?:2\.(?:9|10|11)\.0-spider|2\.12\.0-nests|2\.13\.0-cave)"/);
  assert.match(main,/spider-model\.js\?v=(?:2\.(?:9|10|11)\.0-spider|2\.12\.0-nests|2\.13\.0-cave)/);
  assert.ok(['2.9.0','2.10.0','2.11.0','2.12.0','2.13.0'].includes(pkg.version));
  assert.ok(pkg.scripts.test.includes('v290-spider-footplant.mjs'));
});
console.log(`v2.9: ${tests} novas verificações aprovadas`);
