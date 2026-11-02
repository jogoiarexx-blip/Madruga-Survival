// Missões independentes para Chiquinha e Bruxa do 71; estado persistível no save v2.
import {validCrop,makeCrop,CROP_MATURITY,CROP_WATER_SECONDS} from './farming.js';
export const CABIN_COST=Object.freeze({wood:12,stone:8,fiber:6});
export const WITCH_OFFER=Object.freeze({spiderSilk:3,caveCrystal:1});
export const CHIQUINHA_INTERVAL=9;
export const FARM_REACH=24;
export const NPC_HOME=Object.freeze({x:10,z:-8});
export const CABIN_POSITION=Object.freeze({x:-48,z:-38});
export const createNpcQuestProgress=()=>({chiquinha:{stage:0,harvests:0,workTimer:0},
  bruxa:{stage:0,lastBlessingDay:0}});
const whole=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
export function restoreNpcQuestProgress(input){
  if(input===undefined)return createNpcQuestProgress();
  if(!input||typeof input!=='object'||Array.isArray(input))return null;
  const a=input.chiquinha,b=input.bruxa;
  if(!a||!b||!whole(a.stage,0,2)||!whole(a.harvests,0,100000)||
    !Number.isFinite(a.workTimer)||a.workTimer<0||a.workTimer>CHIQUINHA_INTERVAL||
    !whole(b.stage,0,2)||!whole(b.lastBlessingDay,0,100000))return null;
  if(a.stage===0&&a.harvests!==0)return null;
  return {chiquinha:{stage:a.stage,harvests:a.harvests,workTimer:a.workTimer},
    bruxa:{stage:b.stage,lastBlessingDay:b.lastBlessingDay}};
}
export function nearestChiquinhaFarm(plots){
  if(!Array.isArray(plots))return null;
  return plots.filter(p=>p?.type==='farmPlot'&&validCrop(p.crop)&&
      Math.hypot(p.x-NPC_HOME.x,p.z-NPC_HOME.z)<=FARM_REACH)
    .sort((a,b)=>Math.hypot(a.x-NPC_HOME.x,a.z-NPC_HOME.z)-
      Math.hypot(b.x-NPC_HOME.x,b.z-NPC_HOME.z))[0]||null;
}
// Seleciona trabalho útil em todos os canteiros próximos: colheitas prontas
// antes das novas sementes, rega apenas quando necessário e monitora as demais.
export function chooseChiquinhaFarm(plots,inventory={}){
  if(!Array.isArray(plots))return null;
  const candidates=plots.filter(p=>p?.type==='farmPlot'&&validCrop(p.crop)&&
    Math.hypot(p.x-NPC_HOME.x,p.z-NPC_HOME.z)<=FARM_REACH);
  if(!candidates.length)return null;
  const scored=candidates.map(plot=>{
    const crop=plot.crop;
    let action='watch',priority=0;
    if(crop.planted&&crop.growth>=CROP_MATURITY){
      if(Number.isInteger(inventory.vegetables)&&inventory.vegetables<=996){
        action='harvest';priority=4;
      }else{action='full';priority=1;}
    }else if(crop.planted&&crop.water<12){
      action='water';priority=3;
    }else if(!crop.planted){
      action='plant';priority=2;
    }
    return {plot,action,priority,distance:Math.hypot(plot.x-NPC_HOME.x,plot.z-NPC_HOME.z)};
  });
  scored.sort((a,b)=>b.priority-a.priority||a.distance-b.distance||a.plot.x-b.plot.x||a.plot.z-b.plot.z);
  return scored[0];
}
function hasResources(inventory,cost){
  return Object.entries(cost).every(([key,count])=>whole(inventory[key],0,999)&&inventory[key]>=count);
}
function transfer(inventory,cost={},gift={}){
  if(!hasResources(inventory,cost))return false;
  for(const [key,count] of Object.entries(gift)){
    if(!whole((inventory[key]||0)-(cost[key]||0)+count,0,999))return false;
  }
  for(const [key,count] of Object.entries(cost))inventory[key]-=count;
  for(const [key,count] of Object.entries(gift))inventory[key]=(inventory[key]||0)+count;
  return true;
}
export function advanceChiquinhaWork(state,plots,inventory,dt,{workerPosition=null}={}){
  if(!state||state.chiquinha.stage<1||!inventory||!Number.isFinite(dt)||dt<=0)return null;
  const job=chooseChiquinhaFarm(plots,inventory);
  if(!job)return null;
  const {plot,action}=job;
  // Quando Chiquinha está sendo simulada na tela, trabalho requer estar ao
  // alcance real da lavoura. Fora do alcance, o cronômetro aguarda a chegada.
  if(workerPosition&&Math.hypot(workerPosition.x-plot.x,workerPosition.z-plot.z)>2.7)return null;
  state.chiquinha.workTimer=Math.min(CHIQUINHA_INTERVAL,state.chiquinha.workTimer+Math.min(.1,dt));
  if(state.chiquinha.workTimer<CHIQUINHA_INTERVAL)return null;
  state.chiquinha.workTimer=0;
  const crop=plot.crop;
  if(action==='full')return {action:'full',plot};
  if(action==='plant'){
    Object.assign(crop,makeCrop(),{planted:true,water:CROP_WATER_SECONDS});
    return {action:'plant',plot};
  }
  if(action==='harvest'){
    if((inventory.vegetables||0)>996)return {action:'full',plot};
    inventory.vegetables=(inventory.vegetables||0)+3;
    state.chiquinha.harvests=Math.min(100000,state.chiquinha.harvests+1);
    Object.assign(crop,makeCrop());
    return {action:'harvest',plot,amount:3};
  }
  if(action==='water'){crop.water=CROP_WATER_SECONDS;return {action:'water',plot};}
  // A espera de amadurecimento nao consome recursos nem modifica o cultivo.
  return null;
}
export function npcQuestStatus(state,{farms=[],day=1}={}){
  const c=state.chiquinha,b=state.bruxa;
  const farm=nearestChiquinhaFarm(farms);
  return {
    chiquinha:c.stage===0?'Chiquinha · converse para ela trabalhar na horta':
      !farm?'Chiquinha · construa um canteiro a até 24 m da base':
      c.stage===1?'Chiquinha · 2 colheitas: '+Math.min(2,c.harvests)+'/2'+(c.harvests>=2?' · fale com ela!':''):
      'Chiquinha · horta automática · '+c.harvests+' colheitas',
    bruxa:b.stage===0?'Bruxa do 71 · cabana: 12 madeira, 8 pedra e 6 fibra':
      b.stage===1?'Bruxa do 71 · entregue 3 sedas de aranha e 1 cristal':
      day>b.lastBlessingDay?'Bruxa do 71 · proteção diária disponível (F)':
      'Bruxa do 71 · bênção de hoje recebida'
  };
}
export function interactNpcQuest(state,id,{inventory,farms=[],day=1}={}){
  if(!state||!inventory)return {changed:false,message:'Não foi possível iniciar a missão.'};
  if(id==='chiquinha'){
    const q=state.chiquinha;
    if(q.stage===0){
      if(!transfer(inventory,{}, {seeds:2,water:1}))
        return {changed:false,message:'Chiquinha: Libere espaço para as sementes.'};
      q.stage=1;
      return {changed:true,xp:6,message:'Chiquinha: Vou plantar, regar e colher! Construa um canteiro perto da base. +2 sementes, +1 água, +6 XP.'};
    }
    if(q.stage===1){
      if(!nearestChiquinhaFarm(farms))
        return {changed:false,message:'Chiquinha: Construa um canteiro a até 24 metros daqui.'};
      if(q.harvests<2)return {changed:false,message:'Chiquinha: Já fiz '+q.harvests+'/2 colheitas. Aguarde as plantas crescerem.'};
      if(!transfer(inventory,{}, {vegetables:6,seeds:3}))
        return {changed:false,message:'Chiquinha: Abra espaço na mochila para sua recompensa.'};
      q.stage=2;
      return {changed:true,xp:18,message:'Chiquinha: Horta estabelecida! +6 legumes, +3 sementes e +18 XP. Continuarei colhendo!'};
    }
    return {changed:false,message:'Chiquinha: A horta está sob meus cuidados! Já fiz '+q.harvests+' colheitas.'};
  }
  if(id==='bruxa71'){
    const q=state.bruxa;
    if(q.stage===0){
      if(!hasResources(inventory,CABIN_COST))return {changed:false,
        message:'Bruxa do 71: Preciso de 12 madeiras, 8 pedras e 6 fibras para minha cabana.'};
      if(!transfer(inventory,CABIN_COST,{cloth:2}))return {changed:false,
        message:'Bruxa do 71: Abra espaço para os tecidos da recompensa.'};
      q.stage=1;
      return {changed:true,builtCabin:true,xp:20,
        message:'Bruxa do 71: Cabana pronta! +2 tecidos e +20 XP. Agora preciso de seda e cristal.'};
    }
    if(q.stage===1){
      if(!hasResources(inventory,WITCH_OFFER))return {changed:false,
        message:'Bruxa do 71: Traga 3 sedas de aranha e 1 cristal subterrâneo da caverna.'};
      if(!transfer(inventory,WITCH_OFFER,{silkDressing:2,medicalKit:1}))
        return {changed:false,message:'Bruxa do 71: Libere espaço para os remédios.'};
      q.stage=2;q.lastBlessingDay=Math.max(1,Math.floor(day));
      return {changed:true,xp:30,
        message:'Bruxa do 71: Amuleto pronto! +2 curativos de seda, +1 kit médico e +30 XP. Volte amanhã.'};
    }
    if(day<=q.lastBlessingDay)return {changed:false,
      message:'Bruxa do 71: Já preparei a proteção de hoje. Volte amanhã.'};
    if(!transfer(inventory,{}, {bandage:1,water:1}))
      return {changed:false,message:'Bruxa do 71: Abra espaço na mochila.'};
    q.lastBlessingDay=Math.max(1,Math.floor(day));
    return {changed:true,xp:3,message:'Bruxa do 71: Proteção diária! +1 bandagem, +1 água e +3 XP.'};
  }
  return {changed:false,message:'NPC desconhecido.'};
}
