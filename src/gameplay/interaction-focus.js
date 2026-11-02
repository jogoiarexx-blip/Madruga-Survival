// Escolha comum do alvo de F e do HUD. A distância vem do mesmo
// ponto de interação, sem prioridade artificial de porta sobre um saque próximo.
// Empates favorecem recipientes em vez de abrir/fechar porta sem intenção.
const PRIORITY=Object.freeze({loot:0,building:1,npc:2,guard:3,nest:4,fixture:5,resource:6});
export function chooseInteractionFocus(candidates=[]){
  let winner=null;
  for(const item of candidates){
    if(!item||!Object.hasOwn(PRIORITY,item.kind)||!Number.isFinite(item.distance)||
      item.distance<0||!item.target)continue;
    if(!winner||item.distance<winner.distance-.1||
      Math.abs(item.distance-winner.distance)<=.1&&PRIORITY[item.kind]<PRIORITY[winner.kind])
      winner=item;
  }
  return winner;
}
