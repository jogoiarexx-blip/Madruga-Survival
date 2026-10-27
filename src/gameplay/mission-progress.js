// Missões opcionais de sobrevivência, sem fim de campanha obrigatório.
// Contadores limitados e estágio persistido preservam a compatibilidade dos saves v2.
export const MISSIONS=Object.freeze([
 {id:'campfire',title:'Primeira fogueira',description:'Construa uma fogueira para se aquecer',target:1,xp:3,items:{berries:2}},
 {id:'farm',title:'Cultivar a terra',description:'Construa um canteiro na base',target:1,xp:4,items:{water:2}},
 {id:'hunt',title:'Provisões da floresta',description:'Cace dois animais selvagens',target:2,xp:5,items:{fiber:3}},
 {id:'cook',title:'Cozinheiro do acampamento',description:'Prepare um prato na fogueira',target:1,xp:5,items:{berries:3}},
 {id:'defend',title:'Defesa da floresta',description:'Derrote cinco criaturas inimigas',target:5,xp:7,items:{stone:4}},
 {id:'ally',title:'Parceiro de jornada',description:'Recrute o Chaves',target:1,xp:7,items:{wood:4}}
]);
const inRange=(n,max)=>Number.isInteger(n)&&n>=0&&n<=max;
export function createMissionProgress(){return {stage:0,hunt:0,cook:0,defeat:0};}
export function restoreMissionProgress(data){
 if(data===undefined)return createMissionProgress();
 if(!data||typeof data!=='object'||Array.isArray(data)||
   !inRange(data.stage,MISSIONS.length)||!inRange(data.hunt,100000)||
   !inRange(data.cook,100000)||!inRange(data.defeat,100000))return null;
 return {stage:data.stage,hunt:data.hunt,cook:data.cook,defeat:data.defeat};
}
export function recordMissionEvent(state,kind,amount=1){
 if(!state||!['hunt','cook','defeat'].includes(kind)||!inRange(amount,1000))return false;
 state[kind]=Math.min(100000,state[kind]+amount);return true;
}
export function currentMission(state,context={}){
 const mission=MISSIONS[state?.stage??0];if(!mission)return null;
 const count=mission.id==='campfire'?Number(!!context.firesBuilt):
  mission.id==='farm'?Number(!!context.hasFarm):
  mission.id==='hunt'?state.hunt:mission.id==='cook'?state.cook:
  mission.id==='defend'?state.defeat:Number(!!context.guardRecruited);
 return {...mission,count:Math.min(mission.target,count)};
}
export function advanceMission(state,context){
 const current=currentMission(state,context);
 if(!current||current.count<current.target)return null;
 state.stage++;return current;
}
