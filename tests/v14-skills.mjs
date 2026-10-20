import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SKILLS,MAX_SKILL_LEVEL,createSkills,restoreSkills,skillGoal,awardSkill,skillLevel,
 fishingBonus,farmingBonus,huntingBonus,resourceBonus,recipeCost,cookedYield,survivalDrain,perkDescription} from '../src/gameplay/skills.js';
import {createSurvival,restoreSurvival,RECIPES,canAfford,spendRecipe,advanceSurvival} from '../src/gameplay/survival.js';
import {tryFish} from '../src/gameplay/fishing.js';
import {workCrop,makeCrop,CROP_MATURITY,validCrop,advanceCrop} from '../src/gameplay/farming.js';
import {validateSave,readSave,writeSave} from '../src/gameplay/save-system.js';
const test=(label,fn)=>{fn();console.log(`OK v1.4: ${label}`);};
test('oito profissões independentes partem do nível 1',()=>{
 const state=createSurvival();assert.equal(Object.keys(state.skills).length,8);
 for(const id of Object.keys(SKILLS))assert.deepEqual(state.skills[id],{level:1,xp:0,total:0});
 assert.equal(skillLevel(state,'farming'),1);
});
test('XP acumula, sobe diversos níveis, reseta progresso parcial e não interfere no combate',()=>{
 const s=createSurvival();assert.deepEqual(awardSkill(s,'fishing',skillGoal(1)),{ok:true,levelUps:1,level:2});
 assert.equal(s.skills.fishing.xp,0);assert.equal(s.skills.hunting.level,1);
 const r=awardSkill(s,'fishing',skillGoal(2)+37);
 assert.equal(r.level,3);assert.equal(s.skills.fishing.xp,37);
 assert.equal(awardSkill(s,'invalid',100).ok,false);
 assert.equal(awardSkill(s,'fishing',.5).ok,false);
});
test('level 20 limita XP inclusive em eventos muito grandes',()=>{
 const state=createSurvival();awardSkill(state,'building',1000000);
 assert.equal(state.skills.building.level,MAX_SKILL_LEVEL);assert.equal(state.skills.building.xp,0);
 assert.deepEqual(restoreSkills(state.skills),state.skills);
 assert.ok(perkDescription('building',20).includes('Desconto'));
});
test('migração da v1.3 preserva estatísticas e cria todas as habilidades',()=>{
 const old=createSurvival();delete old.skills;old.days=14;old.inventory.wood=65;
 const migrated=restoreSurvival(old);
 assert.equal(migrated.days,14);assert.equal(migrated.inventory.wood,65);
 assert.deepEqual(migrated.skills,createSkills());
});
test('salvamento rejeita manipulação do XP, nível, campos ausentes e NaN',()=>{
 const s=createSurvival();
 assert.equal(restoreSurvival({...s,skills:{...s.skills,fishing:{level:21,xp:0,total:0}}}),null);
 assert.equal(restoreSurvival({...s,skills:{...s.skills,fishing:{level:1,xp:75,total:75}}}),null);
 assert.equal(restoreSurvival({...s,skills:{...s.skills,fishing:{level:1,xp:NaN,total:0}}}),null);
 assert.equal(restoreSurvival({...s,skills:{...s.skills,fishing:null}}),null);
});
test('pesca usa bônus para rendimento e tempo, sem XP quando falha',()=>{
 const s=createSurvival();s.crafted.fishingRod=true;
 const b=fishingBonus(11);assert.equal(b.yield,3);assert.equal(b.cooldown,18);
 const failed=tryFish(s,5,false,b);assert.equal(failed.ok,false);
 const caught=tryFish(s,5,true,b);assert.equal(caught.amount,3);assert.equal(s.inventory.fish,3);
 assert.equal(tryFish(s,22.9,true,b).ok,false);
 assert.equal(tryFish(s,23,true,b).ok,true);
});
test('agricultura concede mais produção e água sem quebrar validação de save',()=>{
 const plot=makeCrop(),s=createSurvival();s.inventory.seeds=2;s.inventory.water=2;
 assert.equal(workCrop(plot,s.inventory,farmingBonus(9)).action,'plant');
 assert.equal(workCrop(plot,s.inventory,farmingBonus(9)).action,'water');
 assert.equal(plot.water,84);assert.equal(validCrop(plot),true);
 for(let i=0;i<200;i++)advanceCrop(plot,1);
 assert.equal(plot.growth,CROP_MATURITY);
 const harvest=workCrop(plot,s.inventory,farmingBonus(9));
 assert.equal(harvest.action,'harvest');assert.equal(s.inventory.vegetables,5);
});
test('caça, minério e coleta oferecem bônus somente para o ofício adequado',()=>{
 assert.equal(huntingBonus(9),2);assert.equal(huntingBonus(1),0);
 assert.equal(resourceBonus('iron',11),2);assert.equal(resourceBonus('wood',11),2);
 assert.equal(resourceBonus('fish',11),0);
});
test('construtor ganha desconto em receitas de construção, sem criar materiais',()=>{
 const s=createSurvival(),base=RECIPES.wall.cost;
 assert.equal(recipeCost('wall',base,s.skills).wood,5);
 s.skills.building.level=6;s.skills.building.total=800;
 const cost=recipeCost('wall',base,s.skills);
 assert.deepEqual(cost,{wood:4,fiber:1});
 s.inventory.wood=4;s.inventory.fiber=1;
 assert.equal(canAfford(s,'wall'),false);assert.equal(canAfford(s,'wall',cost),true);
 assert.equal(spendRecipe(s,'wall',cost),true);assert.equal(s.inventory.wood,0);
 assert.equal(spendRecipe(s,'wall',cost),false); // não gera recursos negativos
 assert.equal(recipeCost('cooked',RECIPES.cooked.cost,s.skills).wood,1);
});
test('artesanato melhora comidas e desconto sem afetar receita inicial',()=>{
 assert.equal(cookedYield(1),1);assert.equal(cookedYield(6),2);
 const s=createSurvival();s.skills.crafting.level=11;
 assert.equal(recipeCost('pickaxe',RECIPES.pickaxe.cost,s.skills).stone,3);
 assert.equal(recipeCost('spear',RECIPES.spear.cost,s.skills).wood,2);
});
test('sobrevivência reduz desgaste com o nível sem gerar recursos ou vida',()=>{
 const a=createSurvival(),b=createSurvival();
 advanceSurvival(a,.1,{sprinting:true,moving:true,survivalLevel:1});
 advanceSurvival(b,.1,{sprinting:true,moving:true,survivalLevel:20});
 assert.ok(b.hunger>a.hunger);assert.ok(b.thirst>a.thirst);
 assert.equal(survivalDrain(20),.75);
 assert.equal(b.inventory.wood,a.inventory.wood);
});
test('oito habilidades sobrevivem à gravação e leitura sem afetar chave v2',()=>{
 const s=createSurvival();awardSkill(s,'hunting',152);awardSkill(s,'mining',191);
 const sample={seed:2000,graphicsQuality:'medium',level:3,xp:1,kills:0,health:100,maxHealth:100,
 wave:1,elapsed:120,currentWeapon:0,player:{x:0,z:0,yaw:0},survival:s,
 raid:{lastNight:0,waves:0},resources:[],buildings:[],healthPacks:[],speedBoosts:[],enemies:[]};
 const obj={items:new Map(),getItem(k){return this.items.get(k)},setItem(k,v){this.items.set(k,v)},removeItem(k){this.items.delete(k)}};
 assert.equal(writeSave(obj,sample),true);
 assert.deepEqual(readSave(obj).survival.skills,s.skills);
 const legacy={...sample,survival:{...s}};delete legacy.survival.skills;
 assert.ok(validateSave({version:2,...legacy}));
 assert.deepEqual(validateSave({version:2,...legacy}).survival.skills,createSkills());
});
test('main liga todos os eventos e painel à jogabilidade real',()=>{
 const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../src/ui/survival-ui.js',import.meta.url),'utf8');
 for(const symbol of ["earnSkill('hunting'","earnSkill('farming'","earnSkill('building'","earnSkill(skill","earnSkill('fishing'","earnSkill('crafting'","earnSkill('survival'",'KeyU','openSkills(','recipeCost(','fishingBonus(','farmingBonus('])assert.ok(main.includes(symbol),symbol);
 assert.match(ui,/getRecipeCost\(key\)/);
 for(const id of ['skills-toggle','skills-close','skills-panel','skills-list','open-skills-inventory'])assert.ok(html.includes(`id="${id}"`));
});
