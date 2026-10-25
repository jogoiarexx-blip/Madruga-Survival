// Profissões independentes; lógica pura para testes e partidas salvas.
export const MAX_SKILL_LEVEL=20;
export const SKILLS=Object.freeze({
 fishing:{name:'Pesca',icon:'🎣',activity:'Peixes capturados'},
 farming:{name:'Agricultura',icon:'🌾',activity:'Plantar, regar e colher'},
 hunting:{name:'Caça',icon:'🏹',activity:'Caçar animais selvagens'},
 building:{name:'Construtor',icon:'🏠',activity:'Construir e reparar'},
 mining:{name:'Mineração',icon:'⛏️',activity:'Extrair pedras e ferro'},
 gathering:{name:'Coleta',icon:'🌿',activity:'Recolher madeira, água, fibras e frutos'},
 crafting:{name:'Artesanato',icon:'🛠️',activity:'Fabricar equipamentos e cozinhar'},
 survival:{name:'Sobrevivência',icon:'🔥',activity:'Resistir a novos dias'}
});
export const skillGoal=level=>level>=MAX_SKILL_LEVEL?0:50+25*level;
export const createSkills=()=>Object.fromEntries(Object.keys(SKILLS).map(id=>[id,{level:1,xp:0,total:0}]));
export function restoreSkills(value){
 if(value===undefined)return createSkills(); // migração de saves v1.0 a v1.3
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const restored={};
 for(const id of Object.keys(SKILLS)){
  const record=value[id];
  if(!record||!Number.isInteger(record.level)||record.level<1||record.level>MAX_SKILL_LEVEL||
     !Number.isInteger(record.xp)||record.xp<0||record.xp>=(skillGoal(record.level)||1)||
     !Number.isInteger(record.total)||record.total<0||record.total>10000000)return null;
  restored[id]={level:record.level,xp:record.xp,total:record.total};
 }
 return restored;
}
export function skillLevel(state,id){return state?.skills?.[id]?.level||1;}
export function awardSkill(state,id,amount){
 const p=state?.skills?.[id];
 if(!Object.hasOwn(SKILLS,id)||!p||!Number.isInteger(amount)||amount<1)return {ok:false,levelUps:0};
 if(p.level>=MAX_SKILL_LEVEL)return {ok:true,levelUps:0,level:p.level};
 p.total=Math.min(10000000,p.total+amount);p.xp+=amount;
 let levelUps=0;
 while(p.level<MAX_SKILL_LEVEL&&p.xp>=skillGoal(p.level)){
  p.xp-=skillGoal(p.level);p.level++;levelUps++;
 }
 if(p.level===MAX_SKILL_LEVEL)p.xp=0;
 return {ok:true,levelUps,level:p.level};
}
export function fishingBonus(level){return {yield:Math.min(4,1+Math.floor((level-1)/5)),cooldown:Math.max(12,28-(level-1))};}
export function farmingBonus(level){return {harvestExtra:Math.min(5,Math.floor((level-1)/4)),waterExtra:Math.min(40,(level-1)*3)};}
export function huntingBonus(level){return Math.min(4,Math.floor((level-1)/4));}
export function resourceBonus(type,level){
 if(type==='iron'||type==='stone')return Math.min(3,Math.floor((level-1)/5));
 if(['wood','berries','fiber','water'].includes(type))return Math.min(3,Math.floor((level-1)/5));
 return 0;
}
const BUILD_RECIPES=new Set(['campfire','shelter','floor','wall','door','bed','chest','workbench','roof','farmPlot']);
const CRAFT_RECIPES=new Set(['fishingRod','hammer','spear','pickaxe','ironSpear','repairPickaxe','repairHammer','repairSpear','ironHammer','reinforcedGrip','hardenedSpear','spikedHammer','armoredBroom','reinforcedVest','trailBoots','medicalKit','repairKit','bandage','cooked','grilledFish','stew']);
export function recipeCost(recipeId,baseCost,skills){
 if(!baseCost)return null;
 const level=BUILD_RECIPES.has(recipeId)?skillLevel({skills},'building'):CRAFT_RECIPES.has(recipeId)?skillLevel({skills},'crafting'):1;
 const discount=Math.floor((level-1)/5); // primeiro desconto no nível 6
 return Object.fromEntries(Object.entries(baseCost).map(([id,n])=>[id,Math.max(1,n-(n>=3?Math.min(discount,2):0))]));
}
export function cookedYield(level){return level>=6?2:1;}
export function survivalDrain(level){return Math.max(.75,1-(level-1)*.015);}
export function perkDescription(id,level){
 switch(id){
  case 'fishing':{const x=fishingBonus(level);return `${x.yield} peixe(s) por captura · espera ${x.cooldown}s`;}
  case 'farming':{const x=farmingBonus(level);return `+${x.harvestExtra} legumes por colheita · +${x.waterExtra}s de irrigação`;}
  case 'hunting':return `+${huntingBonus(level)} carne(s) extras por animal`;
  case 'building':return `Desconto de até ${Math.min(2,Math.floor((level-1)/5))} madeira/pedra/fibra em receitas de construção com custo ≥3`;
  case 'mining':return `+${resourceBonus('iron',level)} pedra/minério por coleta`;
  case 'gathering':return `+${resourceBonus('wood',level)} recurso por coleta comum`;
  case 'crafting':return `Até ${Math.min(2,Math.floor((level-1)/5))} materiais economizados; ${cookedYield(level)} prato(s) por receita`;
  case 'survival':return `${Math.round((1-survivalDrain(level))*100)}% menos desgaste de fome e sede`;
  default:return '';
 }
}
