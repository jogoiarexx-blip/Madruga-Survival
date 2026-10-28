// Pesca interativa independente de Three.js; a captura só é efetivada ao recolher a linha.
// Estado transitório: não altera o checkpoint, itens ou XP até completar a ação.
const SPECIES=Object.freeze([
 {id:'tilapia',name:'Tilápia',weight:60,tugs:3},
 {id:'traira',name:'Traíra',weight:28,tugs:4},
 {id:'carpa',name:'Carpa',weight:12,tugs:5}
]);
export const BITE_WINDOW=1.55;
export const REEL_WINDOW=6.6;
export function selectFishSpecies(roll=0){
 const v=Math.max(0,Math.min(.999999,Number.isFinite(roll)?roll:0))*100;
 let tally=0;for(const s of SPECIES){tally+=s.weight;if(v<tally)return {...s};}
 return {...SPECIES[0]};
}
export function createFishingSession(random=Math.random){
 let state={phase:'idle',seconds:0,progress:0,species:null,x:0,z:0,lastTap:-1};
 const result=(type,message)=>({type,message,phase:state.phase});
 function cancel(){state={phase:'idle',seconds:0,progress:0,species:null,x:0,z:0,lastTap:-1};return result('cancel','Pesca encerrada.');}
 function start({survival,elapsed,nearWater,position}={}){
  if(state.phase!=='idle')return result('busy','Já existe uma linha lançada.');
  if(!nearWater)return result('error','Procure água para pescar.');
  if(!survival?.crafted?.fishingRod)return result('error','Fabrique uma vara de pesca primeiro.');
  if(!Number.isFinite(elapsed)||elapsed<0)return result('error','Tempo inválido.');
  if(elapsed<(survival.fishReadyAt||0))return result('error',`Aguarde ${Math.ceil(survival.fishReadyAt-elapsed)}s para pescar novamente.`);
  if((survival.inventory?.fish||0)>=999)return result('error','Mochila cheia de peixes.');
  if(!Number.isFinite(position?.x)||!Number.isFinite(position?.z))return result('error','Posição inválida.');
  const roll=Math.max(0,Math.min(.999999,Number(random())||0));
  state={phase:'waiting',seconds:2.7+roll*3.9,progress:0,species:null,x:position.x,z:position.z,lastTap:-1};
  return result('cast','🎣 Linha lançada. Aguarde a fisgada…');
 }
 function press(){
  if(state.phase==='bite'){
   state.phase='reeling';state.seconds=REEL_WINDOW;state.progress=1;state.lastTap=0;
   return result('hook','🐟 Fisgou! Aperte Y novamente para recolher a linha.');
  }
  if(state.phase==='reeling'){
   // Intervalo curto impede que o mesmo pressionamento do teclado conte diversas vezes.
   if(state.lastTap<.19)return result('wait','Puxe a linha com ritmo.');
   state.lastTap=0;state.progress++;
   if(state.progress>=state.species.tugs){state.phase='caught';return result('caught',`🎣 ${state.species.name} capturada!`);}
   return result('reel',`🎣 Recolhendo ${state.species.name}: ${state.progress}/${state.species.tugs}`);
  }
  if(state.phase==='waiting')return result('wait','Aguarde o peixe morder a isca…');
  return result('error','Pressione Y junto à água para lançar a linha.');
 }
 function tick(dt,{position,nearWater,active=true}={}){
  if(state.phase==='idle'||state.phase==='caught')return null;
  if(!active||!nearWater||!position||Math.hypot(position.x-state.x,position.z-state.z)>3.3)return cancel();
  const step=Number.isFinite(dt)?Math.max(0,Math.min(.1,dt)):0;
  state.seconds=Math.max(0,state.seconds-step);
  if(state.phase==='reeling')state.lastTap+=step;
  if(state.seconds>0)return null;
  if(state.phase==='waiting'){
   const s=selectFishSpecies(random());state.species=s;state.phase='bite';state.seconds=BITE_WINDOW;
   return result('bite','❗ FISGOU! Aperte Y agora!');
  }
  if(state.phase==='bite'||state.phase==='reeling'){
   const lost=state.species?.name||'peixe';cancel();return result('miss',`💦 ${lost} escapou! Lance novamente.`);
  }
  return null;
 }
 return {start,press,tick,cancel,reset:cancel,get state(){return {...state,species:state.species&&{...state.species}}}};
}
