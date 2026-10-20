// Pesca com intervalo por partida; não depende da taxa de quadros.
export const FISH_COOLDOWN=28;
export function tryFish(survival,elapsed,nearWater,bonus={}){
 if(!nearWater)return {ok:false,message:'Procure uma fonte de água para pescar.'};
 if(!survival.crafted.fishingRod)return {ok:false,message:'Fabrique uma vara de pesca na mochila.'};
 if(!Number.isFinite(elapsed)||elapsed<0)return {ok:false,message:'Tempo inválido'};
 if(elapsed<(survival.fishReadyAt||0))return {ok:false,message:`🎣 Aguarde ${Math.ceil(survival.fishReadyAt-elapsed)}s para pescar novamente.`};
 const amount=Number.isInteger(bonus.yield)?Math.max(1,Math.min(4,bonus.yield)):1;
 const cooldown=Number.isFinite(bonus.cooldown)?Math.max(12,Math.min(FISH_COOLDOWN,bonus.cooldown)):FISH_COOLDOWN;
 if((survival.inventory.fish||0)>999-amount)return {ok:false,message:'Mochila cheia de peixes!'};
 survival.inventory.fish=(survival.inventory.fish||0)+amount;
 survival.fishReadyAt=elapsed+cooldown;
 return {ok:true,amount,message:`🎣 +${amount} peixe(s) cru(s)! Asse na fogueira.`};
}
