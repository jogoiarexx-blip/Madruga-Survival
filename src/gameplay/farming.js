// Agricultura determinística, sem DOM nem WebGL. A plantação cresce durante o jogo.
export const CROP_MATURITY=125;
export const CROP_WATER_SECONDS=60;
export const makeCrop=()=>({planted:false,growth:0,water:0});
export function validCrop(c){return !!c&&typeof c==='object'&&typeof c.planted==='boolean'&&
  Number.isFinite(c.growth)&&c.growth>=0&&c.growth<=CROP_MATURITY&&
  Number.isFinite(c.water)&&c.water>=0&&c.water<=CROP_WATER_SECONDS+40;}
export function advanceCrop(c,seconds){
  if(!validCrop(c)||!c.planted)return false;
  const dt=Math.max(0,Math.min(seconds,1));
  const wet=Math.min(dt,c.water);
  // Solo úmido cresce mais rapidamente. O restante cresce com a velocidade normal.
  c.growth=Math.min(CROP_MATURITY,c.growth+wet*2+(dt-wet)*.58);
  c.water=Math.max(0,c.water-dt);
  return c.growth>=CROP_MATURITY;
}
export function workCrop(c,inventory,bonus={}){
  if(!validCrop(c)||!inventory)return {ok:false,message:'Canteiro inválido'};
  if(!c.planted){
    if((inventory.seeds||0)<1)return {ok:false,message:'Você precisa de sementes (colete arbustos de frutas)'};
    inventory.seeds--;c.planted=true;c.growth=0;c.water=0;
    return {ok:true,action:'plant',message:'🌱 Sementes plantadas! Regue para acelerar o crescimento.'};
  }
  if(c.growth>=CROP_MATURITY){
    const amount=3+Math.max(0,Math.min(5,Math.floor(bonus.harvestExtra||0)));
    if((inventory.vegetables||0)>999-amount||(inventory.seeds||0)>997)return {ok:false,message:'Mochila cheia!'};
    inventory.vegetables=(inventory.vegetables||0)+amount;
    inventory.seeds=(inventory.seeds||0)+2;
    Object.assign(c,makeCrop());
    return {ok:true,action:'harvest',amount,message:`🥕 +${amount} legumes e +2 sementes!`};
  }
  if(c.water>8)return {ok:false,message:'A plantação já está regada. Volte depois.'};
  if((inventory.water||0)<1)return {ok:false,message:'Use 1 água da mochila para regar.'};
  inventory.water--;c.water=CROP_WATER_SECONDS+Math.max(0,Math.min(40,Math.floor(bonus.waterExtra||0)));
  return {ok:true,action:'water',message:'💧 Canteiro regado! Crescimento acelerado.'};
}
