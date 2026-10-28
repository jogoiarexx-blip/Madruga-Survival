import {createSkills,restoreSkills,survivalDrain} from './skills.js?v=2.2.8-weapons-craft';
import {normalizeGear} from './gear-loadout.js';
// Regras puras da sobrevivência (sem dependências de DOM/Three.js).
export const RESOURCES = Object.freeze({
  wood: {label:'Madeira',icon:'🪵'}, stone:{label:'Pedra',icon:'🪨'},
  fiber:{label:'Fibra',icon:'🌿'}, berries:{label:'Frutas',icon:'🫐'},
  water:{label:'Água',icon:'💧'}, meat:{label:'Carne crua',icon:'🥩'},
  cooked:{label:'Carne assada',icon:'🍖'}, iron:{label:'Minério de ferro',icon:'⛏️'},
  seeds:{label:'Sementes',icon:'🌱'},vegetables:{label:'Legumes',icon:'🥕'},
  fish:{label:'Peixe cru',icon:'🐟'},grilledFish:{label:'Peixe assado',icon:'🍤'},
  stew:{label:'Ensopado de legumes',icon:'🍲'},bandage:{label:'Bandagem',icon:'🩹'},
  scrap:{label:'Sucata metálica',icon:'🔩'},cloth:{label:'Tecido reaproveitado',icon:'🧵'},
  medicalKit:{label:'Kit médico',icon:'🧰'},repairKit:{label:'Kit de manutenção',icon:'🛠️'},
  spiderSilk:{label:'Seda de aranha',icon:'🕸️'},chitin:{label:'Quitina',icon:'🪲'},
  silkDressing:{label:'Curativo de seda',icon:'🩹'},caveCrystal:{label:'Cristal subterrâneo',icon:'💎'}
});
export const RECIPES = Object.freeze({
  campfire:{label:'Fogueira',cost:{wood:4,stone:4},hint:'Aquece e permite cozinhar'},
  shelter:{label:'Abrigo',cost:{wood:8,fiber:6},hint:'Protege do frio noturno'},
  floor:{label:'Piso de madeira',cost:{wood:3},hint:'Base encaixável de 3 metros'},
  wall:{label:'Parede',cost:{wood:5,fiber:1},hint:'Bloqueia passagem e criaturas'},
  window:{label:'Janela com veneziana',cost:{wood:4,fiber:2},hint:'Abre e fecha com F; ventila e permite visão'},
  door:{label:'Porta',cost:{wood:4,stone:1},hint:'Abre e fecha usando F'},
  bed:{label:'Cama',cost:{wood:5,fiber:4},hint:'Dormir até amanhecer; usa F'},
  chest:{label:'Baú',cost:{wood:6,stone:2},hint:'Guarda 80 itens; usa F'},
  workbench:{label:'Bancada de trabalho',cost:{wood:8,stone:5},hint:'Permite ferramentas e reforços de ferro'},
  roof:{label:'Telhado de madeira',cost:{wood:7,fiber:4},hint:'Cobertura de 3 metros; reduz exposição ao frio'},
  railing:{label:'Guarda-corpo de madeira',cost:{wood:4,fiber:1},hint:'Protege as bordas das plataformas elevadas'},
  roofFlat:{label:'Telhado plano modular',cost:{wood:6,fiber:3},hint:'Cobertura reta e encaixável 3x3 m'},
  stairs:{label:'Escada de madeira',cost:{wood:7,stone:2},hint:'Acesso à plataforma elevada (2,6 m)'},
  loft:{label:'Plataforma elevada',cost:{wood:9,fiber:3},hint:'Piso superior com encaixe automático'},
  farmPlot:{label:'Canteiro de plantio',cost:{wood:3,stone:2,fiber:2},hint:'Plante e regue com F; colher ao amadurecer'},
  fishingRod:{label:'Vara de pesca',cost:{wood:3,fiber:5,stone:1},hint:'Pesca junto à água com Y ou botão da mochila'},
  hammer:{label:'Marreta',cost:{wood:3,stone:4},hint:'Arma mais forte'},
  spear:{label:'Lança',cost:{wood:4,stone:2,fiber:2},hint:'Ataque de maior alcance'},
  pickaxe:{label:'Picareta de pedra',cost:{wood:3,stone:5},hint:'Exige bancada; minera ferro'},
  ironSpear:{label:'Reforçar lança com ferro',cost:{iron:6,wood:2},hint:'Bancada · +3 de dano e ponta de ferro'},
  hardenedSpear:{label:'Lança temperada',cost:{iron:8,stone:3,fiber:3},hint:'Bancada · exige ponta de ferro; +2 de dano e lâmina serrilhada'},
  ironHammer:{label:'Cabeça de marreta de ferro',cost:{iron:5,stone:3,wood:2},hint:'Bancada · +2 de dano e acabamento metálico'},
  spikedHammer:{label:'Marreta cravada',cost:{iron:7,stone:4,fiber:2},hint:'Bancada · exige marreta de ferro; +2 de dano e cravos metálicos'},
  armoredBroom:{label:'Cabo de vassoura reforçado',cost:{iron:3,wood:4,fiber:4},hint:'Bancada · +1 de dano no cabo de vassoura'},
  reinforcedGrip:{label:'Empunhadura reforçada',cost:{fiber:6,wood:2,iron:2},hint:'Bancada · aumenta a durabilidade de marreta e lança'},
  reinforcedVest:{label:'Colete de proteção',cost:{scrap:7,cloth:5,iron:4},hint:'Bancada · reduz 20% dos golpes recebidos'},
  trailBoots:{label:'Botas de caminhada',cost:{cloth:5,scrap:4,fiber:5},hint:'Bancada · reduz consumo de energia na corrida'},
  medicalKit:{label:'Kit médico de emergência',cost:{bandage:2,cloth:2,water:2},hint:'Bancada · recupera 65 de vida e elimina veneno'},
  repairKit:{label:'Kit de manutenção da base',cost:{scrap:2,iron:1,wood:2},hint:'Bancada · recupera até 95 de vida estrutural'},
  silkDressing:{label:'Curativo de seda (teia e feridas)',cost:{spiderSilk:2,fiber:2,bandage:1},hint:'Bancada · cura 40 PV e remove lentidão das teias'},
  chitinPadding:{label:'Reforço de quitina',cost:{chitin:6,scrap:3,cloth:2},hint:'Bancada · reforço permanente que reduz 10% do dano sofrido'},
  crystalSpear:{label:'Ponta de cristal da caverna',cost:{caveCrystal:4,iron:5,chitin:4},hint:'Bancada · exige lança temperada; +3 de dano de lança'},
  bandage:{label:'Fabricar bandagem',cost:{fiber:3,water:1},hint:'Recupera 25 de vida, pode fabricar várias'},
  repairPickaxe:{label:'Reparar picareta',cost:{wood:1,stone:2},hint:'Exige bancada; restaura durabilidade'},
  repairHammer:{label:'Reparar marreta',cost:{stone:2,wood:1},hint:'Exige bancada; restaura durabilidade'},
  repairSpear:{label:'Reparar lança',cost:{wood:2,iron:1},hint:'Exige bancada; restaura durabilidade'},
  cooked:{label:'Assar carne',cost:{meat:1,wood:1},hint:'Exige fogueira acesa'},
  grilledFish:{label:'Assar peixe',cost:{fish:1,wood:1},hint:'Exige fogueira próxima'},
  stew:{label:'Cozinhar ensopado',cost:{vegetables:2,water:1},hint:'Exige fogueira próxima'}
});
export const DAY_SECONDS = 480;
// Balanco: frio permanece perigoso durante a noite inteira, sem eliminar o jogador em poucos segundos.
export const SURVIVAL_BALANCE=Object.freeze({nightColdRate:.75,coldDamageRate:1.0,sprintDrain:16,bootSprintDrain:12,walkRecovery:12,restRecovery:20});
export const clamp = n => Math.max(0,Math.min(100,n));
export function createSurvival() {
  return {hunger:85,thirst:80,stamina:100,warmth:100,days:1,time:DAY_SECONDS*.34,
    inventory:{wood:2,stone:1,fiber:1,berries:2,water:2,meat:0,cooked:0,iron:0,seeds:0,vegetables:0,fish:0,grilledFish:0,stew:0,bandage:0,scrap:0,cloth:0,medicalKit:0,repairKit:0,spiderSilk:0,chitin:0,silkDressing:0,caveCrystal:0},
    crafted:{hammer:false,spear:false,pickaxe:false,ironSpear:false,ironHammer:false,reinforcedGrip:false,hardenedSpear:false,spikedHammer:false,armoredBroom:false,reinforcedVest:false,trailBoots:false,chitinPadding:false,crystalSpear:false,fishingRod:false},equippedGear:{vest:false,padding:false,boots:false},fishReadyAt:0,durability:{pickaxe:0,hammer:0,spear:0},firesBuilt:0,sheltersBuilt:0,gripStrikes:0,skills:createSkills()};
}
export function isNight(state) {
  const t=(state.time%DAY_SECONDS)/DAY_SECONDS;
  return t < .20 || t >= .76;
}
export function cycleClock(state) {
  const t=(state.time%DAY_SECONDS)/DAY_SECONDS;
  const hour=Math.floor(t*24),minute=Math.floor((t*24-hour)*60);
  return `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
}
export function advanceSurvival(state,dt,{sprinting=false,moving=false,nearFire=false,sheltered=false,survivalLevel=1,trailBoots=false}={}) {
  const d=Math.max(0,Math.min(dt,.1));
  state.time += d;
  state.days=1+Math.floor(state.time/DAY_SECONDS);
  const drain=survivalDrain(survivalLevel);
  state.hunger=clamp(state.hunger-d*(moving?.055:.038)*drain);
  state.thirst=clamp(state.thirst-d*(sprinting?.135:.080)*drain);
  const canRun=state.stamina>4 && state.hunger>5 && state.thirst>5;
  state.stamina=clamp(state.stamina+d*(sprinting&&canRun?(trailBoots?-SURVIVAL_BALANCE.bootSprintDrain:-SURVIVAL_BALANCE.sprintDrain):moving?SURVIVAL_BALANCE.walkRecovery:SURVIVAL_BALANCE.restRecovery));
  const exposed=isNight(state)&&!nearFire&&!sheltered;
  state.warmth=clamp(state.warmth+d*(exposed?-SURVIVAL_BALANCE.nightColdRate:nearFire?9:sheltered?5:3));
  const starving=state.hunger<=0||state.thirst<=0;
  const freezing=state.warmth<=0;
  return {canRun,damage:d*((starving?2:0)+(freezing?SURVIVAL_BALANCE.coldDamageRate:0)),night:isNight(state)};
}
export function canAfford(state,recipeId,costOverride=null) {
  const recipe=RECIPES[recipeId];
  return !!recipe&&Object.entries(costOverride||recipe.cost).every(([key,count])=>(state.inventory[key]||0)>=count);
}
export function spendRecipe(state,recipeId,costOverride=null) {
  if(!canAfford(state,recipeId,costOverride))return false;
  for(const [key,count] of Object.entries(costOverride||RECIPES[recipeId].cost))state.inventory[key]-=count;
  return true;
}
export function addResource(state,key,amount=1){
  if(!Object.hasOwn(RESOURCES,key) || !Number.isInteger(amount)||amount<1) return false;
  state.inventory[key]=Math.min(999,(state.inventory[key]||0)+amount);return true;
}
export function useConsumable(state,key) {
  if((state.inventory[key]||0)<1)return false;
  if(key==='berries'){state.hunger=clamp(state.hunger+18);state.thirst=clamp(state.thirst+4);}
  else if(key==='water'){state.thirst=clamp(state.thirst+40);}
  else if(key==='cooked'){state.hunger=clamp(state.hunger+48);}
  else if(key==='vegetables'){state.hunger=clamp(state.hunger+23);state.thirst=clamp(state.thirst+5);}
  else if(key==='grilledFish'){state.hunger=clamp(state.hunger+40);}
  else if(key==='stew'){state.hunger=clamp(state.hunger+65);state.thirst=clamp(state.thirst+12);}
  else return false;
  state.inventory[key]--;return true;
}
export function restoreSurvival(data){
  const exemplar=createSurvival();
  if(!data||typeof data!=='object'||Array.isArray(data))return null;
  const obj={...exemplar,...data};
  const isPct=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100;
  if(!['hunger','thirst','stamina','warmth'].every(k=>isPct(obj[k])))return null;
  if(!Number.isFinite(obj.time)||obj.time<0||obj.time>1e7)return null;
  if(!Number.isInteger(obj.days)||obj.days<1||obj.days>100000)return null;
  // Migração da v1.1: recurso de ferro e ferramentas ainda não existiam.
  obj.inventory={...exemplar.inventory,...(obj.inventory||{})};
  if(!Object.keys(RESOURCES).every(k=>Number.isInteger(obj.inventory[k])&&obj.inventory[k]>=0&&obj.inventory[k]<=999))return null;
  if(!obj.crafted||typeof obj.crafted.hammer!=='boolean'||typeof obj.crafted.spear!=='boolean')return null;
  const oldTools=!data.durability;obj.crafted={...exemplar.crafted,...obj.crafted};
  obj.durability={...exemplar.durability,...(obj.durability||{})};
  if(oldTools){if(obj.crafted.hammer)obj.durability.hammer=100;if(obj.crafted.spear)obj.durability.spear=90;}
  if(!['pickaxe','ironSpear','fishingRod'].every(k=>typeof obj.crafted[k]==='boolean'))return null;
  if(!Number.isFinite(obj.fishReadyAt)||obj.fishReadyAt<0||obj.fishReadyAt>1e7)return null;
  if(obj.crafted.ironSpear&&!obj.crafted.spear)return null;
  if(obj.crafted.ironHammer&&!obj.crafted.hammer)return null;
  if(obj.crafted.spikedHammer&&!obj.crafted.ironHammer)return null;
  if(obj.crafted.hardenedSpear&&!obj.crafted.ironSpear)return null;
  if(obj.crafted.crystalSpear&&!obj.crafted.hardenedSpear)return null;
  if(obj.crafted.reinforcedGrip&&(!obj.crafted.spear||!obj.crafted.hammer))return null;
  if(!['ironHammer','reinforcedGrip','spikedHammer','hardenedSpear','armoredBroom','reinforcedVest','trailBoots','chitinPadding','crystalSpear'].every(k=>typeof obj.crafted[k]==='boolean'))return null;
  if(!Object.entries({pickaxe:80,hammer:100,spear:90}).every(([k,max])=>Number.isInteger(obj.durability[k])&&obj.durability[k]>=0&&obj.durability[k]<=max&&(!obj.durability[k]||obj.crafted[k])))return null;
  if(!Number.isInteger(obj.firesBuilt)||obj.firesBuilt<0||obj.firesBuilt>100)return null;
  if(!Number.isInteger(obj.sheltersBuilt)||obj.sheltersBuilt<0||obj.sheltersBuilt>100)return null;
  obj.gripStrikes=data.gripStrikes??0;
  if(!Number.isInteger(obj.gripStrikes)||obj.gripStrikes<0||obj.gripStrikes>1)return null;
  const equippedGear=normalizeGear(obj,data.equippedGear);if(!equippedGear)return null;
  const skills=restoreSkills(data.skills);if(!skills)return null;
  return {hunger:obj.hunger,thirst:obj.thirst,stamina:obj.stamina,warmth:obj.warmth,
    time:obj.time,days:obj.days,inventory:Object.fromEntries(Object.keys(RESOURCES).map(k=>[k,obj.inventory[k]])),
    crafted:{...obj.crafted},equippedGear,fishReadyAt:obj.fishReadyAt,durability:{...obj.durability},gripStrikes:obj.gripStrikes,firesBuilt:obj.firesBuilt,sheltersBuilt:obj.sheltersBuilt,skills};
}
